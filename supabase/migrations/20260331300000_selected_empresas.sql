-- Migration: Add selected_empresas column for multi-empresa consolidated view
-- Phase 1: App-side approach — no RLS changes, queries per-empresa and merges client-side

ALTER TABLE usuario ADD COLUMN IF NOT EXISTS selected_empresas UUID[] DEFAULT NULL;
COMMENT ON COLUMN usuario.selected_empresas IS 'Array of empresa IDs for consolidated view. NULL = single empresa mode (default).';
