-- =============================================================================
-- Migration: Phase 2 — Benchmarking anonimo cross-company
-- Cria tabela benchmarking_setor para dados agregados do setor.
-- SEM RLS para escrita (service role apenas).
-- SELECT permitido para authenticated users.
--
-- Referencia: docs/research/benchmarking-anonimo.md
-- LGPD Art. 12: dados anonimizados/agregados nao sao dados pessoais.
-- k-anonymity: minimo 5 empresas por segmento.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. TABLE: benchmarking_setor
--    Armazena medianas agregadas por tipo_cegonha.
--    Preenchida via fn_refresh_benchmarking() (service role / pg_cron).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS benchmarking_setor (
  id                                SERIAL PRIMARY KEY,
  tipo_cegonha                      tipo_cegonha NOT NULL,
  total_empresas                    INTEGER NOT NULL DEFAULT 0,
  total_caminhoes                   INTEGER NOT NULL DEFAULT 0,
  mediana_kml                       NUMERIC(5,2),
  mediana_custo_por_km_centavos     INTEGER,
  mediana_pct_combustivel_frete     NUMERIC(5,1),
  mediana_margem_viagem_pct         NUMERIC(5,1),
  mediana_manutencoes_por_caminhao  NUMERIC(5,1),
  atualizado_em                     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_benchmarking_tipo UNIQUE (tipo_cegonha)
);

COMMENT ON TABLE benchmarking_setor IS 'Dados agregados anonimos do setor por tipo de cegonha. Refresh via service role. Art. 12 LGPD.';
COMMENT ON COLUMN benchmarking_setor.mediana_custo_por_km_centavos IS 'Mediana do custo por km em centavos.';
COMMENT ON COLUMN benchmarking_setor.mediana_pct_combustivel_frete IS 'Mediana do % de combustivel sobre o valor do frete.';
COMMENT ON COLUMN benchmarking_setor.mediana_margem_viagem_pct IS 'Mediana da margem por viagem em %.';
COMMENT ON COLUMN benchmarking_setor.mediana_manutencoes_por_caminhao IS 'Mediana de manutencoes por caminhao (no periodo).';

-- ---------------------------------------------------------------------------
-- 2. RLS: authenticated users can SELECT only; NO insert/update/delete
-- ---------------------------------------------------------------------------
ALTER TABLE benchmarking_setor ENABLE ROW LEVEL SECURITY;

CREATE POLICY "benchmarking_setor_select_authenticated"
  ON benchmarking_setor FOR SELECT
  TO authenticated
  USING (true);

-- No INSERT/UPDATE/DELETE policies for authenticated —
-- only service_role (bypasses RLS) can write.

-- ---------------------------------------------------------------------------
-- 3. FUNCTION: fn_refresh_benchmarking()
--    Recalcula medianas cross-tenant agrupadas por tipo_cegonha.
--    Roda como SECURITY DEFINER (bypassa RLS).
--    Chamada via pg_cron ou script manual com service role.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_refresh_benchmarking()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tipo tipo_cegonha;
BEGIN
  -- Para cada tipo de cegonha, calcular medianas
  FOR v_tipo IN SELECT unnest(enum_range(NULL::tipo_cegonha)) LOOP

    INSERT INTO benchmarking_setor (
      tipo_cegonha,
      total_empresas,
      total_caminhoes,
      mediana_kml,
      mediana_custo_por_km_centavos,
      mediana_pct_combustivel_frete,
      mediana_margem_viagem_pct,
      mediana_manutencoes_por_caminhao,
      atualizado_em
    )
    SELECT
      v_tipo,
      COALESCE(stats.total_empresas, 0),
      COALESCE(stats.total_caminhoes, 0),
      stats.mediana_kml,
      stats.mediana_custo_por_km_centavos,
      stats.mediana_pct_combustivel_frete,
      stats.mediana_margem_viagem_pct,
      stats.mediana_manutencoes_por_caminhao,
      NOW()
    FROM (
      SELECT
        -- Count distinct empresas and caminhoes
        (SELECT COUNT(DISTINCT c2.empresa_id)
         FROM caminhao c2
         JOIN viagem v2 ON v2.caminhao_id = c2.id
         WHERE c2.tipo_cegonha = v_tipo
           AND v2.status = 'concluida'
        ) AS total_empresas,

        (SELECT COUNT(DISTINCT c2.id)
         FROM caminhao c2
         JOIN viagem v2 ON v2.caminhao_id = c2.id
         WHERE c2.tipo_cegonha = v_tipo
           AND v2.status = 'concluida'
        ) AS total_caminhoes,

        -- Mediana km/L: from viagens concluidas with km data + fuel gastos
        (SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY sub.kml)
         FROM (
           SELECT
             CASE WHEN fuel.total_litros > 0 AND (vi.km_chegada - vi.km_saida) > 0
               THEN ROUND(((vi.km_chegada - vi.km_saida)::NUMERIC / fuel.total_litros), 2)
               ELSE NULL
             END AS kml
           FROM viagem vi
           JOIN caminhao ca ON ca.id = vi.caminhao_id
           LEFT JOIN LATERAL (
             SELECT COALESCE(SUM(g.litros), 0) AS total_litros
             FROM gasto g
             WHERE g.viagem_id = vi.id
               AND g.litros IS NOT NULL
               AND g.litros > 0
           ) fuel ON true
           WHERE vi.status = 'concluida'
             AND ca.tipo_cegonha = v_tipo
             AND vi.km_saida IS NOT NULL
             AND vi.km_chegada IS NOT NULL
             AND vi.km_chegada > vi.km_saida
         ) sub
         WHERE sub.kml IS NOT NULL AND sub.kml > 0 AND sub.kml < 10
        ) AS mediana_kml,

        -- Mediana custo/km em centavos
        (SELECT ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY sub.custo_km))::INTEGER
         FROM (
           SELECT
             CASE WHEN (vi.km_chegada - vi.km_saida) > 0
               THEN costs.total_gasto::NUMERIC / (vi.km_chegada - vi.km_saida)
               ELSE NULL
             END AS custo_km
           FROM viagem vi
           JOIN caminhao ca ON ca.id = vi.caminhao_id
           LEFT JOIN LATERAL (
             SELECT COALESCE(SUM(g.valor), 0) AS total_gasto
             FROM gasto g
             WHERE g.viagem_id = vi.id
           ) costs ON true
           WHERE vi.status = 'concluida'
             AND ca.tipo_cegonha = v_tipo
             AND vi.km_saida IS NOT NULL
             AND vi.km_chegada IS NOT NULL
             AND vi.km_chegada > vi.km_saida
         ) sub
         WHERE sub.custo_km IS NOT NULL AND sub.custo_km > 0
        ) AS mediana_custo_por_km_centavos,

        -- Mediana % combustivel sobre frete
        (SELECT ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY sub.pct)::NUMERIC, 1)
         FROM (
           SELECT
             CASE WHEN vi.valor_total > 0
               THEN (fuel_cost.total_combustivel::NUMERIC / vi.valor_total) * 100
               ELSE NULL
             END AS pct
           FROM viagem vi
           JOIN caminhao ca ON ca.id = vi.caminhao_id
           LEFT JOIN LATERAL (
             SELECT COALESCE(SUM(g.valor), 0) AS total_combustivel
             FROM gasto g
             JOIN categoria_gasto cg ON cg.id = g.categoria_id
             WHERE g.viagem_id = vi.id
               AND LOWER(cg.nome) = 'combustivel'
           ) fuel_cost ON true
           WHERE vi.status = 'concluida'
             AND ca.tipo_cegonha = v_tipo
             AND vi.valor_total > 0
         ) sub
         WHERE sub.pct IS NOT NULL AND sub.pct > 0 AND sub.pct < 100
        ) AS mediana_pct_combustivel_frete,

        -- Mediana margem viagem %
        (SELECT ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY sub.margem)::NUMERIC, 1)
         FROM (
           SELECT
             CASE WHEN vi.valor_total > 0
               THEN ((vi.valor_total - costs.total_gasto)::NUMERIC / vi.valor_total) * 100
               ELSE NULL
             END AS margem
           FROM viagem vi
           JOIN caminhao ca ON ca.id = vi.caminhao_id
           LEFT JOIN LATERAL (
             SELECT COALESCE(SUM(g.valor), 0) AS total_gasto
             FROM gasto g
             WHERE g.viagem_id = vi.id
           ) costs ON true
           WHERE vi.status = 'concluida'
             AND ca.tipo_cegonha = v_tipo
             AND vi.valor_total > 0
         ) sub
         WHERE sub.margem IS NOT NULL
        ) AS mediana_margem_viagem_pct,

        -- Mediana manutencoes por caminhao
        (SELECT ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY sub.cnt)::NUMERIC, 1)
         FROM (
           SELECT
             ca.id AS caminhao_id,
             COUNT(g.id)::NUMERIC AS cnt
           FROM caminhao ca
           LEFT JOIN gasto g ON g.caminhao_id = ca.id
           LEFT JOIN categoria_gasto cg ON cg.id = g.categoria_id
           WHERE ca.tipo_cegonha = v_tipo
             AND (cg.id IS NULL OR LOWER(cg.nome) = 'manutencao')
           GROUP BY ca.id
         ) sub
        ) AS mediana_manutencoes_por_caminhao

    ) stats
    ON CONFLICT (tipo_cegonha)
    DO UPDATE SET
      total_empresas = EXCLUDED.total_empresas,
      total_caminhoes = EXCLUDED.total_caminhoes,
      mediana_kml = EXCLUDED.mediana_kml,
      mediana_custo_por_km_centavos = EXCLUDED.mediana_custo_por_km_centavos,
      mediana_pct_combustivel_frete = EXCLUDED.mediana_pct_combustivel_frete,
      mediana_margem_viagem_pct = EXCLUDED.mediana_margem_viagem_pct,
      mediana_manutencoes_por_caminhao = EXCLUDED.mediana_manutencoes_por_caminhao,
      atualizado_em = NOW();

  END LOOP;
END;
$$;

COMMENT ON FUNCTION fn_refresh_benchmarking() IS 'Recalcula medianas cross-tenant por tipo_cegonha. SECURITY DEFINER para bypassar RLS. Chamar via pg_cron ou service role.';

-- ---------------------------------------------------------------------------
-- 4. INDEX for fast reads
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_benchmarking_setor_tipo
  ON benchmarking_setor (tipo_cegonha);

-- ---------------------------------------------------------------------------
-- 5. Initial population (will be empty until refresh runs)
-- ---------------------------------------------------------------------------
-- Run: SELECT fn_refresh_benchmarking();
-- Or via script: scripts/refresh-benchmarking.js

-- ---------------------------------------------------------------------------
-- ROLLBACK SCRIPT (run manually if needed)
-- ---------------------------------------------------------------------------
-- DROP FUNCTION IF EXISTS fn_refresh_benchmarking();
-- DROP TABLE IF EXISTS benchmarking_setor;
-- =============================================================================
