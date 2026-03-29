'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUsuario } from '@/lib/auth/get-user-role';
import type {
  FechamentoHistoricoFiltros,
  FechamentoListItem,
  FechamentoListResult,
  FechamentoActionResult,
  ResumoFinanceiro,
  FechamentoFilterOptions,
} from '@/types/fechamento';

/**
 * Fetch paginated and filtered fechamentos for the historico page.
 * RLS ensures empresa isolation; motorista role sees only own records.
 */
export async function getFechamentosHistorico(
  filtros: FechamentoHistoricoFiltros,
): Promise<{ data?: FechamentoListResult; error?: string }> {
  try {
    const supabase = await createClient();
    const usuario = await getCurrentUsuario();

    if (!usuario) {
      return { error: 'Nao autenticado' };
    }

    const { pagina, pageSize } = filtros;
    const offset = (pagina - 1) * pageSize;

    // Build query
    let query = supabase
      .from('fechamento')
      .select(
        'id, motorista_id, periodo_inicio, periodo_fim, tipo, total_viagens, total_gastos, saldo_motorista, status, created_at, motorista!inner(nome, cpf)',
        { count: 'exact' },
      )
      .order('periodo_inicio', { ascending: false })
      .range(offset, offset + pageSize - 1);

    // Motorista sees only own fechamentos
    if (usuario.role === 'motorista' && usuario.motorista_id) {
      query = query.eq('motorista_id', usuario.motorista_id);
    }

    // Apply filters
    if (filtros.motorista_ids && filtros.motorista_ids.length > 0) {
      query = query.in('motorista_id', filtros.motorista_ids);
    }

    if (filtros.tipo && filtros.tipo !== 'todos') {
      query = query.eq('tipo', filtros.tipo);
    }

    if (filtros.status && filtros.status !== 'todos') {
      query = query.eq('status', filtros.status);
    }

    if (filtros.periodo_inicio) {
      query = query.gte('periodo_inicio', filtros.periodo_inicio);
    }

    if (filtros.periodo_fim) {
      query = query.lte('periodo_inicio', filtros.periodo_fim);
    }

    if (filtros.busca && filtros.busca.trim().length > 0) {
      query = query.ilike('motorista.nome', `%${filtros.busca.trim()}%`);
    }

    const { data, count, error } = await query;

    if (error) {
      return { error: `Erro ao buscar fechamentos: ${error.message}` };
    }

    const fechamentos: FechamentoListItem[] = (data ?? []).map((f) => {
      const motorista = f.motorista as unknown as { nome: string; cpf: string };
      return {
        id: f.id as string,
        motorista_nome: motorista.nome,
        motorista_cpf: motorista.cpf,
        periodo_inicio: f.periodo_inicio as string,
        periodo_fim: f.periodo_fim as string,
        tipo: f.tipo,
        total_viagens: f.total_viagens as number,
        total_gastos: f.total_gastos as number,
        saldo_motorista: f.saldo_motorista as number,
        status: f.status,
        created_at: f.created_at as string,
      };
    });

    return {
      data: {
        fechamentos,
        totalCount: count ?? 0,
      },
    };
  } catch (err) {
    return {
      error: `Erro inesperado: ${err instanceof Error ? err.message : 'Desconhecido'}`,
    };
  }
}

/**
 * Fetch financial summary indicators for dono/admin.
 * Returns totals for: pago no mes, em aberto, pendentes.
 */
export async function getResumoFinanceiro(): Promise<{
  data?: ResumoFinanceiro;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const usuario = await getCurrentUsuario();

    if (!usuario) {
      return { error: 'Nao autenticado' };
    }

    // Only dono/admin see the summary
    if (usuario.role === 'motorista') {
      return {
        data: {
          totalPagoMesCentavos: 0,
          totalEmAbertoCentavos: 0,
          qtdPendentes: 0,
        },
      };
    }

    const now = new Date();
    const mesAtualInicio = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .slice(0, 10);

    const [pagosNoMes, emAberto, pendentes] = await Promise.all([
      supabase
        .from('fechamento')
        .select('saldo_motorista')
        .eq('status', 'pago')
        .gte('periodo_inicio', mesAtualInicio),
      supabase
        .from('fechamento')
        .select('saldo_motorista')
        .eq('status', 'aberto'),
      supabase
        .from('fechamento')
        .select('id', { count: 'exact', head: true })
        .in('status', ['aberto', 'fechado']),
    ]);

    const totalPagoMesCentavos =
      pagosNoMes.data?.reduce(
        (sum: number, f: { saldo_motorista: number }) => sum + f.saldo_motorista,
        0,
      ) ?? 0;

    const totalEmAbertoCentavos =
      emAberto.data?.reduce(
        (sum: number, f: { saldo_motorista: number }) => sum + f.saldo_motorista,
        0,
      ) ?? 0;

    const qtdPendentes = pendentes.count ?? 0;

    return {
      data: {
        totalPagoMesCentavos,
        totalEmAbertoCentavos,
        qtdPendentes,
      },
    };
  } catch (err) {
    return {
      error: `Erro inesperado: ${err instanceof Error ? err.message : 'Desconhecido'}`,
    };
  }
}

/**
 * Reopen a fechamento by changing status from 'fechado' to 'aberto'.
 * Only dono/admin can reopen. Cannot reopen 'pago' fechamentos.
 */
export async function reabrirFechamento(
  id: string,
): Promise<FechamentoActionResult> {
  try {
    const supabase = await createClient();
    const usuario = await getCurrentUsuario();

    if (!usuario) {
      return { success: false, error: 'Nao autenticado' };
    }

    // Only dono/admin can reopen
    if (!['dono', 'admin'].includes(usuario.role)) {
      return {
        success: false,
        error: 'Apenas dono ou admin podem reabrir fechamentos.',
      };
    }

    // Verify current status
    const { data: fechamento } = await supabase
      .from('fechamento')
      .select('status')
      .eq('id', id)
      .single();

    if (!fechamento) {
      return { success: false, error: 'Fechamento nao encontrado.' };
    }

    if (fechamento.status === 'pago') {
      return {
        success: false,
        error: 'Fechamentos com status "pago" nao podem ser reabertos.',
      };
    }

    if (fechamento.status !== 'fechado') {
      return {
        success: false,
        error: 'Apenas fechamentos com status "fechado" podem ser reabertos.',
      };
    }

    // Atomic update
    const { error } = await supabase
      .from('fechamento')
      .update({
        status: 'aberto',
        fechado_por: null,
        fechado_em: null,
      })
      .eq('id', id);

    if (error) {
      return {
        success: false,
        error: `Erro ao reabrir fechamento: ${error.message}`,
      };
    }

    revalidatePath('/financeiro/historico');

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: `Erro inesperado: ${err instanceof Error ? err.message : 'Desconhecido'}`,
    };
  }
}

/**
 * Fetch filter options (motoristas) for the historico page.
 */
export async function fetchFechamentoFilterOptions(): Promise<{
  data?: FechamentoFilterOptions;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    const { data: motoristas, error } = await supabase
      .from('motorista')
      .select('id, nome')
      .eq('status', 'ativo')
      .order('nome');

    if (error) {
      return { error: `Erro ao buscar motoristas: ${error.message}` };
    }

    return {
      data: {
        motoristas: motoristas ?? [],
      },
    };
  } catch (err) {
    return {
      error: `Erro inesperado: ${err instanceof Error ? err.message : 'Desconhecido'}`,
    };
  }
}
