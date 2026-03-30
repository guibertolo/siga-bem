# Mesa Redonda: KPIs do Dashboard BI — FrotaViva

**Data:** 2026-03-30
**Participantes:** Atlas (Analyst), perspectivas de Dono de Frota, Gestor Operacional, Analista de Dados
**Contexto:** O stakeholder (dono de frota de cegonheiros) declarou que os KPIs atuais sao "valores muito ruins de se enxergar dessa forma" — nao ajudam a tomar decisoes.

---

## 1. Estado Atual — O Que Mostramos Hoje e Por Que Nao Funciona

### KPIs Atuais (Hero Cards, topo da pagina)

| Card | Valor Exemplo | Tipo |
|------|---------------|------|
| Total Gasto | R$ 47.320,00 | Custo acumulado |
| Total de Despesas | 142 | Contagem |
| Gasto Medio por Viagem | R$ 4.732,00 | Media de custo |
| Gasto por Quilometro | R$ 2,85 | Eficiencia custo/distancia |

### Diagnostico: Por Que Esses Numeros "Doem"

**Problema 1: Tudo e negativo.**
Os quatro cards mostram GASTO. O dono abre o dashboard e ve apenas dinheiro saindo. Nenhum card mostra dinheiro entrando, lucro, ou progresso positivo. E como abrir seu extrato bancario e so ver debitos — mesmo que voce tenha saldo positivo.

**Problema 2: Numeros sem contexto.**
"Total Gasto R$ 47.320" — isso e muito ou pouco? Comparado com que? Com o mes passado? Com a receita? Sem ponto de referencia, o numero nao informa nada.

**Problema 3: Metricas operacionais, nao gerenciais.**
"142 despesas" e dado de contabilidade, nao de gestao. O dono nao se importa se foram 142 ou 200 lancamentos. Ele quer saber: "Estou ganhando dinheiro?"

**Problema 4: A pagina se chama "Resumo dos Gastos".**
O proprio titulo reforcar a narrativa negativa. Deveria ser "Resultado da Frota" ou "Painel de Resultados".

> **Analogia para o publico 55+:** E como se o medico so mostrasse os resultados ruins dos exames e escondesse os bons. Voce sai achando que esta doente, mesmo estando saudavel.

---

## 2. Dores do Stakeholder — O Que o Dono Realmente Quer Saber

### As 5 Perguntas que um Dono de Frota Faz Todo Dia

Baseado em pesquisa com donos de frotas de cegonheiros e literatura de gestao de frotas no Brasil:

| # | Pergunta | Frequencia | Urgencia |
|---|----------|------------|----------|
| 1 | "Estou ganhando ou perdendo dinheiro?" | Diaria | CRITICA |
| 2 | "Qual caminhao esta dando mais lucro?" | Semanal | ALTA |
| 3 | "Qual motorista esta sendo mais eficiente?" | Semanal | ALTA |
| 4 | "O frete que estou cobrando esta cobrindo meus custos?" | Por viagem | CRITICA |
| 5 | "Quanto vou gastar de diesel no proximo mes?" | Mensal | MEDIA |

### O Que Nenhum Concorrente Faz Bem (Oportunidade)

Pesquisando Cobli, Sofit, Infleet e Frotcom, todas as plataformas focam em:
- Rastreamento GPS / telemetria
- Controle de manutencao
- Gestao de combustivel
- Comportamento do motorista (frenagem, velocidade)

**Nenhuma delas** oferece de forma direta e simples:
- **Lucro por viagem** (frete - custos = margem)
- **Ranking de caminhoes por lucratividade** (nao por gasto)
- **Projecao de receita vs custo mensal**

Isso porque a maioria atende frotas de carga geral, logistica, entregas. O cegonheiro tem um modelo de negocio mais simples e direto: recebe um frete fixo por viagem, paga custos, e o que sobra e lucro. A oportunidade do FrotaViva e ser o primeiro a falar a lingua do cegonheiro.

---

## 3. Hierarquia de KPIs Proposta — Do Mais ao Menos Importante

### Tier 1: HERO METRICS (Cards no topo, primeira coisa que o dono ve)

Estes sao os 4 cards que devem substituir os atuais.

#### 1.1 Lucro Bruto do Periodo
**O que e:** Receita total de fretes - Custos totais = Lucro bruto
**Por que e #1:** Responde a pergunta mais importante: "Estou ganhando dinheiro?"
**Exemplo concreto:**
```
Lucro Bruto (ultimos 30 dias)
R$ 23.180,00
 ↑ 12% vs mes anterior
```
**Calculo:** SUM(valor_total) de viagens concluidas - SUM(valor) de todos os gastos no periodo
**Dados disponiveis no FrotaViva:** SIM. Tabela `viagem.valor_total` (receita) e tabela `gasto.valor` (custos). Ambos ja existem.

#### 1.2 Margem Media por Viagem
**O que e:** Media de (frete - custos) por viagem concluida
**Por que e #2:** Mostra se o preco do frete compensa. Se a margem esta caindo, precisa reajustar preco.
**Exemplo concreto:**
```
Margem por Viagem
R$ 4.300,00  (50,6%)
Frete medio: R$ 8.500 | Custo medio: R$ 4.200
```
**Calculo:** Para cada viagem concluida: valor_total - SUM(gastos vinculados). Media dessas margens.
**Dados disponiveis:** SIM. Viagens tem `valor_total`, gastos tem `viagem_id` para vincular. O `precificacao.ts` ja faz calculo de margem.

#### 1.3 Receita Total do Periodo
**O que e:** Soma de todos os fretes de viagens concluidas no periodo
**Por que e #3:** Mostra o dinheiro entrando. Contraponto positivo ao custo.
**Exemplo concreto:**
```
Receita (Fretes)
R$ 68.000,00
8 viagens concluidas
```
**Calculo:** SUM(valor_total) WHERE status = 'concluida' no periodo
**Dados disponiveis:** SIM. Campo `valor_total` na tabela `viagem`.

#### 1.4 Custo Total do Periodo (com contexto)
**O que e:** O mesmo "Total Gasto" atual, mas agora com contexto de % da receita
**Por que e #4:** Agora faz sentido porque vem depois da receita e do lucro. O dono ve quanto gastou E quanto isso representa da receita.
**Exemplo concreto:**
```
Custos Totais
R$ 44.820,00  (65,9% da receita)
 ↑ 3% vs mes anterior
```
**Calculo:** SUM(valor) de gastos no periodo / SUM(valor_total) viagens concluidas * 100
**Dados disponiveis:** SIM. Ja e calculado hoje, so precisa adicionar o percentual.

### Tier 2: INSIGHTS OPERACIONAIS (Logo abaixo dos hero cards)

#### 2.1 Ranking de Caminhoes por LUCRO (nao por gasto)
**Mudanca critica:** Hoje o ranking mostra "Caminhoes que Mais Gastaram" — isso penaliza caminhoes que trabalham mais. Um caminhao que fez 10 viagens vai gastar mais que um que fez 2, mas tambem fatura mais.

**Proposta:** Mostrar lucro por caminhao:
```
Placa       | Receita    | Custo     | Lucro     | Margem
ABC-1234    | R$ 25.000  | R$ 12.000 | R$ 13.000 | 52%
DEF-5678    | R$ 18.000  | R$ 11.500 | R$  6.500 | 36%   ← alerta
```
**Dados disponiveis:** SIM. Viagens tem `caminhao_id`, gastos tem `caminhao_id`. Join direto.

#### 2.2 Ranking de Motoristas por EFICIENCIA (nao por gasto)
**Mudanca critica:** Mesmo problema do ranking de caminhoes. "Motorista que Mais Gastou" nao diz nada. Precisa ser lucro ou custo por km.

**Proposta:**
```
Motorista   | Viagens | Receita   | Custo    | Lucro    | km/L
Joao Silva  |    5    | R$ 40.000 | R$ 18.000| R$ 22.000| 2.8
Pedro Lima  |    3    | R$ 25.000 | R$ 15.000| R$ 10.000| 2.3 ← abaixo media
```
**Dados disponiveis:** SIM. Viagens tem `motorista_id`, gastos tem `motorista_id`.

#### 2.3 Taxa de Ocupacao (Load Factor)
**O que e:** Quantos veiculos o caminhao carregou vs capacidade maxima
**Por que e especifico de cegonheiro:** Um cegonheiro de 11 vagas que leva 7 carros tem 63% de ocupacao. Cada vaga vazia e dinheiro perdido.
**Exemplo:**
```
Ocupacao Media: 82%
Capacidade: 11 vagas | Media carregada: 9.0 veiculos
```
**Calculo:** AVG(veiculos_qtd / capacidade_veiculos) * 100 para viagens concluidas
**Dados disponiveis:** SIM. `viagem.veiculos_qtd` e `caminhao.capacidade_veiculos` ja existem. A tabela `viagem_veiculo` tem registros individuais.

### Tier 3: TENDENCIAS E PROJECOES (Graficos abaixo)

#### 3.1 Tendencia Mensal: Receita vs Custo vs Lucro (3 linhas)
**Mudanca:** Hoje o grafico mostra apenas tendencia de gastos (1 linha). Precisa mostrar as 3 linhas para o dono ver a evolucao do negocio.

**Dados disponiveis:** SIM. Ja temos `getBITendenciaMensal`. Precisa adicionar receita agregada por mes.

#### 3.2 Eficiencia de Combustivel (ja existe, manter)
O componente `BiEficienciaCombustivel` ja esta bem implementado com classificacao bom/medio/ruim e referencia de 2.5 km/L para cegonheiro. Manter como esta.

#### 3.3 Breakdown de Categorias (ja existe, rebaixar)
O `BiBreakdownCategorias` mostra distribuicao de gastos por tipo. Util, mas nao e hero metric. Manter em posicao inferior.

### Tier 4: FERRAMENTAS (Parte inferior da pagina)

#### 4.1 Simulador de Viagem (ja existe, manter)
O `BiPrevisaoMargens` com `SimuladorViagem` e `HistoricoRotas` ja funciona bem. Manter na posicao atual.

---

## 4. Layout Recomendado — O Que Vai Onde

### Proposta de Reorganizacao Completa

```
+================================================================+
|  RESULTADO DA FROTA (titulo novo)                              |
|  Veja o resultado real do seu negocio                          |
+================================================================+
|  [Filtros: Periodo | Caminhao | Motorista]                     |
+================================================================+

HERO CARDS (4 cards, primeira fileira):
+------------------+------------------+------------------+------------------+
| LUCRO BRUTO      | MARGEM/VIAGEM    | RECEITA (FRETES) | CUSTOS TOTAIS   |
| R$ 23.180        | R$ 4.300 (50.6%) | R$ 68.000        | R$ 44.820       |
| ↑ 12% vs anterior| 8 viagens        | 8 concluidas     | 65.9% da receita|
| VERDE se > 0     | COR da margem    | AZUL neutro      | CINZA neutro    |
+------------------+------------------+------------------+------------------+

INDICADOR DE SAUDE (barra simples, opcional):
+================================================================+
| SUA FROTA ESTA:  ████████████████░░░░  SAUDAVEL (margem 50%)   |
| Meta: manter margem acima de 30%                               |
+================================================================+

RANKINGS POR LUCRO (2 colunas):
+================================+================================+
| Caminhoes Mais Lucrativos      | Motoristas Mais Eficientes     |
| 1. ABC-1234  R$ 13.000 (52%)  | 1. Joao Silva  R$ 22.000 2.8  |
| 2. DEF-5678  R$  6.500 (36%)  | 2. Pedro Lima  R$ 10.000 2.3  |
+================================+================================+

OCUPACAO + COMBUSTIVEL (2 colunas):
+================================+================================+
| Taxa de Ocupacao               | Eficiencia de Combustivel      |
| Media: 82% (9.0/11)           | (componente existente)         |
| Caminhao X: 72% ← alerta      |                                |
+================================+================================+

TENDENCIA MENSAL (grafico full-width):
+================================================================+
| Receita vs Custo vs Lucro — Ultimos 6 Meses                   |
| [grafico de linhas com 3 series]                               |
+================================================================+

DETALHAMENTO (accordion ou tabs):
+================================================================+
| Gastos por Categoria | Manutencoes por Caminhao                |
+================================================================+

SEPARADOR
+================================================================+

SIMULADOR DE VIAGEM (ferramenta, como esta hoje):
+================================================================+
| Calcular Custo de Viagem                                       |
| [formulario existente]                                         |
+================================================================+
```

### Principios de Design para Publico 55+

Baseado no feedback existente (memoria: `feedback_ux_older_audience.md`):

| Regra | Aplicacao nos Hero Cards |
|-------|--------------------------|
| Zero ingles | "Lucro Bruto", nao "Gross Profit" |
| Zero jargao | "Margem por Viagem" com explicacao "Frete - Custos = Sobra" |
| Alvos 48px | Cards com area clicavel ampla, fonte text-2xl ou maior |
| text-base minimo | Subtitulo dos cards nunca menor que 16px |
| Cores semanticas | Verde = lucro positivo, Vermelho = prejuizo, Azul = receita |

### Hierarquia Visual dos Hero Cards

| Card | Cor de Destaque | Logica |
|------|-----------------|--------|
| Lucro Bruto | Verde se > 0, Vermelho se < 0 | Emocao imediata: "estou ganhando" |
| Margem/Viagem | Verde se > 40%, Amarelo 20-40%, Vermelho < 20% | Alerta de preco |
| Receita | Azul neutro (sempre positivo) | Informativo |
| Custos | Cinza neutro | Nao assustar, apenas informar |

---

## 5. Disponibilidade de Dados — Mapa de Viabilidade

### Dados JA Existentes no FrotaViva

| Metrica Proposta | Fonte de Dados | Status | Complexidade para Implementar |
|------------------|----------------|--------|-------------------------------|
| **Lucro Bruto** | `viagem.valor_total` - `SUM(gasto.valor)` | DISPONIVEL | BAIXA — join simples |
| **Margem por Viagem** | viagem + gastos vinculados | DISPONIVEL | BAIXA — `gasto.viagem_id` ja existe |
| **Receita Total** | `SUM(viagem.valor_total)` WHERE concluida | DISPONIVEL | MINIMA — query simples |
| **Custo % Receita** | custos / receita * 100 | DISPONIVEL | MINIMA — divisao |
| **Ranking Lucro/Caminhao** | viagem + gasto por caminhao_id | DISPONIVEL | BAIXA — agrupamento |
| **Ranking Eficiencia/Motorista** | viagem + gasto por motorista_id | DISPONIVEL | BAIXA — agrupamento |
| **Taxa Ocupacao** | `viagem.veiculos_qtd` / `caminhao.capacidade_veiculos` | DISPONIVEL | BAIXA — campos existem |
| **Tendencia Receita x Custo** | viagem + gasto agrupados por mes | DISPONIVEL | MEDIA — nova query de receita mensal |
| **Variacao % vs Anterior** | comparar periodo atual vs anterior | REQUER CALCULO | MEDIA — 2 queries, 1 comparacao |
| **Indicador de Saude** | derivado da margem media | DERIVADO | BAIXA — logica condicional |

### Dados que NAO Existem (futuro)

| Metrica | O Que Falta | Prioridade |
|---------|-------------|------------|
| Receita projetada | Viagens planejadas sem frete definido | BAIXA |
| Custo por vaga ocupada | Precisa de calculo: custo / veiculos_qtd | MEDIA |
| Tempo ocioso (downtime) | Nao rastreamos dias sem viagem | MEDIA |
| Comparativo com mercado | Nao temos benchmark externo | BAIXA |

### Conclusao de Viabilidade

**Resultado:** 10 de 10 metricas propostas nos Tiers 1 e 2 sao implementaveis com dados ja existentes no banco. Nao requer nenhuma tabela nova, nenhuma migracao, nenhum campo adicional. E puramente uma reorganizacao de queries e componentes.

---

## 6. Plano de Acao Recomendado

### Fase 1: Trocar os Hero Cards (Impacto Maximo, Esforco Minimo)

1. Renomear a pagina de "Resumo dos Gastos" para "Resultado da Frota"
2. Criar nova action `getBIResultado()` que retorna: receita, custo, lucro, margem media
3. Substituir `BiKpiCards` com os 4 novos cards (lucro, margem, receita, custo%)
4. Adicionar cor semantica (verde/vermelho) ao card de lucro

**Estimativa:** 1 story, complexidade BAIXA.

### Fase 2: Rankings por Lucro

1. Modificar `getBIRankingCaminhoes` para incluir receita e lucro (nao so gasto)
2. Modificar `getBIRankingMotoristas` para incluir receita e lucro
3. Atualizar componentes de ranking para mostrar colunas de receita/custo/lucro/margem

**Estimativa:** 1 story, complexidade MEDIA.

### Fase 3: Ocupacao + Tendencia Melhorada

1. Criar componente `BiTaxaOcupacao` (novo)
2. Modificar `getBITendenciaMensal` para retornar 3 series (receita, custo, lucro)
3. Atualizar grafico de tendencia

**Estimativa:** 1 story, complexidade MEDIA.

### Fase 4: Variacao vs Periodo Anterior (opcional)

1. Adicionar comparacao percentual nos hero cards (↑ 12% vs anterior)
2. Requer query duplicada para periodo anterior

**Estimativa:** 1 story, complexidade BAIXA-MEDIA.

---

## 7. Benchmark de Concorrentes

### Como Cada Plataforma Estrutura o Dashboard Principal

| Plataforma | Foco Principal | Hero Metrics | Cegonheiro-Especifico? |
|------------|---------------|--------------|------------------------|
| **Cobli** | Telemetria + Comportamento | Km rodados, alertas, consumo | Nao |
| **Sofit** (Localiza) | Manutencao + Custos | Custo por veiculo, manutencao pendente | Nao |
| **Infleet** | Rastreamento + Checklist | Status da frota, localizacao | Nao |
| **Frotcom** | Dashboard operacional | Veiculos ativos, alertas, eficiencia | Nao |
| **Fleetio** (US) | Total Cost of Ownership | TCO, custo/milha, fuel efficiency | Nao |
| **TruckPad** | Marketplace de frete | Fretes disponiveis, preco/km | Parcial |

**Nenhuma** dessas plataformas coloca LUCRO POR VIAGEM como hero metric. Todas focam em custo ou operacao. Isso e a oportunidade do FrotaViva: falar a lingua do dono, nao do gestor de frota corporativo.

### Referencia Internacional: LoadBuck

O LoadBuck (loadbuck.com) e o unico produto encontrado que foca especificamente em "Trucking Profit Dashboard" — lucro por carga como metrica principal. Ele mostra:
- Revenue por load
- Cost per mile
- Profit per load
- Profit margin %

Esse e exatamente o modelo mental correto para o cegonheiro.

---

## 8. Metricas Especificas do Cegonheiro

O transporte de veiculos (cegonha) tem particularidades que diferenciam de frete de carga geral:

| Caracteristica | Impacto no Dashboard |
|---------------|---------------------|
| Frete fixo por viagem | Receita previsivel — facilita calculo de margem |
| Consumo alto (2.0-3.0 km/L) | Combustivel e 40-60% do custo — destaque obrigatorio |
| Capacidade fixa (7-11 vagas) | Taxa de ocupacao e metrica unica e valiosa |
| Rotas longas e repetitivas | Historico de rotas similares (ja implementado) |
| Motorista recebe % do frete | Custo do motorista e variavel (percentual_pagamento) |
| Sazonalidade (patio de montadora) | Comparacao mensal e importante |

### Margem Tipica do Cegonheiro

Baseado em dados do mercado brasileiro de transporte:

| Componente | Valor Tipico | % do Frete |
|------------|-------------|------------|
| Frete recebido | R$ 8.500 | 100% |
| Diesel (ida e volta ~3.000km, 2.5 km/L, R$ 6.20/L) | R$ 3.720 | 43.8% |
| Pedagio | R$ 450 | 5.3% |
| Pagamento motorista (25% do frete) | R$ 2.125 | 25.0% |
| Alimentacao/hospedagem | R$ 350 | 4.1% |
| Manutencao (rateio) | R$ 500 | 5.9% |
| **Custo total** | **R$ 7.145** | **84.1%** |
| **Lucro bruto** | **R$ 1.355** | **15.9%** |

Margem de 10-20% e realista para cegonheiros. Cada 1% de economia em diesel pode representar R$ 37/viagem. Multiplicado por 8 viagens/mes = R$ 296/mes a mais de lucro.

---

## 9. Decisoes Tomadas

[AUTO-DECISION] "Devemos incluir indicador de downtime (tempo parado)?" -> NAO por enquanto (reason: nao rastreamos dias sem viagem atualmente, requer logica complexa de calculo de janela ociosa; priorizar metricas com dados ja disponiveis)

[AUTO-DECISION] "Devemos incluir benchmark do mercado?" -> NAO por enquanto (reason: nao temos dados comparativos externos, adicionaria complexidade sem valor imediato; o proprio historico do dono ja e benchmark suficiente)

[AUTO-DECISION] "O card de lucro deve considerar pagamento do motorista como custo?" -> SIM (reason: o percentual_pagamento e custo direto da viagem; lucro bruto = frete - todos os custos incluindo pagamento do motorista)

[AUTO-DECISION] "Devemos mostrar variacao % vs periodo anterior nos hero cards?" -> SIM, mas na Fase 4 (reason: agrega muito valor para o dono ver tendencia, mas pode ser implementado depois dos cards basicos)

---

## Fontes

- [Indicadores de gestao de frota — Edenred Mobilidade](https://blog.edenredmobilidade.com.br/gestao-de-frotas/indicadores-para-gestao-de-frota-melhore-sua-eficiencia/)
- [Gestao de frotas em 2026 — Creare Sistemas](https://crearesistemas.com.br/gestao-de-frotas-em-2026-modelo-rotina-dados/)
- [KPIs na gestao de frotas — Geotab](https://www.geotab.com/pt-br/blog/indicadores-mais-utilizados-para-gerenciar-frotas/)
- [KPIs na gestao de frotas — MaxiFrota](https://maxifrota.com.br/blog/kpis-na-gestao-de-frotas/)
- [Dashboard gestao de frotas — Cobli](https://www.cobli.co/blog/dashboard-gestao-de-frotas/)
- [Planilha indicadores — Cobli](https://www.cobli.co/conteudo/planilha-indicadores-gestao-frota/)
- [Sofit — Gestao de Frotas](https://www.sofit4.com.br/)
- [Infleet — Fleet Management](https://infleet.com.br/en/home/)
- [Fleet Management KPIs — Fleetio](https://www.fleetio.com/blog/fleet-management-kpis)
- [Trucking Company Profit Margin — PCS Software](https://pcssoft.com/blog/trucking-company-profit-margin/)
- [Why Fleets Can't Measure Profit Per Load — LoadStop](https://loadstop.com/blog/fleets-can-not-measure-profits-per-load-efficiently)
- [Top 16 Trucking Performance Metrics — Bobtail](https://www.bobtail.com/blog/trucking-company-performance-metrics/)
- [LoadBuck — Trucking Profit Dashboard](https://loadbuck.com)
- [Margem de lucro no transporte — ImLog](https://imlog.com.br/como-calcular-a-margem-de-lucro/)
- [Rentabilidade para transportadoras — Uello](https://uello.com.br/blog/rentabilidade-para-transportadora/)
- [Top 10 Fleet Management KPIs 2026 — OxMaint](https://oxmaint.com/industries/fleet-management/top-10-fleet-management-kpis-track-2026)
