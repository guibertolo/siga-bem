---
name: BI Scope Expansion - All Expenses
description: Stakeholder clarified BI covers ALL trip expenses (not just fuel) - PRD v2.0 updated 2026-03-29
type: project
---

Stakeholder esclareceu que o BI do Siga Bem cobre TODOS os gastos da viagem, nao apenas combustivel.

**Why:** O stakeholder quer previsao total de custos incluindo pedagio, alimentacao, manutencao, pneu, hospedagem, lavagem e outros -- nao apenas combustivel como inicialmente documentado.

**How to apply:** PRD `docs/prd-combustivel-notas.md` atualizado para v2.0 com FR-BI-1 a FR-BI-10. Story S6 dividida em S6a (relatorios de gastos, acesso dono+admin) e S6b (previsoes/margem, acesso somente dono). Toda story ou epic que referencie o BI deve considerar todas as categorias de `categoria_gasto`, nao apenas Combustivel. Admin ve relatorios mas NAO previsoes de lucro.
