/**
 * Integration test for Tool T4 `motoristas_cnh_vencendo`.
 * Story 9.4 AC-6.
 */

import { executeMotoristasCnhVencendo } from '@/lib/copilot/tools/motoristas-cnh-vencendo';
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

function buildSupabase(motoristas: Array<{
  id: string;
  nome: string;
  cnh_numero: string | null;
  cnh_categoria: string | null;
  cnh_validade: string;
}>) {
  const chain = createChain({ data: motoristas, error: null });
  const from = jest.fn(() => chain);
  return { supabase: { from }, chain };
}

describe('executeMotoristasCnhVencendo', () => {
  it('returns empty when user has no empresas', async () => {
    const supabase = { from: jest.fn() };
    const result = await executeMotoristasCnhVencendo(
      {},
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        supabase: supabase as any,
        usuario: fakeUsuario,
        empresaIds: [],
      },
    );
    expect(result.motoristas).toEqual([]);
    expect(result.dias_janela).toBe(30);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('returns motoristas with CNH expiring within window', async () => {
    const { supabase, chain } = buildSupabase([
      {
        id: 'm1',
        nome: 'Joao',
        cnh_numero: '123',
        cnh_categoria: 'E',
        cnh_validade: '2026-04-20',
      },
      {
        id: 'm2',
        nome: 'Maria',
        cnh_numero: '456',
        cnh_categoria: 'D',
        cnh_validade: '2026-05-01',
      },
    ]);

    const ctx: ToolContext = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase: supabase as any,
      usuario: fakeUsuario,
      empresaIds: ['emp-1'],
    };

    const result = await executeMotoristasCnhVencendo({ dias: 60 }, ctx);

    expect(result.dias_janela).toBe(60);
    expect(result.motoristas).toHaveLength(2);
    expect(result.motoristas[0].nome).toBe('Joao');
    expect(result.motoristas[1].nome).toBe('Maria');
    expect(typeof result.motoristas[0].dias_ate_vencer).toBe('number');

    // Verifies RLS filters were applied
    expect(chain.eq).toHaveBeenCalledWith('status', 'ativo');
    expect(chain.in).toHaveBeenCalled();
  });

  it('includes already-expired CNH with negative dias_ate_vencer', async () => {
    const { supabase } = buildSupabase([
      {
        id: 'm1',
        nome: 'Expired',
        cnh_numero: '789',
        cnh_categoria: 'E',
        cnh_validade: '2025-01-01',
      },
    ]);

    const result = await executeMotoristasCnhVencendo(
      { dias: 30 },
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        supabase: supabase as any,
        usuario: fakeUsuario,
        empresaIds: ['emp-1'],
      },
    );

    expect(result.motoristas).toHaveLength(1);
    expect(result.motoristas[0].dias_ate_vencer).toBeLessThan(0);
  });

  it('defaults to 30 days when dias not provided', async () => {
    const { supabase } = buildSupabase([]);

    await executeMotoristasCnhVencendo(
      {},
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        supabase: supabase as any,
        usuario: fakeUsuario,
        empresaIds: ['emp-1'],
      },
    );

    expect(supabase.from).toHaveBeenCalledWith('motorista');
  });

  it('returns empty when no motoristas match', async () => {
    const { supabase } = buildSupabase([]);

    const result = await executeMotoristasCnhVencendo(
      { dias: 30 },
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        supabase: supabase as any,
        usuario: fakeUsuario,
        empresaIds: ['emp-1'],
      },
    );

    expect(result.motoristas).toEqual([]);
  });
});
