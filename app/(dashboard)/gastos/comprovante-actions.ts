'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUsuario } from '@/lib/auth/get-user-role'
import type {
  ComprovanteActionResult,
  ComprovantesListResult,
} from '@/types/foto-comprovante'

const BUCKET = 'comprovantes'
const SIGNED_URL_EXPIRY = 3600 // 1 hour

/**
 * Upload a comprovante file to Supabase Storage and create DB record.
 * Called from client after compression.
 */
export async function uploadComprovante(
  formData: FormData,
): Promise<ComprovanteActionResult> {
  const usuario = await getCurrentUsuario()
  if (!usuario) {
    return { success: false, error: 'Não autenticado' }
  }

  const file = formData.get('file') as File | null
  const gastoId = formData.get('gastoId') as string | null
  const contentType = formData.get('contentType') as string | null

  if (!file || !gastoId || !contentType) {
    return { success: false, error: 'Dados incompletos para upload' }
  }

  const supabase = await createClient()

  // Verify the gasto belongs to the user's empresa
  const { data: gasto, error: gastoError } = await supabase
    .from('gasto')
    .select('id, empresa_id')
    .eq('id', gastoId)
    .single()

  if (gastoError || !gasto) {
    return { success: false, error: 'Gasto não encontrado' }
  }

  if (gasto.empresa_id !== usuario.empresa_id) {
    return { success: false, error: 'Permissão insuficiente' }
  }

  // Build storage path: {empresa_id}/{gasto_id}/{timestamp}.{ext}
  const timestamp = Date.now()
  const ext = contentType === 'application/pdf' ? 'pdf' : 'jpg'
  const storagePath = `${usuario.empresa_id}/${gastoId}/${timestamp}.${ext}`

  // Upload to Storage
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, {
      contentType,
      upsert: false,
    })

  if (uploadError) {
    return { success: false, error: `Erro no upload: ${uploadError.message}` }
  }

  // Create DB record
  const { data: comprovante, error: insertError } = await supabase
    .from('foto_comprovante')
    .insert({
      empresa_id: usuario.empresa_id,
      gasto_id: gastoId,
      storage_path: storagePath,
      content_type: contentType,
      size_bytes: file.size,
    })
    .select()
    .single()

  if (insertError) {
    // Rollback: remove uploaded file
    await supabase.storage.from(BUCKET).remove([storagePath])
    return { success: false, error: 'Erro ao registrar comprovante' }
  }

  // Update foto_url on gasto with signed URL
  const { data: signedUrlData } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_EXPIRY)

  if (signedUrlData?.signedUrl) {
    await supabase
      .from('gasto')
      .update({ foto_url: storagePath })
      .eq('id', gastoId)
  }

  revalidatePath('/gastos')
  revalidatePath(`/gastos/${gastoId}`)
  return { success: true, comprovante }
}

/**
 * Delete a comprovante from Storage and DB.
 */
export async function deleteComprovante(
  comprovanteId: string,
): Promise<ComprovanteActionResult> {
  const usuario = await getCurrentUsuario()
  if (!usuario) {
    return { success: false, error: 'Não autenticado' }
  }

  const supabase = await createClient()

  // Fetch the comprovante record
  const { data: comprovante, error: fetchError } = await supabase
    .from('foto_comprovante')
    .select('*')
    .eq('id', comprovanteId)
    .single()

  if (fetchError || !comprovante) {
    return { success: false, error: 'Comprovante não encontrado' }
  }

  if (comprovante.empresa_id !== usuario.empresa_id) {
    return { success: false, error: 'Permissão insuficiente' }
  }

  // Delete from Storage
  const { error: storageError } = await supabase.storage
    .from(BUCKET)
    .remove([comprovante.storage_path])

  if (storageError) {
    return { success: false, error: `Erro ao remover arquivo: ${storageError.message}` }
  }

  // Delete DB record
  const { error: deleteError } = await supabase
    .from('foto_comprovante')
    .delete()
    .eq('id', comprovanteId)

  if (deleteError) {
    return { success: false, error: 'Erro ao remover registro' }
  }

  // Check if this was the last comprovante for the gasto — clear foto_url
  const { data: remaining } = await supabase
    .from('foto_comprovante')
    .select('id, storage_path')
    .eq('gasto_id', comprovante.gasto_id)
    .order('uploaded_at', { ascending: false })
    .limit(1)

  if (remaining && remaining.length > 0) {
    // Update foto_url to the most recent remaining comprovante
    await supabase
      .from('gasto')
      .update({ foto_url: remaining[0].storage_path })
      .eq('id', comprovante.gasto_id)
  } else {
    // No comprovantes left — clear foto_url
    await supabase
      .from('gasto')
      .update({ foto_url: null })
      .eq('id', comprovante.gasto_id)
  }

  revalidatePath('/gastos')
  revalidatePath(`/gastos/${comprovante.gasto_id}`)
  return { success: true }
}

/**
 * List all comprovantes for a gasto, with signed URLs.
 */
export async function listComprovantes(
  gastoId: string,
): Promise<ComprovantesListResult> {
  const usuario = await getCurrentUsuario()
  if (!usuario) {
    return { success: false, error: 'Não autenticado' }
  }

  const supabase = await createClient()

  const { data: comprovantes, error } = await supabase
    .from('foto_comprovante')
    .select('*')
    .eq('gasto_id', gastoId)
    .order('uploaded_at', { ascending: false })

  if (error) {
    return { success: false, error: error.message }
  }

  if (!comprovantes || comprovantes.length === 0) {
    return { success: true, data: [] }
  }

  // Generate signed URLs for each comprovante
  const withUrls = await Promise.all(
    comprovantes.map(async (comp) => {
      const { data: signedUrlData } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(comp.storage_path, SIGNED_URL_EXPIRY)

      return {
        ...comp,
        url: signedUrlData?.signedUrl ?? '',
      }
    }),
  )

  return { success: true, data: withUrls }
}
