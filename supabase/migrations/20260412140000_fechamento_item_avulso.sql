-- =============================================================================
-- Migration: Add 'avulso' and 'ajuste' to fechamento_item_tipo enum
-- Story: 13.1 — Acertos de Conta v2
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. ADD ENUM VALUES: avulso, ajuste
-- ---------------------------------------------------------------------------
-- NOTE: ALTER TYPE ... ADD VALUE cannot run inside a transaction block.
-- Supabase migrations run each file as a single transaction by default.
-- Using IF NOT EXISTS to make it safe for re-runs.

ALTER TYPE fechamento_item_tipo ADD VALUE IF NOT EXISTS 'avulso';
ALTER TYPE fechamento_item_tipo ADD VALUE IF NOT EXISTS 'ajuste';

-- ---------------------------------------------------------------------------
-- 2. ADD COLUMN: descricao (for avulso/ajuste items)
-- ---------------------------------------------------------------------------
ALTER TABLE fechamento_item
  ADD COLUMN IF NOT EXISTS descricao TEXT;

-- Limit description length
ALTER TABLE fechamento_item
  ADD CONSTRAINT chk_fi_descricao_length
  CHECK (descricao IS NULL OR char_length(descricao) <= 200);

COMMENT ON COLUMN fechamento_item.descricao IS
  'Descrição do item avulso/ajuste. NULL para tipo=viagem/gasto.';

-- ---------------------------------------------------------------------------
-- 3. CONSTRAINT: referencia_id required for viagem/gasto, optional for avulso/ajuste
-- ---------------------------------------------------------------------------
ALTER TABLE fechamento_item
  ADD CONSTRAINT chk_fi_referencia_required
  CHECK (
    (tipo IN ('viagem', 'gasto') AND referencia_id IS NOT NULL)
    OR
    (tipo IN ('avulso', 'ajuste'))
  );

-- ---------------------------------------------------------------------------
-- 4. UNIQUE INDEX already exists from FIRE migration (idx_fechamento_item_viagem_unique)
--    It has WHERE tipo = 'viagem', so avulso/ajuste items are NOT constrained.
--    No changes needed.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- ROLLBACK (manual, if needed):
--
-- ALTER TABLE fechamento_item DROP CONSTRAINT IF EXISTS chk_fi_referencia_required;
-- ALTER TABLE fechamento_item DROP CONSTRAINT IF EXISTS chk_fi_descricao_length;
-- ALTER TABLE fechamento_item DROP COLUMN IF EXISTS descricao;
-- NOTE: Postgres does not support DROP VALUE from enum. To remove 'avulso'/'ajuste',
-- you would need to recreate the enum type entirely (rename, create, migrate, drop old).
-- ---------------------------------------------------------------------------
