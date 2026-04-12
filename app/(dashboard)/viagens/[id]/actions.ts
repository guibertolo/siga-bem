'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { singleRelation } from '@/lib/utils/supabase-types';
import { getCurrentUsuario } from '@/lib/auth/get-user-role';
import {
  getAbastecimentosPorViagem,
  type AbastecimentoItem,
  type AbastecimentoListResult,
} from '@/lib/queries/combustivel-queries';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const UF_LIST = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const;

type TipoCombustivel = 'diesel_s10' | 'diesel_comum';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const abastecimentoSchema = z.object({
  viagem_id: z.string().uuid('Viagem inválida'),
  litros: z.number()
    .gt(0, 'Litros deve ser maior que zero')
    .lte(9999.999, 'Litros deve ser no máximo 9.999,999'),
  valor_centavos: z.number()
    .int('Valor deve ser inteiro em centavos')
    .gt(0, 'Valor deve ser maior que zero'),
  uf_abastecimento: z.string()
    .length(2, 'UF deve ter 2 letras')
    .refine((val) => (UF_LIST as readonly string[]).includes(val), 'UF inválida'),
  tipo_combustivel: z.enum(['diesel_s10', 'diesel_comum']).default('diesel_s10'),
  posto_local: z.string().max(200, 'Posto deve ter no máximo 200 caracteres').optional().nullable(),
  km_odometro: z.number().int().positive().optional().nullable(),
  observacao: z.string().max(500, 'Observação deve ter no máximo 500 caracteres').optional().nullable(),
  data: z.string().min(1, 'Data é obrigatória'),
});

export type AbastecimentoInput = z.infer<typeof abastecimentoSchema>;

export interface AbastecimentoResult {
  success: boolean;
  gastoId?: string;
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
}

// ---------------------------------------------------------------------------
// Server Action
// ---------------------------------------------------------------------------

/**
 * Create a fuel expense (abastecimento) inside an active trip.
 * Story 5.2 — AC 8, 10, 11
 *
 * Inserts a single row into `gasto` with fuel-specific columns
 * (litros, tipo_combustivel, posto_local, uf_abastecimento).
 * Category is always "Combustivel" (looked up by name, never hardcoded UUID).
 */
export async function createAbastecimento(
  input: AbastecimentoInput,
): Promise<AbastecimentoResult> {
  // 1. Auth check
  const usuario = await getCurrentUsuario();
  if (!usuario) {
    return { success: false, error: 'Não autenticado' };
  }
  if (!usuario.ativo) {
    return { success: false, error: 'Usuário desativado' };
  }

  // 2. Validate input
  const parsed = abastecimentoSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<string, string>> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as string;
      if (!fieldErrors[field]) {
        fieldErrors[field] = issue.message;
      }
    }
    return { success: false, fieldErrors };
  }

  const data = parsed.data;
  const supabase = await createClient();

  // 3. Fetch viagem to get motorista_id, caminhao_id, km_saida, and status
  const { data: viagem, error: viagemError } = await supabase
    .from('viagem')
    .select('id, motorista_id, caminhao_id, km_saida, status')
    .eq('id', data.viagem_id)
    .single();

  if (viagemError || !viagem) {
    return { success: false, error: 'Viagem não encontrada' };
  }

  if (viagem.status !== 'em_andamento') {
    return { success: false, error: 'Abastecimento so pode ser registrado em viagem em andamento' };
  }

  // 4. Validate odometer against km_saida (AC 10)
  if (data.km_odometro != null && viagem.km_saida != null) {
    if (data.km_odometro < viagem.km_saida) {
      return {
        success: false,
        fieldErrors: {
          km_odometro: `Odômetro deve ser maior ou igual ao KM de saída (${viagem.km_saida.toLocaleString('pt-BR')} km)`,
        },
      };
    }
  }

  // 5. Fetch categoria "Combustivel" by name (NOT hardcoded UUID)
  const { data: categoria, error: catError } = await supabase
    .from('categoria_gasto')
    .select('id')
    .eq('nome', 'Combustivel')
    .single();

  if (catError || !categoria) {
    return { success: false, error: 'Categoria "Combustível" não encontrada. Verifique as categorias cadastradas.' };
  }

  // 6. For motorista role, enforce motorista_id from viagem
  // (motorista can only register on trips where they are the driver)
  if (usuario.role === 'motorista') {
    if (!usuario.motorista_id || viagem.motorista_id !== usuario.motorista_id) {
      return { success: false, error: 'Permissão insuficiente: você não é o motorista desta viagem' };
    }
  }

  // 7. INSERT into gasto with fuel columns
  const { data: gasto, error: insertError } = await supabase
    .from('gasto')
    .insert({
      empresa_id: usuario.empresa_id,
      categoria_id: categoria.id,
      motorista_id: viagem.motorista_id,
      caminhao_id: viagem.caminhao_id,
      viagem_id: viagem.id,
      valor: data.valor_centavos,
      data: data.data,
      km_registro: data.km_odometro ?? null,
      descricao: data.observacao ?? null,
      litros: data.litros,
      tipo_combustivel: data.tipo_combustivel as TipoCombustivel,
      posto_local: data.posto_local ?? null,
      uf_abastecimento: data.uf_abastecimento,
      created_by: usuario.id,
    })
    .select('id')
    .single();

  if (insertError || !gasto) {
    return { success: false, error: 'Erro ao registrar abastecimento. Tente novamente.' };
  }

  // 8. Revalidate paths
  revalidatePath(`/viagens/${viagem.id}`);
  revalidatePath('/viagens');
  revalidatePath('/gastos');
  revalidatePath('/dashboard');

  return { success: true, gastoId: gasto.id };
}

// ---------------------------------------------------------------------------
// Query: List fuel expenses for a trip (Story 5.3)
// ---------------------------------------------------------------------------

export { type AbastecimentoItem };

/**
 * Fetch all fuel expenses (abastecimentos) for a given trip.
 * Story 5.3 — AC 4, 7, 8, 11
 *
 * Delegates to combustivel-queries module. RLS handles role-based filtering.
 */
export async function getAbastecimentosForViagem(
  viagemId: string,
): Promise<AbastecimentoListResult> {
  const usuario = await getCurrentUsuario();
  if (!usuario) {
    return { data: [], error: 'Não autenticado' };
  }

  const supabase = await createClient();
  return getAbastecimentosPorViagem(supabase, viagemId);
}

// ---------------------------------------------------------------------------
// Query: List non-fuel gastos for a trip
// ---------------------------------------------------------------------------

export interface GastoViagemItem {
  id: string;
  data: string;
  created_at: string;
  valor: number; // centavos
  descricao: string | null;
  foto_url: string | null;
  foto_signed_url: string | null;
  categoria_nome: string;
  categoria_icone: string | null;
  categoria_cor: string | null;
}

export interface GastoViagemListResult {
  data: GastoViagemItem[];
  totalCentavos: number;
  error: string | null;
}

/**
 * Fetch all non-fuel gastos linked to a viagem.
 * Returns gastos with category info, ordered by date desc.
 * Fuel expenses (Combustivel) are excluded — shown in AbastecimentoList.
 */
export async function getGastosPorViagem(
  viagemId: string,
): Promise<GastoViagemListResult> {
  const usuario = await getCurrentUsuario();
  if (!usuario) {
    return { data: [], totalCentavos: 0, error: 'Não autenticado' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('gasto')
    .select(`
      id,
      data,
      created_at,
      valor,
      descricao,
      foto_url,
      categoria_gasto ( nome, icone, cor )
    `)
    .eq('viagem_id', viagemId)
    .order('data', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    return { data: [], totalCentavos: 0, error: error.message };
  }

  const filtered = (data ?? [])
    .filter((row) => {
      const cat = singleRelation<{ nome: string }>(row.categoria_gasto);
      // Exclude fuel entries — those appear in AbastecimentoList
      return cat?.nome?.toLowerCase() !== 'combustivel';
    });

  // Generate signed URLs for comprovantes in parallel
  const items: GastoViagemItem[] = await Promise.all(
    filtered.map(async (row) => {
      const cat = singleRelation<{
        nome: string;
        icone: string | null;
        cor: string | null;
      }>(row.categoria_gasto);

      let fotoSignedUrl: string | null = null;
      if (row.foto_url) {
        const { data: signedData } = await supabase.storage
          .from('comprovantes')
          .createSignedUrl(row.foto_url, 3600);
        fotoSignedUrl = signedData?.signedUrl ?? null;
      }

      return {
        id: row.id,
        data: row.data,
        created_at: row.created_at,
        valor: row.valor,
        descricao: row.descricao,
        foto_url: row.foto_url ?? null,
        foto_signed_url: fotoSignedUrl,
        categoria_nome: cat?.nome ?? 'Sem categoria',
        categoria_icone: cat?.icone ?? null,
        categoria_cor: cat?.cor ?? null,
      };
    }),
  );

  const totalCentavos = items.reduce((sum, item) => sum + item.valor, 0);

  return { data: items, totalCentavos, error: null };
}
