-- =============================================================================
-- Story 22.1: Eliminar admin client em queryMultiEmpresa
-- Epic 22 — Infra Hardening
-- Data: 2026-04-14
-- =============================================================================
-- Problema: queryMultiEmpresa usa createAdminClient() (service_role) que
-- bypassa RLS. A seguranca depende de convencao (getMultiEmpresaContext valida
-- ownership), mas o admin client e um footgun estrutural.
--
-- Solucao:
--   1. Criar fn_user_empresa_ids() — retorna TODOS os empresa_id com vinculo
--      ativo para o usuario autenticado (para uso em RLS SELECT)
--   2. Criar fn_get_query_empresas(selected uuid[]) — retorna intersecao de
--      selected com vinculos ativos (validacao server-side)
--   3. Atualizar policies SELECT de viagem, gasto, fechamento, motorista,
--      caminhao para permitir leitura de TODAS as empresas vinculadas
--   4. INSERT/UPDATE/DELETE permanecem restritos a empresa ativa
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. fn_user_empresa_ids() — Helper for RLS SELECT policies
-- =============================================================================
-- Retorna array de empresa_ids com vinculo ativo para o usuario autenticado.
-- Usado em RLS SELECT para permitir leitura multi-empresa.
-- SECURITY DEFINER: precisa ler usuario_empresa sem RLS circular.

CREATE OR REPLACE FUNCTION fn_user_empresa_ids()
RETURNS UUID[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    array_agg(ue.empresa_id),
    ARRAY[]::UUID[]
  )
  FROM usuario u
  JOIN usuario_empresa ue ON ue.usuario_id = u.id AND ue.ativo = true
  WHERE u.auth_id = auth.uid();
$$;

COMMENT ON FUNCTION fn_user_empresa_ids IS
  'Retorna todos empresa_ids com vinculo ativo para o usuario autenticado. '
  'Usado em RLS SELECT para suportar multi-empresa sem admin client.';

-- =============================================================================
-- 2. fn_get_query_empresas(selected uuid[]) — Validacao server-side
-- =============================================================================
-- Retorna intersecao de selected_empresas com vinculos ativos.
-- Chamada via RPC pelo queryMultiEmpresa para validar acesso.
-- SECURITY INVOKER: opera no contexto do usuario autenticado.

CREATE OR REPLACE FUNCTION fn_get_query_empresas(selected_empresas UUID[])
RETURNS UUID[]
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COALESCE(
    array_agg(ue.empresa_id),
    ARRAY[]::UUID[]
  )
  FROM usuario u
  JOIN usuario_empresa ue ON ue.usuario_id = u.id AND ue.ativo = true
  WHERE u.auth_id = auth.uid()
    AND ue.empresa_id = ANY(selected_empresas);
$$;

COMMENT ON FUNCTION fn_get_query_empresas IS
  'Valida e retorna intersecao de empresa IDs solicitados com vinculos ativos '
  'do usuario autenticado. Retorna array vazio se nenhuma valida.';

-- =============================================================================
-- 3. Atualizar SELECT policies — viagem
-- =============================================================================
-- DROP das policies SELECT existentes e recriacao com fn_user_empresa_ids()

DROP POLICY IF EXISTS viagem_select ON viagem;

CREATE POLICY viagem_select ON viagem
  FOR SELECT
  TO authenticated
  USING (
    empresa_id = ANY(fn_user_empresa_ids())
    AND (
      fn_get_user_role() IN ('dono', 'admin')
      OR motorista_id = fn_get_motorista_id()
    )
  );

-- =============================================================================
-- 4. Atualizar SELECT policies — gasto (dono/admin e motorista)
-- =============================================================================

DROP POLICY IF EXISTS "gasto_select_dono_admin" ON gasto;
DROP POLICY IF EXISTS "gasto_select_motorista" ON gasto;

CREATE POLICY "gasto_select_dono_admin"
  ON gasto FOR SELECT
  TO authenticated
  USING (
    empresa_id = ANY(fn_user_empresa_ids())
    AND fn_get_user_role() IN ('dono', 'admin')
  );

CREATE POLICY "gasto_select_motorista"
  ON gasto FOR SELECT
  TO authenticated
  USING (
    empresa_id = ANY(fn_user_empresa_ids())
    AND motorista_id = fn_get_motorista_id()
  );

-- =============================================================================
-- 5. Atualizar SELECT policies — fechamento
-- =============================================================================

DROP POLICY IF EXISTS fechamento_select ON fechamento;

CREATE POLICY fechamento_select ON fechamento
  FOR SELECT
  TO authenticated
  USING (
    empresa_id = ANY(fn_user_empresa_ids())
    AND (
      fn_get_user_role() IN ('dono', 'admin')
      OR motorista_id = fn_get_motorista_id()
    )
  );

-- =============================================================================
-- 6. Atualizar SELECT policies — motorista
-- =============================================================================

DROP POLICY IF EXISTS "motorista_select_empresa" ON motorista;
DROP POLICY IF EXISTS "motorista_select_self" ON motorista;

CREATE POLICY "motorista_select_empresa"
  ON motorista FOR SELECT
  TO authenticated
  USING (
    empresa_id = ANY(fn_user_empresa_ids())
    AND fn_get_user_role() IN ('dono', 'admin')
  );

CREATE POLICY "motorista_select_self"
  ON motorista FOR SELECT
  TO authenticated
  USING (
    id = fn_get_motorista_id()
  );

-- =============================================================================
-- 7. Atualizar SELECT policies — caminhao
-- =============================================================================
-- caminhao tem policy FOR ALL (dono/admin) e FOR SELECT (motorista)

DROP POLICY IF EXISTS "Dono e admin gerenciam caminhoes" ON caminhao;
DROP POLICY IF EXISTS "Motorista visualiza caminhoes da empresa" ON caminhao;

-- Dono/admin: SELECT usa fn_user_empresa_ids; INSERT/UPDATE/DELETE usa fn_get_empresa_id
CREATE POLICY "caminhao_select_dono_admin"
  ON caminhao FOR SELECT
  TO authenticated
  USING (
    empresa_id = ANY(fn_user_empresa_ids())
    AND fn_get_user_role() IN ('dono', 'admin')
  );

CREATE POLICY "caminhao_insert_dono_admin"
  ON caminhao FOR INSERT
  TO authenticated
  WITH CHECK (
    empresa_id = fn_get_empresa_id()
    AND fn_get_user_role() IN ('dono', 'admin')
  );

CREATE POLICY "caminhao_update_dono_admin"
  ON caminhao FOR UPDATE
  TO authenticated
  USING (
    empresa_id = fn_get_empresa_id()
    AND fn_get_user_role() IN ('dono', 'admin')
  )
  WITH CHECK (
    empresa_id = fn_get_empresa_id()
    AND fn_get_user_role() IN ('dono', 'admin')
  );

CREATE POLICY "caminhao_delete_dono_admin"
  ON caminhao FOR DELETE
  TO authenticated
  USING (
    empresa_id = fn_get_empresa_id()
    AND fn_get_user_role() IN ('dono', 'admin')
  );

-- Motorista: SELECT todas empresas vinculadas (para multi)
CREATE POLICY "caminhao_select_motorista"
  ON caminhao FOR SELECT
  TO authenticated
  USING (
    empresa_id = ANY(fn_user_empresa_ids())
    AND fn_get_user_role() = 'motorista'
  );

-- =============================================================================
-- 8. Atualizar SELECT policies — fechamento_item
-- =============================================================================
-- fechamento_item SELECT usa join com fechamento.empresa_id

DROP POLICY IF EXISTS fechamento_item_select ON fechamento_item;

CREATE POLICY fechamento_item_select ON fechamento_item
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM fechamento f
      WHERE f.id = fechamento_item.fechamento_id
        AND f.empresa_id = ANY(fn_user_empresa_ids())
        AND (
          fn_get_user_role() IN ('dono', 'admin')
          OR f.motorista_id = fn_get_motorista_id()
        )
    )
  );

-- =============================================================================
-- 9. Atualizar SELECT policies — viagem_veiculo
-- =============================================================================

DROP POLICY IF EXISTS "empresa_viagem_veiculo_all" ON viagem_veiculo;

-- Replace FOR ALL with separate SELECT + CUD policies
CREATE POLICY "viagem_veiculo_select"
  ON viagem_veiculo FOR SELECT
  TO authenticated
  USING (empresa_id = ANY(fn_user_empresa_ids()));

CREATE POLICY "viagem_veiculo_insert"
  ON viagem_veiculo FOR INSERT
  TO authenticated
  WITH CHECK (empresa_id = fn_get_empresa_id());

CREATE POLICY "viagem_veiculo_update"
  ON viagem_veiculo FOR UPDATE
  TO authenticated
  USING (empresa_id = fn_get_empresa_id())
  WITH CHECK (empresa_id = fn_get_empresa_id());

CREATE POLICY "viagem_veiculo_delete"
  ON viagem_veiculo FOR DELETE
  TO authenticated
  USING (empresa_id = fn_get_empresa_id());

-- motorista policy remains unchanged (operates on own viagens)
-- "motorista_viagem_veiculo_own" is not touched

COMMIT;
