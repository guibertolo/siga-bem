-- =============================================================================
-- Story 21.6: RPC fn_create_empresa_with_owner + remover policy INSERT aberta
-- Epic 21 — SEC (Seguranca e Integridade)
-- Data: 2026-04-14
-- =============================================================================
-- Problema: Policy "Usuarios autenticados criam empresa" permite INSERT direto
-- por qualquer usuario autenticado, burlando o fluxo de onboarding. Alem disso,
-- INSERT em empresa + INSERT em usuario_empresa sao duas operacoes separadas no
-- codigo TypeScript, criando risco de estado inconsistente (empresa sem dono).
--
-- Solucao: RPC SECURITY DEFINER que faz ambos INSERTs atomicamente.
-- Apos criar a RPC, a policy aberta de INSERT e removida.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Criar RPC fn_create_empresa_with_owner
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_create_empresa_with_owner(
  p_razao_social   text,
  p_cnpj           text,
  p_nome_fantasia  text DEFAULT NULL,
  p_plano          text DEFAULT 'free'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa_id  uuid;
  v_usuario_id  uuid;
  v_plano       plano_tipo;
BEGIN
  -- Validar que o caller esta autenticado
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Nao autenticado'
      USING ERRCODE = '28000';
  END IF;

  -- Lookup do usuario na tabela usuario
  SELECT id INTO v_usuario_id
  FROM usuario
  WHERE auth_id = auth.uid();

  IF v_usuario_id IS NULL THEN
    RAISE EXCEPTION 'Usuario nao encontrado na tabela usuario'
      USING ERRCODE = 'P0002';
  END IF;

  -- Cast seguro do plano
  BEGIN
    v_plano := p_plano::plano_tipo;
  EXCEPTION WHEN invalid_text_representation THEN
    v_plano := 'free';
  END;

  -- Criar empresa
  INSERT INTO empresa (razao_social, cnpj, nome_fantasia, plano)
  VALUES (p_razao_social, p_cnpj, p_nome_fantasia, v_plano)
  RETURNING id INTO v_empresa_id;

  -- Vincular usuario como dono
  INSERT INTO usuario_empresa (usuario_id, empresa_id, role, ativo)
  VALUES (v_usuario_id, v_empresa_id, 'dono', true);

  -- Atualizar empresa_id ativa do usuario
  UPDATE usuario
  SET empresa_id = v_empresa_id
  WHERE id = v_usuario_id;

  RETURN v_empresa_id;
END;
$$;

COMMENT ON FUNCTION fn_create_empresa_with_owner IS
  'Cria empresa e vincula usuario autenticado como dono atomicamente. '
  'SECURITY DEFINER — bypassa RLS. Unico caminho para INSERT em empresa.';

-- Grant para usuarios autenticados
GRANT EXECUTE ON FUNCTION fn_create_empresa_with_owner(text, text, text, text) TO authenticated;

-- -----------------------------------------------------------------------------
-- 2. Remover policy aberta de INSERT em empresa
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Usuarios autenticados criam empresa" ON empresa;

COMMIT;
