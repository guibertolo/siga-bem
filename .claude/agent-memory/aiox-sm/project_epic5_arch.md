---
name: Epic 5 Architecture Decision
description: @po corrected Epic 5 approach — ALTER TABLE gasto (not new table), preco_litro derived, BI for ALL expense types, only role=dono
type: project
---

ALTER TABLE `gasto` adds 4 nullable columns: `litros NUMERIC(10,3)`, `tipo_combustivel`, `posto_local`, `uf_abastecimento`. There is NO separate `abastecimento_detalhe` table.

`preco_litro` is DERIVED: `(valor / 100) / litros`. Not stored anywhere.

The BI dashboard (Story 5.5) covers ALL expense types (combustivel, pedagio, alimentacao, manutencao, pneu, hospedagem, outros), not only fuel.

BI access (Stories 5.4, 5.5, 5.6) is ONLY for `role = dono`. Admin does NOT have access.

Story 5.6 is a NEW story (previously did not exist): profit/cost estimation per route.

**Why:** @po rejected the separate-table approach as over-engineered. Extending `gasto` preserves existing RLS, photo upload (foto_comprovante), and closing (fn_calcular_fechamento) with zero changes.

**How to apply:** Never propose creating a separate fuel/abastecimento table. Always extend `gasto`. Always derive preco_litro. Always restrict BI to dono-only.
