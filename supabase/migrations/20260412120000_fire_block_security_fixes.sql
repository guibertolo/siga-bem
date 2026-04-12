-- =============================================================================
-- Migration: FIRE Block — correcoes criticas de seguranca e schema
-- Data: 2026-04-12
-- Origem: auditoria multi-agente (ver docs/review/2026-04-12/*.md)
-- =============================================================================
-- Esta migration consolida tres correcoes criticas identificadas pela auditoria:
--
--   F2) Remove storage policies duplicadas/sem escopo de empresa criadas em
--       20260330300000_create_storage_policies.sql. As policies originais usam
--       apenas o bucket_id como filtro, permitindo que qualquer authenticated
--       possa ler/escrever comprovantes de QUALQUER empresa.
--
--   F3) Adiciona validacao de autorizacao em fn_calcular_fechamento. A funcao
--       esta marcada SECURITY DEFINER mas nao valida que o motorista pertence
--       a empresa do usuario autenticado — permitindo leak cross-tenant de
--       totais financeiros via chamada direta da funcao.
--
--   F4) Cria UNIQUE INDEX condicional em fechamento_item para impedir que a
--       mesma viagem seja lancada em dois fechamentos diferentes.
--
-- IMPORTANTE — aplicar manualmente via supabase db push apos revisao humana.
-- Antes de aplicar, rode a query de cleanup check abaixo no SQL Editor:
--
--   SELECT referencia_id, COUNT(*) AS ocorrencias
--   FROM fechamento_item
--   WHERE tipo = 'viagem'
--   GROUP BY referencia_id
--   HAVING COUNT(*) > 1;
--
-- Se retornar linhas, ha duplicatas que precisam ser resolvidas antes do
-- bloco F4 (caso contrario o CREATE UNIQUE INDEX vai falhar).
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- F2) REMOVER STORAGE POLICIES SEM FILTRO DE EMPRESA
-- -----------------------------------------------------------------------------
-- As policies abaixo foram criadas sem restricao de empresa, abrindo acesso
-- cross-tenant ao bucket 'comprovantes'. Dropa-se aqui; substituicoes com
-- filtro adequado (path prefix por empresa_id) virao em migration separada
-- apos definirmos o padrao de layout do bucket.

DROP POLICY IF EXISTS "Users can upload comprovantes" ON storage.objects;
DROP POLICY IF EXISTS "Users can view comprovantes" ON storage.objects;
DROP POLICY IF EXISTS "Users can update comprovantes" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete comprovantes" ON storage.objects;

-- -----------------------------------------------------------------------------
-- F3) fn_calcular_fechamento — adicionar validacao de autorizacao
-- -----------------------------------------------------------------------------
-- A funcao permanece SECURITY DEFINER (necessario para bypass de RLS em
-- queries agregadas), mas agora valida explicitamente que o motorista
-- informado pertence a uma empresa onde o usuario autenticado tem vinculo
-- ATIVO. Isso fecha o vetor de leak cross-tenant sem exigir mudancas nos
-- callers da funcao.

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
SET search_path = public, pg_temp
AS $$
DECLARE
  v_total_viagens INTEGER := 0;
  v_total_gastos INTEGER := 0;
  v_qtd_viagens BIGINT := 0;
  v_qtd_gastos BIGINT := 0;
BEGIN
  -- Validar que o motorista pertence a uma empresa do usuario autenticado.
  -- usuario.auth_id == auth.uid() (ver 20260328180100_create_usuario_table.sql).
  -- usuario_empresa.ativo deve ser true (ver 20260329200000_usuario_empresa_multitenancy.sql).
  IF NOT EXISTS (
    SELECT 1
    FROM motorista m
    JOIN usuario_empresa ue ON ue.empresa_id = m.empresa_id
    JOIN usuario u ON u.id = ue.usuario_id
    WHERE m.id = p_motorista_id
      AND u.auth_id = auth.uid()
      AND ue.ativo = true
  ) THEN
    RAISE EXCEPTION 'Acesso negado: motorista nao pertence a empresa do usuario autenticado'
      USING ERRCODE = '42501';
  END IF;

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

COMMENT ON FUNCTION fn_calcular_fechamento IS
  'Calcula totais de viagens e gastos de um motorista em um periodo. Valores em centavos. '
  'Valida que o motorista pertence a empresa do usuario autenticado antes de retornar dados.';

-- -----------------------------------------------------------------------------
-- F4) UNIQUE INDEX parcial em fechamento_item (tipo=viagem)
-- -----------------------------------------------------------------------------
-- Impede que a mesma viagem seja lancada em dois fechamentos diferentes.
-- O indice e parcial (WHERE tipo = 'viagem') porque gastos podem legitimamente
-- aparecer em mais de um lugar nao (cada gasto so aparece uma vez, mas a
-- regra de unicidade aqui e especifica para viagens).
--
-- NOTA: se houver duplicatas historicas, este CREATE INDEX vai FALHAR.
-- Rode a query de cleanup check no header antes de aplicar.

CREATE UNIQUE INDEX IF NOT EXISTS idx_fechamento_item_viagem_unique
  ON fechamento_item (referencia_id)
  WHERE tipo = 'viagem';

COMMENT ON INDEX idx_fechamento_item_viagem_unique IS
  'Garante que uma viagem seja lancada em no maximo um fechamento_item (tipo=viagem). '
  'Introduzido pela migration FIRE Block 2026-04-12 para corrigir F4 da auditoria.';

COMMIT;
