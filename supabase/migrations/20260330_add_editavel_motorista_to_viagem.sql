-- =============================================================================
-- Migration: Add editavel_motorista column to viagem table
-- Story: 3.4 — Fluxo de Carga e Permissoes de Edicao
-- Timestamp: 20260330
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. ADD COLUMN: editavel_motorista
-- ---------------------------------------------------------------------------
ALTER TABLE viagem
  ADD COLUMN IF NOT EXISTS editavel_motorista BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN viagem.editavel_motorista IS
  'When false, motorista cannot edit origem/destino/valor_total. Set false when dono/admin creates the viagem.';

-- ---------------------------------------------------------------------------
-- 2. BACKFILL: viagens created by dono/admin get locked
-- ---------------------------------------------------------------------------
UPDATE viagem v
SET editavel_motorista = false
WHERE EXISTS (
  SELECT 1 FROM usuario u
  WHERE u.id = v.created_by
  AND u.role IN ('dono', 'admin')
);

-- Backfill conservador: viagens sem created_by (dados antigos) ficam locked
UPDATE viagem
SET editavel_motorista = false
WHERE created_by IS NULL;

-- ---------------------------------------------------------------------------
-- 3. UPDATE RLS: allow motorista to INSERT viagens
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS viagem_insert ON viagem;

CREATE POLICY viagem_insert ON viagem
  FOR INSERT WITH CHECK (
    empresa_id = fn_get_empresa_id()
    AND fn_get_user_role() IN ('dono', 'admin', 'motorista')
  );

-- ---------------------------------------------------------------------------
-- 4. INDEX: performance for motorista + editavel queries
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_viagem_editavel
  ON viagem (motorista_id, editavel_motorista);
