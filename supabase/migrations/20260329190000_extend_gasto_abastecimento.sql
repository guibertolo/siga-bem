-- =============================================================================
-- Migration: Story 5.1 — Estender tabela gasto com campos de abastecimento
-- Approach: extend gasto (not separate table) per architect/PO decision
--
-- Adds 4 nullable columns for fuel tracking, 2 partial indexes for BI,
-- and 4 views for analytics (region, truck, driver, full BI).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Verify combustivel_tipo ENUM exists (created in migration 180800)
--    Safe DO block: no-op if already present
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'combustivel_tipo') THEN
    CREATE TYPE combustivel_tipo AS ENUM ('diesel_s10', 'diesel_comum');
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- 2. ADD COLUMNS to gasto — all nullable for backward compatibility
-- ---------------------------------------------------------------------------
ALTER TABLE gasto
  ADD COLUMN IF NOT EXISTS litros             NUMERIC(10,3),
  ADD COLUMN IF NOT EXISTS tipo_combustivel   combustivel_tipo,
  ADD COLUMN IF NOT EXISTS posto_local        TEXT,
  ADD COLUMN IF NOT EXISTS uf_abastecimento   CHAR(2);

-- ---------------------------------------------------------------------------
-- 3. CHECK CONSTRAINTS
-- ---------------------------------------------------------------------------
ALTER TABLE gasto
  ADD CONSTRAINT ck_gasto_litros CHECK (litros IS NULL OR litros > 0);

ALTER TABLE gasto
  ADD CONSTRAINT ck_gasto_uf CHECK (uf_abastecimento IS NULL OR uf_abastecimento ~ '^[A-Z]{2}$');

-- ---------------------------------------------------------------------------
-- 4. PARTIAL INDEXES for BI queries
-- ---------------------------------------------------------------------------
-- AC5: optimize queries filtering fuel expenses
CREATE INDEX IF NOT EXISTS idx_gasto_combustivel
  ON gasto (empresa_id, data DESC)
  WHERE tipo_combustivel IS NOT NULL;

-- AC6: optimize region/fuel-type aggregation
CREATE INDEX IF NOT EXISTS idx_gasto_uf_combustivel
  ON gasto (uf_abastecimento, tipo_combustivel)
  WHERE uf_abastecimento IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 5. VIEW: vw_media_combustivel_regiao (AC7)
--    Average fuel price by state and fuel type.
--    Price per liter is DERIVED: (valor / 100.0) / litros
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_media_combustivel_regiao
  WITH (security_invoker = true)
AS
SELECT
  g.empresa_id,
  g.uf_abastecimento,
  g.tipo_combustivel,
  COUNT(*)                                                 AS total_abastecimentos,
  ROUND(AVG(g.valor::numeric / 100.0 / g.litros), 4)      AS preco_medio_litro,
  ROUND(MIN(g.valor::numeric / 100.0 / g.litros), 4)      AS preco_min_litro,
  ROUND(MAX(g.valor::numeric / 100.0 / g.litros), 4)      AS preco_max_litro,
  ROUND(SUM(g.litros)::numeric, 1)                         AS total_litros,
  SUM(g.valor)                                             AS total_valor_centavos,
  MIN(g.data)                                              AS primeira_data,
  MAX(g.data)                                              AS ultima_data
FROM gasto g
WHERE g.tipo_combustivel IS NOT NULL
  AND g.litros IS NOT NULL
  AND g.litros > 0
  AND g.uf_abastecimento IS NOT NULL
GROUP BY g.empresa_id, g.uf_abastecimento, g.tipo_combustivel;

-- ---------------------------------------------------------------------------
-- 6. VIEW: vw_custo_por_caminhao (AC8)
--    Fuel cost per truck with placa/modelo join.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_custo_por_caminhao
  WITH (security_invoker = true)
AS
SELECT
  g.empresa_id,
  g.caminhao_id,
  c.placa,
  c.modelo,
  COUNT(*)                                                 AS total_abastecimentos,
  SUM(g.valor)                                             AS total_valor_centavos,
  ROUND(SUM(g.litros)::numeric, 1)                         AS total_litros,
  ROUND(AVG(g.valor::numeric / 100.0 / g.litros), 4)      AS preco_medio_litro_derivado,
  CASE
    WHEN SUM(g.litros) > 0 AND c.km_atual > 0
    THEN ROUND(c.km_atual::numeric / SUM(g.litros)::numeric, 2)
    ELSE NULL
  END                                                      AS km_por_litro_estimado,
  MIN(g.data)                                              AS primeiro_abastecimento,
  MAX(g.data)                                              AS ultimo_abastecimento
FROM gasto g
JOIN caminhao c ON c.id = g.caminhao_id
WHERE g.tipo_combustivel IS NOT NULL
  AND g.litros IS NOT NULL
  AND g.litros > 0
  AND g.caminhao_id IS NOT NULL
GROUP BY g.empresa_id, g.caminhao_id, c.placa, c.modelo, c.km_atual;

-- ---------------------------------------------------------------------------
-- 7. VIEW: vw_custo_por_motorista (AC9)
--    Fuel cost per driver with motorista nome join.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_custo_por_motorista
  WITH (security_invoker = true)
AS
SELECT
  g.empresa_id,
  g.motorista_id,
  m.nome                                                   AS motorista_nome,
  COUNT(*)                                                 AS total_abastecimentos,
  SUM(g.valor)                                             AS total_valor_centavos,
  ROUND(SUM(g.litros)::numeric, 1)                         AS total_litros,
  ROUND(AVG(g.valor::numeric / 100.0 / g.litros), 4)      AS preco_medio_litro_derivado,
  MIN(g.data)                                              AS primeiro_abastecimento,
  MAX(g.data)                                              AS ultimo_abastecimento
FROM gasto g
JOIN motorista m ON m.id = g.motorista_id
WHERE g.tipo_combustivel IS NOT NULL
  AND g.litros IS NOT NULL
  AND g.litros > 0
GROUP BY g.empresa_id, g.motorista_id, m.nome;

-- ---------------------------------------------------------------------------
-- 8. VIEW: vw_gastos_bi (AC10)
--    Full BI view — ALL expense types, no fuel filter.
--    Groups by category, truck, driver, trip for dashboard Story 5.5.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_gastos_bi
  WITH (security_invoker = true)
AS
SELECT
  g.empresa_id,
  cg.nome                                                  AS categoria_nome,
  g.caminhao_id,
  g.motorista_id,
  g.viagem_id,
  g.valor,
  g.data,
  TO_CHAR(g.data, 'YYYY-MM')                              AS mes_ano
FROM gasto g
LEFT JOIN categoria_gasto cg ON cg.id = g.categoria_id;

-- =============================================================================
-- ROLLBACK SCRIPT (run manually if needed)
-- =============================================================================
-- DROP VIEW IF EXISTS vw_gastos_bi;
-- DROP VIEW IF EXISTS vw_custo_por_motorista;
-- DROP VIEW IF EXISTS vw_custo_por_caminhao;
-- DROP VIEW IF EXISTS vw_media_combustivel_regiao;
-- DROP INDEX IF EXISTS idx_gasto_uf_combustivel;
-- DROP INDEX IF EXISTS idx_gasto_combustivel;
-- ALTER TABLE gasto DROP CONSTRAINT IF EXISTS ck_gasto_uf;
-- ALTER TABLE gasto DROP CONSTRAINT IF EXISTS ck_gasto_litros;
-- ALTER TABLE gasto DROP COLUMN IF EXISTS uf_abastecimento;
-- ALTER TABLE gasto DROP COLUMN IF EXISTS posto_local;
-- ALTER TABLE gasto DROP COLUMN IF EXISTS tipo_combustivel;
-- ALTER TABLE gasto DROP COLUMN IF EXISTS litros;
-- =============================================================================
