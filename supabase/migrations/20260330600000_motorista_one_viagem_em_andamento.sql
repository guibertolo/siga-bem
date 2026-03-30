-- =============================================================================
-- Migration: Enforce max 1 viagem em_andamento per motorista
-- Reason: Um motorista nao pode viajar para 2 destinos ao mesmo tempo
-- =============================================================================

-- Partial unique index: only one em_andamento row per motorista
CREATE UNIQUE INDEX IF NOT EXISTS idx_viagem_one_em_andamento_per_motorista
  ON viagem (motorista_id)
  WHERE status = 'em_andamento';

COMMENT ON INDEX idx_viagem_one_em_andamento_per_motorista IS
  'Garante que cada motorista tenha no maximo 1 viagem em_andamento simultaneamente';
