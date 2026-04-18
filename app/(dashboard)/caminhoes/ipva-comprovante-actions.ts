'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/get-user-role'
import { logError } from '@/lib/observability/logger'

const BUCKET = 'comprovantes'
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf',
])

interface IpvaUploadResult {
  success: boolean
  error?: string
  url?: string
}

/**
 * Upload IPVA comprovante to Supabase Storage.
 * Stores in bucket `comprovantes`, path `ipva/{caminhao_id}/{timestamp}.{ext}`.
 * Updates `ipva_comprovante_url` on the caminhao record.
 */
export async function uploadIpvaComprovante(
  formData: FormData,
): Promise<IpvaUploadResult> {
  let currentUsuario
  try {
    currentUsuario = await requireRole(['dono', 'admin'])
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Permissao insuficiente',
    }
  }

  const file = formData.get('file') as File | null
  const caminhaoId = formData.get('caminhaoId') as string | null
  const contentType = formData.get('contentType') as string | null

  if (!file || !caminhaoId || !contentType) {
    return { success: false, error: 'Dados incompletos para upload' }
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    const limitMb = (MAX_FILE_SIZE_BYTES / (1024 * 1024)).toFixed(0)
    return { success: false, error: `Arquivo muito grande (máximo ${limitMb}MB)` }
  }

  if (file.size === 0) {
    return { success: false, error: 'Arquivo vazio' }
  }

  const normalizedMime = contentType.toLowerCase().trim()
  if (!ALLOWED_MIME_TYPES.has(normalizedMime)) {
    return {
      success: false,
      error: 'Tipo de arquivo nao permitido. Envie imagem (JPG, PNG, WEBP) ou PDF.',
    }
  }

  const supabase = await createClient()

  // Verify the caminhao belongs to the user's empresa
  const { data: caminhao, error: caminhaoError } = await supabase
    .from('caminhao')
    .select('id, empresa_id')
    .eq('id', caminhaoId)
    .single()

  if (caminhaoError || !caminhao) {
    return { success: false, error: 'Caminhao nao encontrado' }
  }

  if (caminhao.empresa_id !== currentUsuario.empresa_id) {
    return { success: false, error: 'Permissao insuficiente' }
  }

  // Build storage path: ipva/{caminhao_id}/{timestamp}.{ext}
  const timestamp = Date.now()
  const ext = normalizedMime === 'application/pdf' ? 'pdf' : 'jpg'
  const storagePath = `ipva/${caminhaoId}/${timestamp}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, {
      contentType: normalizedMime,
      upsert: false,
    })

  if (uploadError) {
    logError(
      {
        action: 'uploadIpvaComprovante',
        empresaId: currentUsuario.empresa_id,
        usuarioId: currentUsuario.id,
        params: { caminhaoId },
      },
      uploadError,
    )
    return { success: false, error: `Erro no upload: ${uploadError.message}` }
  }

  // Update ipva_comprovante_url on caminhao
  const { error: updateError } = await supabase
    .from('caminhao')
    .update({ ipva_comprovante_url: storagePath })
    .eq('id', caminhaoId)

  if (updateError) {
    logError(
      {
        action: 'uploadIpvaComprovante.update',
        empresaId: currentUsuario.empresa_id,
        usuarioId: currentUsuario.id,
        params: { caminhaoId },
      },
      updateError,
    )
    // Rollback
    await supabase.storage.from(BUCKET).remove([storagePath])
    return { success: false, error: 'Erro ao registrar comprovante' }
  }

  revalidatePath('/caminhoes')
  revalidatePath(`/caminhoes/${caminhaoId}`)
  return { success: true, url: storagePath }
}

/**
 * Delete IPVA comprovante from Storage and clear URL from caminhao.
 */
export async function deleteIpvaComprovante(
  caminhaoId: string,
): Promise<IpvaUploadResult> {
  let currentUsuario
  try {
    currentUsuario = await requireRole(['dono', 'admin'])
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Permissao insuficiente',
    }
  }

  const supabase = await createClient()

  const { data: caminhao, error: fetchError } = await supabase
    .from('caminhao')
    .select('id, empresa_id, ipva_comprovante_url')
    .eq('id', caminhaoId)
    .single()

  if (fetchError || !caminhao) {
    return { success: false, error: 'Caminhao nao encontrado' }
  }

  if (caminhao.empresa_id !== currentUsuario.empresa_id) {
    return { success: false, error: 'Permissao insuficiente' }
  }

  if (!caminhao.ipva_comprovante_url) {
    return { success: true }
  }

  const { error: storageError } = await supabase.storage
    .from(BUCKET)
    .remove([caminhao.ipva_comprovante_url])

  if (storageError) {
    logError(
      {
        action: 'deleteIpvaComprovante.storage',
        empresaId: currentUsuario.empresa_id,
        usuarioId: currentUsuario.id,
        params: { caminhaoId },
      },
      storageError,
    )
    return { success: false, error: `Erro ao remover arquivo: ${storageError.message}` }
  }

  const { error: updateError } = await supabase
    .from('caminhao')
    .update({ ipva_comprovante_url: null })
    .eq('id', caminhaoId)

  if (updateError) {
    logError(
      {
        action: 'deleteIpvaComprovante.update',
        empresaId: currentUsuario.empresa_id,
        usuarioId: currentUsuario.id,
        params: { caminhaoId },
      },
      updateError,
    )
    return { success: false, error: 'Erro ao limpar registro' }
  }

  revalidatePath('/caminhoes')
  revalidatePath(`/caminhoes/${caminhaoId}`)
  return { success: true }
}
