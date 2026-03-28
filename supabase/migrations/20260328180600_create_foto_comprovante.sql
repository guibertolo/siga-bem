-- Migration: Create foto_comprovante table + Storage bucket policies
-- Story: 2.2 — Upload de Fotos de Comprovantes
-- Date: 2026-03-28

-- ---------------------------------------------------------------------------
-- 1. TABLE: foto_comprovante
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS foto_comprovante (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id     UUID NOT NULL REFERENCES empresa(id) ON DELETE RESTRICT,
  gasto_id       UUID NOT NULL REFERENCES gasto(id) ON DELETE CASCADE,
  storage_path   TEXT NOT NULL,
  thumbnail_path TEXT,
  content_type   VARCHAR(50),
  size_bytes     INTEGER,
  uploaded_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT ck_foto_size CHECK (size_bytes IS NULL OR size_bytes > 0)
);

COMMENT ON TABLE foto_comprovante IS 'Fotos de comprovantes de gastos armazenadas no Supabase Storage.';
COMMENT ON COLUMN foto_comprovante.storage_path IS 'Path no bucket comprovantes: {empresa_id}/{gasto_id}/{timestamp}.{ext}';
COMMENT ON COLUMN foto_comprovante.content_type IS 'MIME type: image/jpeg, image/png, image/webp, application/pdf';

-- ---------------------------------------------------------------------------
-- 2. INDEXES
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_foto_comprovante_gasto
  ON foto_comprovante (gasto_id);

CREATE INDEX IF NOT EXISTS idx_foto_comprovante_empresa
  ON foto_comprovante (empresa_id);

-- ---------------------------------------------------------------------------
-- 3. RLS
-- ---------------------------------------------------------------------------
ALTER TABLE foto_comprovante ENABLE ROW LEVEL SECURITY;

-- Dono/admin: full access to all comprovantes of their empresa
CREATE POLICY "Dono e admin gerenciam comprovantes"
  ON foto_comprovante FOR ALL
  USING (
    empresa_id = fn_get_empresa_id()
    AND fn_get_user_role() IN ('dono', 'admin')
  );

-- Motorista: only comprovantes of their own gastos
CREATE POLICY "Motorista ve comprovantes dos proprios gastos"
  ON foto_comprovante FOR SELECT
  USING (
    gasto_id IN (
      SELECT id FROM gasto WHERE motorista_id = fn_get_motorista_id()
    )
  );

CREATE POLICY "Motorista insere comprovantes nos proprios gastos"
  ON foto_comprovante FOR INSERT
  WITH CHECK (
    empresa_id = fn_get_empresa_id()
    AND gasto_id IN (
      SELECT id FROM gasto WHERE motorista_id = fn_get_motorista_id()
    )
  );

CREATE POLICY "Motorista deleta comprovantes dos proprios gastos"
  ON foto_comprovante FOR DELETE
  USING (
    gasto_id IN (
      SELECT id FROM gasto WHERE motorista_id = fn_get_motorista_id()
    )
  );

-- ---------------------------------------------------------------------------
-- 4. STORAGE BUCKET: comprovantes
-- ---------------------------------------------------------------------------
-- NOTE: Bucket creation is done via Supabase Dashboard or supabase CLI.
-- The SQL below configures RLS policies on the storage.objects table.
-- Run in Supabase SQL Editor:

-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('comprovantes', 'comprovantes', false);

-- Storage RLS: users can only upload to their empresa folder
CREATE POLICY "Upload comprovante na pasta da empresa"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'comprovantes'
    AND (storage.foldername(name))[1] = fn_get_empresa_id()::text
  );

-- Storage RLS: users can only read from their empresa folder
CREATE POLICY "Leitura comprovante da propria empresa"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'comprovantes'
    AND (storage.foldername(name))[1] = fn_get_empresa_id()::text
  );

-- Storage RLS: users can only delete from their empresa folder
CREATE POLICY "Deletar comprovante da propria empresa"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'comprovantes'
    AND (storage.foldername(name))[1] = fn_get_empresa_id()::text
  );
