/**
 * Types for the FotoChamada (chamada photo) domain.
 * Story 23.2 — Upload mobile da chamada no lancamento de viagem
 */

/**
 * FotoChamada entity as stored in the database.
 * Matches the `foto_chamada` table schema.
 */
export interface FotoChamada {
  id: string
  empresa_id: string
  viagem_id: string
  storage_path: string
  thumbnail_path: string | null
  content_type: string | null
  size_bytes: number | null
  uploaded_at: string
  created_at: string
}

/**
 * FotoChamada with a signed URL for display.
 */
export interface FotoChamadaWithUrl extends FotoChamada {
  url: string
}

/**
 * Result from upload operations on chamada.
 */
export interface ChamadaActionResult {
  success: boolean
  error?: string
  chamada?: FotoChamada
}

/**
 * Result from listing chamadas for a viagem.
 */
export interface ChamadasListResult {
  success: boolean
  error?: string
  data?: FotoChamadaWithUrl[]
}
