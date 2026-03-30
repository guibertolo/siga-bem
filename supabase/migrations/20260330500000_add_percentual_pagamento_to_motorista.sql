-- =============================================================================
-- Migration: Add percentual_pagamento to motorista table
-- Reason: Percentual is a contract between dono and motorista, lives in cadastro
-- The viagem inherits it from motorista at creation time.
-- =============================================================================

ALTER TABLE motorista
  ADD COLUMN IF NOT EXISTS percentual_pagamento NUMERIC(5,2)
    CHECK (percentual_pagamento IS NULL OR (percentual_pagamento >= 0 AND percentual_pagamento <= 100));

COMMENT ON COLUMN motorista.percentual_pagamento IS 'Percentual que o motorista recebe por viagem (%). Definido pelo dono no cadastro. Herdado pela viagem na criacao.';
