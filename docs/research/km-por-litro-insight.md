# km/L - Insight do Stakeholder

> Nota temporaria registrada em 2026-03-30. Incorporar na metodologia formal quando o doc `km-por-litro-metodologia.md` for criado.

## Insight do Stakeholder

O dono sugeriu usar a DIFERENCA entre km_chegada da viagem anterior e km_saida da viagem atual para capturar os km "invisiveis" (patio -> carregamento, deslocamentos entre viagens).

Exemplo:
- Viagem 1: km_saida=100.000, km_chegada=100.410 (410 km na viagem)
- Viagem 2: km_saida=100.450, km_chegada=101.160 (710 km na viagem)
- km "invisiveis" entre viagem 1 e 2: 100.450 - 100.410 = 40 km

Total real percorrido: 410 + 40 + 710 = 1.160 km (vs 1.120 km se so somar viagens)

Isso da um calculo mais fiel do consumo real, pois inclui:
- Deslocamento patio -> local de carregamento
- Deslocamento entrega -> proximo carregamento
- Qualquer km rodado fora de viagem registrada

### Formula sugerida

```
km_total_real = SUM(km por viagem) + SUM(gaps entre viagens consecutivas do mesmo caminhao)
km/L = km_total_real / total_litros_abastecidos_no_periodo
```
