-- =============================================================================
-- Migration: Update RPC relatorio_caminhao_periodo with IPVA/CRLV fields
-- Story: 23.6 update — Story 18.1 agora implementada, campos IPVA/CRLV disponiveis
-- Timestamp: 20260414510000
--
-- Adiciona ao header: doc_vencimento, doc_status, ipva_pago, ipva_valor_centavos,
-- ipva_ano_referencia.
-- doc_status calculado: 'ok' (>30d), 'vencendo' (0-30d), 'vencido' (<0), 'sem_data' (null)
-- =============================================================================

CREATE OR REPLACE FUNCTION relatorio_caminhao_periodo(
  p_caminhao_id UUID,
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
  v_placa TEXT;
  v_modelo TEXT;
  v_empresa_nome TEXT;
  v_doc_vencimento DATE;
  v_ipva_pago BOOLEAN;
  v_ipva_valor_centavos INTEGER;
  v_ipva_ano_referencia INTEGER;
  v_doc_status TEXT;
  v_header JSONB;
  v_viagens JSONB;
  v_motoristas JSONB;
  v_custos_diretos JSONB;
  v_comparativo JSONB;
  v_total_viagens INTEGER;
  v_km_total_calculado BIGINT;
  v_receita_total BIGINT;
  v_custo_total BIGINT;
  v_custo_por_km INTEGER;
  v_margem_abs BIGINT;
  v_margem_pct NUMERIC(5,1);
  v_dias_em_rota INTEGER;
  v_dias_parado INTEGER;
  v_dias_periodo INTEGER;
  v_combustivel BIGINT;
  v_manutencao BIGINT;
  v_pedagio BIGINT;
BEGIN
  -- -----------------------------------------------------------------------
  -- 1. Resolve caminhao + empresa + doc fields (RLS will filter)
  -- -----------------------------------------------------------------------
  SELECT c.empresa_id, c.placa, c.modelo, e.razao_social,
         c.doc_vencimento, c.ipva_pago, c.ipva_valor_centavos, c.ipva_ano_referencia
    INTO v_empresa_id, v_placa, v_modelo, v_empresa_nome,
         v_doc_vencimento, v_ipva_pago, v_ipva_valor_centavos, v_ipva_ano_referencia
    FROM caminhao c
    JOIN empresa e ON e.id = c.empresa_id
   WHERE c.id = p_caminhao_id;

  IF v_empresa_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Caminhao nao encontrado');
  END IF;

  -- -----------------------------------------------------------------------
  -- 1b. Calculate doc_status from doc_vencimento
  -- ok (>30d), vencendo (0-30d), vencido (<0), sem_data (null)
  -- -----------------------------------------------------------------------
  v_doc_status := CASE
    WHEN v_doc_vencimento IS NULL THEN 'sem_data'
    WHEN v_doc_vencimento < CURRENT_DATE THEN 'vencido'
    WHEN v_doc_vencimento <= CURRENT_DATE + INTERVAL '30 days' THEN 'vencendo'
    ELSE 'ok'
  END;

  -- -----------------------------------------------------------------------
  -- 2. Aggregates de viagens
  -- uses index idx_viagem_caminhao_saida (caminhao_id, data_saida)
  -- -----------------------------------------------------------------------
  SELECT
    COUNT(*)::INTEGER,
    COALESCE(SUM(
      CASE WHEN v.km_saida IS NOT NULL AND v.km_chegada IS NOT NULL
           THEN v.km_chegada - v.km_saida
           ELSE 0
      END
    ), 0),
    COALESCE(SUM(v.valor_total), 0)
  INTO v_total_viagens, v_km_total_calculado, v_receita_total
  FROM viagem v
  WHERE v.caminhao_id = p_caminhao_id
    AND v.data_saida::date BETWEEN p_inicio AND p_fim;

  -- -----------------------------------------------------------------------
  -- 3. Custos diretos por categoria (Combustivel, Manutencao, Pedagio)
  -- Nome e texto seed, filtrado por ILIKE (nao enum)
  -- -----------------------------------------------------------------------
  SELECT
    COALESCE(SUM(CASE WHEN cg.nome ILIKE 'Combustivel' THEN g.valor ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN cg.nome ILIKE 'Manutencao'  THEN g.valor ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN cg.nome ILIKE 'Pedagio'     THEN g.valor ELSE 0 END), 0)
  INTO v_combustivel, v_manutencao, v_pedagio
  FROM gasto g
  JOIN categoria_gasto cg ON cg.id = g.categoria_id
  WHERE g.caminhao_id = p_caminhao_id
    AND g.data BETWEEN p_inicio AND p_fim;

  v_custo_total := v_combustivel + v_manutencao + v_pedagio;

  -- -----------------------------------------------------------------------
  -- 4. Custo por km (centavos/km)
  -- -----------------------------------------------------------------------
  v_custo_por_km := CASE
    WHEN v_km_total_calculado > 0
    THEN ROUND(v_custo_total::numeric / v_km_total_calculado)::INTEGER
    ELSE NULL
  END;

  -- -----------------------------------------------------------------------
  -- 5. Margem percentual
  -- -----------------------------------------------------------------------
  v_margem_abs := v_receita_total - v_custo_total;
  v_margem_pct := CASE
    WHEN v_receita_total > 0
    THEN ROUND((v_receita_total - v_custo_total) * 100.0 / v_receita_total, 1)
    ELSE NULL
  END;

  -- -----------------------------------------------------------------------
  -- 6. Build viagens array
  -- uses index idx_viagem_caminhao_saida (caminhao_id, data_saida)
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
        'status', v.status,
        'motorista_nome', m.nome
      ) ORDER BY v.data_saida DESC
    ), '[]'::jsonb)
  INTO v_viagens
  FROM viagem v
  JOIN motorista m ON m.id = v.motorista_id
  WHERE v.caminhao_id = p_caminhao_id
    AND v.data_saida::date BETWEEN p_inicio AND p_fim;

  -- -----------------------------------------------------------------------
  -- 7. Motoristas que rodaram (distintos no periodo)
  -- -----------------------------------------------------------------------
  SELECT COALESCE(jsonb_agg(sub), '[]'::jsonb)
  INTO v_motoristas
  FROM (
    SELECT
      m.nome,
      CONCAT(LEFT(m.cpf, 3), '.***.***-', RIGHT(m.cpf, 2)) AS cpf_mascarado,
      COUNT(*)::INTEGER AS total_viagens,
      COALESCE(SUM(
        CASE WHEN v.km_saida IS NOT NULL AND v.km_chegada IS NOT NULL
             THEN v.km_chegada - v.km_saida
             ELSE 0
        END
      ), 0) AS km_total_calculado
    FROM viagem v
    JOIN motorista m ON m.id = v.motorista_id
    WHERE v.caminhao_id = p_caminhao_id
      AND v.data_saida::date BETWEEN p_inicio AND p_fim
    GROUP BY m.id, m.nome, m.cpf
  ) sub;

  -- -----------------------------------------------------------------------
  -- 8. Dias em rota / parado
  -- -----------------------------------------------------------------------
  SELECT COUNT(DISTINCT v.data_saida::date)::INTEGER
  INTO v_dias_em_rota
  FROM viagem v
  WHERE v.caminhao_id = p_caminhao_id
    AND v.data_saida::date BETWEEN p_inicio AND p_fim;

  v_dias_periodo := (p_fim - p_inicio) + 1;
  v_dias_parado := GREATEST(v_dias_periodo - v_dias_em_rota, 0);

  -- -----------------------------------------------------------------------
  -- 9. Comparativo com frota: ranking por receita e por margem
  -- -----------------------------------------------------------------------
  WITH caminhao_stats AS (
    SELECT
      vr.caminhao_id,
      SUM(vr.valor_total) AS receita,
      SUM(vr.valor_total) - COALESCE((
        SELECT SUM(g2.valor)
        FROM gasto g2
        JOIN categoria_gasto cg2 ON cg2.id = g2.categoria_id
        WHERE g2.caminhao_id = vr.caminhao_id
          AND g2.data BETWEEN p_inicio AND p_fim
          AND cg2.nome ILIKE ANY(ARRAY['Combustivel', 'Manutencao', 'Pedagio'])
      ), 0) AS margem_abs
    FROM viagem vr
    WHERE vr.empresa_id = v_empresa_id
      AND vr.data_saida::date BETWEEN p_inicio AND p_fim
    GROUP BY vr.caminhao_id
  ),
  ranked AS (
    SELECT
      caminhao_id,
      RANK() OVER (ORDER BY receita DESC) AS posicao_receita,
      RANK() OVER (ORDER BY margem_abs DESC) AS posicao_margem,
      COUNT(*) OVER () AS total_caminhoes
    FROM caminhao_stats
  )
  SELECT jsonb_build_object(
    'posicao_receita', COALESCE(r.posicao_receita, 0),
    'posicao_margem', COALESCE(r.posicao_margem, 0),
    'total_caminhoes', COALESCE(r.total_caminhoes, 0)
  )
  INTO v_comparativo
  FROM ranked r
  WHERE r.caminhao_id = p_caminhao_id;

  IF v_comparativo IS NULL THEN
    v_comparativo := jsonb_build_object(
      'posicao_receita', 0,
      'posicao_margem', 0,
      'total_caminhoes', 0
    );
  END IF;

  -- -----------------------------------------------------------------------
  -- 10. Build header (with IPVA/CRLV fields from Story 18.1)
  -- -----------------------------------------------------------------------
  v_header := jsonb_build_object(
    'caminhao_placa', v_placa,
    'caminhao_modelo', v_modelo,
    'empresa_nome', v_empresa_nome,
    'periodo_inicio', p_inicio,
    'periodo_fim', p_fim,
    'total_viagens', v_total_viagens,
    'km_total_calculado', v_km_total_calculado,
    'receita_total_centavos', v_receita_total,
    'custo_total_centavos', v_custo_total,
    'custo_por_km_centavos', v_custo_por_km,
    'margem_absoluta_centavos', v_margem_abs,
    'margem_percentual', v_margem_pct,
    'doc_vencimento', v_doc_vencimento,
    'doc_status', v_doc_status,
    'ipva_pago', v_ipva_pago,
    'ipva_valor_centavos', v_ipva_valor_centavos,
    'ipva_ano_referencia', v_ipva_ano_referencia
  );

  v_custos_diretos := jsonb_build_object(
    'combustivel_centavos', v_combustivel,
    'manutencao_centavos', v_manutencao,
    'pedagio_centavos', v_pedagio
  );

  -- -----------------------------------------------------------------------
  -- 11. Return
  -- -----------------------------------------------------------------------
  RETURN jsonb_build_object(
    'header', v_header,
    'viagens', v_viagens,
    'motoristas_que_rodaram', v_motoristas,
    'custos_diretos', v_custos_diretos,
    'comparativo_frota', v_comparativo,
    'dias_em_rota', v_dias_em_rota,
    'dias_parado', v_dias_parado
  );
END;
$$;

COMMENT ON FUNCTION relatorio_caminhao_periodo IS 'Retorna relatorio completo de um caminhao em um periodo: receita, custos, margem, custo/km, ranking na frota, status CRLV/IPVA. SECURITY INVOKER: herda RLS do caller. Depende de idx_viagem_caminhao_saida.';
