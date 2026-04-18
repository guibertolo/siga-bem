-- =============================================================================
-- Migration: Story 21.5 — Restrict combustivel_preco writes to dono/admin
-- Problem: Original policy "empresa_combustivel_all" allows any authenticated
-- user (including motoristas) to INSERT/UPDATE/DELETE prices.
-- Fix: Split into read (all authenticated) and write (dono/admin only).
-- =============================================================================

-- 1. Drop the overly permissive policy
DROP POLICY IF EXISTS "empresa_combustivel_all" ON combustivel_preco;

-- 2. SELECT: any authenticated user in the empresa can read prices
CREATE POLICY "combustivel_preco_select"
  ON combustivel_preco FOR SELECT
  TO authenticated
  USING (empresa_id = fn_get_empresa_id());

-- 3. INSERT/UPDATE/DELETE: only dono/admin can modify prices
CREATE POLICY "combustivel_preco_write"
  ON combustivel_preco FOR ALL
  TO authenticated
  USING (
    empresa_id = fn_get_empresa_id()
    AND fn_get_user_role() IN ('dono', 'admin')
  )
  WITH CHECK (
    empresa_id = fn_get_empresa_id()
    AND fn_get_user_role() IN ('dono', 'admin')
  );
