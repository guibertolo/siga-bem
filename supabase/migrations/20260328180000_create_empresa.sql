-- Migration: Create empresa table with RLS
-- Story: 1.2 — Cadastro de Empresa
-- Date: 2026-03-28

-- ---------------------------------------------------------------------------
-- 1. EXTENSIONS (idempotent)
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------------------
-- 2. CUSTOM TYPE: plano_tipo
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'plano_tipo') THEN
    CREATE TYPE plano_tipo AS ENUM ('free', 'essencial', 'profissional', 'enterprise');
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- 3. HELPER FUNCTION: auto-update updated_at
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- 4. PLACEHOLDER HELPER FUNCTIONS for RLS (SECURITY DEFINER)
-- These return NULL until the usuario table exists (migration 20260328180100).
-- The usuario migration redefines them with real queries.
-- ---------------------------------------------------------------------------

-- fn_get_empresa_id: placeholder — returns NULL until usuario table exists
CREATE OR REPLACE FUNCTION fn_get_empresa_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NULL::UUID;
$$;

-- fn_get_user_role: placeholder — returns NULL until usuario table exists
CREATE OR REPLACE FUNCTION fn_get_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NULL::TEXT;
$$;

-- ---------------------------------------------------------------------------
-- 5. TABLE: empresa
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS empresa (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cnpj           VARCHAR(18) NOT NULL UNIQUE,
  razao_social   TEXT NOT NULL,
  nome_fantasia  TEXT,
  endereco       TEXT,
  cidade         TEXT,
  estado         CHAR(2),
  cep            VARCHAR(9),
  telefone       VARCHAR(20),
  email          TEXT,
  plano          plano_tipo NOT NULL DEFAULT 'free',
  max_caminhoes  INTEGER NOT NULL DEFAULT 3,
  ativa          BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT ck_empresa_cnpj_format CHECK (cnpj ~ '^\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}$'),
  CONSTRAINT ck_empresa_max_caminhoes CHECK (max_caminhoes > 0),
  CONSTRAINT ck_empresa_estado CHECK (estado IS NULL OR estado ~ '^[A-Z]{2}$')
);

COMMENT ON TABLE empresa IS 'Empresa cliente (tenant). Cada empresa opera isolada via RLS.';
COMMENT ON COLUMN empresa.cnpj IS 'CNPJ formatado: 00.000.000/0000-00';
COMMENT ON COLUMN empresa.max_caminhoes IS 'Limite de caminhoes conforme plano contratado.';

-- ---------------------------------------------------------------------------
-- 6. TRIGGER: auto-update updated_at
-- ---------------------------------------------------------------------------
CREATE TRIGGER trg_empresa_updated_at
  BEFORE UPDATE ON empresa
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ---------------------------------------------------------------------------
-- 7. INDEX: unique CNPJ (already via UNIQUE constraint, explicit for clarity)
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS idx_empresa_cnpj ON empresa(cnpj);

-- ---------------------------------------------------------------------------
-- 8. RLS: Enable and create policies
-- ---------------------------------------------------------------------------
ALTER TABLE empresa ENABLE ROW LEVEL SECURITY;

-- SELECT: user sees only their own empresa
CREATE POLICY "Usuarios visualizam propria empresa"
  ON empresa FOR SELECT
  USING (id = fn_get_empresa_id());

-- INSERT: authenticated users can create empresa (first-time registration)
CREATE POLICY "Usuarios autenticados criam empresa"
  ON empresa FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: only dono can edit their empresa
CREATE POLICY "Dono edita propria empresa"
  ON empresa FOR UPDATE
  USING (id = fn_get_empresa_id() AND fn_get_user_role() = 'dono');
