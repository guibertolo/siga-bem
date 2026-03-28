-- =============================================================================
-- Migration: Create motorista table + RLS policies
-- Story: 1.3 — Cadastro de Motoristas
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. CUSTOM TYPES
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE motorista_status AS ENUM ('ativo', 'inativo');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE cnh_categoria AS ENUM ('A', 'B', 'C', 'D', 'E', 'AB', 'AC', 'AD', 'AE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- 2. TABLE: motorista
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS motorista (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id      UUID NOT NULL REFERENCES empresa(id) ON DELETE RESTRICT,
  usuario_id      UUID REFERENCES usuario(id) ON DELETE SET NULL,
  nome            TEXT NOT NULL,
  cpf             VARCHAR(14) NOT NULL,  -- formatted: 000.000.000-00
  cnh_numero      VARCHAR(20) NOT NULL,
  cnh_categoria   cnh_categoria NOT NULL DEFAULT 'E',
  cnh_validade    DATE NOT NULL,
  telefone        VARCHAR(20),
  status          motorista_status NOT NULL DEFAULT 'ativo',
  observacao      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT ck_motorista_cpf_format CHECK (cpf ~ '^\d{3}\.\d{3}\.\d{3}-\d{2}$'),
  CONSTRAINT uq_motorista_cpf_empresa UNIQUE (empresa_id, cpf)
);

COMMENT ON TABLE motorista IS 'Motorista de cegonheiro. CPF unico por empresa.';
COMMENT ON COLUMN motorista.usuario_id IS 'Vinculo opcional com usuario da plataforma (para login via app).';
COMMENT ON COLUMN motorista.cpf IS 'CPF formatado: 000.000.000-00';

-- Trigger: auto-update updated_at
DROP TRIGGER IF EXISTS trg_motorista_updated_at ON motorista;
CREATE TRIGGER trg_motorista_updated_at
  BEFORE UPDATE ON motorista
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. INDEXES
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_motorista_empresa ON motorista (empresa_id);
CREATE INDEX IF NOT EXISTS idx_motorista_status ON motorista (empresa_id, status);
CREATE INDEX IF NOT EXISTS idx_motorista_cnh_validade ON motorista (empresa_id, cnh_validade);

-- ---------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------
ALTER TABLE motorista ENABLE ROW LEVEL SECURITY;

-- Policy: dono/admin can manage all motoristas in their empresa
CREATE POLICY "motorista_select_empresa"
  ON motorista FOR SELECT
  USING (
    empresa_id = fn_get_empresa_id()
    AND fn_get_user_role() IN ('dono', 'admin')
  );

CREATE POLICY "motorista_insert_empresa"
  ON motorista FOR INSERT
  WITH CHECK (
    empresa_id = fn_get_empresa_id()
    AND fn_get_user_role() IN ('dono', 'admin')
  );

CREATE POLICY "motorista_update_empresa"
  ON motorista FOR UPDATE
  USING (
    empresa_id = fn_get_empresa_id()
    AND fn_get_user_role() IN ('dono', 'admin')
  );

-- Policy: motorista can see own record
CREATE POLICY "motorista_select_self"
  ON motorista FOR SELECT
  USING (id = fn_get_motorista_id());
