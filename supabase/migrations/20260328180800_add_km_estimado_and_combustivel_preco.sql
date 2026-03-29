-- =============================================================================
-- Migration: Story 3.3 — Estimativa de Custo e Precificacao
-- Adds km_estimado to viagem and creates combustivel_preco table.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Add km_estimado column to viagem
-- ---------------------------------------------------------------------------
ALTER TABLE viagem
  ADD COLUMN km_estimado INTEGER CHECK (km_estimado IS NULL OR km_estimado > 0);

COMMENT ON COLUMN viagem.km_estimado IS 'Distancia estimada da viagem em km. Input manual (sem integracao API mapa no MVP).';

-- ---------------------------------------------------------------------------
-- 2. Create combustivel_tipo enum
-- ---------------------------------------------------------------------------
CREATE TYPE combustivel_tipo AS ENUM ('diesel_s10', 'diesel_comum');

-- ---------------------------------------------------------------------------
-- 3. Create combustivel_preco table
-- ---------------------------------------------------------------------------
CREATE TABLE combustivel_preco (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id       UUID NOT NULL REFERENCES empresa(id) ON DELETE RESTRICT,
  regiao           TEXT NOT NULL DEFAULT 'Geral',
  tipo             combustivel_tipo NOT NULL DEFAULT 'diesel_s10',
  preco_centavos   INTEGER NOT NULL CHECK (preco_centavos > 0),
  data_referencia  DATE NOT NULL DEFAULT CURRENT_DATE,
  fonte            TEXT,
  ativo            BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE combustivel_preco IS 'Precos de referencia de combustivel por empresa e regiao.';
COMMENT ON COLUMN combustivel_preco.preco_centavos IS 'Preco por litro em centavos. Ex: 650 = R$ 6,50.';
COMMENT ON COLUMN combustivel_preco.regiao IS 'Regiao de referencia. Ex: Sul, Sudeste, Geral.';

-- ---------------------------------------------------------------------------
-- 4. RLS on combustivel_preco
-- ---------------------------------------------------------------------------
ALTER TABLE combustivel_preco ENABLE ROW LEVEL SECURITY;

CREATE POLICY "empresa_combustivel_all"
  ON combustivel_preco FOR ALL
  USING (empresa_id = fn_get_empresa_id())
  WITH CHECK (empresa_id = fn_get_empresa_id());

-- ---------------------------------------------------------------------------
-- 5. Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX idx_combustivel_empresa ON combustivel_preco (empresa_id, ativo);
CREATE INDEX idx_combustivel_data ON combustivel_preco (empresa_id, data_referencia DESC);

-- ---------------------------------------------------------------------------
-- 6. Updated_at trigger
-- ---------------------------------------------------------------------------
CREATE TRIGGER trg_combustivel_updated_at
  BEFORE UPDATE ON combustivel_preco
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
