/**
 * Integration test for Tool T5 `resumo_desempenho_periodo`.
 * Story 9.4 AC-6.
 */

import { executeResumoDesempenhoPeriodo } from '@/lib/copilot/tools/resumo-desempenho-periodo';
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
    valor_total: number;
    custo_total: number;
    status: string;
  }>;
  gastos: Array<{ valor: number; categoria_id: string | null }>;
  categorias: Array<{ id: string; nome: string }>;
}) {
  const viagemChain = createChain({ data: options.viagens, error: null });
  const gastoChain = createChain({ data: options.gastos, error: null });
  const categoriaChain = createChain({ data: options.categorias, error: null });

  const from = jest.fn((table: string) => {
    if (table === 'viagem') return viagemChain;
    if (table === 'gasto') return gastoChain;
    if (table === 'categoria_gasto') return categoriaChain;
    throw new Error(`unexpected: ${table}`);
  });
  return { supabase: { from }, viagemChain, gastoChain };
}

describe('executeResumoDesempenhoPeriodo', () => {
  it('returns empty when user has no empresas', async () => {
    const supabase = { from: jest.fn() };
    const result = await executeResumoDesempenhoPeriodo(
      { periodo: 'este mes' },
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        supabase: supabase as any,
        usuario: fakeUsuario,
        empresaIds: [],
      },
    );
    expect(result.qtd_viagens).toBe(0);
    expect(result.lucro_centavos).toBe(0);
    expect(result.melhor_viagem).toBeNull();
    expect(result.pior_viagem).toBeNull();
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('returns zeros when no data in period', async () => {
    const { supabase } = buildSupabase({
      viagens: [],
      gastos: [],
      categorias: [],
    });

    const result = await executeResumoDesempenhoPeriodo(
      { periodo: 'este mes' },
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        supabase: supabase as any,
        usuario: fakeUsuario,
        empresaIds: ['emp-1'],
      },
    );

    expect(result.qtd_viagens).toBe(0);
    expect(result.receita_total_centavos).toBe(0);
    expect(result.gasto_total_centavos).toBe(0);
    expect(result.lucro_centavos).toBe(0);
    expect(result.top_3_categorias).toEqual([]);
    expect(result.melhor_viagem).toBeNull();
    expect(result.pior_viagem).toBeNull();
  });

  it('aggregates viagens and gastos correctly', async () => {
    const { supabase, viagemChain } = buildSupabase({
      viagens: [
        {
          id: 'v1',
          origem: 'SP',
          destino: 'RJ',
          valor_total: 100_000,
          custo_total: 60_000,
          status: 'concluida',
        },
        {
          id: 'v2',
          origem: 'RJ',
          destino: 'MG',
          valor_total: 200_000,
          custo_total: 180_000,
          status: 'concluida',
        },
      ],
      gastos: [
        { valor: 30_000, categoria_id: 'cat1' },
        { valor: 20_000, categoria_id: 'cat1' },
        { valor: 10_000, categoria_id: 'cat2' },
      ],
      categorias: [
        { id: 'cat1', nome: 'Combustivel' },
        { id: 'cat2', nome: 'Pedagio' },
      ],
    });

    const ctx: ToolContext = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase: supabase as any,
      usuario: fakeUsuario,
      empresaIds: ['emp-1'],
    };

    const result = await executeResumoDesempenhoPeriodo(
      { periodo: 'este mes' },
      ctx,
    );

    expect(result.qtd_viagens).toBe(2);
    expect(result.receita_total_centavos).toBe(300_000);
    expect(result.gasto_total_centavos).toBe(60_000);
    expect(result.lucro_centavos).toBe(240_000);

    // Top 3 categorias (sorted by total desc)
    expect(result.top_3_categorias).toHaveLength(2);
    expect(result.top_3_categorias[0].nome).toBe('Combustivel');
    expect(result.top_3_categorias[0].total_centavos).toBe(50_000);
    expect(result.top_3_categorias[1].nome).toBe('Pedagio');
    expect(result.top_3_categorias[1].total_centavos).toBe(10_000);

    // Best viagem by valor_total: v2 (200k) > v1 (100k)
    expect(result.melhor_viagem).not.toBeNull();
    expect(result.melhor_viagem!.id).toBe('v2');

    // Worst viagem by valor_total: v1 (100k) < v2 (200k)
    expect(result.pior_viagem).not.toBeNull();
    expect(result.pior_viagem!.id).toBe('v1');

    // Excludes canceled
    expect(viagemChain.neq).toHaveBeenCalledWith('status', 'cancelada');
  });

  it('handles gastos without categoria', async () => {
    const { supabase } = buildSupabase({
      viagens: [],
      gastos: [{ valor: 15_000, categoria_id: null }],
      categorias: [],
    });

    const result = await executeResumoDesempenhoPeriodo(
      { periodo: 'este mes' },
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        supabase: supabase as any,
        usuario: fakeUsuario,
        empresaIds: ['emp-1'],
      },
    );

    expect(result.gasto_total_centavos).toBe(15_000);
    expect(result.top_3_categorias[0].nome).toBe('Sem categoria');
  });

  it('caps top_3_categorias to 3 entries', async () => {
    const { supabase } = buildSupabase({
      viagens: [
        {
          id: 'v1',
          origem: 'A',
          destino: 'B',
          valor_total: 100_000,
          custo_total: 50_000,
          status: 'concluida',
        },
      ],
      gastos: [
        { valor: 40_000, categoria_id: 'c1' },
        { valor: 30_000, categoria_id: 'c2' },
        { valor: 20_000, categoria_id: 'c3' },
        { valor: 10_000, categoria_id: 'c4' },
      ],
      categorias: [
        { id: 'c1', nome: 'Combustivel' },
        { id: 'c2', nome: 'Pedagio' },
        { id: 'c3', nome: 'Manutencao' },
        { id: 'c4', nome: 'Seguro' },
      ],
    });

    const result = await executeResumoDesempenhoPeriodo(
      { periodo: 'este mes' },
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        supabase: supabase as any,
        usuario: fakeUsuario,
        empresaIds: ['emp-1'],
      },
    );

    expect(result.top_3_categorias).toHaveLength(3);
    expect(result.top_3_categorias[0].nome).toBe('Combustivel');
  });
});
