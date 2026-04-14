-- =============================================================================
-- Migration: Create foto_chamada table, storage bucket, OCR columns, indices
-- Story: 23.1 — Schema, Storage e Indices da Chamada
-- Date: 2026-04-14
-- Espelha: 20260328180600_create_foto_comprovante.sql (gasto_id → viagem_id)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. TABLE: foto_chamada
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS foto_chamada (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id     UUID NOT NULL REFERENCES empresa(id) ON DELETE RESTRICT,
  viagem_id      UUID NOT NULL REFERENCES viagem(id) ON DELETE CASCADE,
  storage_path   TEXT NOT NULL,
  thumbnail_path TEXT,
  content_type   VARCHAR(50),
  size_bytes     INTEGER,
  uploaded_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT ck_chamada_size CHECK (size_bytes IS NULL OR size_bytes > 0)
);

COMMENT ON TABLE foto_chamada IS 'Fotos da chamada (documento da embarcadora) armazenadas no Supabase Storage.';
COMMENT ON COLUMN foto_chamada.storage_path IS 'Path no bucket chamadas: {empresa_id}/{viagem_id}/{timestamp}.{ext}';
COMMENT ON COLUMN foto_chamada.content_type IS 'MIME type: image/jpeg, image/png, image/webp, application/pdf';

-- ---------------------------------------------------------------------------
-- 2. INDEXES
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_foto_chamada_viagem
  ON foto_chamada (viagem_id);

CREATE INDEX IF NOT EXISTS idx_foto_chamada_empresa
  ON foto_chamada (empresa_id);

-- ---------------------------------------------------------------------------
-- 3. RLS
-- ---------------------------------------------------------------------------
ALTER TABLE foto_chamada ENABLE ROW LEVEL SECURITY;

-- Dono/admin: full access to all chamadas of their empresa
CREATE POLICY "Dono e admin gerenciam chamadas"
  ON foto_chamada FOR ALL
  USING (
    empresa_id = fn_get_empresa_id()
    AND fn_get_user_role() IN ('dono', 'admin')
  );

-- Motorista: only chamadas of their own viagens
CREATE POLICY "Motorista ve chamadas das proprias viagens"
  ON foto_chamada FOR SELECT
  USING (
    viagem_id IN (
      SELECT id FROM viagem WHERE motorista_id = fn_get_motorista_id()
    )
  );

CREATE POLICY "Motorista insere chamadas nas proprias viagens ativas"
  ON foto_chamada FOR INSERT
  WITH CHECK (
    empresa_id = fn_get_empresa_id()
    AND viagem_id IN (
      SELECT id FROM viagem
      WHERE motorista_id = fn_get_motorista_id()
        AND status IN ('planejada', 'em_andamento')
    )
  );

-- Motorista UPDATE/DELETE: NENHUMA policy — bloqueio total por omissao (imutabilidade)

-- ---------------------------------------------------------------------------
-- 4. TRIGGER: bloquear INSERT quando viagem nao esta ativa (segunda camada)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_block_chamada_insert_status()
RETURNS TRIGGER AS $$
DECLARE
  v_status viagem_status;
BEGIN
  -- Dono/admin passam sem verificacao de status
  IF fn_get_user_role() IN ('dono', 'admin') THEN
    RETURN NEW;
  END IF;

  SELECT status INTO v_status
  FROM viagem
  WHERE id = NEW.viagem_id;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Viagem nao encontrada: %', NEW.viagem_id;
  END IF;

  IF v_status NOT IN ('planejada', 'em_andamento') THEN
    RAISE EXCEPTION 'Nao e permitido anexar chamada em viagem com status "%". Apenas viagens planejadas ou em andamento aceitam fotos da chamada.', v_status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tg_block_chamada_insert_status
  BEFORE INSERT ON foto_chamada
  FOR EACH ROW
  EXECUTE FUNCTION fn_block_chamada_insert_status();

-- ---------------------------------------------------------------------------
-- 5. COLUNAS OCR-READY em viagem (nullable, sem default)
-- ---------------------------------------------------------------------------
ALTER TABLE viagem ADD COLUMN IF NOT EXISTS chamada_carros_count INTEGER;
ALTER TABLE viagem ADD COLUMN IF NOT EXISTS chamada_embarcador TEXT;
ALTER TABLE viagem ADD COLUMN IF NOT EXISTS chamada_ocr_extraido_em TIMESTAMPTZ;

-- ---------------------------------------------------------------------------
-- 6. COMMENT ON viagem.valor_total (sobrescreve anterior)
-- ---------------------------------------------------------------------------
COMMENT ON COLUMN viagem.valor_total IS 'Valor total do frete conforme a chamada (documento fisico recebido na embarcadora). Preenchido pelo motorista no lancamento da viagem.';

-- ---------------------------------------------------------------------------
-- 7. STORAGE BUCKET: chamadas
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('chamadas', 'chamadas', false)
ON CONFLICT DO NOTHING;

-- INSERT: usuario so faz upload na pasta da sua empresa
CREATE POLICY "Upload chamada na pasta da empresa"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'chamadas'
    AND (storage.foldername(name))[1] = fn_get_empresa_id()::text
  );

-- SELECT: usuario so le chamadas da sua empresa
CREATE POLICY "Leitura chamada da propria empresa"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'chamadas'
    AND (storage.foldername(name))[1] = fn_get_empresa_id()::text
  );

-- DELETE: usuario so deleta chamadas da sua empresa
CREATE POLICY "Deletar chamada da propria empresa"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'chamadas'
    AND (storage.foldername(name))[1] = fn_get_empresa_id()::text
  );

-- SEM UPDATE por design — chamadas sao imutaveis

-- ---------------------------------------------------------------------------
-- 8. INDICE COMPOSTO: viagem por caminhao e data
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_viagem_caminhao_saida
  ON viagem (caminhao_id, data_saida DESC);
