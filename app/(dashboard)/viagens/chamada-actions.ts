'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUsuario } from '@/lib/auth/get-user-role'
import type { ChamadaActionResult, ChamadasListResult } from '@/types/foto-chamada'
import { logError } from '@/lib/observability/logger'

const BUCKET = 'chamadas'

// Validacao server-side (defesa em profundidade — client tambem valida).
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
])

/**
 * Upload a chamada photo to Supabase Storage and create DB record.
 * Called from client after compression.
 *
 * Imutabilidade: motorista so INSERT, nunca UPDATE/DELETE.
 * Nenhuma funcao de UPDATE/DELETE e exposta neste modulo.
 */
export async function uploadChamada(
  formData: FormData,
): Promise<ChamadaActionResult> {
  const usuario = await getCurrentUsuario()
  if (!usuario) {
    return { success: false, error: 'Voce precisa estar logado para enviar a foto.' }
  }

  const file = formData.get('file') as File | null
  const viagemId = formData.get('viagemId') as string | null
  const contentType = formData.get('contentType') as string | null

  if (!file || !viagemId) {
    return { success: false, error: 'Dados incompletos. Selecione uma foto e tente novamente.' }
  }

  if (!contentType) {
    return { success: false, error: 'Use apenas fotos (JPG, PNG ou WebP).' }
  }

  // Validacao: tamanho
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      success: false,
      error: 'A foto esta muito grande. Tente tirar com menos zoom ou escolha outra.',
    }
  }

  if (file.size === 0) {
    return { success: false, error: 'O arquivo esta vazio. Tente tirar a foto novamente.' }
  }

  // Validacao: tipo
  const normalizedMime = (contentType ?? '').toLowerCase().trim()
  if (!ALLOWED_MIME_TYPES.has(normalizedMime)) {
    return {
      success: false,
      error: 'Use apenas fotos (JPG, PNG ou WebP).',
    }
  }

  const supabase = await createClient()

  // Verificar ownership: viagem pertence a empresa do usuario
  const { data: viagem, error: viagemError } = await supabase
    .from('viagem')
    .select('id, empresa_id, status')
    .eq('id', viagemId)
    .single()

  if (viagemError || !viagem) {
    return { success: false, error: 'Viagem nao encontrada' }
  }

  if (viagem.empresa_id !== usuario.empresa_id) {
    return { success: false, error: 'Viagem nao encontrada' }
  }

  // Restricao de status: apenas motorista tem restricao
  if (usuario.role === 'motorista') {
    const statusPermitidos = ['planejada', 'em_andamento']
    if (!statusPermitidos.includes(viagem.status)) {
      return {
        success: false,
        error: 'Nao e possivel adicionar chamada a uma viagem que nao esta em andamento',
      }
    }
  }

  // Build storage path: {empresa_id}/{viagem_id}/{uuid}.webp
  const uuid = crypto.randomUUID()
  const ext = normalizedMime === 'image/webp' ? 'webp' : normalizedMime === 'image/png' ? 'png' : 'jpg'
  const storagePath = `${usuario.empresa_id}/${viagemId}/${uuid}.${ext}`

  // Upload to Storage
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, {
      contentType: normalizedMime,
      upsert: false,
    })

  if (uploadError) {
    logError(
      {
        action: 'uploadChamada',
        empresaId: usuario.empresa_id,
        usuarioId: usuario.id,
        params: { viagemId },
      },
      uploadError,
    )
    return {
      success: false,
      error: 'Nao conseguimos enviar a foto. Verifique a conexao e tente novamente.',
    }
  }

  // Create DB record
  const { data: chamada, error: insertError } = await supabase
    .from('foto_chamada')
    .insert({
      empresa_id: usuario.empresa_id,
      viagem_id: viagemId,
      storage_path: storagePath,
      content_type: normalizedMime,
      size_bytes: file.size,
    })
    .select()
    .single()

  if (insertError) {
    logError(
      {
        action: 'uploadChamada.insert',
        empresaId: usuario.empresa_id,
        usuarioId: usuario.id,
        params: { viagemId },
      },
      insertError,
    )
    // Rollback: remove uploaded file
    await supabase.storage.from(BUCKET).remove([storagePath])
    return {
      success: false,
      error: 'Nao conseguimos enviar a foto. Verifique a conexao e tente novamente.',
    }
  }

  revalidatePath('/viagens')
  revalidatePath(`/viagens/${viagemId}`)
  return { success: true, chamada }
}

const SIGNED_URL_EXPIRY_DETAIL = 3600 // 1 hour — for detail view

/**
 * List all chamadas for a viagem, with signed URLs.
 * Returns in descending order of uploaded_at (most recent first).
 */
export async function listChamadasViagem(
  viagemId: string,
): Promise<ChamadasListResult> {
  const usuario = await getCurrentUsuario()
  if (!usuario) {
    return { success: false, error: 'Nao autenticado' }
  }

  const supabase = await createClient()

  const { data: chamadas, error } = await supabase
    .from('foto_chamada')
    .select('*')
    .eq('viagem_id', viagemId)
    .eq('empresa_id', usuario.empresa_id!)
    .order('uploaded_at', { ascending: false })

  if (error) {
    return { success: false, error: error.message }
  }

  if (!chamadas || chamadas.length === 0) {
    return { success: true, data: [] }
  }

  // Generate signed URLs for each chamada
  const withUrls = await Promise.all(
    chamadas.map(async (ch) => {
      const { data: signedUrlData } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(ch.storage_path, SIGNED_URL_EXPIRY_DETAIL)

      return {
        ...ch,
        url: signedUrlData?.signedUrl ?? '',
      }
    }),
  )

  return { success: true, data: withUrls }
}

/**
 * Get a signed URL for a single chamada (detail context, 1h TTL).
 */
export async function getChamadaSignedUrl(
  chamadaId: string,
): Promise<{ url: string } | { error: string }> {
  const usuario = await getCurrentUsuario()
  if (!usuario) {
    return { error: 'Nao autenticado' }
  }

  const supabase = await createClient()

  const { data: chamada, error: fetchError } = await supabase
    .from('foto_chamada')
    .select('storage_path, empresa_id')
    .eq('id', chamadaId)
    .single()

  if (fetchError || !chamada) {
    return { error: 'Chamada nao encontrada' }
  }

  if (chamada.empresa_id !== usuario.empresa_id) {
    return { error: 'Chamada nao encontrada' }
  }

  const { data: signedUrlData } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(chamada.storage_path, SIGNED_URL_EXPIRY_DETAIL)

  if (!signedUrlData?.signedUrl) {
    return { error: 'Nao foi possivel gerar URL da foto' }
  }

  return { url: signedUrlData.signedUrl }
}

/**
 * Upload chamada for dono/admin — no status restriction.
 * Motoristas must use the regular uploadChamada which restricts by status.
 */
export async function uploadChamadaDono(
  formData: FormData,
): Promise<ChamadaActionResult> {
  const usuario = await getCurrentUsuario()
  if (!usuario) {
    return { success: false, error: 'Voce precisa estar logado para enviar a foto.' }
  }

  // Only dono/admin can use this action
  if (usuario.role !== 'dono' && usuario.role !== 'admin') {
    return { success: false, error: 'Apenas o dono ou admin pode substituir a chamada.' }
  }

  const file = formData.get('file') as File | null
  const viagemId = formData.get('viagemId') as string | null
  const contentType = formData.get('contentType') as string | null

  if (!file || !viagemId) {
    return { success: false, error: 'Dados incompletos. Selecione uma foto e tente novamente.' }
  }

  if (!contentType) {
    return { success: false, error: 'Use apenas fotos (JPG, PNG ou WebP).' }
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      success: false,
      error: 'A foto esta muito grande. Tente tirar com menos zoom ou escolha outra.',
    }
  }

  if (file.size === 0) {
    return { success: false, error: 'O arquivo esta vazio. Tente tirar a foto novamente.' }
  }

  const normalizedMime = (contentType ?? '').toLowerCase().trim()
  if (!ALLOWED_MIME_TYPES.has(normalizedMime)) {
    return {
      success: false,
      error: 'Use apenas fotos (JPG, PNG ou WebP).',
    }
  }

  const supabase = await createClient()

  // Verify ownership
  const { data: viagem, error: viagemError } = await supabase
    .from('viagem')
    .select('id, empresa_id')
    .eq('id', viagemId)
    .single()

  if (viagemError || !viagem) {
    return { success: false, error: 'Viagem nao encontrada' }
  }

  if (viagem.empresa_id !== usuario.empresa_id) {
    return { success: false, error: 'Viagem nao encontrada' }
  }

  // No status restriction for dono/admin — immutability: old photos stay in storage
  const uuid = crypto.randomUUID()
  const ext = normalizedMime === 'image/webp' ? 'webp' : normalizedMime === 'image/png' ? 'png' : 'jpg'
  const storagePath = `${usuario.empresa_id}/${viagemId}/${uuid}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, {
      contentType: normalizedMime,
      upsert: false,
    })

  if (uploadError) {
    logError(
      {
        action: 'uploadChamadaDono',
        empresaId: usuario.empresa_id,
        usuarioId: usuario.id,
        params: { viagemId },
      },
      uploadError,
    )
    return {
      success: false,
      error: 'Nao conseguimos enviar a foto. Verifique a conexao e tente novamente.',
    }
  }

  const { data: chamada, error: insertError } = await supabase
    .from('foto_chamada')
    .insert({
      empresa_id: usuario.empresa_id,
      viagem_id: viagemId,
      storage_path: storagePath,
      content_type: normalizedMime,
      size_bytes: file.size,
    })
    .select()
    .single()

  if (insertError) {
    logError(
      {
        action: 'uploadChamadaDono.insert',
        empresaId: usuario.empresa_id,
        usuarioId: usuario.id,
        params: { viagemId },
      },
      insertError,
    )
    await supabase.storage.from(BUCKET).remove([storagePath])
    return {
      success: false,
      error: 'Nao conseguimos enviar a foto. Verifique a conexao e tente novamente.',
    }
  }

  revalidatePath('/viagens')
  revalidatePath(`/viagens/${viagemId}`)
  return { success: true, chamada }
}
