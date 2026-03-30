-- =============================================================================
-- Migration: Add missing performance indexes on foreign keys
-- Quick Win 7 — Database Performance Indexes
-- Timestamp: 20260330
-- =============================================================================
-- Only indexes NOT already covered by existing migrations are added here.
-- Existing coverage:
--   gasto(empresa_id)    -> idx_gasto_empresa_data (leading col)
--   gasto(motorista_id)  -> idx_gasto_motorista
--   gasto(caminhao_id)   -> idx_gasto_caminhao
--   gasto(categoria_id)  -> idx_gasto_categoria
--   viagem(empresa_id)   -> idx_viagem_empresa_status (leading col)
--   viagem(motorista_id) -> idx_viagem_motorista_data (leading col)
--   viagem(status)       -> idx_viagem_empresa_status (composite)
--   motorista(empresa_id)-> idx_motorista_empresa
--   caminhao(empresa_id) -> idx_caminhao_empresa_ativo
--   usuario(empresa_id)  -> idx_usuario_empresa
--   usuario(auth_id)     -> idx_usuario_auth
--   fechamento(empresa_id, motorista_id) -> idx_fechamento_empresa_motorista
--   fechamento(status)   -> idx_fechamento_status
--   foto_comprovante(gasto_id) -> idx_foto_comprovante_gasto
-- =============================================================================

-- 1. gasto.viagem_id — FK lookup for trip-related expenses
CREATE INDEX IF NOT EXISTS idx_gasto_viagem
  ON gasto (viagem_id) WHERE viagem_id IS NOT NULL;

-- 2. gasto.data — standalone date index for date-range queries without empresa filter
CREATE INDEX IF NOT EXISTS idx_gasto_data
  ON gasto (data DESC);

-- 3. viagem.caminhao_id — FK lookup for truck-related trip queries
CREATE INDEX IF NOT EXISTS idx_viagem_caminhao
  ON viagem (caminhao_id);
