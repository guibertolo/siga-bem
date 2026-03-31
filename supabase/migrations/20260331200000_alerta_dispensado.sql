-- =============================================================================
-- Migration: Create alerta_dispensado table
-- Reason: Allow dono to dismiss BI alerts after verification
-- =============================================================================

CREATE TABLE IF NOT EXISTS alerta_dispensado (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,           -- 'combustivel', 'manutencao', 'pneu', 'gasto_acima_media'
  entidade TEXT NOT NULL,       -- placa ou nome do motorista
  dispensado_por UUID NOT NULL REFERENCES usuario(id),
  dispensado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (empresa_id, tipo, entidade)
);

-- RLS: only dono/admin can manage
ALTER TABLE alerta_dispensado ENABLE ROW LEVEL SECURITY;

CREATE POLICY "alerta_select" ON alerta_dispensado
  FOR SELECT TO authenticated
  USING (empresa_id = fn_get_empresa_id());

CREATE POLICY "alerta_insert" ON alerta_dispensado
  FOR INSERT TO authenticated
  WITH CHECK (
    empresa_id = fn_get_empresa_id()
    AND fn_get_user_role() IN ('dono', 'admin')
  );

CREATE POLICY "alerta_delete" ON alerta_dispensado
  FOR DELETE TO authenticated
  USING (
    empresa_id = fn_get_empresa_id()
    AND fn_get_user_role() IN ('dono', 'admin')
  );

CREATE INDEX idx_alerta_dispensado_empresa ON alerta_dispensado (empresa_id);

COMMENT ON TABLE alerta_dispensado IS 'Alertas do BI que o dono marcou como verificado/tratado';
