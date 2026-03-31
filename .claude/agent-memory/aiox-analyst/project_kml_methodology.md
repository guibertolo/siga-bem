---
name: km/L Methodology Decision
description: Research concluded 2026-03-30 — hybrid method D chosen for FrotaViva fuel efficiency calculation
type: project
---

Hybrid method (Option D) recommended for km/L calculation in FrotaViva:
- Layer 1: Per trip (km_chegada - km_saida) / litros — highest accuracy
- Layer 2: Rolling average 90 days per truck — fallback
- Layer 3: 3.0 km/L system default (already in consumo-calc.ts)

**Why:** Cegonheiro trucks average 2.0-3.0 km/L. Not all trips have complete km data. Motoristas often do partial refuels. Method must be resilient to missing data while providing actionable numbers for 55+ audience.

**How to apply:** Any BI or dashboard work involving fuel efficiency should reference docs/research/km-por-litro-metodologia.md. The consumo-calc.ts file is the implementation target. Sanity check: results must be 1.0-5.0 km/L range.
