-- Migration: Allow multiple active vinculos per caminhao
-- Reason: A truck can have 2+ drivers (day/night shifts, alternating)
-- Date: 2026-03-30

-- Drop the partial unique index that enforced 1 active driver per truck
DROP INDEX IF EXISTS uq_caminhao_motorista_ativo;

-- Update table comments to reflect new business rule
COMMENT ON TABLE motorista_caminhao IS 'Historico de associacao motorista-caminhao. Multiplos vinculos ativos por caminhao sao permitidos (turnos, revezamento).';
COMMENT ON COLUMN motorista_caminhao.ativo IS 'true = vinculo corrente. Multiplos vinculos ativos por caminhao sao permitidos.';
