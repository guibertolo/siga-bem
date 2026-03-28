-- Migration: Create caminhao table with RLS
-- Story: 1.4 — Cadastro de Caminhoes
-- Date: 2026-03-28

-- ---------------------------------------------------------------------------
-- 1. CUSTOM TYPE: tipo_cegonha
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_cegonha') THEN
    CREATE TYPE tipo_cegonha AS ENUM ('aberta', 'fechada');
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- 2. TABLE: caminhao
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS caminhao (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id          UUID NOT NULL REFERENCES empresa(id) ON DELETE RESTRICT,
  placa               VARCHAR(8) NOT NULL,
  modelo              TEXT NOT NULL,
  marca               TEXT,
  ano                 INTEGER,
  renavam             VARCHAR(20),
  tipo_cegonha        tipo_cegonha NOT NULL DEFAULT 'aberta',
  capacidade_veiculos INTEGER NOT NULL DEFAULT 11,
  km_atual            INTEGER NOT NULL DEFAULT 0,
  ativo               BOOLEAN NOT NULL DEFAULT true,
  observacao          TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT ck_caminhao_capacidade CHECK (capacidade_veiculos >= 1 AND capacidade_veiculos <= 15),
  CONSTRAINT ck_caminhao_km CHECK (km_atual >= 0),
  CONSTRAINT ck_caminhao_ano CHECK (ano IS NULL OR (ano >= 1970 AND ano <= EXTRACT(YEAR FROM NOW()) + 1)),
  CONSTRAINT uq_caminhao_placa_empresa UNIQUE (empresa_id, placa)
);

COMMENT ON TABLE caminhao IS 'Caminhao cegonheiro. Placa unica por empresa.';
COMMENT ON COLUMN caminhao.placa IS 'Placa sem hifen, uppercase. Mercosul (ABC1D23) ou antigo (ABC1234).';
COMMENT ON COLUMN caminhao.km_atual IS 'Quilometragem atual do caminhao em km.';
COMMENT ON COLUMN caminhao.capacidade_veiculos IS 'Quantidade maxima de veiculos que a cegonha transporta (1-15).';

-- ---------------------------------------------------------------------------
-- 3. TRIGGER: auto-update updated_at
-- ---------------------------------------------------------------------------
CREATE TRIGGER trg_caminhao_updated_at
  BEFORE UPDATE ON caminhao
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ---------------------------------------------------------------------------
-- 4. INDEX: placa per empresa (covered by UNIQUE constraint above)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_caminhao_empresa_ativo
  ON caminhao(empresa_id) WHERE ativo = true;

-- ---------------------------------------------------------------------------
-- 5. RLS: Enable and create policies
-- ---------------------------------------------------------------------------
ALTER TABLE caminhao ENABLE ROW LEVEL SECURITY;

-- Dono/admin: full access to all caminhoes of their empresa
CREATE POLICY "Dono e admin gerenciam caminhoes"
  ON caminhao FOR ALL
  USING (
    empresa_id = fn_get_empresa_id()
    AND fn_get_user_role() IN ('dono', 'admin')
  );

-- Motorista: read-only access to caminhoes of their empresa
CREATE POLICY "Motorista visualiza caminhoes da empresa"
  ON caminhao FOR SELECT
  USING (empresa_id = fn_get_empresa_id());
