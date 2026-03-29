-- Story 3.2: Cadastro de Veiculos Transportados por Viagem
-- Table viagem_veiculo: vehicles being transported on each trip

CREATE TABLE viagem_veiculo (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresa(id) ON DELETE RESTRICT,
  viagem_id  UUID NOT NULL REFERENCES viagem(id) ON DELETE CASCADE,
  marca      TEXT,
  modelo     TEXT NOT NULL,
  placa      VARCHAR(8),
  chassi     VARCHAR(20),
  cor        TEXT,
  observacao TEXT,
  posicao    INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT ck_vv_posicao CHECK (posicao IS NULL OR (posicao > 0 AND posicao <= 15)),
  CONSTRAINT ck_vv_modelo_len CHECK (char_length(modelo) <= 100),
  CONSTRAINT ck_vv_marca_len CHECK (marca IS NULL OR char_length(marca) <= 50),
  CONSTRAINT ck_vv_placa_len CHECK (placa IS NULL OR char_length(placa) <= 8),
  CONSTRAINT ck_vv_chassi_len CHECK (chassi IS NULL OR char_length(chassi) <= 20),
  CONSTRAINT ck_vv_cor_len CHECK (cor IS NULL OR char_length(cor) <= 30),
  CONSTRAINT ck_vv_obs_len CHECK (observacao IS NULL OR char_length(observacao) <= 300)
);

-- Enable RLS
ALTER TABLE viagem_veiculo ENABLE ROW LEVEL SECURITY;

-- Policy: dono/admin full access to company vehicles
CREATE POLICY "empresa_viagem_veiculo_all"
  ON viagem_veiculo FOR ALL
  USING (empresa_id = fn_get_empresa_id())
  WITH CHECK (empresa_id = fn_get_empresa_id());

-- Policy: motorista read-only access to own trip vehicles
CREATE POLICY "motorista_viagem_veiculo_own"
  ON viagem_veiculo FOR SELECT
  USING (
    viagem_id IN (
      SELECT id FROM viagem
      WHERE empresa_id = fn_get_empresa_id()
        AND (
          fn_get_user_role() IN ('dono', 'admin')
          OR motorista_id = fn_get_motorista_id()
        )
    )
  );

-- Indexes
CREATE INDEX idx_vv_empresa ON viagem_veiculo (empresa_id);
CREATE INDEX idx_vv_viagem ON viagem_veiculo (viagem_id);
CREATE INDEX idx_vv_placa ON viagem_veiculo (placa) WHERE placa IS NOT NULL;

-- Auto-update updated_at trigger (reuse existing function if available)
CREATE TRIGGER set_viagem_veiculo_updated_at
  BEFORE UPDATE ON viagem_veiculo
  FOR EACH ROW
  EXECUTE FUNCTION fn_set_updated_at();
