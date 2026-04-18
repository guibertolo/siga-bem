'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUsuario } from '@/lib/auth/get-user-role';
import { parseBrlInputToCentavos } from '@/lib/utils/currency';
import { calcularGapStats } from '@/lib/utils/viagem-calc';
import type {
  ViagemActionResult,
  ViagemFormData,
  Viagem,
} from '@/types/viagem';
import type { ViagemStatus } from '@/types/database';
import { VIAGEM_STATUS_TRANSITIONS } from '@/types/viagem';
import { logError } from '@/lib/observability/logger';
import { logAuditEvent } from '@/lib/observability/audit';
import { assertOwnership, SecurityError } from '@/lib/security/assert-ownership';
import {
  listViagensRepo,
  listMotoristasAtivosRepo,
  listCaminhoesPorMotoristaRepo,
  getViagemRepo,
  getViagensEmAndamentoRepo,
  listCidadesUsadasRepo,
} from '@/lib/repositories/viagens';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const viagemSchema = z.object({
  motorista_id: z.string().uuid('Selecione um motorista'),
  caminhao_id: z.string().uuid('Selecione um caminhão'),
  origem: z.string()
    .min(1, 'Origem é obrigatória')
    .max(200, 'Origem deve ter no máximo 200 caracteres'),
  destino: z.string()
    .min(1, 'Destino é obrigatório')
    .max(200, 'Destino deve ter no máximo 200 caracteres'),
  data_saida: z.string()
    .min(1, 'Data de saída é obrigatória')
    .refine((val) => !isNaN(Date.parse(val)), 'Data de saída inválida'),
  data_chegada_prevista: z.string()
    .refine(
      (val) => val === '' || !isNaN(Date.parse(val)),
      'Data de chegada prevista inválida',
    ),
  valor_total: z.string()
    .min(1, 'Valor total é obrigatório')
    .refine((val) => {
      const centavos = parseBrlInputToCentavos(val);
      return centavos !== null && centavos > 0;
    }, 'Valor total deve ser maior que zero'),
  percentual_pagamento: z.string()
    .min(1, 'Percentual é obrigatório')
    .refine((val) => {
      const num = parseFloat(val.replace(',', '.'));
      return !isNaN(num) && num >= 0 && num <= 100;
    }, 'Percentual deve ser entre 0 e 100'),
  km_estimado: z.string()
    .refine(
      (val) => val === '' || (!isNaN(Number(val)) && Number(val) > 0),
      'Distância estimada deve ser maior que zero',
    ),
  km_saida: z.string()
    .min(1, 'KM de saída é obrigatório')
    .refine(
      (val) => !isNaN(Number(val)) && Number(val) >= 0,
      'KM saída deve ser um número positivo',
    ),
  observacao: z.string().max(1000, 'Observação deve ter no máximo 1000 caracteres'),
});

function extractFieldErrors(
  error: z.ZodError,
): Partial<Record<keyof ViagemFormData, string>> {
  const fieldErrors: Partial<Record<keyof ViagemFormData, string>> = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as keyof ViagemFormData;
    if (!fieldErrors[field]) {
      fieldErrors[field] = issue.message;
    }
  }
  return fieldErrors;
}

// ---------------------------------------------------------------------------
// Read operations — delegate to repository
// ---------------------------------------------------------------------------

/**
 * List motoristas ativos for select (dono/admin see all, motorista sees self).
 */
export async function listMotoristasAtivos(): Promise<{
  data: Array<{ id: string; nome: string; percentual_pagamento?: number | null }> | null;
  error: string | null;
}> {
  const usuario = await getCurrentUsuario();
  if (!usuario) {
    return { data: null, error: 'Não autenticado' };
  }

  const supabase = await createClient();

  if (usuario.role === 'motorista') {
    return listMotoristasAtivosRepo(supabase, [usuario.empresa_id!], { usuarioId: usuario.id });
  }

  return listMotoristasAtivosRepo(supabase, [usuario.empresa_id!]);
}

/**
 * List caminhoes ativos vinculados a um motorista (via motorista_caminhao ativo).
 * If no motorista_id provided, returns all active caminhoes.
 */
export async function listCaminhoesPorMotorista(
  motoristaId?: string,
): Promise<{
  data: Array<{ id: string; placa: string; modelo: string; km_atual: number }> | null;
  error: string | null;
}> {
  const usuario = await getCurrentUsuario();
  if (!usuario) {
    return { data: null, error: 'Não autenticado' };
  }

  const supabase = await createClient();
  return listCaminhoesPorMotoristaRepo(supabase, [usuario.empresa_id!], motoristaId);
}

/**
 * Get a single viagem by ID (with joins).
 */
export async function getViagem(
  viagemId: string,
): Promise<ViagemActionResult> {
  const usuario = await getCurrentUsuario();
  if (!usuario) {
    return { success: false, error: 'Não autenticado' };
  }

  const supabase = await createClient();
  const { data, error } = await getViagemRepo(supabase, viagemId);

  if (error || !data) {
    return { success: false, error: error ?? 'Viagem não encontrada' };
  }

  return { success: true, viagem: data as Viagem };
}

/**
 * List viagens with optional filters (AC5).
 */
export async function listViagens(filters?: {
  status?: ViagemStatus[];
  motorista_id?: string;
  data_inicio?: string;
  data_fim?: string;
  texto?: string;
  page?: number;
  pageSize?: number;
}) {
  const usuario = await getCurrentUsuario();
  if (!usuario) {
    return { data: null, total: 0, error: 'Não autenticado' };
  }

  const supabase = await createClient();
  return listViagensRepo(supabase, [usuario.empresa_id!], filters);
}

/**
 * Get count of viagens em_andamento for dashboard card (T7).
 */
export async function getViagensEmAndamento(): Promise<{
  count: number;
  error: string | null;
}> {
  const usuario = await getCurrentUsuario();
  if (!usuario) {
    return { count: 0, error: 'Não autenticado' };
  }

  const supabase = await createClient();
  return getViagensEmAndamentoRepo(supabase, [usuario.empresa_id!]);
}

/**
 * List unique cities used in origem/destino for the current empresa.
 */
export async function listCidadesUsadas(): Promise<{
  data: string[];
  error: string | null;
}> {
  const usuario = await getCurrentUsuario();
  if (!usuario) {
    return { data: [], error: 'Não autenticado' };
  }

  const supabase = await createClient();
  return listCidadesUsadasRepo(supabase, [usuario.empresa_id!]);
}

// ---------------------------------------------------------------------------
// CRUD Operations (mutations stay here)
// ---------------------------------------------------------------------------

/**
 * Create a new viagem.
 * Only dono/admin can create (enforced by RLS + app check).
 */
export async function createViagem(
  formData: ViagemFormData,
): Promise<ViagemActionResult> {
  const usuario = await getCurrentUsuario();
  if (!usuario) {
    return { success: false, error: 'Não autenticado' };
  }

  if (!usuario.ativo) {
    return { success: false, error: 'Usuário desativado' };
  }

  // Motorista must have a motorista_id linked
  if (usuario.role === 'motorista' && !usuario.motorista_id) {
    return { success: false, error: 'Você não possui perfil de motorista vinculado. Solicite ao proprietario.' };
  }

  const parsed = viagemSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, fieldErrors: extractFieldErrors(parsed.error) };
  }

  const data = parsed.data;

  const valorCentavos = parseBrlInputToCentavos(data.valor_total);
  if (valorCentavos === null || valorCentavos <= 0) {
    return { success: false, fieldErrors: { valor_total: 'Valor inválido' } };
  }

  const kmEstimado = data.km_estimado !== '' ? Number(data.km_estimado) : null;
  const kmSaida = data.km_saida !== '' ? Number(data.km_saida) : null;

  // Story 3.4: determine editavel_motorista and motorista_id based on role
  const isMotorista = usuario.role === 'motorista';
  const editavelMotorista = isMotorista; // true if motorista creates, false if dono/admin
  const motoristaId = isMotorista ? usuario.motorista_id! : data.motorista_id;

  const supabase = await createClient();

  // Block if motorista already has a viagem em_andamento
  const { count: emAndamento } = await supabase
    .from('viagem')
    .select('id', { count: 'exact', head: true })
    .eq('motorista_id', motoristaId)
    .eq('status', 'em_andamento');

  if (emAndamento && emAndamento > 0) {
    return { success: false, error: 'Este motorista ja possui uma viagem em andamento. Conclua ou cancele antes de criar outra.' };
  }

  // ALWAYS inherit percentual from motorista cadastro — never from form
  const { data: motoristaRecord } = await supabase
    .from('motorista')
    .select('percentual_pagamento')
    .eq('id', motoristaId)
    .single();

  const percentual = motoristaRecord?.percentual_pagamento ?? 0;

  const { data: viagem, error: insertError } = await supabase
    .from('viagem')
    .insert({
      empresa_id: usuario.empresa_id,
      motorista_id: motoristaId,
      caminhao_id: data.caminhao_id,
      origem: data.origem,
      destino: data.destino,
      data_saida: data.data_saida,
      data_chegada_prevista: data.data_chegada_prevista || null,
      valor_total: valorCentavos,
      percentual_pagamento: percentual,
      km_estimado: kmEstimado,
      km_saida: kmSaida,
      observacao: data.observacao || null,
      editavel_motorista: editavelMotorista,
      created_by: usuario.id,
    })
    .select()
    .single();

  if (insertError) {
    logError({ action: 'createViagem', empresaId: usuario.empresa_id, usuarioId: usuario.id }, insertError);
    return { success: false, error: 'Erro ao cadastrar viagem. Tente novamente.' };
  }

  // Story 20.1 AC-3: Consistency warnings (non-blocking)
  const warnings: string[] = [];
  if (kmSaida != null) {
    const { data: previousTrips } = await supabase
      .from('viagem')
      .select('id, km_saida, km_chegada')
      .eq('caminhao_id', data.caminhao_id)
      .eq('status', 'concluida')
      .not('km_saida', 'is', null)
      .not('km_chegada', 'is', null)
      .order('data_saida', { ascending: false })
      .limit(20);

    if (previousTrips && previousTrips.length > 0) {
      const lastTrip = previousTrips[0];
      if (lastTrip.km_chegada != null && kmSaida < lastTrip.km_chegada) {
        warnings.push(
          `O odômetro informado (${kmSaida.toLocaleString('pt-BR')} km) é menor que o último registro (${lastTrip.km_chegada.toLocaleString('pt-BR')} km). Verifique.`,
        );
      } else if (lastTrip.km_chegada != null) {
        const currentGap = kmSaida - lastTrip.km_chegada;
        if (previousTrips.length >= 3) {
          const historicalGaps: number[] = [];
          for (let i = 0; i < previousTrips.length - 1; i++) {
            const prev = previousTrips[i + 1];
            const curr = previousTrips[i];
            if (prev.km_chegada != null && curr.km_saida != null) {
              const g = curr.km_saida - prev.km_chegada;
              if (g >= 0) historicalGaps.push(g);
            }
          }
          if (historicalGaps.length >= 5) {
            const stats = calcularGapStats(historicalGaps);
            const threshold = stats.media + 2 * stats.stddev;
            if (currentGap > threshold) {
              warnings.push(
                `Diferença de ${currentGap.toLocaleString('pt-BR')} km desde a última viagem (média histórica: ${Math.round(stats.media).toLocaleString('pt-BR')} km). Tá correto?`,
              );
            }
          } else if (historicalGaps.length >= 2) {
            const tripKms = previousTrips
              .filter((t) => t.km_saida != null && t.km_chegada != null)
              .map((t) => (t.km_chegada as number) - (t.km_saida as number));
            const avgTripKm = tripKms.reduce((s, k) => s + k, 0) / tripKms.length;
            if (currentGap > avgTripKm * 0.5) {
              warnings.push(
                `Diferença de ${currentGap.toLocaleString('pt-BR')} km desde a última viagem. Tá correto?`,
              );
            }
          }
        }
      }
    }
  }

  await logAuditEvent({
    supabase,
    usuarioId: usuario.id,
    usuarioRole: usuario.role,
    usuarioNome: usuario.nome,
    empresaId: usuario.empresa_id!,
    acao: 'create',
    entidade: 'viagem',
    entidadeId: viagem.id,
    entidadeDescricao: `${data.origem} → ${data.destino}`,
    valoresDepois: {
      origem: data.origem,
      destino: data.destino,
      data_saida: data.data_saida,
      valor_total: valorCentavos,
      motorista_id: motoristaId,
      caminhao_id: data.caminhao_id,
      km_saida: kmSaida,
      km_estimado: kmEstimado,
    },
  });

  revalidatePath('/viagens');
  revalidatePath('/dashboard');
  return { success: true, viagem, warnings: warnings.length > 0 ? warnings : undefined };
}

/**
 * Update an existing viagem.
 */
export async function updateViagem(
  viagemId: string,
  formData: ViagemFormData,
): Promise<ViagemActionResult> {
  const usuario = await getCurrentUsuario();
  if (!usuario) {
    return { success: false, error: 'Não autenticado' };
  }

  if (!usuario.ativo) {
    return { success: false, error: 'Usuário desativado' };
  }

  const supabase = await createClient();

  // Fetch current viagem to check status and editavel_motorista
  const { data: existing, error: fetchError } = await supabase
    .from('viagem')
    .select('status, editavel_motorista, origem, destino, valor_total, percentual_pagamento')
    .eq('id', viagemId)
    .single();

  if (fetchError || !existing) {
    return { success: false, error: 'Viagem não encontrada' };
  }

  // Only editable when planejada or em_andamento
  if (existing.status !== 'planejada' && existing.status !== 'em_andamento') {
    return { success: false, error: 'Viagem concluída ou cancelada não pode ser editada' };
  }

  const parsed = viagemSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, fieldErrors: extractFieldErrors(parsed.error) };
  }

  const data = parsed.data;

  const valorCentavos = parseBrlInputToCentavos(data.valor_total);
  if (valorCentavos === null || valorCentavos <= 0) {
    return { success: false, fieldErrors: { valor_total: 'Valor inválido' } };
  }

  const kmEstimado = data.km_estimado !== '' ? Number(data.km_estimado) : null;
  const kmSaida = data.km_saida !== '' ? Number(data.km_saida) : null;

  // Story 3.4: 3-level edit lock for core fields
  const camposEditaveis =
    usuario.role === 'dono' ||
    (existing.editavel_motorista === true && existing.status === 'planejada');

  const coreFieldChanged =
    data.origem !== existing.origem ||
    data.destino !== existing.destino ||
    valorCentavos !== existing.valor_total;

  if (coreFieldChanged && !camposEditaveis) {
    return {
      success: false,
      error: 'Campos bloqueados para edição. Origem, destino e valor não podem ser alterados.',
    };
  }

  // Story 21.4: Validate ownership of motorista_id and caminhao_id
  const { data: motoristaOwnership } = await supabase
    .from('motorista')
    .select('id')
    .eq('id', data.motorista_id)
    .eq('empresa_id', usuario.empresa_id!)
    .single();

  if (!motoristaOwnership) {
    return { success: false, error: 'Motorista inválido' };
  }

  const { data: caminhaoOwnership } = await supabase
    .from('caminhao')
    .select('id')
    .eq('id', data.caminhao_id)
    .eq('empresa_id', usuario.empresa_id!)
    .single();

  if (!caminhaoOwnership) {
    return { success: false, error: 'Caminhão inválido' };
  }

  // Story 21.3: assertOwnership antes do update
  try {
    await assertOwnership(supabase, 'viagem', viagemId, usuario.empresa_id!);
  } catch (e) {
    if (e instanceof SecurityError) {
      return { success: false, error: 'Acesso negado' };
    }
    throw e;
  }

  // percentual_pagamento is NEVER updated via viagem edit
  const { data: viagem, error: updateError } = await supabase
    .from('viagem')
    .update({
      motorista_id: data.motorista_id,
      caminhao_id: data.caminhao_id,
      origem: camposEditaveis ? data.origem : existing.origem,
      destino: camposEditaveis ? data.destino : existing.destino,
      data_saida: data.data_saida,
      data_chegada_prevista: data.data_chegada_prevista || null,
      valor_total: camposEditaveis ? valorCentavos : existing.valor_total,
      km_estimado: kmEstimado,
      km_saida: kmSaida,
      observacao: data.observacao || null,
    })
    .eq('id', viagemId)
    .eq('empresa_id', usuario.empresa_id!)
    .select()
    .single();

  if (updateError) {
    logError({ action: 'updateViagem', empresaId: usuario.empresa_id, usuarioId: usuario.id, params: { viagemId } }, updateError);
    return { success: false, error: 'Erro ao atualizar viagem. Tente novamente.' };
  }

  await logAuditEvent({
    supabase,
    usuarioId: usuario.id,
    usuarioRole: usuario.role,
    usuarioNome: usuario.nome,
    empresaId: usuario.empresa_id!,
    acao: 'update',
    entidade: 'viagem',
    entidadeId: viagemId,
    entidadeDescricao: `${viagem.origem} → ${viagem.destino}`,
    valoresAntes: {
      origem: existing.origem,
      destino: existing.destino,
      valor_total: existing.valor_total,
    },
    valoresDepois: {
      origem: viagem.origem,
      destino: viagem.destino,
      valor_total: viagem.valor_total,
      motorista_id: data.motorista_id,
      caminhao_id: data.caminhao_id,
      km_saida: kmSaida,
      km_estimado: kmEstimado,
    },
  });

  revalidatePath('/viagens');
  revalidatePath('/dashboard');
  return { success: true, viagem };
}

/**
 * Update viagem status with transition validation.
 */
export async function updateViagemStatus(
  viagemId: string,
  novoStatus: ViagemStatus,
  dataChegadaReal?: string,
  kmChegada?: number,
): Promise<ViagemActionResult> {
  const usuario = await getCurrentUsuario();
  if (!usuario) {
    return { success: false, error: 'Não autenticado' };
  }

  const supabase = await createClient();

  // Story 21.3: assertOwnership antes de qualquer operacao
  try {
    await assertOwnership(supabase, 'viagem', viagemId, usuario.empresa_id!);
  } catch (e) {
    if (e instanceof SecurityError) {
      return { success: false, error: 'Acesso negado' };
    }
    throw e;
  }

  const { data: viagem, error: fetchError } = await supabase
    .from('viagem')
    .select('status, motorista_id, caminhao_id, km_saida')
    .eq('id', viagemId)
    .eq('empresa_id', usuario.empresa_id!)
    .single();

  if (fetchError || !viagem) {
    return { success: false, error: 'Acesso negado' };
  }

  const transicoesValidas = VIAGEM_STATUS_TRANSITIONS[viagem.status as ViagemStatus];
  if (!transicoesValidas.includes(novoStatus)) {
    return {
      success: false,
      error: `Transição inválida: ${viagem.status} para ${novoStatus}`,
    };
  }

  // Block: motorista can only have 1 viagem em_andamento at a time
  if (novoStatus === 'em_andamento') {
    const { count: emAndamento } = await supabase
      .from('viagem')
      .select('id', { count: 'exact', head: true })
      .eq('motorista_id', viagem.motorista_id)
      .eq('status', 'em_andamento')
      .neq('id', viagemId);

    if (emAndamento && emAndamento > 0) {
      return { success: false, error: 'Este motorista ja possui uma viagem em andamento. Conclua ou cancele antes de iniciar outra.' };
    }
  }

  // AC3: data_chegada_real required when concluding
  if (novoStatus === 'concluida' && !dataChegadaReal) {
    return {
      success: false,
      error: 'Data de chegada real é obrigatória para concluir viagem',
    };
  }

  // Story 20.1 AC-2: km_chegada obrigatorio ao concluir
  if (novoStatus === 'concluida' && kmChegada == null) {
    return {
      success: false,
      error: 'KM de chegada é obrigatório para concluir viagem',
    };
  }

  // Validate km_chegada >= km_saida (when both available)
  if (novoStatus === 'concluida' && kmChegada != null && viagem.km_saida != null) {
    if (kmChegada < viagem.km_saida) {
      return {
        success: false,
        error: `KM de chegada (${kmChegada.toLocaleString('pt-BR')}) não pode ser menor que o de saída (${viagem.km_saida.toLocaleString('pt-BR')})`,
      };
    }
  }

  const updatePayload: Record<string, unknown> = { status: novoStatus };

  if (novoStatus === 'concluida') {
    updatePayload.data_chegada_real = dataChegadaReal;
    updatePayload.km_chegada = kmChegada;
  }

  const { data: updated, error: updateError } = await supabase
    .from('viagem')
    .update(updatePayload)
    .eq('id', viagemId)
    .eq('empresa_id', usuario.empresa_id!)
    .select()
    .single();

  if (updateError) {
    logError({ action: 'updateViagemStatus', empresaId: usuario.empresa_id, usuarioId: usuario.id, params: { viagemId, novoStatus } }, updateError);
    return { success: false, error: 'Erro ao atualizar status. Tente novamente.' };
  }

  // Update caminhao km_atual when concluding viagem with km_chegada
  if (novoStatus === 'concluida' && kmChegada != null && viagem.caminhao_id) {
    await supabase
      .from('caminhao')
      .update({ km_atual: kmChegada })
      .eq('id', viagem.caminhao_id);
  }

  await logAuditEvent({
    supabase,
    usuarioId: usuario.id,
    usuarioRole: usuario.role,
    usuarioNome: usuario.nome,
    empresaId: usuario.empresa_id!,
    acao: 'update',
    entidade: 'viagem',
    entidadeId: viagemId,
    entidadeDescricao: `Status: ${viagem.status} → ${novoStatus}`,
    valoresAntes: { status: viagem.status },
    valoresDepois: {
      status: novoStatus,
      ...(novoStatus === 'concluida' && { data_chegada_real: dataChegadaReal, km_chegada: kmChegada }),
    },
  });

  revalidatePath('/viagens');
  revalidatePath('/dashboard');
  return { success: true, viagem: updated };
}

/**
 * Update only observacao for concluida/cancelada viagens (AC6).
 */
export async function updateViagemObservacao(
  viagemId: string,
  observacao: string,
): Promise<ViagemActionResult> {
  const usuario = await getCurrentUsuario();
  if (!usuario) {
    return { success: false, error: 'Não autenticado' };
  }

  const supabase = await createClient();

  // Story 21.3: assertOwnership antes do update
  try {
    await assertOwnership(supabase, 'viagem', viagemId, usuario.empresa_id!);
  } catch (e) {
    if (e instanceof SecurityError) {
      return { success: false, error: 'Acesso negado' };
    }
    throw e;
  }

  const { data: viagem, error: updateError } = await supabase
    .from('viagem')
    .update({ observacao: observacao || null })
    .eq('id', viagemId)
    .eq('empresa_id', usuario.empresa_id!)
    .select()
    .single();

  if (updateError) {
    logError({ action: 'updateViagemObservacao', empresaId: usuario.empresa_id, usuarioId: usuario.id, params: { viagemId } }, updateError);
    return { success: false, error: 'Erro ao atualizar observação. Tente novamente.' };
  }

  revalidatePath('/viagens');
  return { success: true, viagem };
}

/**
 * Delete a viagem.
 * AC6: Only deletable when status is 'planejada'.
 */
export async function deleteViagem(
  viagemId: string,
): Promise<{ success: boolean; error?: string }> {
  const usuario = await getCurrentUsuario();
  if (!usuario) {
    return { success: false, error: 'Não autenticado' };
  }

  if (usuario.role === 'motorista') {
    return { success: false, error: 'Motorista não pode excluir viagens' };
  }

  const supabase = await createClient();

  // Story 21.3: assertOwnership antes de qualquer operacao
  try {
    await assertOwnership(supabase, 'viagem', viagemId, usuario.empresa_id!);
  } catch (e) {
    if (e instanceof SecurityError) {
      return { success: false, error: 'Acesso negado' };
    }
    throw e;
  }

  // Check status before delete
  const { data: existing, error: fetchError } = await supabase
    .from('viagem')
    .select('status')
    .eq('id', viagemId)
    .eq('empresa_id', usuario.empresa_id!)
    .single();

  if (fetchError || !existing) {
    return { success: false, error: 'Acesso negado' };
  }

  if (existing.status !== 'planejada') {
    return { success: false, error: 'Somente viagens planejadas podem ser excluidas' };
  }

  const { error } = await supabase
    .from('viagem')
    .delete()
    .eq('id', viagemId)
    .eq('empresa_id', usuario.empresa_id!);

  if (error) {
    logError({ action: 'deleteViagem', empresaId: usuario.empresa_id, usuarioId: usuario.id, params: { viagemId } }, error);
    return { success: false, error: 'Erro ao excluir viagem. Tente novamente.' };
  }

  revalidatePath('/viagens');
  revalidatePath('/dashboard');
  return { success: true };
}

/**
 * Invalidar (cancel) a viagem — admin/dono override.
 */
export async function invalidarViagem(
  viagemId: string,
  motivo: string,
): Promise<{ success: boolean; error?: string }> {
  const usuario = await getCurrentUsuario();
  if (!usuario) {
    return { success: false, error: 'Não autenticado' };
  }

  if (!usuario.ativo) {
    return { success: false, error: 'Usuário desativado' };
  }

  // Only dono/admin can invalidate
  if (usuario.role === 'motorista') {
    return { success: false, error: 'Motorista não pode invalidar viagens' };
  }

  if (!motivo || motivo.trim().length < 10) {
    return { success: false, error: 'Motivo deve ter no mínimo 10 caracteres' };
  }

  const supabase = await createClient();

  // Story 21.3: assertOwnership antes de qualquer operacao
  try {
    await assertOwnership(supabase, 'viagem', viagemId, usuario.empresa_id!);
  } catch (e) {
    if (e instanceof SecurityError) {
      return { success: false, error: 'Acesso negado' };
    }
    throw e;
  }

  const { data: existing, error: fetchError } = await supabase
    .from('viagem')
    .select('status, observacao')
    .eq('id', viagemId)
    .eq('empresa_id', usuario.empresa_id!)
    .single();

  if (fetchError || !existing) {
    return { success: false, error: 'Acesso negado' };
  }

  if (existing.status === 'cancelada') {
    return { success: false, error: 'Viagem ja esta cancelada' };
  }

  const observacaoOriginal = existing.observacao ?? '';
  const novaObservacao = observacaoOriginal
    ? `[INVALIDADA] ${motivo.trim()} | ${observacaoOriginal}`
    : `[INVALIDADA] ${motivo.trim()}`;

  const { error: updateError } = await supabase
    .from('viagem')
    .update({
      status: 'cancelada',
      observacao: novaObservacao,
    })
    .eq('id', viagemId)
    .eq('empresa_id', usuario.empresa_id!);

  if (updateError) {
    logError({ action: 'invalidarViagem', empresaId: usuario.empresa_id, usuarioId: usuario.id, params: { viagemId } }, updateError);
    return { success: false, error: 'Erro ao invalidar viagem. Tente novamente.' };
  }

  revalidatePath('/viagens');
  revalidatePath('/dashboard');
  return { success: true };
}
