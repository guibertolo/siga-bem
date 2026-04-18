-- =============================================================================
-- Story 21.7: WITH CHECK explicito em policies de gasto
-- Epic 21 — SEC (Seguranca e Integridade)
-- Data: 2026-04-14
-- =============================================================================
-- Problema: Policies FOR ALL em gasto usam apenas USING (sem WITH CHECK
-- explicito). Em INSERT/UPDATE, o Postgres aplica USING como WITH CHECK por
-- padrao, mas a pratica recomendada e ser explicito — especialmente quando ha
-- dois campos de isolamento (empresa_id + motorista_id).
--
-- Solucao: Dropar as 2 policies FOR ALL e recriar como 4 policies separadas
-- por operacao (SELECT, INSERT, UPDATE, DELETE), com WITH CHECK explicito
-- em INSERT e UPDATE.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. DROP das policies FOR ALL atuais
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Dono e admin gerenciam gastos" ON gasto;
DROP POLICY IF EXISTS "Motorista gerencia proprios gastos" ON gasto;

-- -----------------------------------------------------------------------------
-- 2. Policies para DONO/ADMIN
-- -----------------------------------------------------------------------------

-- SELECT: dono/admin ve todos gastos da empresa
CREATE POLICY "gasto_select_dono_admin"
  ON gasto FOR SELECT
  TO authenticated
  USING (
    empresa_id = fn_get_empresa_id()
    AND fn_get_user_role() IN ('dono', 'admin')
  );

-- INSERT: dono/admin insere gastos na propria empresa
CREATE POLICY "gasto_insert_dono_admin"
  ON gasto FOR INSERT
  TO authenticated
  WITH CHECK (
    empresa_id = fn_get_empresa_id()
    AND fn_get_user_role() IN ('dono', 'admin')
  );

-- UPDATE: dono/admin atualiza gastos da propria empresa
CREATE POLICY "gasto_update_dono_admin"
  ON gasto FOR UPDATE
  TO authenticated
  USING (
    empresa_id = fn_get_empresa_id()
    AND fn_get_user_role() IN ('dono', 'admin')
  )
  WITH CHECK (
    empresa_id = fn_get_empresa_id()
    AND fn_get_user_role() IN ('dono', 'admin')
  );

-- DELETE: dono/admin deleta gastos da propria empresa
CREATE POLICY "gasto_delete_dono_admin"
  ON gasto FOR DELETE
  TO authenticated
  USING (
    empresa_id = fn_get_empresa_id()
    AND fn_get_user_role() IN ('dono', 'admin')
  );

-- -----------------------------------------------------------------------------
-- 3. Policies para MOTORISTA
-- -----------------------------------------------------------------------------

-- SELECT: motorista ve apenas os proprios gastos
CREATE POLICY "gasto_select_motorista"
  ON gasto FOR SELECT
  TO authenticated
  USING (
    empresa_id = fn_get_empresa_id()
    AND motorista_id = fn_get_motorista_id()
  );

-- INSERT: motorista insere apenas gastos proprios na propria empresa
CREATE POLICY "gasto_insert_motorista"
  ON gasto FOR INSERT
  TO authenticated
  WITH CHECK (
    empresa_id = fn_get_empresa_id()
    AND motorista_id = fn_get_motorista_id()
  );

-- UPDATE: motorista atualiza apenas gastos proprios
CREATE POLICY "gasto_update_motorista"
  ON gasto FOR UPDATE
  TO authenticated
  USING (
    empresa_id = fn_get_empresa_id()
    AND motorista_id = fn_get_motorista_id()
  )
  WITH CHECK (
    empresa_id = fn_get_empresa_id()
    AND motorista_id = fn_get_motorista_id()
  );

-- DELETE: motorista NAO pode deletar gastos (apenas dono/admin)
-- (Sem policy DELETE para motorista — acesso negado por padrao via RLS)

COMMIT;
