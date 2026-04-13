/**
 * Integration test for Tool T3 `ranking_viagens_por_margem`.
 * Story 9.3 AC-6.
 */

import { executeRankingViagensPorMargem } from '@/lib/copilot/tools/ranking-viagens-por-margem';
import type { ToolContext } from '@/lib/copilot/tools/index';
import type { Usuario } from '@/types/usuario';

import { createChain } from './__helpers__/mock-supabase';

const fakeUsuario: Usuario = {
  id: 'user-1',
  auth_id: 'auth-1',
  empresa_id: 'emp-1',
  motorista_id: null,
  nome: 'Test',
  email: 't@example.com',
  telefone: null,
  role: 'dono',
  ativo: true,
  ultima_empresa_id: null,
  selected_empresas: null,
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
};

function buildSupabase(options: {
  viagens: Array<{
    id: string;
    origem: string;
    destino: string;
    data_saida: string;
    valor_total: number;
    motorista_id?: string | null;
    caminhao_id?: string | null;
    status: string;
  }>;
  viagensCount?: number;
  gastos: Array<{ viagem_id: string | null; valor: number }>;
}) {
  const viagemChain = createChain({
    data: options.viagens,
    error: null,
    count: options.viagensCount ?? options.viagens.length,
  });
  const gastoChain = createChain({ data: options.gastos, error: null });
  const motoristaChain = createChain({ data: [], error: null });
  const caminhaoChain = createChain({ data: [], error: null });

  const from = jest.fn((table: string) => {
    if (table === 'viagem') return viagemChain;
    if (table === 'gasto') return gastoChain;
    if (table === 'motorista') return motoristaChain;
    if (table === 'caminhao') return caminhaoChain;
    throw new Error(`unexpected: ${table}`);
  });
  return { supabase: { from }, viagemChain, gastoChain };
}

describe('executeRankingViagensPorMargem', () => {
  it('returns empty when user has no empresas', async () => {
    const supabase = { from: jest.fn() };
    const result = await executeRankingViagensPorMargem(
      { periodo: 'este mes' },
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        supabase: supabase as any,
        usuario: fakeUsuario,
        empresaIds: [],
      },
    );
    expect(result.viagens).toEqual([]);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('ranks viagens by margem ascending by default (pior margem primeiro)', async () => {
    const { supabase, viagemChain } = buildSupabase({
      viagens: [
        {
          id: 'v1',
          origem: 'SP',
          destino: 'RJ',
          data_saida: '2026-04-01',
          valor_total: 100_000,
          status: 'concluida',
        },
        {
          id: 'v2',
          origem: 'SP',
          destino: 'BH',
          data_saida: '2026-04-05',
          valor_total: 200_000,
          status: 'concluida',
        },
      ],
      gastos: [
        // v1: 80k gastos => margem 20%
        { viagem_id: 'v1', valor: 50_000 },
        { viagem_id: 'v1', valor: 30_000 },
        // v2: 40k gastos => margem 80%
        { viagem_id: 'v2', valor: 40_000 },
      ],
    });

    const ctx: ToolContext = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase: supabase as any,
      usuario: fakeUsuario,
      empresaIds: ['emp-1'],
    };

    const result = await executeRankingViagensPorMargem(
      { periodo: 'este mes' },
      ctx,
    );

    expect(result.ordem).toBe('crescente');
    expect(result.viagens).toHaveLength(2);
    expect(result.viagens[0].id).toBe('v1');
    expect(result.viagens[0].gasto_total_centavos).toBe(80_000);
    expect(result.viagens[0].lucro_centavos).toBe(20_000);
    expect(result.viagens[0].margem_percentual).toBe(20);
    expect(result.viagens[1].id).toBe('v2');
    expect(result.viagens[1].margem_percentual).toBe(80);

    // excludes canceled + zero-frete at the SQL layer
    expect(viagemChain.neq).toHaveBeenCalledWith('status', 'cancelada');
    expect(viagemChain.gt).toHaveBeenCalledWith('valor_total', 0);
  });

  it('sorts decrescente when requested', async () => {
    const { supabase } = buildSupabase({
      viagens: [
        {
          id: 'v1',
          origem: 'SP',
          destino: 'RJ',
          data_saida: '2026-04-01',
          valor_total: 100_000,
          status: 'concluida',
        },
        {
          id: 'v2',
          origem: 'SP',
          destino: 'BH',
          data_saida: '2026-04-05',
          valor_total: 100_000,
          status: 'concluida',
        },
      ],
      gastos: [
        { viagem_id: 'v1', valor: 50_000 }, // margem 50
        { viagem_id: 'v2', valor: 10_000 }, // margem 90
      ],
    });

    const result = await executeRankingViagensPorMargem(
      { periodo: 'este mes', ordem: 'decrescente', top_n: 5 },
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        supabase: supabase as any,
        usuario: fakeUsuario,
        empresaIds: ['emp-1'],
      },
    );

    expect(result.viagens[0].id).toBe('v2');
    expect(result.viagens[0].margem_percentual).toBe(90);
  });

  it('handles negative margem (viagem prejuizo)', async () => {
    const { supabase } = buildSupabase({
      viagens: [
        {
          id: 'v1',
          origem: 'SP',
          destino: 'BSB',
          data_saida: '2026-04-03',
          valor_total: 100_000,
          status: 'concluida',
        },
      ],
      gastos: [{ viagem_id: 'v1', valor: 150_000 }],
    });

    const result = await executeRankingViagensPorMargem(
      { periodo: 'este mes' },
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        supabase: supabase as any,
        usuario: fakeUsuario,
        empresaIds: ['emp-1'],
      },
    );

    expect(result.viagens[0].lucro_centavos).toBe(-50_000);
    expect(result.viagens[0].margem_percentual).toBe(-50);
  });

  it('flags limite_carregamento_atingido when count > cap', async () => {
    const { supabase } = buildSupabase({
      viagens: [
        {
          id: 'v1',
          origem: 'SP',
          destino: 'RJ',
          data_saida: '2026-04-01',
          valor_total: 100_000,
          status: 'concluida',
        },
      ],
      viagensCount: 9999,
      gastos: [],
    });

    const result = await executeRankingViagensPorMargem(
      { periodo: 'este mes' },
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        supabase: supabase as any,
        usuario: fakeUsuario,
        empresaIds: ['emp-1'],
      },
    );

    expect(result.limite_carregamento_atingido).toBe(true);
  });
});
