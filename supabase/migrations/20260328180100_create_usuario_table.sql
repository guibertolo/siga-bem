-- =============================================================================
-- Migration: Create usuario table + RLS policies + helper functions
-- Story: 1.6 — Gestao de Usuarios e Perfis
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. CUSTOM TYPE: usuario_role enum
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE usuario_role AS ENUM ('dono', 'motorista', 'admin');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- 2. HELPER FUNCTION: auto-update updated_at (idempotent)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- 3. TABLE: usuario
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuario (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id    UUID NOT NULL UNIQUE,  -- references auth.users(id)
  empresa_id UUID NOT NULL REFERENCES empresa(id) ON DELETE RESTRICT,
  motorista_id UUID,  -- FK added in migration 180200 after motorista table exists
  nome       TEXT NOT NULL,
  email      TEXT NOT NULL,
  telefone   VARCHAR(20),
  role       usuario_role NOT NULL DEFAULT 'motorista',
  ativo      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE usuario IS 'Usuario da plataforma, vinculado ao Supabase Auth via auth_id.';
COMMENT ON COLUMN usuario.auth_id IS 'FK para auth.users(id) do Supabase Auth.';
COMMENT ON COLUMN usuario.motorista_id IS 'Vinculo opcional com registro motorista (para role motorista).';

-- Trigger: auto-update updated_at
DROP TRIGGER IF EXISTS trg_usuario_updated_at ON usuario;
CREATE TRIGGER trg_usuario_updated_at
  BEFORE UPDATE ON usuario
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ---------------------------------------------------------------------------
-- 4. INDEXES
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_usuario_empresa ON usuario (empresa_id);
CREATE INDEX IF NOT EXISTS idx_usuario_auth ON usuario (auth_id);
CREATE INDEX IF NOT EXISTS idx_usuario_email ON usuario (email);
CREATE INDEX IF NOT EXISTS idx_usuario_role ON usuario (empresa_id, role);

-- ---------------------------------------------------------------------------
-- 5. RLS HELPER FUNCTIONS (SECURITY DEFINER)
-- ---------------------------------------------------------------------------

-- Drop placeholder functions from migration 180000 (return type changes from TEXT to specific types)
DROP FUNCTION IF EXISTS fn_get_empresa_id() CASCADE;
DROP FUNCTION IF EXISTS fn_get_user_role() CASCADE;
DROP FUNCTION IF EXISTS fn_get_motorista_id() CASCADE;

-- fn_get_empresa_id: returns empresa_id for the authenticated user
CREATE OR REPLACE FUNCTION fn_get_empresa_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT empresa_id FROM usuario WHERE auth_id = auth.uid() LIMIT 1;
$$;

COMMENT ON FUNCTION fn_get_empresa_id IS 'Retorna empresa_id do usuario autenticado via Supabase Auth.';

-- fn_get_user_role: returns role for the authenticated user
CREATE OR REPLACE FUNCTION fn_get_user_role()
RETURNS usuario_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM usuario WHERE auth_id = auth.uid() LIMIT 1;
$$;

COMMENT ON FUNCTION fn_get_user_role IS 'Retorna role do usuario autenticado (dono/admin/motorista).';

-- fn_get_motorista_id: placeholder (real implementation in migration 180200 after motorista table)
CREATE OR REPLACE FUNCTION fn_get_motorista_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NULL::UUID;
$$;

-- ---------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------
ALTER TABLE usuario ENABLE ROW LEVEL SECURITY;

-- Policy: dono/admin can see all users in their empresa
CREATE POLICY "usuario_select_empresa"
  ON usuario FOR SELECT
  USING (empresa_id = fn_get_empresa_id());

-- Policy: dono/admin can insert users in their empresa
CREATE POLICY "usuario_insert_empresa"
  ON usuario FOR INSERT
  WITH CHECK (
    empresa_id = fn_get_empresa_id()
    AND fn_get_user_role() IN ('dono', 'admin')
  );

-- Policy: dono/admin can update users in their empresa; motorista can update own profile
CREATE POLICY "usuario_update_empresa"
  ON usuario FOR UPDATE
  USING (
    empresa_id = fn_get_empresa_id()
    AND (
      fn_get_user_role() IN ('dono', 'admin')
      OR auth_id = auth.uid()
    )
  );

-- Policy: motorista can see own profile (covered by empresa select above,
-- but this ensures even if empresa policy changes, motorista always sees self)
CREATE POLICY "usuario_select_self"
  ON usuario FOR SELECT
  USING (auth_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 7. RECREATE empresa RLS policies (dropped by CASCADE on fn_get_empresa_id)
-- ---------------------------------------------------------------------------
CREATE POLICY "Usuarios visualizam propria empresa"
  ON empresa FOR SELECT
  USING (id = fn_get_empresa_id());

CREATE POLICY "Dono edita propria empresa"
  ON empresa FOR UPDATE
  USING (id = fn_get_empresa_id() AND fn_get_user_role() = 'dono');
