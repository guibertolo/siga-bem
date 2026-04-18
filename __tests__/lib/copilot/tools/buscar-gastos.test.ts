/**
 * Integration test for Tool T1 `buscar_gastos_por_periodo`.
 * Story 9.2 AC-6. Uses a thenable-chainable Supabase mock.
 */

import { executeBuscarGastosPorPeriodo } from '@/lib/copilot/tools/buscar-gastos-por-periodo';
import type { ToolContext } from '@/lib/copilot/tools/index';
import type { Usuario } from '@/types/usuario';

interface MockResult {
  data: unknown[] | null;
  error: { message: string } | null;
  count?: number;
}

/**
 * Thenable chainable mock — every known builder method returns the chain,
 * and awaiting the chain resolves to the configured `result`.
 */
function createChain(result: MockResult) {
  const chain: Record<string, unknown> = {};
  const methods = ['select', 'in', 'gte', 'lte', 'eq', 'order', 'limit'] as const;
  for (const m of methods) {
    chain[m] = jest.fn().mockReturnValue(chain);
  }
  (chain as { then: (cb: (v: MockResult) => unknown) => Promise<unknown> }).then = (
    cb: (v: MockResult) => unknown,
  ) => Promise.resolve(cb(result));
  return chain as {
    select: jest.Mock;
    in: jest.Mock;
    gte: jest.Mock;
    lte: jest.Mock;
    eq: jest.Mock;
    order: jest.Mock;
    limit: jest.Mock;
  };
}

interface SupabaseCallState {
  categoriaChain: ReturnType<typeof createChain>;
  aggChain: ReturnType<typeof createChain>;
  detailChain: ReturnType<typeof createChain>;
  fromCalls: string[];
}

function createSupabaseMock(options: {
  categorias: Array<{ id: string; nome: string }>;
  aggRows: Array<{ valor: number; categoria_id: string | null }>;
  aggCount: number;
  detailRows: Array<{
    id: string;
    data: string;
    valor: number;
    descricao: string | null;
    categoria_id: string | null;
    caminhao: { placa: string | null } | null;
    motorista: { nome: string | null } | null;
  }>;
}): { supabase: { from: jest.Mock }; state: SupabaseCallState } {
  const categoriaChain = createChain({
    data: options.categorias,
    error: null,
  });
  const aggChain = createChain({
    data: options.aggRows,
    error: null,
    count: options.aggCount,
  });
  const detailChain = createChain({
    data: options.detailRows,
    error: null,
  });

  const state: SupabaseCallState = {
    categoriaChain,
    aggChain,
    detailChain,
    fromCalls: [],
  };

  let gastoFromIndex = 0;

  const from = jest.fn((table: string) => {
    state.fromCalls.push(table);
    if (table === 'categoria_gasto') {
      return categoriaChain;
    }
    if (table === 'gasto') {
      gastoFromIndex += 1;
      return gastoFromIndex === 1 ? aggChain : detailChain;
    }
    throw new Error(`unexpected table in mock: ${table}`);
  });

  return { supabase: { from }, state };
}

const fakeUsuario: Usuario = {
  id: 'user-1',
  auth_id: 'auth-1',
  empresa_id: 'emp-1',
  motorista_id: null,
  nome: 'Test User',
  email: 'test@example.com',
  telefone: null,
  role: 'dono',
  ativo: true,
  ultima_empresa_id: null,
  selected_empresas: null,
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
};

describe('executeBuscarGastosPorPeriodo', () => {
  it('returns empty result when user has no empresas', async () => {
    const { supabase } = createSupabaseMock({
      categorias: [],
      aggRows: [],
      aggCount: 0,
      detailRows: [],
    });

    const ctx: ToolContext = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase: supabase as any,
      usuario: fakeUsuario,
      empresaIds: [],
    };

    const result = await executeBuscarGastosPorPeriodo(
      { periodo: 'este mes' },
      ctx,
    );

    expect(result.total_centavos).toBe(0);
    expect(result.qtd_gastos).toBe(0);
    expect(result.gastos).toEqual([]);
    expect(result.subtotais_por_categoria).toEqual([]);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('aggregates centavos and builds subtotals by category', async () => {
    const { supabase, state } = createSupabaseMock({
      categorias: [
        { id: 'cat-comb', nome: 'Combustivel' },
        { id: 'cat-ped', nome: 'Pedagio' },
      ],
      aggRows: [
        { valor: 15000, categoria_id: 'cat-comb' },
        { valor: 25000, categoria_id: 'cat-comb' },
        { valor: 3000, categoria_id: 'cat-ped' },
      ],
      aggCount: 3,
      detailRows: [
        {
          id: 'g1',
          data: '2026-04-05',
          valor: 25000,
          descricao: 'Abastecimento',
          categoria_id: 'cat-comb',
          caminhao: { placa: 'ABC1D23' },
          motorista: { nome: 'Joao' },
        },
      ],
    });

    const ctx: ToolContext = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase: supabase as any,
      usuario: fakeUsuario,
      empresaIds: ['emp-1'],
    };

    const result = await executeBuscarGastosPorPeriodo(
      { periodo: 'este mes' },
      ctx,
    );

    expect(state.fromCalls).toEqual(['categoria_gasto', 'gasto', 'gasto']);
    expect(state.aggChain.in).toHaveBeenCalledWith('empresa_id', ['emp-1']);
    expect(result.total_centavos).toBe(43000);
    expect(result.qtd_gastos).toBe(3);
    expect(result.subtotais_por_categoria[0]).toEqual({
      categoria: 'Combustivel',
      total_centavos: 40000,
      qtd_gastos: 2,
    });
    expect(result.subtotais_por_categoria[1]).toEqual({
      categoria: 'Pedagio',
      total_centavos: 3000,
      qtd_gastos: 1,
    });
    expect(result.gastos).toHaveLength(1);
    expect(result.gastos[0].valor_centavos).toBe(25000);
    expect(result.gastos[0].categoria).toBe('Combustivel');
    expect(result.gastos[0].caminhao_placa).toBe('ABC1D23');
    expect(result.limite_aplicado).toBe(false);
  });

  it('flags limite_aplicado when qtd > MAX_TOOL_ROWS', async () => {
    const { supabase } = createSupabaseMock({
      categorias: [{ id: 'cat-comb', nome: 'Combustivel' }],
      aggRows: Array.from({ length: 75 }, () => ({
        valor: 100,
        categoria_id: 'cat-comb',
      })),
      aggCount: 75,
      detailRows: [],
    });

    const ctx: ToolContext = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase: supabase as any,
      usuario: fakeUsuario,
      empresaIds: ['emp-1'],
    };

    const result = await executeBuscarGastosPorPeriodo(
      { periodo: 'este mes' },
      ctx,
    );

    expect(result.qtd_gastos).toBe(75);
    expect(result.limite_aplicado).toBe(true);
  });

  it('filters by categoria name when provided', async () => {
    const { supabase, state } = createSupabaseMock({
      categorias: [
        { id: 'cat-comb', nome: 'Combustivel' },
        { id: 'cat-ped', nome: 'Pedagio' },
      ],
      aggRows: [{ valor: 15000, categoria_id: 'cat-comb' }],
      aggCount: 1,
      detailRows: [],
    });

    const ctx: ToolContext = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase: supabase as any,
      usuario: fakeUsuario,
      empresaIds: ['emp-1'],
    };

    await executeBuscarGastosPorPeriodo(
      { periodo: 'este mes', categoria: 'combustivel' },
      ctx,
    );

    // aggChain.eq should have been called with categoria_id = cat-comb
    expect(state.aggChain.eq).toHaveBeenCalledWith('categoria_id', 'cat-comb');
    expect(state.detailChain.eq).toHaveBeenCalledWith(
      'categoria_id',
      'cat-comb',
    );
  });
});
