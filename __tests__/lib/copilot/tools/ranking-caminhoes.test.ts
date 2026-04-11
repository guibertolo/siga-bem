/**
 * Integration test for Tool T2 `ranking_caminhoes_por_lucro`.
 * Story 9.3 AC-6.
 */

import { executeRankingCaminhoesPorLucro } from '@/lib/copilot/tools/ranking-caminhoes-por-lucro';
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
    caminhao_id: string | null;
    valor_frete_centavos: number;
    status: string;
  }>;
  gastos: Array<{ caminhao_id: string | null; valor: number }>;
  caminhoes: Array<{ id: string; placa: string; modelo: string }>;
}) {
  const viagemChain = createChain({ data: options.viagens, error: null });
  const gastoChain = createChain({ data: options.gastos, error: null });
  const caminhaoChain = createChain({ data: options.caminhoes, error: null });

  const from = jest.fn((table: string) => {
    if (table === 'viagem') return viagemChain;
    if (table === 'gasto') return gastoChain;
    if (table === 'caminhao') return caminhaoChain;
    throw new Error(`unexpected: ${table}`);
  });
  return { supabase: { from }, viagemChain, gastoChain, caminhaoChain };
}

describe('executeRankingCaminhoesPorLucro', () => {
  it('returns empty when user has no empresas', async () => {
    const supabase = { from: jest.fn() };
    const result = await executeRankingCaminhoesPorLucro(
      { periodo: 'este mes' },
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        supabase: supabase as any,
        usuario: fakeUsuario,
        empresaIds: [],
      },
    );
    expect(result.caminhoes).toEqual([]);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('ranks caminhoes by lucro ascending by default (prejuizo first)', async () => {
    const { supabase, viagemChain } = buildSupabase({
      viagens: [
        { caminhao_id: 'c1', valor_frete_centavos: 100_000, status: 'concluida' },
        { caminhao_id: 'c1', valor_frete_centavos: 50_000, status: 'concluida' },
        { caminhao_id: 'c2', valor_frete_centavos: 200_000, status: 'concluida' },
      ],
      gastos: [
        { caminhao_id: 'c1', valor: 80_000 },
        { caminhao_id: 'c2', valor: 50_000 },
      ],
      caminhoes: [
        { id: 'c1', placa: 'AAA1A11', modelo: 'V1' },
        { id: 'c2', placa: 'BBB2B22', modelo: 'V2' },
      ],
    });

    const ctx: ToolContext = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase: supabase as any,
      usuario: fakeUsuario,
      empresaIds: ['emp-1'],
    };

    const result = await executeRankingCaminhoesPorLucro(
      { periodo: 'este mes' },
      ctx,
    );

    expect(result.ordem).toBe('crescente');
    expect(result.caminhoes).toHaveLength(2);
    // c1: receita 150k - gasto 80k = lucro 70k (qtd 2)
    // c2: receita 200k - gasto 50k = lucro 150k (qtd 1)
    // crescente => c1 primeiro
    expect(result.caminhoes[0].id).toBe('c1');
    expect(result.caminhoes[0].receita_centavos).toBe(150_000);
    expect(result.caminhoes[0].gasto_centavos).toBe(80_000);
    expect(result.caminhoes[0].lucro_centavos).toBe(70_000);
    expect(result.caminhoes[0].qtd_viagens).toBe(2);
    expect(result.caminhoes[1].id).toBe('c2');
    expect(result.caminhoes[1].lucro_centavos).toBe(150_000);

    // excludes canceled trips — we called .neq('status', 'cancelada') on viagem
    expect(viagemChain.neq).toHaveBeenCalledWith('status', 'cancelada');
  });

  it('sorts decrescente when requested', async () => {
    const { supabase } = buildSupabase({
      viagens: [
        { caminhao_id: 'c1', valor_frete_centavos: 100_000, status: 'concluida' },
        { caminhao_id: 'c2', valor_frete_centavos: 200_000, status: 'concluida' },
      ],
      gastos: [
        { caminhao_id: 'c1', valor: 80_000 },
        { caminhao_id: 'c2', valor: 50_000 },
      ],
      caminhoes: [
        { id: 'c1', placa: 'AAA', modelo: 'V1' },
        { id: 'c2', placa: 'BBB', modelo: 'V2' },
      ],
    });

    const result = await executeRankingCaminhoesPorLucro(
      { periodo: 'este mes', ordem: 'decrescente' },
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        supabase: supabase as any,
        usuario: fakeUsuario,
        empresaIds: ['emp-1'],
      },
    );

    expect(result.ordem).toBe('decrescente');
    expect(result.caminhoes[0].id).toBe('c2');
  });

  it('respects top_n limit', async () => {
    const { supabase } = buildSupabase({
      viagens: Array.from({ length: 10 }, (_, i) => ({
        caminhao_id: `c${i}`,
        valor_frete_centavos: (i + 1) * 10_000,
        status: 'concluida',
      })),
      gastos: [],
      caminhoes: Array.from({ length: 10 }, (_, i) => ({
        id: `c${i}`,
        placa: `P${i}`,
        modelo: `M${i}`,
      })),
    });

    const result = await executeRankingCaminhoesPorLucro(
      { periodo: 'este mes', top_n: 3 },
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        supabase: supabase as any,
        usuario: fakeUsuario,
        empresaIds: ['emp-1'],
      },
    );

    expect(result.caminhoes).toHaveLength(3);
  });

  it('includes caminhao with only gastos and no viagens', async () => {
    const { supabase } = buildSupabase({
      viagens: [],
      gastos: [{ caminhao_id: 'c1', valor: 50_000 }],
      caminhoes: [{ id: 'c1', placa: 'AAA', modelo: 'V1' }],
    });

    const result = await executeRankingCaminhoesPorLucro(
      { periodo: 'este mes' },
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        supabase: supabase as any,
        usuario: fakeUsuario,
        empresaIds: ['emp-1'],
      },
    );

    expect(result.caminhoes).toHaveLength(1);
    expect(result.caminhoes[0].receita_centavos).toBe(0);
    expect(result.caminhoes[0].lucro_centavos).toBe(-50_000);
  });
});
