-- =============================================================================
-- Migration: Create fechamento + fechamento_item tables with RLS
-- Story: 4.1 — Fechamento Financeiro por Motorista
-- Timestamp: 20260328180900
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. CUSTOM TYPES
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE fechamento_tipo AS ENUM ('semanal', 'mensal');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE fechamento_status AS ENUM ('aberto', 'fechado', 'pago');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE fechamento_item_tipo AS ENUM ('gasto', 'viagem');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 1. TABLE: fechamento
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fechamento (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id        UUID NOT NULL REFERENCES empresa(id) ON DELETE RESTRICT,
  motorista_id      UUID NOT NULL REFERENCES motorista(id) ON DELETE RESTRICT,
  tipo              fechamento_tipo NOT NULL,
  status            fechamento_status NOT NULL DEFAULT 'aberto',
  periodo_inicio    DATE NOT NULL,
  periodo_fim       DATE NOT NULL,
  total_viagens     INTEGER NOT NULL DEFAULT 0,  -- centavos
  total_gastos      INTEGER NOT NULL DEFAULT 0,  -- centavos
  saldo_motorista   INTEGER NOT NULL DEFAULT 0,  -- centavos (viagens - gastos)
  observacao        TEXT,
  fechado_em        TIMESTAMPTZ,
  fechado_por       UUID REFERENCES usuario(id) ON DELETE SET NULL,
  pago_em           TIMESTAMPTZ,
  pago_por          UUID REFERENCES usuario(id) ON DELETE SET NULL,
  created_by        UUID REFERENCES usuario(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT ck_fechamento_periodo CHECK (periodo_fim >= periodo_inicio),
  CONSTRAINT ck_fechamento_total_viagens CHECK (total_viagens >= 0),
  CONSTRAINT ck_fechamento_total_gastos CHECK (total_gastos >= 0)
);

COMMENT ON TABLE fechamento IS 'Fechamento financeiro por motorista. Valores em centavos.';
COMMENT ON COLUMN fechamento.total_viagens IS 'Soma do valor_motorista de viagens concluidas no periodo, em centavos.';
COMMENT ON COLUMN fechamento.total_gastos IS 'Soma dos gastos do motorista no periodo, em centavos.';
COMMENT ON COLUMN fechamento.saldo_motorista IS 'total_viagens - total_gastos, em centavos. Pode ser negativo.';

-- ---------------------------------------------------------------------------
-- 2. TRIGGER: auto-update updated_at
-- ---------------------------------------------------------------------------
CREATE TRIGGER trg_fechamento_updated_at
  BEFORE UPDATE ON fechamento
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. INDEXES
-- ---------------------------------------------------------------------------
CREATE INDEX idx_fechamento_empresa_motorista ON fechamento (empresa_id, motorista_id);
CREATE INDEX idx_fechamento_empresa_periodo ON fechamento (empresa_id, periodo_inicio, periodo_fim);
CREATE INDEX idx_fechamento_motorista_periodo ON fechamento (motorista_id, periodo_inicio DESC);
CREATE INDEX idx_fechamento_status ON fechamento (status);

-- ---------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------
ALTER TABLE fechamento ENABLE ROW LEVEL SECURITY;

-- Dono/admin see all fechamentos of their empresa
CREATE POLICY fechamento_select ON fechamento
  FOR SELECT USING (
    empresa_id = fn_get_empresa_id()
    AND (
      fn_get_user_role() IN ('dono', 'admin')
      OR motorista_id = fn_get_motorista_id()
    )
  );

-- Only dono/admin can create fechamentos
CREATE POLICY fechamento_insert ON fechamento
  FOR INSERT WITH CHECK (
    empresa_id = fn_get_empresa_id()
    AND fn_get_user_role() IN ('dono', 'admin')
  );

-- Only dono/admin can update (fechar, pagar, reabrir)
CREATE POLICY fechamento_update ON fechamento
  FOR UPDATE USING (
    empresa_id = fn_get_empresa_id()
    AND fn_get_user_role() IN ('dono', 'admin')
  );

-- Only dono/admin can delete (only aberto)
CREATE POLICY fechamento_delete ON fechamento
  FOR DELETE USING (
    empresa_id = fn_get_empresa_id()
    AND fn_get_user_role() IN ('dono', 'admin')
  );

-- ---------------------------------------------------------------------------
-- 5. TABLE: fechamento_item
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fechamento_item (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fechamento_id   UUID NOT NULL REFERENCES fechamento(id) ON DELETE CASCADE,
  tipo            TEXT NOT NULL CHECK (tipo IN ('viagem', 'gasto')),
  referencia_id   UUID NOT NULL,  -- viagem.id or gasto.id
  descricao       TEXT NOT NULL,
  valor           INTEGER NOT NULL,  -- centavos (positive for viagem, positive for gasto)
  data            DATE NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE fechamento_item IS 'Itens do fechamento: viagens e gastos incluidos. Valores em centavos.';
COMMENT ON COLUMN fechamento_item.tipo IS 'viagem ou gasto — indica a origem do item.';
COMMENT ON COLUMN fechamento_item.referencia_id IS 'ID da viagem ou gasto de origem.';
COMMENT ON COLUMN fechamento_item.valor IS 'Valor em centavos. Viagem = valor_motorista, Gasto = valor do gasto.';

-- ---------------------------------------------------------------------------
-- 6. INDEXES for fechamento_item
-- ---------------------------------------------------------------------------
CREATE INDEX idx_fechamento_item_fechamento ON fechamento_item (fechamento_id);
CREATE INDEX idx_fechamento_item_referencia ON fechamento_item (tipo, referencia_id);

-- ---------------------------------------------------------------------------
-- 7. RLS for fechamento_item (inherits from parent fechamento)
-- ---------------------------------------------------------------------------
ALTER TABLE fechamento_item ENABLE ROW LEVEL SECURITY;

-- Select: user can see items if they can see the parent fechamento
CREATE POLICY fechamento_item_select ON fechamento_item
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM fechamento f
      WHERE f.id = fechamento_item.fechamento_id
      AND f.empresa_id = fn_get_empresa_id()
      AND (
        fn_get_user_role() IN ('dono', 'admin')
        OR f.motorista_id = fn_get_motorista_id()
      )
    )
  );

-- Insert/Update/Delete: only via parent policies (dono/admin)
CREATE POLICY fechamento_item_insert ON fechamento_item
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM fechamento f
      WHERE f.id = fechamento_item.fechamento_id
      AND f.empresa_id = fn_get_empresa_id()
      AND fn_get_user_role() IN ('dono', 'admin')
    )
  );

CREATE POLICY fechamento_item_delete ON fechamento_item
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM fechamento f
      WHERE f.id = fechamento_item.fechamento_id
      AND f.empresa_id = fn_get_empresa_id()
      AND fn_get_user_role() IN ('dono', 'admin')
    )
  );

-- ---------------------------------------------------------------------------
-- 8. FUNCTION: fn_calcular_fechamento
-- Calculates viagens and gastos for a motorista in a period.
-- Returns: total_viagens (centavos), total_gastos (centavos), saldo (centavos)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_calcular_fechamento(
  p_motorista_id UUID,
  p_periodo_inicio DATE,
  p_periodo_fim DATE
)
RETURNS TABLE (
  total_viagens INTEGER,
  total_gastos INTEGER,
  saldo_motorista INTEGER,
  qtd_viagens BIGINT,
  qtd_gastos BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_viagens INTEGER := 0;
  v_total_gastos INTEGER := 0;
  v_qtd_viagens BIGINT := 0;
  v_qtd_gastos BIGINT := 0;
BEGIN
  -- Sum viagens concluidas in period: valor_motorista = valor_total * percentual_pagamento / 100
  SELECT
    COALESCE(SUM(ROUND(v.valor_total * v.percentual_pagamento / 100)::INTEGER), 0),
    COUNT(*)
  INTO v_total_viagens, v_qtd_viagens
  FROM viagem v
  WHERE v.motorista_id = p_motorista_id
    AND v.status = 'concluida'
    AND v.data_saida::DATE >= p_periodo_inicio
    AND v.data_saida::DATE <= p_periodo_fim;

  -- Sum gastos in period
  SELECT
    COALESCE(SUM(g.valor), 0),
    COUNT(*)
  INTO v_total_gastos, v_qtd_gastos
  FROM gasto g
  WHERE g.motorista_id = p_motorista_id
    AND g.data >= p_periodo_inicio
    AND g.data <= p_periodo_fim;

  RETURN QUERY SELECT
    v_total_viagens,
    v_total_gastos,
    (v_total_viagens - v_total_gastos)::INTEGER,
    v_qtd_viagens,
    v_qtd_gastos;
END;
$$;

COMMENT ON FUNCTION fn_calcular_fechamento IS 'Calcula totais de viagens e gastos de um motorista em um periodo. Valores em centavos.';
