/**
 * Integration test for Tool T6 `listar_caminhoes`.
 * Story 9.2 AC-7.
 */

import { executeListarCaminhoes } from '@/lib/copilot/tools/listar-caminhoes';
import type { ToolContext } from '@/lib/copilot/tools/index';
import type { Usuario } from '@/types/usuario';

interface MockResult {
  data: unknown[] | null;
  error: { message: string } | null;
}

/**
 * Builds a thenable chainable mock that resolves to `result` whenever
 * the consumer awaits it (Supabase query builders are thenable —
 * await-ing triggers the HTTP call).
 */
function createChain(result: MockResult) {
  const chain: Record<string, unknown> = {};
  const methods = ['select', 'in', 'eq', 'order', 'or', 'limit'] as const;
  for (const m of methods) {
    chain[m] = jest.fn().mockReturnValue(chain);
  }
  (chain as { then: (cb: (v: MockResult) => unknown) => Promise<unknown> }).then = (
    cb: (v: MockResult) => unknown,
  ) => Promise.resolve(cb(result));
  return chain as {
    select: jest.Mock;
    in: jest.Mock;
    eq: jest.Mock;
    order: jest.Mock;
    or: jest.Mock;
    limit: jest.Mock;
  };
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

describe('executeListarCaminhoes', () => {
  it('returns empty list when user has no empresas', async () => {
    const supabase = { from: jest.fn() };
    const ctx: ToolContext = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase: supabase as any,
      usuario: fakeUsuario,
      empresaIds: [],
    };

    const result = await executeListarCaminhoes({}, ctx);

    expect(result.caminhoes).toEqual([]);
    expect(result.limite_aplicado).toBe(false);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('returns caminhoes filtered by empresa with proper shape', async () => {
    const chain = createChain({
      data: [
        {
          id: 'cam-1',
          placa: 'ABC1D23',
          modelo: 'Cegonha 9 carros',
          marca: 'Volvo',
          ano: 2020,
        },
        {
          id: 'cam-2',
          placa: 'XYZ9K87',
          modelo: 'Cegonha 11 carros',
          marca: 'Scania',
          ano: 2022,
        },
      ],
      error: null,
    });
    const supabase = { from: jest.fn().mockReturnValue(chain) };

    const ctx: ToolContext = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase: supabase as any,
      usuario: fakeUsuario,
      empresaIds: ['emp-1'],
    };

    const result = await executeListarCaminhoes({}, ctx);

    expect(supabase.from).toHaveBeenCalledWith('caminhao');
    expect(chain.in).toHaveBeenCalledWith('empresa_id', ['emp-1']);
    expect(chain.eq).toHaveBeenCalledWith('ativo', true);
    expect(result.caminhoes).toHaveLength(2);
    expect(result.caminhoes[0].placa).toBe('ABC1D23');
    expect(result.caminhoes[1].marca).toBe('Scania');
  });

  it('applies ilike OR filter when busca is provided', async () => {
    const chain = createChain({ data: [], error: null });
    const supabase = { from: jest.fn().mockReturnValue(chain) };

    const ctx: ToolContext = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase: supabase as any,
      usuario: fakeUsuario,
      empresaIds: ['emp-1'],
    };

    await executeListarCaminhoes({ busca: 'ABC' }, ctx);

    expect(chain.or).toHaveBeenCalledWith(
      'placa.ilike.%ABC%,modelo.ilike.%ABC%',
    );
  });

  it('does not apply filter when busca is whitespace only', async () => {
    const chain = createChain({ data: [], error: null });
    const supabase = { from: jest.fn().mockReturnValue(chain) };

    const ctx: ToolContext = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase: supabase as any,
      usuario: fakeUsuario,
      empresaIds: ['emp-1'],
    };

    await executeListarCaminhoes({ busca: '   ' }, ctx);

    expect(chain.or).not.toHaveBeenCalled();
  });

  it('throws ToolExecutionError on supabase error', async () => {
    const chain = createChain({
      data: null,
      error: { message: 'connection lost' },
    });
    const supabase = { from: jest.fn().mockReturnValue(chain) };

    const ctx: ToolContext = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase: supabase as any,
      usuario: fakeUsuario,
      empresaIds: ['emp-1'],
    };

    await expect(executeListarCaminhoes({}, ctx)).rejects.toThrow(
      /listar_caminhoes/,
    );
  });
});
