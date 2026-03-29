-- =============================================================================
-- Migration: Create viagem table with RLS policies
-- Story: 3.1 — CRUD de Viagens
-- Timestamp: 20260328180700
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. CUSTOM TYPE: viagem_status enum
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE viagem_status AS ENUM ('planejada', 'em_andamento', 'concluida', 'cancelada');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- 1. TABLE: viagem
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS viagem (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id            UUID NOT NULL REFERENCES empresa(id) ON DELETE RESTRICT,
  motorista_id          UUID NOT NULL REFERENCES motorista(id) ON DELETE RESTRICT,
  caminhao_id           UUID NOT NULL REFERENCES caminhao(id) ON DELETE RESTRICT,
  origem                TEXT NOT NULL,
  destino               TEXT NOT NULL,
  data_saida            TIMESTAMPTZ NOT NULL,
  data_chegada_prevista TIMESTAMPTZ,
  data_chegada_real     TIMESTAMPTZ,
  valor_total           INTEGER NOT NULL DEFAULT 0,  -- centavos
  percentual_pagamento  NUMERIC(5,2) NOT NULL DEFAULT 0,  -- e.g. 25.50 = 25.5%
  status                viagem_status NOT NULL DEFAULT 'planejada',
  km_saida              INTEGER,
  km_chegada            INTEGER,
  observacao            TEXT,
  created_by            UUID REFERENCES usuario(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT ck_viagem_valor CHECK (valor_total >= 0),
  CONSTRAINT ck_viagem_percentual CHECK (percentual_pagamento >= 0 AND percentual_pagamento <= 100),
  CONSTRAINT ck_viagem_chegada CHECK (data_chegada_real IS NULL OR data_chegada_real >= data_saida),
  CONSTRAINT ck_viagem_km CHECK (km_chegada IS NULL OR km_saida IS NULL OR km_chegada >= km_saida)
);

COMMENT ON TABLE viagem IS 'Viagem de transporte de veiculos. Valores monetarios em centavos.';
COMMENT ON COLUMN viagem.valor_total IS 'Valor total da viagem em centavos (R$ 1.500,00 = 150000).';
COMMENT ON COLUMN viagem.percentual_pagamento IS 'Percentual de pagamento ao motorista. Ex: 25.50 = 25,5%.';

-- ---------------------------------------------------------------------------
-- 2. TRIGGER: auto-update updated_at
-- ---------------------------------------------------------------------------
CREATE TRIGGER trg_viagem_updated_at
  BEFORE UPDATE ON viagem
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. INDEXES
-- ---------------------------------------------------------------------------
CREATE INDEX idx_viagem_empresa_status ON viagem (empresa_id, status);
CREATE INDEX idx_viagem_motorista_data ON viagem (motorista_id, data_saida DESC);
CREATE INDEX idx_viagem_empresa_data ON viagem (empresa_id, data_saida DESC);

-- ---------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------
ALTER TABLE viagem ENABLE ROW LEVEL SECURITY;

-- Dono/admin see all viagens of their empresa; motorista sees only own
CREATE POLICY viagem_select ON viagem
  FOR SELECT USING (
    empresa_id = fn_get_empresa_id()
    AND (
      fn_get_user_role() IN ('dono', 'admin')
      OR motorista_id = fn_get_motorista_id()
    )
  );

-- Only dono/admin can create viagens
CREATE POLICY viagem_insert ON viagem
  FOR INSERT WITH CHECK (
    empresa_id = fn_get_empresa_id()
    AND fn_get_user_role() IN ('dono', 'admin')
  );

-- Dono/admin can update any; motorista can update own (status changes)
CREATE POLICY viagem_update ON viagem
  FOR UPDATE USING (
    empresa_id = fn_get_empresa_id()
    AND (
      fn_get_user_role() IN ('dono', 'admin')
      OR motorista_id = fn_get_motorista_id()
    )
  );

-- Only dono/admin can delete viagens
CREATE POLICY viagem_delete ON viagem
  FOR DELETE USING (
    empresa_id = fn_get_empresa_id()
    AND fn_get_user_role() IN ('dono', 'admin')
  );

-- ---------------------------------------------------------------------------
-- 5. VIEW: viagens ativas (em_andamento) for dashboard card
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW view_viagens_ativas AS
SELECT
  v.id,
  v.empresa_id,
  v.motorista_id,
  v.caminhao_id,
  v.origem,
  v.destino,
  v.data_saida,
  v.valor_total,
  v.percentual_pagamento,
  m.nome AS motorista_nome,
  c.placa AS caminhao_placa
FROM viagem v
JOIN motorista m ON m.id = v.motorista_id
JOIN caminhao c ON c.id = v.caminhao_id
WHERE v.status = 'em_andamento';

-- ---------------------------------------------------------------------------
-- 6. FK: gasto.viagem_id -> viagem(id) (deferred from migration 20260328180500)
-- ---------------------------------------------------------------------------
ALTER TABLE gasto ADD CONSTRAINT fk_gasto_viagem
  FOREIGN KEY (viagem_id) REFERENCES viagem(id) ON DELETE SET NULL;
