/**
 * Types for the FotoComprovante (receipt photo) domain.
 * Story 2.2 — Upload de Fotos de Comprovantes
 */

/**
 * FotoComprovante entity as stored in the database.
 * Matches the `foto_comprovante` table schema.
 */
export interface FotoComprovante {
  id: string
  empresa_id: string
  gasto_id: string
  storage_path: string
  thumbnail_path: string | null
  content_type: string | null
  size_bytes: number | null
  uploaded_at: string
  created_at: string
}

/**
 * FotoComprovante with a signed URL for display.
 */
export interface FotoComprovanteWithUrl extends FotoComprovante {
  url: string
}

/**
 * Result from upload/delete operations.
 */
export interface ComprovanteActionResult {
  success: boolean
  error?: string
  comprovante?: FotoComprovante
}

/**
 * Result from listing comprovantes for a gasto.
 */
export interface ComprovantesListResult {
  success: boolean
  error?: string
  data?: FotoComprovanteWithUrl[]
}
