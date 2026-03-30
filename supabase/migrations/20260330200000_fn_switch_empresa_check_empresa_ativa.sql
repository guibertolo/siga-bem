-- =============================================================================
-- Story 7.5: Add empresa.ativa check to fn_switch_empresa
-- =============================================================================
-- The original fn_switch_empresa (from Story 7.1) validates that the user has
-- an active binding in usuario_empresa, but does NOT check whether the target
-- empresa itself is active (empresa.ativa = true).
--
-- AC:5 requires: "Nao e possivel trocar para uma empresa com empresa.ativa = false"
-- =============================================================================

CREATE OR REPLACE FUNCTION fn_switch_empresa(p_empresa_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usuario_id UUID;
  v_new_role   usuario_role;
  v_empresa_ativa BOOLEAN;
BEGIN
  -- Find authenticated user
  SELECT id INTO v_usuario_id
  FROM usuario
  WHERE auth_id = auth.uid();

  IF v_usuario_id IS NULL THEN
    RAISE EXCEPTION 'Usuario nao encontrado';
  END IF;

  -- AC:5 — Verify that the target empresa is active
  SELECT ativa INTO v_empresa_ativa
  FROM empresa
  WHERE id = p_empresa_id;

  IF v_empresa_ativa IS NULL THEN
    RAISE EXCEPTION 'Empresa nao encontrada';
  END IF;

  IF v_empresa_ativa = false THEN
    RAISE EXCEPTION 'Empresa nao esta ativa';
  END IF;

  -- AC:4 — Validate active binding exists in usuario_empresa
  SELECT ue.role INTO v_new_role
  FROM usuario_empresa ue
  WHERE ue.usuario_id = v_usuario_id
    AND ue.empresa_id = p_empresa_id
    AND ue.ativo = true;

  IF v_new_role IS NULL THEN
    RAISE EXCEPTION 'Sem vinculo ativo com esta empresa';
  END IF;

  -- Atomically switch empresa and sync role
  UPDATE usuario
  SET empresa_id = p_empresa_id,
      role = v_new_role,
      ultima_empresa_id = empresa_id
  WHERE id = v_usuario_id;

  RETURN true;
END;
$$;

COMMENT ON FUNCTION fn_switch_empresa IS 'Troca empresa ativa do usuario autenticado. Valida empresa.ativa, vinculo ativo, e sincroniza role.';
