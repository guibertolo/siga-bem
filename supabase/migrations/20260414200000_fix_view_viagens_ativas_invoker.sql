-- =============================================================================
-- Migration: Fix view_viagens_ativas security_invoker
-- Story: 21.1
-- Data: 2026-04-14
-- Origem: auditoria de seguranca — view roda como owner (superuser),
--         permitindo leak cross-tenant via bypass de RLS.
-- =============================================================================
-- A view view_viagens_ativas foi criada em 20260328180700_create_viagem.sql
-- sem WITH (security_invoker = true). Isso faz a view executar com os
-- privilegios do OWNER (superuser), ignorando todas as RLS policies das
-- tabelas viagem, motorista e caminhao. Qualquer usuario autenticado que
-- consultar essa view consegue ver viagens de TODAS as empresas.
--
-- Correcao: recriar a view com security_invoker = true. O SELECT e identico
-- ao original — apenas a opcao de seguranca muda.
-- =============================================================================

DROP VIEW IF EXISTS view_viagens_ativas;

CREATE OR REPLACE VIEW view_viagens_ativas
  WITH (security_invoker = true)
AS
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

COMMENT ON VIEW view_viagens_ativas IS
  'Viagens com status em_andamento para dashboard. '
  'security_invoker=true garante que RLS das tabelas base se aplica ao caller.';
