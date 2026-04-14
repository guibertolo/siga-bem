-- Migration: Add IPVA/CRLV documentation fields to caminhao
-- Story: 18.1 — Campos de documentacao e IPVA no cadastro do caminhao
-- Date: 2026-04-14

ALTER TABLE caminhao ADD COLUMN IF NOT EXISTS doc_vencimento DATE;
ALTER TABLE caminhao ADD COLUMN IF NOT EXISTS ipva_pago BOOLEAN DEFAULT false;
ALTER TABLE caminhao ADD COLUMN IF NOT EXISTS ipva_valor_centavos INTEGER;
ALTER TABLE caminhao ADD COLUMN IF NOT EXISTS ipva_comprovante_url TEXT;
ALTER TABLE caminhao ADD COLUMN IF NOT EXISTS ipva_ano_referencia INTEGER;

COMMENT ON COLUMN caminhao.doc_vencimento IS 'Data vencimento CRLV';
COMMENT ON COLUMN caminhao.ipva_pago IS 'IPVA do ano referencia foi quitado';
COMMENT ON COLUMN caminhao.ipva_valor_centavos IS 'Valor IPVA pago em centavos';
COMMENT ON COLUMN caminhao.ipva_comprovante_url IS 'Path no Storage (bucket comprovantes, pasta ipva/)';
COMMENT ON COLUMN caminhao.ipva_ano_referencia IS 'Ano fiscal do IPVA (ex: 2026), reset manual';
