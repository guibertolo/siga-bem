-- =============================================================================
-- Migration: RPC relatorio_motorista_periodo
-- Story: 23.5 — Relatorio por motorista com totais e ranking
-- Timestamp: 20260414310000
-- =============================================================================

CREATE OR REPLACE FUNCTION relatorio_motorista_periodo(
  p_motorista_id UUID,
  p_inicio DATE,
  p_fim DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_empresa_id UUID;
  v_motorista_nome TEXT;
  v_motorista_cpf TEXT;
  v_empresa_nome TEXT;
  v_header JSONB;
  v_viagens JSONB;
  v_caminhoes JSONB;
  v_dias_trabalhados INTEGER;
  v_dias_ociosos INTEGER;
  v_dias_periodo INTEGER;
  v_ranking JSONB;
  v_total_viagens INTEGER;
  v_total_km_calculado BIGINT;
  v_total_valor_bruto BIGINT;
  v_total_pagamento BIGINT;
BEGIN
  -- -----------------------------------------------------------------------
  -- 1. Resolve motorista + empresa (RLS will filter)
  -- -----------------------------------------------------------------------
  SELECT m.empresa_id, m.nome, m.cpf, e.razao_social
    INTO v_empresa_id, v_motorista_nome, v_motorista_cpf, v_empresa_nome
    FROM motorista m
    JOIN empresa e ON e.id = m.empresa_id
   WHERE m.id = p_motorista_id;

  IF v_empresa_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Motorista nao encontrado');
  END IF;

  -- -----------------------------------------------------------------------
  -- 2. Build viagens array
  -- -----------------------------------------------------------------------
  SELECT
    COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', v.id,
        'data_saida', v.data_saida,
        'data_chegada_real', v.data_chegada_real,
        'origem', v.origem,
        'destino', v.destino,
        'km_calculado', CASE
          WHEN v.km_saida IS NOT NULL AND v.km_chegada IS NOT NULL
          THEN v.km_chegada - v.km_saida
          ELSE NULL
        END,
        'valor_total_centavos', v.valor_total,
        'percentual_pagamento', v.percentual_pagamento,
        'pagamento_centavos', ROUND(v.valor_total * v.percentual_pagamento / 100.0)::INTEGER,
        'status', v.status,
        'caminhao_placa', c.placa,
        'caminhao_modelo', c.modelo,
        'comprovantes', COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object('storage_path', fc.storage_path)
          )
          FROM gasto g
          JOIN foto_comprovante fc ON fc.gasto_id = g.id
          WHERE g.viagem_id = v.id
        ), '[]'::jsonb)
      ) ORDER BY v.data_saida DESC
    ), '[]'::jsonb)
  INTO v_viagens
  FROM viagem v
  JOIN caminhao c ON c.id = v.caminhao_id
  WHERE v.motorista_id = p_motorista_id
    AND v.data_saida::date BETWEEN p_inicio AND p_fim;

  -- -----------------------------------------------------------------------
  -- 3. Aggregates
  -- -----------------------------------------------------------------------
  SELECT
    COUNT(*)::INTEGER,
    COALESCE(SUM(
      CASE WHEN v.km_saida IS NOT NULL AND v.km_chegada IS NOT NULL
           THEN v.km_chegada - v.km_saida
           ELSE 0
      END
    ), 0),
    COALESCE(SUM(v.valor_total), 0),
    COALESCE(SUM(ROUND(v.valor_total * v.percentual_pagamento / 100.0)::INTEGER), 0)
  INTO v_total_viagens, v_total_km_calculado, v_total_valor_bruto, v_total_pagamento
  FROM viagem v
  WHERE v.motorista_id = p_motorista_id
    AND v.data_saida::date BETWEEN p_inicio AND p_fim;

  -- -----------------------------------------------------------------------
  -- 4. Caminhoes usados (distinct)
  -- -----------------------------------------------------------------------
  SELECT COALESCE(jsonb_agg(DISTINCT jsonb_build_object('placa', c.placa, 'modelo', c.modelo)), '[]'::jsonb)
  INTO v_caminhoes
  FROM viagem v
  JOIN caminhao c ON c.id = v.caminhao_id
  WHERE v.motorista_id = p_motorista_id
    AND v.data_saida::date BETWEEN p_inicio AND p_fim;

  -- -----------------------------------------------------------------------
  -- 5. Dias trabalhados / ociosos
  -- -----------------------------------------------------------------------
  SELECT COUNT(DISTINCT v.data_saida::date)::INTEGER
  INTO v_dias_trabalhados
  FROM viagem v
  WHERE v.motorista_id = p_motorista_id
    AND v.data_saida::date BETWEEN p_inicio AND p_fim;

  v_dias_periodo := (p_fim - p_inicio) + 1;
  v_dias_ociosos := GREATEST(v_dias_periodo - v_dias_trabalhados, 0);

  -- -----------------------------------------------------------------------
  -- 6. Ranking na frota (por valor bruto, apenas concluidas)
  -- -----------------------------------------------------------------------
  WITH motorista_rank AS (
    SELECT
      vr.motorista_id,
      SUM(vr.valor_total) AS total,
      RANK() OVER (ORDER BY SUM(vr.valor_total) DESC) AS posicao
    FROM viagem vr
    WHERE vr.empresa_id = v_empresa_id
      AND vr.data_saida::date BETWEEN p_inicio AND p_fim
      AND vr.status = 'concluida'
    GROUP BY vr.motorista_id
  )
  SELECT jsonb_build_object(
    'posicao', COALESCE(mr.posicao, 0),
    'total_motoristas', (SELECT COUNT(*) FROM motorista_rank),
    'metrica', 'valor_bruto'
  )
  INTO v_ranking
  FROM motorista_rank mr
  WHERE mr.motorista_id = p_motorista_id;

  IF v_ranking IS NULL THEN
    v_ranking := jsonb_build_object('posicao', 0, 'total_motoristas', 0, 'metrica', 'valor_bruto');
  END IF;

  -- -----------------------------------------------------------------------
  -- 7. Build header
  -- -----------------------------------------------------------------------
  v_header := jsonb_build_object(
    'motorista_nome', v_motorista_nome,
    'motorista_cpf', v_motorista_cpf,
    'empresa_nome', v_empresa_nome,
    'periodo_inicio', p_inicio,
    'periodo_fim', p_fim,
    'total_viagens', v_total_viagens,
    'total_km_calculado', v_total_km_calculado,
    'total_valor_bruto_centavos', v_total_valor_bruto,
    'total_pagamento_centavos', v_total_pagamento
  );

  -- -----------------------------------------------------------------------
  -- 8. Return
  -- -----------------------------------------------------------------------
  RETURN jsonb_build_object(
    'header', v_header,
    'viagens', v_viagens,
    'caminhoes_usados', v_caminhoes,
    'dias_trabalhados', v_dias_trabalhados,
    'dias_ociosos', v_dias_ociosos,
    'ranking_frota', v_ranking
  );
END;
$$;

COMMENT ON FUNCTION relatorio_motorista_periodo IS 'Retorna relatorio completo de viagens de um motorista em um periodo. SECURITY INVOKER: herda RLS do caller.';
