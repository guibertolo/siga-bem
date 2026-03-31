# Benchmarking Anonimo Cross-Company no FrotaViva

> **Pesquisa:** Viabilidade e melhores praticas para benchmarking anonimo entre empresas no SaaS FrotaViva
> **Data:** 2026-03-30
> **Agente:** Atlas (Analyst)
> **Confianca geral:** ALTA (fundamentos legais solidos, precedentes tecnicos claros, valor de mercado comprovado)

---

## TL;DR

Benchmarking anonimo entre empresas e **legal sob a LGPD**, **tecnicamente viavel com Supabase**, e representa um **diferencial competitivo significativo** que nenhum concorrente direto no nicho cegonheiro oferece hoje. A recomendacao e implementar via materialized view com pg_cron, exigindo minimo de 5 empresas por segmento para exibir dados agregados, com modelo opt-in.

---

## 1. Analise Legal / LGPD

### 1.1 Fundamento Legal: Artigo 12 da LGPD

A LGPD (Lei 13.709/2018) trata diretamente a questao no **Artigo 12**:

> "Os dados anonimizados nao serao considerados dados pessoais para os fins desta Lei, salvo quando o processo de anonimizacao ao qual foram submetidos for revertido, utilizando exclusivamente meios proprios, ou quando, com esforcos razoaveis, puder ser revertido."

**Implicacao pratica:** Dados **agregados** (medias, medianas, percentis) por definicao **nao sao dados pessoais** pois nao permitem identificar individuos ou empresas. O FrotaViva estaria operando **fora do escopo da LGPD** ao compartilhar agregacoes.

### 1.2 Requisitos para Conformidade

| Requisito | Aplicacao no FrotaViva | Status |
|-----------|----------------------|--------|
| Anonimizacao irreversivel | Agregar por mediana/media elimina rastro individual | OK |
| Esforco razoavel para reverter | Com N>=5 empresas, impossivel deduzir dados individuais | OK |
| Perfil comportamental (Art. 12 par.2) | Nao se aplica -- dados sao de frotas, nao de pessoas | N/A |
| Consentimento | Recomendado opt-in por transparencia, nao obrigatorio legalmente | Recomendado |
| Politica de privacidade | Deve mencionar uso de dados agregados anonimos | Necessario |

### 1.3 Parecer

**Confianca: ALTA.** Dados agregados de empresas (km/L medio, custo/km medio) nao constituem dados pessoais sob a LGPD. Ainda assim, recomenda-se:

1. **Opt-in explicito** no onboarding do dono -- transparencia gera confianca
2. **Clausula nos Termos de Uso** mencionando benchmarking anonimo
3. **Minimo de 5 empresas** por segmento para evitar deducao (k-anonymity com k=5)
4. **Nunca expor dados que permitam triangulacao** (ex: "empresa que transporta para Fiat no PR" + volume = identificavel)

### 1.4 Fontes Legais

- [Art. 12 LGPD - LGPD Brasil](https://lgpd-brasil.info/capitulo_02/artigo_12)
- [Dados Anonimizados - Serpro](https://www.serpro.gov.br/lgpd/menu/protecao-de-dados/dados-anonimizados-lgpd)
- [LGPD e Anonimizacao - Migalhas](https://www.migalhas.com.br/depeso/337227/lgpd-e-a-anonimizacao-de-dados-pessoais)
- [ANPD-EU Adequacy Agreement Jan 2026](https://www.mattosfilho.com.br/en/unico/data-privacy-protection-day/)

---

## 2. Abordagem Tecnica

### 2.1 Opcoes Avaliadas

| Opcao | Descricao | Latencia | Custo Supabase | Complexidade | Recomendacao |
|-------|-----------|----------|---------------|-------------|-------------|
| **A: Materialized View + pg_cron** | View materializada que agrega cross-tenant, refresh via cron | Leitura instantanea | Zero (SQL nativo) | Baixa | **RECOMENDADA** |
| B: Edge Function on-demand | Calcula agregados a cada request | Alta (query pesada) | Invocacoes Edge | Media | Nao recomendada |
| C: Tabela de cache manual | Job que grava em tabela dedicada | Leitura instantanea | Zero | Media-Alta | Alternativa valida |

### 2.2 Solucao Recomendada: Materialized View + pg_cron

**Por que Materialized View?**

1. **Bypass natural de RLS**: Materialized views no PostgreSQL v15 **nao suportam RLS** -- isso e uma limitacao para views de dados sensiveis, mas e **exatamente o que queremos** para agregacao cross-tenant
2. **Performance**: Leitura direta de dados pre-computados, sem custo de query em tempo real
3. **pg_cron nativo no Supabase**: Refresh agendado sem infraestrutura adicional
4. **Service role**: O refresh roda como `postgres` user, que bypassa RLS naturalmente

**Arquitetura proposta:**

```
[Tabelas com RLS]          [Materialized View sem RLS]       [Cliente]

viagens (dono_id RLS)  -->  mv_benchmark_setor            -->  App le a MV
abastecimentos (RLS)   -->  (medianas, percentis)         -->  via anon/auth
manutencoes (RLS)      -->  refresh a cada 6h via pg_cron -->  com RLS na MV
```

**Esquema conceitual da MV:**

```sql
-- NOTA: codigo apenas para documentacao/referencia, NAO implementar
CREATE MATERIALIZED VIEW mv_benchmark_setor AS
SELECT
  tipo_cegonha,                          -- 'aberta' | 'fechada'
  regiao,                                -- 'SUL', 'SUDESTE', etc.
  COUNT(DISTINCT dono_id) AS n_empresas, -- para threshold k>=5

  -- Eficiencia combustivel
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY km_por_litro) AS mediana_km_l,
  AVG(km_por_litro) AS media_km_l,
  PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY km_por_litro) AS p25_km_l,
  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY km_por_litro) AS p75_km_l,

  -- Custo por km
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY custo_por_km) AS mediana_custo_km,

  -- ... demais metricas

  NOW() AS atualizado_em
FROM dados_agregados_por_empresa  -- subquery que pre-agrega por dono
GROUP BY tipo_cegonha, regiao
HAVING COUNT(DISTINCT dono_id) >= 5;  -- k-anonymity threshold
```

**Refresh schedule:**

```sql
-- pg_cron: refresh a cada 6 horas
SELECT cron.schedule(
  'refresh-benchmarks',
  '0 */6 * * *',
  'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_benchmark_setor'
);
```

### 2.3 Protecao na Camada de Leitura

Mesmo a MV sendo sem RLS intrinsecamente, devemos controlar acesso:

1. **RLS na MV para filtragem**: Criar policy que so retorna linhas onde `n_empresas >= 5`
2. **Ou**: Usar uma View regular em cima da MV com `WHERE n_empresas >= 5`
3. **Edge Function wrapper** (opcional): Para adicionar logica de formatacao

### 2.4 Fontes Tecnicas

- [Supabase RLS Docs](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Cron](https://supabase.com/docs/guides/cron)
- [Materialized Views + RLS Discussion](https://github.com/orgs/supabase/discussions/17790)
- [pg_cron Extension Docs](https://supabase.com/docs/guides/database/extensions/pg_cron)

---

## 3. Metricas para Benchmarking

### 3.1 Metricas Prioritarias (Phase 2)

Baseado em KPIs padrao do setor de frotas e na realidade do cegonheiro:

| Metrica | Formula | Unidade | Segmentacao | Prioridade |
|---------|---------|---------|-------------|-----------|
| **km/L por tipo de cegonha** | km_rodados / litros_abastecidos | km/L | aberta vs fechada | P0 - CRITICA |
| **Custo medio por km** | total_custos / km_rodados | R$/km | tipo + regiao | P0 - CRITICA |
| **% combustivel vs frete** | custo_combustivel / valor_frete * 100 | % | tipo | P1 - ALTA |
| **Frequencia manutencao** | qtd_manutencoes / km_rodados * 10000 | por 10k km | tipo | P1 - ALTA |
| **Margem media por viagem** | (frete - custos) / frete * 100 | % | tipo + rota | P2 - MEDIA |
| **Taxa utilizacao** | dias_em_viagem / dias_totais * 100 | % | tipo | P2 - MEDIA |

### 3.2 Valores de Referencia do Setor

Dados coletados de fontes publicas para caminhoes pesados (cegonha):

| Metrica | Faixa Esperada | Fonte |
|---------|---------------|-------|
| Consumo km/L | 2.0 - 3.2 km/L | Infleet, Sem Parar, dados internos FrotaViva |
| Custo combustivel como % do frete | 30-40% do custo operacional | Geotab, Cobli |
| Variacao por comportamento motorista | Ate 25% de diferenca | Cobli, Prolog |

### 3.3 Segmentacao Recomendada

Para que o benchmark seja **justo e util**, segmentar por:

1. **Tipo de cegonha**: Aberta vs Fechada (consumos muito diferentes)
2. **Regiao**: SUL, SUDESTE, NORDESTE, etc. (topografia e distancias afetam)
3. **Porte da frota**: 1-5 veiculos, 6-15, 16+ (economias de escala)
4. **Tipo de rota**: Longa distancia vs regional

> **ATENCAO**: Cada segmento precisa de N>=5 empresas. Segmentacao excessiva pode invalidar benchmarks por falta de amostra.

### 3.4 Fontes

- [Cobli - Indicadores de Frota](https://www.cobli.co/blog/indicadores-de-desempenho-para-frota/)
- [Geotab - Fleet KPIs](https://www.geotab.com/blog/fleet-management-kpis/)
- [Infleet - Consumo Caminhoes](https://infleet.com.br/blog/tabela-consumo-combustivel-caminhoes/)
- [Fleet Management KPIs 2026](https://opsima.com/blog/kpis/fleet-management-kpis/)
- [MICHELIN Fleet KPIs](https://connectedfleet.michelin.com/blog/the-most-important-kpis-in-fleet-management/)

---

## 4. Requisitos de Privacidade

### 4.1 K-Anonymity Aplicada

O conceito de k-anonymity garante que cada registro em um dataset e indistinguivel de pelo menos k-1 outros registros.

**Aplicacao no FrotaViva:**

| Parametro | Valor | Justificativa |
|-----------|-------|---------------|
| **k minimo** | 5 | Padrao de industria para benchmarks anonimos. Com 4 ou menos, risco de deducao |
| **Estatistica preferida** | Mediana | Medianas sao menos distorcidas por outliers e mais dificeis de reverter que medias |
| **Dados nunca expostos** | Valores individuais, rankings, min/max extremos | Min/max podem revelar a maior ou menor empresa |
| **Arredondamento** | 1 casa decimal | Reduz precisao que poderia identificar |

### 4.2 Modelo de Consentimento

**Recomendacao: OPT-IN com incentivo**

| Aspecto | Decisao | Motivo |
|---------|---------|--------|
| Tipo | Opt-in | Gera confianca, alinha com espirito LGPD |
| Momento | Onboarding do dono + Configuracoes | Facil de encontrar |
| Incentivo | Acesso aos benchmarks do setor | Quem nao opta nao ve os dados do setor |
| Revogacao | A qualquer momento | LGPD exige |
| Default | Desativado | Conservador, mas seguro |

**Texto sugerido (UX para 55+, zero ingles):**

> "Quer comparar sua frota com outras empresas do setor? Ao ativar, seus dados aparecem de forma anonima nas medias do setor. Ninguem ve seus numeros individuais -- so as medias de todos juntos. Voce pode desativar quando quiser."

### 4.3 Niveis de Agregacao Seguros

| Nivel | Exemplo | Seguro? | Condicao |
|-------|---------|---------|----------|
| Nacional | "Media Brasil: 2.6 km/L" | SIM | N>=5 empresas |
| Regional | "Media Sudeste: 2.7 km/L" | SIM | N>=5 na regiao |
| Por tipo | "Cegonha aberta: 2.4 km/L" | SIM | N>=5 no tipo |
| Regional + tipo | "Aberta no Sul: 2.3 km/L" | CUIDADO | So se N>=5 no cruzamento |
| Por rota especifica | "SP-PR: 2.5 km/L" | NAO | Risco alto de deducao |

### 4.4 Fontes

- [K-Anonymity - Programming DP](https://programming-dp.com/chapter2.html)
- [K-Anonymity Guide - Immuta](https://www.immuta.com/blog/k-anonymity-everything-you-need-to-know-2021-guide/)
- [BenchSights - Min Aggregation Rules](https://benchsights.com/)

---

## 5. Analise Competitiva

### 5.1 Concorrentes e Benchmarking

| Plataforma | Benchmarking Cross-Company? | Detalhes |
|------------|---------------------------|----------|
| **Cobli** | NAO (interno apenas) | Oferece KPIs e indicadores por frota, mas comparacao e apenas interna (seus veiculos vs sua media). Tem conteudo educativo sobre benchmarks do setor, mas nao agrega dados de clientes |
| **Sofit (TOTVS)** | NAO | Foco em gestao operacional. Sem recursos de comparacao cross-company. Integracao TOTVS pode trazer isso no futuro |
| **Infleet** | NAO (interno apenas) | Telemetria forte, KPIs internos, mas sem agregacao entre clientes |
| **Frotcom** | NAO | Tracking e fleet management tradicional. Sem benchmarking |
| **Geotab** | PARCIAL | Publica benchmarks do setor em blog/relatorios, mas nao e funcionalidade in-app para clientes |
| **Quatenus** | NAO | Foco em rastreamento |

### 5.2 Oportunidade de Mercado

**Nenhum concorrente direto no nicho cegonheiro oferece benchmarking cross-company in-app.**

Isso representa uma oportunidade de **first-mover advantage** significativa. Plataformas como BenchSights (SaaS generico de benchmarking) e Geotab (grandes frotas) demonstram que o modelo funciona, mas nenhuma atende o nicho especifico de transporte de veiculos (cegonheiros).

### 5.3 Fontes

- [Cobli](https://www.cobli.co/)
- [Infleet](https://infleet.com.br/)
- [Sofit/TOTVS](https://produtos.totvs.com/ficha-tecnica/frotas-by-sofit/)
- [Geotab KPIs](https://www.geotab.com/blog/fleet-management-kpis/)
- [BenchSights](https://benchsights.com/)
- [Quatenus vs Cobli vs Infleet](https://www.quatenusonline.com.br/blog/quatenus-vs-cobli-vs-infleet-qual-sistema-de-rastreamento-ideal-para-frota/)

---

## 6. Proposta de Valor

### 6.1 Network Effect como Diferencial

O benchmarking anonimo cria um **efeito de rede** classico em SaaS:

```
Mais empresas no FrotaViva
    --> Benchmarks mais precisos e segmentados
        --> Mais valor para cada empresa
            --> Menor churn, mais indicacoes
                --> Mais empresas no FrotaViva (ciclo virtuoso)
```

Referencia: [SaaS Network Effect - Sixteen Ventures](https://sixteenventures.com/network-effect-data)

### 6.2 Diferenciadores Competitivos

| Diferencial | Impacto |
|-------------|---------|
| **Unico no nicho**: Nenhum concorrente cegonheiro oferece isso | First-mover advantage |
| **Engajamento**: "Sua frota vs o setor" cria habito de consulta | Retencao +15-20% estimado |
| **Dados como moat**: Quanto mais empresas, melhor o benchmark | Barreira de entrada para concorrentes |
| **Upsell natural**: Benchmarks basicos gratis, detalhados no plano Pro | Conversao para planos superiores |
| **Confianca no setor**: FrotaViva se torna "a referencia" de dados | Branding e autoridade |

### 6.3 Modelo de Monetizacao Sugerido

| Tier | Acesso | Plano |
|------|--------|-------|
| **Basico** | "Sua frota esta acima/abaixo da media" (sem numeros) | Gratuito |
| **Padrao** | Mediana do setor + posicao relativa (percentil) | Plano pago |
| **Avancado** | Segmentacao regional, por tipo, tendencias temporais | Pro |

### 6.4 Fontes

- [SaaS Network Effect Data](https://sixteenventures.com/network-effect-data)
- [Multi-Tenant Analytics - Qrvey](https://qrvey.com/blog/multi-tenant-architecture-for-embedded-analytics-unleashing-insights-for-everyone/)
- [AI-Powered SaaS Multi-Tenant Strategies](https://cloudonair.withgoogle.com/events/ai-powered-saas-multi-tenant-strategies-for-competitive-advantage)

---

## 7. Fases de Implementacao

### Phase 1: Benchmarks Internos (JA IMPLEMENTADO)

- Comparar veiculos/motoristas dentro da mesma empresa
- Base: dados do proprio dono, respeitando RLS
- Status: **DONE**

### Phase 2: Benchmarks do Setor

**Escopo:**
- Materialized view com agregados cross-tenant
- pg_cron para refresh a cada 6h
- Tela "Como estou em relacao ao setor?"
- Opt-in no onboarding

**Pre-requisitos:**
- Minimo 5 empresas ativas com dados suficientes
- Termos de uso atualizados com clausula de benchmarking
- Toggle opt-in na tela de configuracoes do dono

**Metricas Phase 2:**
1. km/L por tipo de cegonha (aberta/fechada)
2. Custo medio por km rodado
3. % combustivel vs frete

**Estimativa de esforco:** 1 Epic, 3-4 Stories

**Entregavel para o usuario:**

```
+-------------------------------------------+
|  Eficiencia da sua frota                  |
|                                           |
|  Seu consumo:      2.3 km/L              |
|  Media do setor:   2.6 km/L              |
|  Sua posicao:      Abaixo da media       |
|                                           |
|  [=========|====.......] 35o percentil    |
|                                           |
|  Baseado em dados anonimos de 12 empresas |
+-------------------------------------------+
```

### Phase 3: Benchmarks Regionais

**Escopo:**
- Segmentacao por UF/regiao
- Tendencias temporais (mes a mes)
- Metricas adicionais (manutencao, margem, utilizacao)

**Pre-requisitos:**
- N>=5 empresas **por regiao** (pode levar meses)
- Phase 2 validada e estavel

**Metricas Phase 3:**
4. Frequencia de manutencao por 10k km
5. Margem media por viagem
6. Taxa de utilizacao da frota
7. Tendencias mensais (esta melhorando ou piorando?)

**Estimativa de esforco:** 1 Epic, 4-5 Stories

### Phase 4 (Futuro): Insights com IA

- "Empresas com frota similar a sua que melhoraram o km/L fizeram X"
- Recomendacoes baseadas em padroes dos dados agregados
- Alertas proativos: "Seu custo/km subiu 15% vs setor que subiu 5%"

---

## 8. Riscos e Mitigacoes

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|--------------|---------|-----------|
| Poucas empresas (N<5) para benchmark | ALTA (curto prazo) | Nao poder mostrar dados | Comecar com agregado nacional, sem segmentacao |
| Empresa deduzir dados de concorrente | BAIXA | Perda de confianca | k>=5, mediana, arredondamento, sem extremos |
| Empresa manipular dados para distorcer benchmark | BAIXA | Benchmark impreciso | Outlier detection, limites de sanidade (ex: km/L > 5 = invalido) |
| ANPD questionar o modelo | MUITO BAIXA | Retrabalho legal | Dados agregados nao sao pessoais (Art. 12). Opt-in reforca |
| Performance do refresh da MV | BAIXA | Lentidao no cron | REFRESH CONCURRENTLY, index na MV |

---

## 9. Decisoes Autonomas

[AUTO-DECISION] Opt-in vs Opt-out? -> Opt-in (reason: alinhamento com LGPD, confianca do publico 55+, e incentivo natural -- quem opta ve os benchmarks)

[AUTO-DECISION] Minimo de empresas (k)? -> k=5 (reason: padrao de industria para benchmarks anonimos, equilibrio entre utilidade e privacidade)

[AUTO-DECISION] Mediana vs Media? -> Mediana como metrica principal (reason: menos sensivel a outliers, mais representativa para pequenas amostras, mais dificil de reverter)

[AUTO-DECISION] Frequencia de refresh? -> 6 horas (reason: dados de frota nao mudam minuto a minuto, 6h e suficiente e nao sobrecarrega o banco)

[AUTO-DECISION] Estatistica a exibir? -> Mediana + percentil do usuario (reason: percentil da contexto sem expor distribuicao completa)

---

## 10. Proximos Passos

1. **@pm**: Criar Epic para Phase 2 do benchmarking com as Stories definidas
2. **@architect**: Validar esquema da materialized view e estrategia de refresh
3. **@data-engineer**: Implementar MV, pg_cron, e policies de acesso
4. **@po**: Definir criterios de aceite para a tela de benchmark
5. **@ux-design-expert**: Projetar tela de benchmark seguindo UX para 55+ (zero ingles, 48px targets)
6. **Legal**: Atualizar Termos de Uso com clausula de benchmarking anonimo

---

## Fontes Consolidadas

### Legal/LGPD
- [Art. 12 LGPD](https://lgpd-brasil.info/capitulo_02/artigo_12)
- [Dados Anonimizados - Serpro](https://www.serpro.gov.br/lgpd/menu/protecao-de-dados/dados-anonimizados-lgpd)
- [LGPD e Anonimizacao - Migalhas](https://www.migalhas.com.br/depeso/337227/lgpd-e-a-anonimizacao-de-dados-pessoais)
- [LGPD 5 Anos - Migalhas](https://www.migalhas.com.br/depeso/440400/lgpd--5-anos-de-vigencia-o-futuro-da-protecao-de-dados-no-brasil)
- [Data Privacy 2025-2026 - Mattos Filho](https://www.mattosfilho.com.br/en/unico/data-privacy-protection-day/)
- [ANPD Temas 2026 - LHLaw](https://www.lhlaw.com.br/publicacoes/o-futuro-da-protecao-de-dados-no-brasil-temas-para-2026/)

### Tecnico
- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Cron / pg_cron](https://supabase.com/docs/guides/cron)
- [Materialized Views + RLS](https://github.com/orgs/supabase/discussions/17790)
- [Scheduling Edge Functions](https://supabase.com/docs/guides/functions/schedule-functions)

### Benchmarking / KPIs
- [Cobli - Indicadores de Frota](https://www.cobli.co/blog/indicadores-de-desempenho-para-frota/)
- [Geotab - Fleet KPIs](https://www.geotab.com/blog/fleet-management-kpis/)
- [Fleet KPIs 2026 - Opsima](https://opsima.com/blog/kpis/fleet-management-kpis/)
- [Fleet Benchmarking Guide - PCS](https://pcssoft.com/blog/fleet-benchmarking/)
- [Infleet - Consumo Caminhoes](https://infleet.com.br/blog/tabela-consumo-combustivel-caminhoes/)

### Privacidade
- [K-Anonymity - Programming DP](https://programming-dp.com/chapter2.html)
- [K-Anonymity Guide - Immuta](https://www.immuta.com/blog/k-anonymity-everything-you-need-to-know-2021-guide/)
- [BenchSights](https://benchsights.com/)

### Estrategia SaaS
- [SaaS Network Effect Data](https://sixteenventures.com/network-effect-data)
- [Multi-Tenant Analytics - Qrvey](https://qrvey.com/blog/multi-tenant-architecture-for-embedded-analytics-unleashing-insights-for-everyone/)
- [Fleet Benchmarking for Mid-Sized Fleets](https://www.fleetmanagementweekly.com/benchmarking-the-competitive-edge-for-mid-sized-fleets/)

### Concorrentes
- [Cobli](https://www.cobli.co/)
- [Infleet](https://infleet.com.br/)
- [Sofit/TOTVS](https://produtos.totvs.com/ficha-tecnica/frotas-by-sofit/)
- [Frotcom](https://www.capterra.pt/directory/20007/fleet-management/software?page=5)
- [Quatenus vs Cobli vs Infleet](https://www.quatenusonline.com.br/blog/quatenus-vs-cobli-vs-infleet-qual-sistema-de-rastreamento-ideal-para-frota/)
