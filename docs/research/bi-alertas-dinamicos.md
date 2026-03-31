# BI Alertas Dinamicos — Thresholds Calculados pela Operacao

**Data:** 2026-03-30
**Tipo:** Decisao de Stakeholder
**Relacionado:** [bi-kpis-round-table.md](bi-kpis-round-table.md)

---

## Alertas BI — Thresholds Dinamicos (Decisao do Stakeholder)

Os alertas do BI NAO devem usar valores fixos predefinidos (ex: "abaixo de 2.0 km/L"). Os thresholds devem ser calculados dinamicamente a partir dos proprios dados da operacao do dono.

### Logica correta:

1. **Consumo de combustivel**: Calcular a MEDIA de km/L de todos os caminhoes da empresa. Alertar quando um caminhao esta 20%+ abaixo da media da empresa. Ex: media da frota = 2.5 km/L -> alerta se < 2.0 km/L. Se a media da frota for 1.8 km/L, alerta se < 1.44 km/L.

2. **Manutencao frequente**: Calcular a MEDIA de manutencoes por caminhao. Alertar quando um caminhao tem 50%+ acima da media. Ex: media = 2 manutencoes -> alerta se >= 3.

3. **Troca de pneu**: Mesmo principio — media da frota de trocas de pneu. Alertar acima da media.

4. **Gasto por viagem**: Calcular a MEDIA de custo por viagem de todos os motoristas. Alertar quando um motorista esta 30%+ acima.

### Principio: Nenhum valor hardcoded. Tudo relativo a operacao real.

Isso significa que:
- Uma frota nova sem dados suficientes nao tera alertas (precisa de pelo menos 1 mes de dados)
- Os alertas ficam mais precisos com o tempo
- Cada empresa tem seus proprios thresholds
- O sistema aprende da propria operacao

---

## Implicacoes Tecnicas

| Alerta | Calculo do Threshold | Desvio para Disparo | Dados Necessarios |
|--------|---------------------|---------------------|-------------------|
| Consumo combustivel | AVG(km/L) de todos caminhoes | -20% abaixo da media | `abastecimento` com km e litros |
| Manutencao frequente | AVG(manutencoes) por caminhao | +50% acima da media | `gasto` WHERE categoria = manutencao |
| Troca de pneu | AVG(trocas) por caminhao | Acima da media | `gasto` WHERE categoria = pneu |
| Gasto por viagem | AVG(custo) por viagem/motorista | +30% acima da media | `gasto` vinculado a `viagem` |

### Requisito minimo de dados

Para que os alertas funcionem com significancia estatistica:
- **Minimo:** 1 mes de operacao com dados registrados
- **Ideal:** 3+ meses para medias estaveis
- **Fallback:** Se dados insuficientes, nao exibir alertas (nunca inventar thresholds)

---

## Decisao Registrada

**[STAKEHOLDER-DECISION]** "Os alertas do BI devem usar thresholds fixos ou dinamicos?" -> DINAMICOS (reason: cada operacao tem sua realidade; valores fixos nao servem para frotas com perfis diferentes; o dono quer ver anomalias relativas a SUA operacao, nao a um padrao generico do mercado)

**Impacto:** Toda logica de alerta deve receber como parametro a media calculada da frota, nunca um valor constante. Isso vale para componentes existentes como `BiEficienciaCombustivel` que atualmente usa referencia fixa de 2.5 km/L.
