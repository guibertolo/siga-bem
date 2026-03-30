-- ---------------------------------------------------------------------------
-- Migration: Restrict RLS for motorista role
-- Issues: M1 (usuario) and M2 (motorista_caminhao) from QA audit
-- ---------------------------------------------------------------------------
-- M1: usuario table - motorista could read all users in empresa (names, emails, roles)
-- M2: motorista_caminhao table - motorista could see all vinculos in empresa
-- ---------------------------------------------------------------------------

-- =========================================================================
-- M1: Restrict usuario visibility for motoristas
-- Previously: "usuario_select_empresa" allowed any role to SELECT all users
--             in the same empresa. Motorista could see names/emails of all
--             colleagues via direct Supabase client call.
-- Now:        Motorista sees only their own record; dono/admin see all.
-- Note:       "usuario_select_self" (auth_id = auth.uid()) already exists
--             and provides a safety net, but this policy is the primary gate.
-- =========================================================================

DROP POLICY IF EXISTS "usuario_select_empresa" ON usuario;

CREATE POLICY "usuario_select_empresa" ON usuario
  FOR SELECT USING (
    CASE
      WHEN fn_get_user_role() = 'motorista' THEN auth_id = auth.uid()
      ELSE empresa_id = fn_get_empresa_id()
    END
  );

-- =========================================================================
-- M2: Restrict motorista_caminhao visibility for motoristas
-- Previously: "Motorista visualiza vinculos da empresa" allowed motorista to
--             SELECT all vinculos in the empresa, exposing which motorista
--             drives which caminhao.
-- Now:        Motorista sees only their own vinculos; dono/admin see all.
-- =========================================================================

DROP POLICY IF EXISTS "Motorista visualiza vinculos da empresa" ON motorista_caminhao;

CREATE POLICY "motorista_caminhao_select_restricted" ON motorista_caminhao
  FOR SELECT USING (
    CASE
      WHEN fn_get_user_role() = 'motorista' THEN motorista_id = fn_get_motorista_id()
      ELSE empresa_id = fn_get_empresa_id()
    END
  );
