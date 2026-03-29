-- Migration: Create categoria_gasto + gasto tables with RLS and seed data
-- Story: 2.1 — CRUD de Gastos com Categorias
-- Date: 2026-03-28

-- ---------------------------------------------------------------------------
-- 1. TABLE: categoria_gasto
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categoria_gasto (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES empresa(id) ON DELETE RESTRICT,  -- NULL = global/default
  nome       TEXT NOT NULL,
  icone      TEXT,        -- icon identifier (e.g., 'fuel', 'toll', 'tire')
  cor        VARCHAR(7),  -- hex color e.g. '#FF5733'
  ativa      BOOLEAN NOT NULL DEFAULT true,
  ordem      INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE categoria_gasto IS 'Categorias de gasto. empresa_id NULL = categorias padrao do sistema.';
COMMENT ON COLUMN categoria_gasto.empresa_id IS 'NULL para categorias globais (seed). Preenchido para categorias customizadas da empresa.';

CREATE TRIGGER trg_categoria_gasto_updated_at
  BEFORE UPDATE ON categoria_gasto
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE INDEX IF NOT EXISTS idx_catgasto_empresa
  ON categoria_gasto (empresa_id);

-- RLS for categoria_gasto
ALTER TABLE categoria_gasto ENABLE ROW LEVEL SECURITY;

-- Everyone can read global categories (empresa_id IS NULL)
CREATE POLICY "Categorias globais visiveis para todos"
  ON categoria_gasto FOR SELECT
  USING (empresa_id IS NULL);

-- Users can read/manage their empresa's custom categories
CREATE POLICY "Categorias da empresa visiveis para membros"
  ON categoria_gasto FOR SELECT
  USING (empresa_id = fn_get_empresa_id());

CREATE POLICY "Dono e admin gerenciam categorias da empresa"
  ON categoria_gasto FOR ALL
  USING (
    empresa_id = fn_get_empresa_id()
    AND fn_get_user_role() IN ('dono', 'admin')
  );

-- ---------------------------------------------------------------------------
-- 2. SEED: 11 default categories (empresa_id = NULL)
-- ---------------------------------------------------------------------------
INSERT INTO categoria_gasto (empresa_id, nome, icone, cor, ordem) VALUES
  (NULL, 'Pedagio',        'toll',        '#6366F1',  1),
  (NULL, 'Combustivel',    'fuel',        '#EF4444',  2),
  (NULL, 'Pneu',           'tire',        '#1F2937',  3),
  (NULL, 'Manutencao',     'wrench',      '#F59E0B',  4),
  (NULL, 'Lavagem',        'droplet',     '#3B82F6',  5),
  (NULL, 'Estacionamento', 'parking',     '#8B5CF6',  6),
  (NULL, 'Alimentacao',    'utensils',    '#10B981',  7),
  (NULL, 'Hospedagem',     'bed',         '#EC4899',  8),
  (NULL, 'Seguro',         'shield',      '#14B8A6',  9),
  (NULL, 'Multa',          'alert',       '#DC2626', 10),
  (NULL, 'Outros',         'ellipsis',    '#6B7280', 99);

-- ---------------------------------------------------------------------------
-- 3. TABLE: gasto
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gasto (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id    UUID NOT NULL REFERENCES empresa(id) ON DELETE RESTRICT,
  categoria_id  UUID NOT NULL REFERENCES categoria_gasto(id) ON DELETE RESTRICT,
  motorista_id  UUID NOT NULL REFERENCES motorista(id) ON DELETE RESTRICT,
  caminhao_id   UUID REFERENCES caminhao(id) ON DELETE SET NULL,
  viagem_id     UUID,  -- FK para viagem adicionada na migration 20260328180700
  valor         INTEGER NOT NULL,  -- centavos: R$ 150,00 = 15000
  data          DATE NOT NULL DEFAULT CURRENT_DATE,
  descricao     TEXT,
  foto_url      TEXT,              -- URL do comprovante principal no Supabase Storage
  km_registro   INTEGER,           -- km no momento do gasto
  created_by    UUID REFERENCES usuario(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT ck_gasto_valor CHECK (valor > 0)
);

COMMENT ON TABLE gasto IS 'Registro de gasto/despesa. Valores em centavos. Vinculado a motorista e opcionalmente a viagem.';
COMMENT ON COLUMN gasto.valor IS 'Valor do gasto em centavos (R$ 150,00 = 15000). NUNCA usar FLOAT/NUMERIC.';

CREATE TRIGGER trg_gasto_updated_at
  BEFORE UPDATE ON gasto
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ---------------------------------------------------------------------------
-- 4. INDEXES for gasto
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_gasto_empresa_data
  ON gasto (empresa_id, data DESC);

CREATE INDEX IF NOT EXISTS idx_gasto_motorista
  ON gasto (motorista_id);

CREATE INDEX IF NOT EXISTS idx_gasto_caminhao
  ON gasto (caminhao_id) WHERE caminhao_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_gasto_categoria
  ON gasto (categoria_id);

CREATE INDEX IF NOT EXISTS idx_gasto_motorista_data
  ON gasto (motorista_id, data DESC);

-- ---------------------------------------------------------------------------
-- 5. RLS for gasto
-- ---------------------------------------------------------------------------
ALTER TABLE gasto ENABLE ROW LEVEL SECURITY;

-- Dono/admin: full access to all gastos of their empresa
CREATE POLICY "Dono e admin gerenciam gastos"
  ON gasto FOR ALL
  USING (
    empresa_id = fn_get_empresa_id()
    AND fn_get_user_role() IN ('dono', 'admin')
  );

-- Motorista: only their own gastos
CREATE POLICY "Motorista gerencia proprios gastos"
  ON gasto FOR ALL
  USING (motorista_id = fn_get_motorista_id());
