/**
 * Route handler: Export relatorio as Excel (.xlsx) with 4 sheets.
 * Story 23.8
 *
 * Uses write-excel-file (NOT xlsx, NOT exceljs).
 * Sheets: Viagens, Despesas, Abastecimentos, Resumo.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import writeXlsxFile from 'write-excel-file/node';
import type { Row, Cell } from 'write-excel-file/node';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUsuario } from '@/lib/auth/get-user-role';
import { logError } from '@/lib/observability/logger';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDateBR(dateStr: string | null): string {
  if (!dateStr) return '';
  // Handle both 'YYYY-MM-DD' and ISO timestamps
  const clean = dateStr.slice(0, 10);
  const [y, m, d] = clean.split('-');
  return `${d}/${m}/${y}`;
}

function formatDateTimeBR(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function headerCell(text: string): Cell {
  return { value: text, type: String, fontWeight: 'bold' };
}

function strCell(value: string | null | undefined): Cell {
  return { value: value ?? '', type: String };
}

function numCell(value: number | null | undefined): Cell {
  if (value == null) return null;
  return { value, type: Number };
}

function centavosCell(centavos: number | null | undefined): Cell {
  if (centavos == null) return null;
  return { value: centavos / 100, type: Number };
}

function pctCell(value: number | null | undefined): Cell {
  if (value == null) return null;
  return { value, type: Number };
}

// ---------------------------------------------------------------------------
// Types for raw data from Supabase
// ---------------------------------------------------------------------------

interface GastoRow {
  id: string;
  data: string;
  valor: number;
  descricao: string | null;
  km_registro: number | null;
  litros: number | null;
  posto_local: string | null;
  viagem_id: string | null;
  caminhao_id: string | null;
  categoria_gasto: { nome: string } | null;
}

interface ViagemRpc {
  id: string;
  data_saida: string;
  data_chegada_real: string | null;
  origem: string;
  destino: string;
  km_calculado: number | null;
  valor_total_centavos: number;
  status: string;
  // motorista report includes caminhao info, caminhao report includes motorista info
  caminhao_placa?: string;
  caminhao_modelo?: string;
  motorista_nome?: string;
  // motorista-specific
  percentual_pagamento?: number;
  pagamento_centavos?: number;
}

interface HeaderMotorista {
  motorista_nome: string;
  empresa_nome: string;
  periodo_inicio: string;
  periodo_fim: string;
  total_viagens: number;
  total_km_calculado: number;
  total_valor_bruto_centavos: number;
  total_pagamento_centavos: number;
}

interface HeaderCaminhao {
  caminhao_placa: string;
  caminhao_modelo: string;
  empresa_nome: string;
  periodo_inicio: string;
  periodo_fim: string;
  total_viagens: number;
  km_total_calculado: number;
  receita_total_centavos: number;
  custo_total_centavos: number;
  custo_por_km_centavos: number | null;
  margem_absoluta_centavos: number;
  margem_percentual: number | null;
}

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tipo: string; id: string }> },
) {
  const { tipo, id } = await params;

  // Validate tipo
  if (tipo !== 'motorista' && tipo !== 'caminhao') {
    return NextResponse.json({ error: 'Tipo invalido' }, { status: 400 });
  }

  // Extract search params
  const { searchParams } = request.nextUrl;
  const inicio = searchParams.get('inicio');
  const fim = searchParams.get('fim');

  if (!inicio || !fim) {
    return NextResponse.json(
      { error: 'Parâmetros início e fim são obrigatórios' },
      { status: 400 },
    );
  }

  // Auth check
  const usuario = await getCurrentUsuario();
  if (!usuario) {
    return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
  }

  const supabase = await createClient();

  // Ownership check
  if (tipo === 'motorista') {
    const { data: motorista, error: motErr } = await supabase
      .from('motorista')
      .select('empresa_id')
      .eq('id', id)
      .single();

    if (motErr || !motorista) {
      return NextResponse.json({ error: 'Nao encontrado' }, { status: 404 });
    }
    if (motorista.empresa_id !== usuario.empresa_id) {
      logError(
        {
          action: 'xlsx.motorista.ownership',
          empresaId: usuario.empresa_id,
          usuarioId: usuario.id,
          params: { id },
        },
        new Error('Acesso negado: motorista de outra empresa'),
      );
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }
  } else {
    const { data: caminhao, error: camErr } = await supabase
      .from('caminhao')
      .select('empresa_id')
      .eq('id', id)
      .single();

    if (camErr || !caminhao) {
      return NextResponse.json({ error: 'Nao encontrado' }, { status: 404 });
    }
    if (caminhao.empresa_id !== usuario.empresa_id) {
      logError(
        {
          action: 'xlsx.caminhao.ownership',
          empresaId: usuario.empresa_id,
          usuarioId: usuario.id,
          params: { id },
        },
        new Error('Acesso negado: caminhao de outra empresa'),
      );
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }
  }

  try {
    // -----------------------------------------------------------------
    // 1. Call RPC for viagens + header
    // -----------------------------------------------------------------
    const rpcName =
      tipo === 'motorista'
        ? 'relatorio_motorista_periodo'
        : 'relatorio_caminhao_periodo';

    const rpcParams =
      tipo === 'motorista'
        ? { p_motorista_id: id, p_inicio: inicio, p_fim: fim }
        : { p_caminhao_id: id, p_inicio: inicio, p_fim: fim };

    const { data: rpcData, error: rpcError } = await supabase.rpc(
      rpcName,
      rpcParams,
    );

    if (rpcError) {
      logError(
        {
          action: `xlsx.${tipo}.rpc`,
          empresaId: usuario.empresa_id,
          params: { id, inicio, fim },
        },
        rpcError,
      );
      return NextResponse.json(
        { error: 'Erro ao gerar relatorio' },
        { status: 500 },
      );
    }

    // -----------------------------------------------------------------
    // 2. Fetch gastos (despesas + abastecimentos) directly
    // -----------------------------------------------------------------
    const gastoFilter =
      tipo === 'motorista'
        ? supabase
            .from('gasto')
            .select(
              'id, data, valor, descricao, km_registro, litros, posto_local, viagem_id, caminhao_id, categoria_gasto!inner(nome)',
            )
            .eq('motorista_id', id)
            .gte('data', inicio)
            .lte('data', fim)
            .order('data', { ascending: true })
        : supabase
            .from('gasto')
            .select(
              'id, data, valor, descricao, km_registro, litros, posto_local, viagem_id, caminhao_id, categoria_gasto!inner(nome)',
            )
            .eq('caminhao_id', id)
            .gte('data', inicio)
            .lte('data', fim)
            .order('data', { ascending: true });

    const { data: gastos, error: gastoError } = await gastoFilter;

    if (gastoError) {
      logError(
        {
          action: `xlsx.${tipo}.gastos`,
          empresaId: usuario.empresa_id,
          params: { id, inicio, fim },
        },
        gastoError,
      );
      return NextResponse.json(
        { error: 'Erro ao buscar gastos' },
        { status: 500 },
      );
    }

    const gastosTyped = (gastos ?? []) as unknown as GastoRow[];

    // -----------------------------------------------------------------
    // 3. Build sheets
    // -----------------------------------------------------------------
    const viagens: ViagemRpc[] = rpcData.viagens ?? [];
    const header =
      tipo === 'motorista'
        ? (rpcData.header as HeaderMotorista)
        : (rpcData.header as HeaderCaminhao);

    const nomeLabel =
      tipo === 'motorista'
        ? (header as HeaderMotorista).motorista_nome
        : `${(header as HeaderCaminhao).caminhao_placa} - ${(header as HeaderCaminhao).caminhao_modelo}`;

    const empresaNome = header.empresa_nome;

    // --- Sheet 1: Viagens ---
    const viagensHeaderRow: Row =
      tipo === 'motorista'
        ? [
            headerCell('Data Saida'),
            headerCell('Data Chegada'),
            headerCell('Origem'),
            headerCell('Destino'),
            headerCell('KM'),
            headerCell('Valor Frete (R$)'),
            headerCell('Comissao (R$)'),
            headerCell('Status'),
            headerCell('Caminhao'),
          ]
        : [
            headerCell('Data Saida'),
            headerCell('Data Chegada'),
            headerCell('Origem'),
            headerCell('Destino'),
            headerCell('KM'),
            headerCell('Valor Frete (R$)'),
            headerCell('Status'),
            headerCell('Motorista'),
          ];

    const viagensRows: Row[] = viagens.map((v) =>
      tipo === 'motorista'
        ? [
            strCell(formatDateBR(v.data_saida)),
            strCell(formatDateBR(v.data_chegada_real)),
            strCell(v.origem),
            strCell(v.destino),
            numCell(v.km_calculado),
            centavosCell(v.valor_total_centavos),
            centavosCell(v.pagamento_centavos),
            strCell(v.status),
            strCell(
              v.caminhao_placa
                ? `${v.caminhao_placa} - ${v.caminhao_modelo ?? ''}`
                : '',
            ),
          ]
        : [
            strCell(formatDateBR(v.data_saida)),
            strCell(formatDateBR(v.data_chegada_real)),
            strCell(v.origem),
            strCell(v.destino),
            numCell(v.km_calculado),
            centavosCell(v.valor_total_centavos),
            strCell(v.status),
            strCell(v.motorista_nome),
          ],
    );

    const viagensSheet = [viagensHeaderRow, ...viagensRows];

    // --- Sheet 2: Despesas (ALL categories, no "dedutivel" filter) ---
    const despesasHeaderRow: Row = [
      headerCell('Categoria'),
      headerCell('Descricao'),
      headerCell('Data'),
      headerCell('Valor (R$)'),
      headerCell('KM no momento'),
    ];

    const despesasRows: Row[] = gastosTyped.map((g) => [
      strCell(g.categoria_gasto?.nome ?? ''),
      strCell(g.descricao),
      strCell(formatDateBR(g.data)),
      centavosCell(g.valor),
      numCell(g.km_registro),
    ]);

    const despesasSheet = [despesasHeaderRow, ...despesasRows];

    // --- Sheet 3: Abastecimentos (gastos with categoria = 'Combustivel') ---
    const abastecimentos = gastosTyped.filter(
      (g) =>
        g.categoria_gasto?.nome?.toLowerCase() === 'combustivel' ||
        g.categoria_gasto?.nome?.toLowerCase() === 'combustível',
    );

    // Group by caminhao_id and sort by km_registro ASC for KM/L calculation
    const abastPorCaminhao = new Map<string, GastoRow[]>();
    for (const ab of abastecimentos) {
      const key = ab.caminhao_id ?? 'sem-caminhao';
      if (!abastPorCaminhao.has(key)) {
        abastPorCaminhao.set(key, []);
      }
      abastPorCaminhao.get(key)!.push(ab);
    }

    // Sort each group by km_registro ASC
    for (const [, group] of abastPorCaminhao) {
      group.sort((a, b) => {
        if (a.km_registro == null && b.km_registro == null) return 0;
        if (a.km_registro == null) return -1;
        if (b.km_registro == null) return 1;
        return a.km_registro - b.km_registro;
      });
    }

    // Build abastecimento rows with KM/L
    const abastHeaderRow: Row = [
      headerCell('Data'),
      headerCell('Posto'),
      headerCell('Litros'),
      headerCell('Valor (R$)'),
      headerCell('KM Abastecido'),
      headerCell('KM/L'),
    ];

    const abastRows: Row[] = [];
    for (const [, group] of abastPorCaminhao) {
      for (let i = 0; i < group.length; i++) {
        const ab = group[i];
        let kmL: number | null = null;

        if (
          i > 0 &&
          ab.km_registro != null &&
          group[i - 1].km_registro != null &&
          ab.litros != null &&
          ab.litros > 0
        ) {
          kmL =
            Math.round(
              ((ab.km_registro - group[i - 1].km_registro!) / ab.litros) * 100,
            ) / 100;
        }

        abastRows.push([
          strCell(formatDateBR(ab.data)),
          strCell(ab.posto_local),
          numCell(ab.litros != null ? Number(ab.litros) : null),
          centavosCell(ab.valor),
          numCell(ab.km_registro),
          numCell(kmL),
        ]);
      }
    }

    const abastSheet = [abastHeaderRow, ...abastRows];

    // --- Sheet 4: Resumo ---
    // Total despesas (all gastos, not just combustivel/manutencao/pedagio)
    const totalDespesasCentavos = gastosTyped.reduce(
      (acc, g) => acc + g.valor,
      0,
    );

    const totalViagens =
      tipo === 'motorista'
        ? (header as HeaderMotorista).total_viagens
        : (header as HeaderCaminhao).total_viagens;

    const kmTotal =
      tipo === 'motorista'
        ? (header as HeaderMotorista).total_km_calculado
        : (header as HeaderCaminhao).km_total_calculado;

    const receitaTotalCentavos =
      tipo === 'motorista'
        ? (header as HeaderMotorista).total_valor_bruto_centavos
        : (header as HeaderCaminhao).receita_total_centavos;

    const margemCentavos = receitaTotalCentavos - totalDespesasCentavos;
    const margemPct =
      receitaTotalCentavos > 0
        ? Math.round((margemCentavos / receitaTotalCentavos) * 10000) / 100
        : null;
    const custoKm =
      kmTotal > 0
        ? Math.round((totalDespesasCentavos / kmTotal) * 100) / 100
        : null;

    const resumoSheet: Row[] = [
      [headerCell('Indicador'), headerCell('Valor')],
      [strCell('Periodo'), strCell(`${formatDateBR(inicio)} a ${formatDateBR(fim)}`)],
      [
        strCell(tipo === 'motorista' ? 'Motorista' : 'Caminhao'),
        strCell(nomeLabel),
      ],
      [strCell('Empresa'), strCell(empresaNome)],
      [strCell('Total de Viagens'), numCell(totalViagens)],
      [strCell('KM Total'), numCell(kmTotal)],
      [strCell('Receita Bruta (R$)'), centavosCell(receitaTotalCentavos)],
      [strCell('Custo Total (R$)'), centavosCell(totalDespesasCentavos)],
      [strCell('Custo/KM (R$/km)'), numCell(custoKm)],
      [strCell('Margem Bruta (R$)'), centavosCell(margemCentavos)],
      [strCell('Margem (%)'), pctCell(margemPct)],
      [
        strCell('Data de Geracao'),
        strCell(formatDateTimeBR(new Date().toISOString())),
      ],
    ];

    // -----------------------------------------------------------------
    // 4. Generate Excel
    // -----------------------------------------------------------------
    const buffer = await writeXlsxFile(
      [viagensSheet, despesasSheet, abastSheet, resumoSheet],
      {
        sheets: ['Viagens', 'Despesas', 'Abastecimentos', 'Resumo'],
        stickyRowsCount: 1,
        buffer: true,
      },
    );

    // -----------------------------------------------------------------
    // 5. Build filename
    // -----------------------------------------------------------------
    const nomeSlug = nomeLabel
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const periodoSlug = `${inicio}_${fim}`;
    const filename = `relatorio-${tipo}-${nomeSlug}-${periodoSlug}.xlsx`;

    // Buffer extends Uint8Array; cast needed for strict BodyInit type
    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    logError(
      {
        action: `xlsx.${tipo}.generate`,
        empresaId: usuario.empresa_id,
        params: { id, inicio, fim },
      },
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      { error: 'Erro ao gerar arquivo Excel' },
      { status: 500 },
    );
  }
}
