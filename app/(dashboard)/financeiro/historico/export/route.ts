import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { singleRelation } from '@/lib/utils/supabase-types';
import { getCurrentUsuario } from '@/lib/auth/get-user-role';
import { mascararCpf } from '@/lib/utils/mascarar-cpf';
import { FECHAMENTO_STATUS_LABELS } from '@/types/fechamento';
import type { FechamentoStatus, FechamentoTipo } from '@/types/database';
import { applyCorsHeaders, handleOptions } from '@/lib/cors';

const ALLOWED_METHODS = 'GET, OPTIONS';

export async function OPTIONS(request: Request) {
  return handleOptions(request, ALLOWED_METHODS) ?? new NextResponse(null, { status: 405 });
}

/**
 * GET /financeiro/historico/export
 *
 * Generates a CSV file with fechamento history data.
 * Applies the same filters as the historico page.
 * CPF is masked for LGPD compliance.
 * Only authenticated users can access (admin sees all, motorista sees own).
 */
export async function GET(request: Request) {
  const requestOrigin = request.headers.get('Origin');
  const usuario = await getCurrentUsuario();

  if (!usuario) {
    return applyCorsHeaders(
      NextResponse.json({ error: 'Não autenticado' }, { status: 401 }),
      requestOrigin,
      ALLOWED_METHODS,
    );
  }

  const { searchParams } = new URL(request.url);
  const supabase = await createClient();

  // Build query with same filters as historico page
  let query = supabase
    .from('fechamento')
    .select(
      'id, periodo_inicio, periodo_fim, tipo, total_viagens, total_gastos, saldo, status, motorista!inner(nome, cpf)',
    )
    .order('periodo_inicio', { ascending: false });

  // Motorista sees only own
  if (usuario.role === 'motorista' && usuario.motorista_id) {
    query = query.eq('motorista_id', usuario.motorista_id);
  }

  // Apply filters from URL
  const motoristaIds = searchParams.get('motoristaIds');
  if (motoristaIds) {
    const rawIds = motoristaIds.split(',').filter(Boolean);
    if (rawIds.length > 0) {
      // Story 22.6: Validate motorista IDs belong to user's empresa
      const { data: validMotoristas } = await supabase
        .from('motorista')
        .select('id')
        .in('id', rawIds)
        .eq('empresa_id', usuario.empresa_id!);

      const validIds = (validMotoristas ?? []).map((m) => m.id);
      if (validIds.length > 0) {
        query = query.in('motorista_id', validIds);
      } else {
        // No valid motorista IDs — return empty CSV
        const bom = '\uFEFF';
        const today = new Date().toISOString().slice(0, 10);
        const headersCsv = [
          'Motorista', 'CPF', 'Período Início', 'Período Fim', 'Tipo',
          'Total Viagens (R$)', 'Total Gastos (R$)', 'Saldo (R$)', 'Status',
        ];
        const csv = headersCsv.map((h) => `"${h}"`).join(',');
        return applyCorsHeaders(
          new NextResponse(bom + csv, {
            headers: {
              'Content-Type': 'text/csv; charset=utf-8',
              'Content-Disposition': `attachment; filename="historico-fechamentos-${today}.csv"`,
            },
          }),
          requestOrigin,
          ALLOWED_METHODS,
        );
      }
    }
  }

  const tipo = searchParams.get('tipo');
  if (tipo && tipo !== 'todos') {
    query = query.eq('tipo', tipo);
  }

  const status = searchParams.get('status');
  if (status && status !== 'todos') {
    query = query.eq('status', status);
  }

  const periodoInicio = searchParams.get('periodoInicio');
  if (periodoInicio) {
    query = query.gte('periodo_inicio', periodoInicio);
  }

  const periodoFim = searchParams.get('periodoFim');
  if (periodoFim) {
    query = query.lte('periodo_inicio', periodoFim);
  }

  const busca = searchParams.get('busca');
  if (busca && busca.trim().length > 0) {
    query = query.ilike('motorista.nome', `%${busca.trim()}%`);
  }

  const { data, error } = await query;

  if (error) {
    return applyCorsHeaders(
      NextResponse.json(
        { error: `Erro ao buscar fechamentos: ${error.message}` },
        { status: 500 },
      ),
      requestOrigin,
      ALLOWED_METHODS,
    );
  }

  const headersCsv = [
    'Motorista',
    'CPF',
    'Período Início',
    'Período Fim',
    'Tipo',
    'Total Viagens (R$)',
    'Total Gastos (R$)',
    'Saldo (R$)',
    'Status',
  ];

  const rows = (data ?? []).map((f) => {
    const motorista = singleRelation<{ nome: string; cpf: string }>(f.motorista)!;
    const saldo = f.saldo as number;
    const totalViagens = f.total_viagens as number;
    const totalGastos = f.total_gastos as number;
    const tipoLabel = (f.tipo as FechamentoTipo) === 'mensal' ? 'Mensal' : 'Semanal';
    const statusLabel = FECHAMENTO_STATUS_LABELS[f.status as FechamentoStatus];

    return [
      motorista.nome,
      mascararCpf(motorista.cpf),
      f.periodo_inicio as string,
      f.periodo_fim as string,
      tipoLabel,
      (totalViagens / 100).toFixed(2).replace('.', ','),
      (totalGastos / 100).toFixed(2).replace('.', ','),
      (saldo / 100).toFixed(2).replace('.', ','),
      statusLabel,
    ];
  });

  const csv = [headersCsv, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  // BOM for UTF-8 Excel compatibility
  const bom = '\uFEFF';
  const today = new Date().toISOString().slice(0, 10);

  return applyCorsHeaders(
    new NextResponse(bom + csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="historico-fechamentos-${today}.csv"`,
      },
    }),
    requestOrigin,
    ALLOWED_METHODS,
  );
}
