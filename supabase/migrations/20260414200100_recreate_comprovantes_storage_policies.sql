-- =============================================================================
-- Migration: Recriar policies do bucket comprovantes (codificar drift)
-- Story: 21.2
-- Data: 2026-04-14
-- Origem: auditoria de seguranca — policies corretas existem no Dashboard
--         mas precisam estar codificadas de forma idemponente no git.
-- =============================================================================
-- As policies originais com escopo de empresa foram criadas em
-- 20260328180600_create_foto_comprovante.sql. As policies SEM escopo
-- (20260330300000) foram dropadas em 20260412120000_fire_block_security_fixes.sql.
--
-- Esta migration garante idempotencia: dropa e recria as 3 policies corretas
-- (INSERT/SELECT/DELETE) com filtro de empresa via fn_get_empresa_id().
-- SEM UPDATE por design — comprovantes sao imutaveis.
-- =============================================================================

-- Drop primeiro para idempotencia (evita erro se policies ja existem)
DROP POLICY IF EXISTS "Upload comprovante na pasta da empresa" ON storage.objects;
DROP POLICY IF EXISTS "Leitura comprovante da propria empresa" ON storage.objects;
DROP POLICY IF EXISTS "Deletar comprovante da propria empresa" ON storage.objects;

-- INSERT: usuario so faz upload na pasta da sua empresa
CREATE POLICY "Upload comprovante na pasta da empresa"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'comprovantes'
    AND (storage.foldername(name))[1] = fn_get_empresa_id()::text
  );

-- SELECT: usuario so le comprovantes da sua empresa
CREATE POLICY "Leitura comprovante da propria empresa"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'comprovantes'
    AND (storage.foldername(name))[1] = fn_get_empresa_id()::text
  );

-- DELETE: usuario so deleta comprovantes da sua empresa
CREATE POLICY "Deletar comprovante da propria empresa"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'comprovantes'
    AND (storage.foldername(name))[1] = fn_get_empresa_id()::text
  );
