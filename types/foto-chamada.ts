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
 * Result from upload operations on chamada.
 */
export interface ChamadaActionResult {
  success: boolean
  error?: string
  chamada?: FotoChamada
}
