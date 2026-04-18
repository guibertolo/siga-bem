-- =============================================================================
-- Migration: Create audit_log table for Gestor Fase 2
-- Timestamp: 20260418000000
--
-- Tabela de auditoria para rastrear mutacoes (create/update/delete) feitas
-- por gestores (role admin) e outros usuarios. O dono pode ver tudo da sua
-- empresa; o gestor pode ver apenas seus proprios registros (transparencia).
--
-- Motivacao: dono precisa saber o que seu gestor fez (adicionou viagens,
-- alterou gastos, apagou manutencoes) sem precisar abrir cada ficha.
-- =============================================================================

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuario(id),
  -- Snapshot do role no momento da acao — se o usuario mudar de role depois,
  -- o historico mantem o contexto correto.
  usuario_role TEXT NOT NULL CHECK (usuario_role IN ('dono', 'admin', 'motorista')),
  usuario_nome TEXT NOT NULL,
  acao TEXT NOT NULL CHECK (acao IN ('create', 'update', 'delete')),
  entidade TEXT NOT NULL,
  entidade_id UUID,
  -- Descricao humana para exibicao no log (ex: "Viagem Osasco -> Cubatao 15/04")
  entidade_descricao TEXT,
  valores_antes JSONB,
  valores_depois JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_empresa_created
  ON audit_log(empresa_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_usuario_created
  ON audit_log(usuario_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_entidade
  ON audit_log(entidade, entidade_id);

-- =============================================================================
-- RLS
-- =============================================================================

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Dono ve tudo da sua empresa (auditoria completa do negocio)
CREATE POLICY "audit_log_select_dono"
  ON audit_log
  FOR SELECT
  USING (
    empresa_id IN (
      SELECT ue.empresa_id
      FROM usuario_empresa ue
      JOIN usuario u ON u.id = ue.usuario_id
      WHERE u.auth_id = auth.uid()
        AND ue.role = 'dono'
    )
  );

-- Admin (gestor) ve apenas seus proprios logs — transparencia, nao espionagem
CREATE POLICY "audit_log_select_admin_proprio"
  ON audit_log
  FOR SELECT
  USING (
    usuario_id = (SELECT id FROM usuario WHERE auth_id = auth.uid())
  );

-- Insert: qualquer usuario autenticado pode logar suas proprias acoes
CREATE POLICY "audit_log_insert_proprio"
  ON audit_log
  FOR INSERT
  WITH CHECK (
    usuario_id = (SELECT id FROM usuario WHERE auth_id = auth.uid())
  );

-- Nao ha UPDATE nem DELETE policies — logs sao imutaveis por design

COMMENT ON TABLE audit_log IS
  'Registro de mutacoes feitas por usuarios. Dono audita gestores. Imutavel.';
