-- =============================================================================
-- Story 7.1: Multi-empresa support — Tabela usuario_empresa e Backfill
-- =============================================================================
-- This migration creates the usuario_empresa junction table, backfills existing
-- user-company relationships, updates fn_get_user_role() to read from the new
-- table, and adds fn_switch_empresa() + fn_get_user_empresas() functions.
--
-- fn_get_empresa_id() is NOT modified — all existing RLS policies remain intact.
-- =============================================================================

-- =============================================================================
-- 1. CREATE TABLE usuario_empresa
-- =============================================================================
CREATE TABLE usuario_empresa (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id  UUID NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  empresa_id  UUID NOT NULL REFERENCES empresa(id) ON DELETE RESTRICT,
  role        usuario_role NOT NULL DEFAULT 'admin',
  ativo       BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_usuario_empresa UNIQUE (usuario_id, empresa_id)
);

COMMENT ON TABLE usuario_empresa IS 'Junction table: many-to-many between usuario and empresa with per-empresa role.';

-- =============================================================================
-- 2. INDEXES (partial, for active records only)
-- =============================================================================
CREATE INDEX idx_ue_usuario ON usuario_empresa (usuario_id) WHERE ativo = true;
CREATE INDEX idx_ue_empresa ON usuario_empresa (empresa_id) WHERE ativo = true;

-- =============================================================================
-- 3. UPDATED_AT TRIGGER (fn_set_updated_at already exists from empresa migration)
-- =============================================================================
CREATE TRIGGER trg_ue_updated_at
  BEFORE UPDATE ON usuario_empresa
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- =============================================================================
-- 4. BACKFILL — Copy existing usuario→empresa relationships
-- =============================================================================
INSERT INTO usuario_empresa (usuario_id, empresa_id, role)
SELECT id, empresa_id, role
FROM usuario
WHERE empresa_id IS NOT NULL
ON CONFLICT (usuario_id, empresa_id) DO NOTHING;

-- =============================================================================
-- 5. ALTER usuario — make empresa_id nullable + add ultima_empresa_id
-- =============================================================================
ALTER TABLE usuario ALTER COLUMN empresa_id DROP NOT NULL;
ALTER TABLE usuario ADD COLUMN ultima_empresa_id UUID REFERENCES empresa(id);

-- =============================================================================
-- 6. UPDATE fn_get_user_role() — now reads from usuario_empresa via JOIN
--    Same name, same return type (usuario_role cast to TEXT is handled by callers).
--    fn_get_empresa_id() is NOT touched.
-- =============================================================================
CREATE OR REPLACE FUNCTION fn_get_user_role()
RETURNS usuario_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ue.role
  FROM usuario u
  JOIN usuario_empresa ue ON ue.usuario_id = u.id AND ue.empresa_id = u.empresa_id
  WHERE u.auth_id = auth.uid()
    AND ue.ativo = true
  LIMIT 1;
$$;

COMMENT ON FUNCTION fn_get_user_role IS 'Retorna role do usuario autenticado na empresa ativa (via usuario_empresa JOIN).';

-- =============================================================================
-- 7. fn_switch_empresa — Switch active empresa for authenticated user
-- =============================================================================
CREATE OR REPLACE FUNCTION fn_switch_empresa(p_empresa_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usuario_id UUID;
  v_new_role   usuario_role;
BEGIN
  -- Find authenticated user
  SELECT id INTO v_usuario_id
  FROM usuario
  WHERE auth_id = auth.uid();

  IF v_usuario_id IS NULL THEN
    RAISE EXCEPTION 'Usuario nao encontrado';
  END IF;

  -- Validate active binding exists
  SELECT ue.role INTO v_new_role
  FROM usuario_empresa ue
  WHERE ue.usuario_id = v_usuario_id
    AND ue.empresa_id = p_empresa_id
    AND ue.ativo = true;

  IF v_new_role IS NULL THEN
    RAISE EXCEPTION 'Sem vinculo ativo com esta empresa';
  END IF;

  -- Atomically switch empresa and sync role
  UPDATE usuario
  SET empresa_id = p_empresa_id,
      role = v_new_role,
      ultima_empresa_id = empresa_id
  WHERE id = v_usuario_id;

  RETURN true;
END;
$$;

COMMENT ON FUNCTION fn_switch_empresa IS 'Troca empresa ativa do usuario autenticado. Valida vinculo ativo, sincroniza role.';

-- =============================================================================
-- 8. fn_get_user_empresas — List all empresas for authenticated user
-- =============================================================================
CREATE OR REPLACE FUNCTION fn_get_user_empresas()
RETURNS TABLE (
  empresa_id    UUID,
  razao_social  TEXT,
  nome_fantasia TEXT,
  cnpj          TEXT,
  role          usuario_role,
  is_active     BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    e.id          AS empresa_id,
    e.razao_social,
    e.nome_fantasia,
    e.cnpj,
    ue.role,
    (ue.empresa_id = u.empresa_id) AS is_active
  FROM usuario u
  JOIN usuario_empresa ue ON ue.usuario_id = u.id AND ue.ativo = true
  JOIN empresa e ON e.id = ue.empresa_id
  WHERE u.auth_id = auth.uid();
$$;

COMMENT ON FUNCTION fn_get_user_empresas IS 'Retorna todas as empresas ativas vinculadas ao usuario autenticado.';

-- =============================================================================
-- 9. RLS — 5 policies on usuario_empresa
-- =============================================================================
ALTER TABLE usuario_empresa ENABLE ROW LEVEL SECURITY;

-- 9a. ue_select_own: user sees their own bindings
CREATE POLICY ue_select_own ON usuario_empresa
  FOR SELECT
  USING (
    usuario_id = (SELECT id FROM usuario WHERE auth_id = auth.uid())
  );

-- 9b. ue_select_empresa: dono/admin sees all bindings in their empresa
CREATE POLICY ue_select_empresa ON usuario_empresa
  FOR SELECT
  USING (
    empresa_id = fn_get_empresa_id()
    AND fn_get_user_role() IN ('dono', 'admin')
  );

-- 9c. ue_insert_dono: dono can add bindings to their empresa
CREATE POLICY ue_insert_dono ON usuario_empresa
  FOR INSERT
  WITH CHECK (
    empresa_id = fn_get_empresa_id()
    AND fn_get_user_role() = 'dono'
  );

-- 9d. ue_update_dono: dono can change role/ativo in their empresa
CREATE POLICY ue_update_dono ON usuario_empresa
  FOR UPDATE
  USING (
    empresa_id = fn_get_empresa_id()
    AND fn_get_user_role() = 'dono'
  );

-- 9e. ue_delete_dono: dono can remove bindings (except their own)
CREATE POLICY ue_delete_dono ON usuario_empresa
  FOR DELETE
  USING (
    empresa_id = fn_get_empresa_id()
    AND fn_get_user_role() = 'dono'
    AND usuario_id != (SELECT id FROM usuario WHERE auth_id = auth.uid())
  );

-- =============================================================================
-- ROLLBACK SCRIPT (run manually if needed)
-- =============================================================================
-- DROP POLICY IF EXISTS ue_delete_dono ON usuario_empresa;
-- DROP POLICY IF EXISTS ue_update_dono ON usuario_empresa;
-- DROP POLICY IF EXISTS ue_insert_dono ON usuario_empresa;
-- DROP POLICY IF EXISTS ue_select_empresa ON usuario_empresa;
-- DROP POLICY IF EXISTS ue_select_own ON usuario_empresa;
--
-- DROP FUNCTION IF EXISTS fn_get_user_empresas();
-- DROP FUNCTION IF EXISTS fn_switch_empresa(UUID);
--
-- -- Restore original fn_get_user_role (reads directly from usuario.role)
-- CREATE OR REPLACE FUNCTION fn_get_user_role()
-- RETURNS usuario_role
-- LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
-- AS $$ SELECT role FROM usuario WHERE auth_id = auth.uid() LIMIT 1; $$;
--
-- ALTER TABLE usuario DROP COLUMN IF EXISTS ultima_empresa_id;
-- ALTER TABLE usuario ALTER COLUMN empresa_id SET NOT NULL;
--
-- DROP TABLE IF EXISTS usuario_empresa;
