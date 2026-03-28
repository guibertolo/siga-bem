-- Migration: Create motorista_caminhao junction table with RLS
-- Story: 1.5 — Vinculacao Motorista-Caminhao
-- Date: 2026-03-28

-- ---------------------------------------------------------------------------
-- 1. TABLE: motorista_caminhao (N:N with history)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS motorista_caminhao (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id   UUID NOT NULL REFERENCES empresa(id) ON DELETE RESTRICT,
  motorista_id UUID NOT NULL REFERENCES motorista(id) ON DELETE RESTRICT,
  caminhao_id  UUID NOT NULL REFERENCES caminhao(id) ON DELETE RESTRICT,
  data_inicio  DATE NOT NULL DEFAULT CURRENT_DATE,
  data_fim     DATE,
  ativo        BOOLEAN NOT NULL DEFAULT true,
  observacao   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT ck_mc_data_fim CHECK (data_fim IS NULL OR data_fim >= data_inicio)
);

COMMENT ON TABLE motorista_caminhao IS 'Historico de associacao motorista-caminhao. Apenas um vinculo ativo por caminhao.';
COMMENT ON COLUMN motorista_caminhao.ativo IS 'true = vinculo corrente. Apenas um vinculo ativo por caminhao (enforced by partial unique index).';
COMMENT ON COLUMN motorista_caminhao.data_fim IS 'NULL = vinculo ativo. Preenchido automaticamente ao encerrar vinculo.';

-- ---------------------------------------------------------------------------
-- 2. TRIGGER: auto-update updated_at
-- ---------------------------------------------------------------------------
CREATE TRIGGER trg_motorista_caminhao_updated_at
  BEFORE UPDATE ON motorista_caminhao
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. INDEXES
-- ---------------------------------------------------------------------------

-- Partial unique index: only one active assignment per truck
CREATE UNIQUE INDEX uq_caminhao_motorista_ativo
  ON motorista_caminhao (caminhao_id)
  WHERE ativo = true;

-- Performance indexes for common queries
CREATE INDEX idx_mc_empresa_id
  ON motorista_caminhao(empresa_id);

CREATE INDEX idx_mc_motorista_ativo
  ON motorista_caminhao(motorista_id)
  WHERE ativo = true;

CREATE INDEX idx_mc_caminhao_id
  ON motorista_caminhao(caminhao_id);

-- ---------------------------------------------------------------------------
-- 4. RLS: Enable and create policies
-- ---------------------------------------------------------------------------
ALTER TABLE motorista_caminhao ENABLE ROW LEVEL SECURITY;

-- Dono/admin: full access to all vinculos of their empresa
CREATE POLICY "Dono e admin gerenciam vinculos"
  ON motorista_caminhao FOR ALL
  USING (
    empresa_id = fn_get_empresa_id()
    AND fn_get_user_role() IN ('dono', 'admin')
  );

-- Motorista: read-only access to vinculos of their empresa
CREATE POLICY "Motorista visualiza vinculos da empresa"
  ON motorista_caminhao FOR SELECT
  USING (empresa_id = fn_get_empresa_id());
