# PRD: Notas de Combustivel Vinculadas a Viagens + BI Completo de Gastos

**Versao:** 2.0
**Data:** 2026-03-29
**Autor:** @pm (Morgan)
**Status:** Draft
**Projeto:** Siga Bem (cegonheiros/)

> **Changelog v2.0 (2026-03-29):** Escopo do BI expandido por esclarecimento do stakeholder.
> O dashboard BI agora cobre TODOS os tipos de gasto da viagem (combustivel, pedagio,
> alimentacao, manutencao, pneu, hospedagem, lavagem, outros), nao apenas combustivel.
> Novos requisitos funcionais FR-BI-1 a FR-BI-10 adicionados. Story S6 dividida em S6a/S6b.
> Regras de acesso refinadas para admin vs dono no contexto BI.

---

## 1. Contexto e Motivacao

O Siga Bem ja possui:
- CRUD de gastos com categorias (Story 2.1), incluindo a categoria "Combustivel"
- Upload de fotos de comprovantes (Story 2.2) com compressao client-side
- Tabela de precos de referencia de combustivel por regiao (Story 3.3, tabela `combustivel_preco`)
- Estimativa de custo de viagem baseada em consumo padrao de 3.0 km/l (Story 3.3)
- Fechamento financeiro por motorista (Story 4.1)

**Lacuna atual:** O sistema registra gastos de combustivel apenas como valor total (centavos). Nao captura **litros abastecidos**, o que impede:
1. Calculo real de preco por litro em cada abastecimento
2. Media de preco de combustivel por regiao baseada em dados reais
3. Calculo de consumo medio real do caminhao (km/l)
4. Previsoes de lucro baseadas em dados historicos reais

**Oportunidade do stakeholder:** "Motorista lanca notas de combustivel dentro da viagem com litros, valor e foto. Com esses dados, calculamos media de preco por regiao e apresentamos previsoes de lucro separadas por caminhao, motorista ou CNPJ. Somente o dono acessa o BI."

**Esclarecimento do stakeholder (v2.0):** "O BI nao sera so de combustivel mas sim previsao total, com TODOS os gastos incluidos pelo motorista na viagem, como pedagio, alimentacao, manutencao, pneu e entre outras opcoes."

**Implicacao:** O dashboard BI deve agregar e analisar todos os gastos registrados na viagem, usando todas as categorias existentes no seed (`categoria_gasto`): Pedagio, Combustivel, Pneu, Manutencao, Lavagem, Estacionamento, Alimentacao, Hospedagem, Seguro, Multa, Outros. Combustivel continua tendo dados adicionais (litros, posto, tipo) mas o BI opera sobre `gasto` inteiro.

---

## 2. Decisao Arquitetural: Estender `gasto` vs. Nova Entidade

### Analise

| Abordagem | Vantagens | Desvantagens |
|-----------|-----------|--------------|
| Estender `gasto` (adicionar coluna `litros`) | Reusa toda infra existente (RLS, Storage, fechamento, filtros). Minima migracao. | Coluna `litros` so se aplica a combustivel, fica NULL para 90%+ dos gastos. |
| Nova tabela `nota_combustivel` | Modelo limpo e especifico. | Duplica logica de RLS, Storage, fechamento. Aumenta complexidade. |

### [AUTO-DECISION] Abordagem escolhida: Estender `gasto`

**Decisao:** Adicionar colunas `litros` (INTEGER, centilitros) e `posto_local` (TEXT) na tabela `gasto`.

**Razao:** O gasto de combustivel ja possui `viagem_id`, `motorista_id`, `caminhao_id`, `foto_url`, `categoria_id`, `km_registro` e toda a infraestrutura de RLS, Storage e fechamento. Adicionar 2 colunas e utilizar os dados quando `categoria_id` aponta para "Combustivel" e exista um processo funcional e simples. O custo de uma entidade nova nao se justifica dado que o modelo existente cobre 95% dos requisitos.

**Convencao monetaria (CON-003):** Litros serao armazenados como INTEGER em centilitros (1 litro = 100 centilitros) para manter consistencia com a regra de nunca usar float. Exemplo: 45,7 litros = 4570 centilitros.

---

## 3. Requisitos Funcionais (FRs)

### FR-1: Lancamento de Nota de Combustivel dentro de Viagem Ativa

O motorista, ao visualizar uma viagem com status `em_andamento`, tera um botao "Lancar Nota de Combustivel" que abre o formulario de gasto pre-preenchido com:
- `viagem_id` = viagem atual (readonly)
- `categoria_id` = "Combustivel" (readonly)
- `motorista_id` = motorista da viagem (readonly)
- `caminhao_id` = caminhao da viagem (readonly)

**Rastreabilidade:** Briefing do stakeholder, paragrafo 1.

### FR-2: Campos do Formulario de Nota de Combustivel

| Campo | Tipo | Obrigatorio | Validacao |
|-------|------|-------------|-----------|
| Litros | number (2 decimais) | Sim | > 0, max 999.99 |
| Valor Total (R$) | currency | Sim | > 0 (centavos, CON-003) |
| Posto/Local | text | Nao | max 200 caracteres |
| Data/Hora | datetime | Sim | <= agora, >= data_saida da viagem |
| KM no abastecimento | number | Nao | >= km_saida da viagem |
| Tipo combustivel | select | Sim | diesel_s10, diesel_comum (enum existente) |

**Campos derivados (calculados, nao editaveis):**
- Preco por litro (R$/L) = valor_total / litros

**Armazenamento:**
- `gasto.valor` = valor total em centavos (existente)
- `gasto.litros` = litros em centilitros (nova coluna)
- `gasto.posto_local` = texto livre (nova coluna)
- `gasto.km_registro` = km no abastecimento (existente)
- `gasto.tipo_combustivel` = diesel_s10 | diesel_comum (nova coluna, reutiliza enum `combustivel_tipo`)
- `gasto.data` = data do abastecimento (existente)

**Rastreabilidade:** Briefing, "quantos litros e o valor abastecido".

### FR-3: Upload de Foto do Comprovante

Reutiliza integralmente a infraestrutura existente:
- `compress-image.ts` para compressao client-side (max 200KB)
- Bucket `comprovantes` no Supabase Storage
- Tabela `foto_comprovante` com RLS
- Componente `ComprovantesUpload.tsx`

Nenhuma alteracao necessaria no fluxo de upload. O gasto de combustivel usa o mesmo fluxo que qualquer outro gasto com comprovante.

**Rastreabilidade:** Briefing, "anexar foto do comprovante".

### FR-4: Calculo Automatico de Preco por Litro

Ao preencher litros e valor total, o sistema calcula e exibe em tempo real:
```
preco_por_litro = valor_total_centavos / litros_centilitros * 100
```
Exemplo: R$ 350,00 (35000 centavos) / 50L (5000 centilitros) * 100 = 700 centavos/litro = R$ 7,00/L

Exibido como campo readonly no formulario. Nao armazenado no banco (derivado).

**Rastreabilidade:** Derivado de FR-2 para viabilizar FR-5.

### FR-5: Media de Preco por Regiao (Cidade/Estado)

Funcao de agregacao que calcula o preco medio de combustivel por regiao a partir dos lancamentos reais dos motoristas:

```sql
-- Pseudo-query
SELECT
  gasto.posto_local,
  viagem.destino,  -- ou origem, dependendo do trecho
  AVG(gasto.valor / gasto.litros * 100) AS preco_medio_centavos_litro,
  COUNT(*) AS qtd_abastecimentos
FROM gasto
WHERE gasto.categoria_id = (categoria 'Combustivel')
  AND gasto.litros IS NOT NULL
  AND gasto.empresa_id = :empresa_id
GROUP BY regiao
```

**Granularidade de regiao:** Baseada no campo `posto_local` e nos campos `origem`/`destino` da viagem vinculada. No MVP, a regiao sera derivada do destino da viagem (texto livre, sem geocodificacao).

**Rastreabilidade:** Briefing, "calcular uma media de preco de combustivel para aquela regiao".

### FR-6: Dashboard BI -- Gastos Completos da Viagem (somente role=dono)

Pagina `/dashboard/bi` acessivel apenas para `role = dono`.

> **ATUALIZADO v2.0:** O BI cobre TODOS os tipos de gasto, nao apenas combustivel.
> As categorias abrangidas sao todas as existentes no seed: Pedagio, Combustivel, Pneu,
> Manutencao, Lavagem, Estacionamento, Alimentacao, Hospedagem, Seguro, Multa, Outros.

**Metricas apresentadas (expandidas):**

| ID | Metrica | Calculo | Visualizacao |
|----|---------|---------|--------------|
| FR-BI-1 | Custo total por viagem | `SUM(gasto.valor) WHERE viagem_id = X` (todos os gastos) | Card com valor total |
| FR-BI-2 | Breakdown por categoria | `SUM(gasto.valor) GROUP BY categoria_id` | Grafico pizza + barras horizontais |
| FR-BI-3 | Custo medio por km rodado | `SUM(gastos) / (km_chegada - km_saida)` | Card com R$/km |
| FR-BI-4 | Comparativo entre viagens | Mesma rota (origem/destino), diferentes periodos | Grafico de barras agrupadas |
| FR-BI-5 | Custo por caminhao | `SUM(gasto.valor) GROUP BY caminhao_id ORDER BY total DESC` | Ranking/tabela |
| FR-BI-6 | Custo por motorista | `SUM(gasto.valor) GROUP BY motorista_id ORDER BY total DESC` | Ranking/tabela |
| FR-BI-7 | Tendencia mensal | `SUM(gasto.valor) GROUP BY month, categoria_id` | Grafico de linhas empilhadas |
| FR-BI-8 | Previsao de custo para proxima viagem | Media historica de rotas similares (ver logica abaixo) | Card com intervalo de confianca |
| FR-BI-9 | Margem de lucro estimada | `receita_viagem - SUM(gastos)` (se receita cadastrada) | Card verde/vermelho |
| FR-BI-10 | Filtros | Periodo, caminhao, motorista, categoria, rota | Barra de filtros no topo |

**Logica de Previsao (FR-BI-8):**

A estimativa de custo para proxima viagem deve considerar:
1. Gastos reais acumulados de viagens anteriores na mesma rota (origem + destino)
2. Media de consumo de combustivel do caminhao (calculada via FR-8 quando litros disponivel)
3. Preco medio de pedagio da rota (soma de gastos categoria=Pedagio em viagens anteriores na rota)
4. Gastos fixos medios (alimentacao, hospedagem) baseados no historico
5. Receita da viagem (se cadastrada) para calculo de margem projetada

```sql
-- Pseudo-query: previsao de custo total para rota
SELECT
  categoria_gasto.nome,
  AVG(gasto.valor) AS media_centavos,
  COUNT(DISTINCT viagem.id) AS viagens_base
FROM gasto
JOIN viagem ON gasto.viagem_id = viagem.id
JOIN categoria_gasto ON gasto.categoria_id = categoria_gasto.id
WHERE viagem.empresa_id = :empresa_id
  AND viagem.origem = :origem
  AND viagem.destino = :destino
  AND viagem.status = 'concluida'
GROUP BY categoria_gasto.id, categoria_gasto.nome
```

Exibir "dados insuficientes" quando < 3 viagens concluidas na mesma rota.

**Dados necessarios:**
- Todos os gastos vinculados a viagens (todas as categorias)
- Viagens concluidas com km real (km_saida, km_chegada)
- Gastos com litros preenchidos para metricas especificas de combustivel (FR-2)
- Precos historicos por regiao (FR-5) para detalhe de combustivel
- Receita da viagem (campo existente ou a ser adicionado) para margem

**Rastreabilidade:** Briefing, "previsoes/expectativas/estimativas de lucro" + esclarecimento v2.0 "TODOS os gastos".

### FR-7: Filtros do Dashboard BI (FR-BI-10)

> **ATUALIZADO v2.0:** Adicionado filtro por categoria de gasto e por rota.

O dashboard BI (FR-6) permite filtrar por:

| Filtro | Fonte | Tipo | Descricao |
|--------|-------|------|-----------|
| Periodo | date range | date picker | Data inicio/fim |
| Caminhao | tabela `caminhao` | multi-select | Filtrar gastos por caminhao |
| Motorista | tabela `motorista` | multi-select | Filtrar gastos por motorista |
| Categoria de gasto | tabela `categoria_gasto` | multi-select | Filtrar por tipo de gasto (combustivel, pedagio, alimentacao, etc.) |
| Rota (origem/destino) | tabela `viagem` | select/autocomplete | Filtrar por rota especifica |
| CNPJ/Empresa | tabela `empresa` | select (caso multi-empresa futuro) | Desabilitado no MVP |
| Tipo combustivel | enum `combustivel_tipo` | select | Aplicavel apenas quando categoria = Combustivel |

No MVP, o filtro por CNPJ sera desabilitado (single-tenant). Preparar a infraestrutura para multi-empresa no futuro.

**Rastreabilidade:** Briefing, "separado por caminhao, motorista ou CNPJ" + esclarecimento v2.0.

### FR-8: Estimativa de Gasto de Combustivel por Viagem (Baseado em Historico)

Evolucao da Story 3.3 existente. Atualmente usa consumo padrao (3.0 km/l). Com os dados de FR-2, pode calcular consumo real:

```
consumo_real_km_l = distancia_percorrida / litros_totais_abastecidos
```

Onde:
- `distancia_percorrida` = km_chegada - km_saida (de viagens concluidas)
- `litros_totais` = soma de litros dos gastos de combustivel da viagem

Atualizar `consumo-calc.ts` para usar dados reais quando disponiveis (fonte = 'historico'), mantendo fallback de 3.0 km/l (fonte = 'padrao').

**Rastreabilidade:** Briefing, "estimativas de lucro" + Story 3.3 existente.

---

## 4. Requisitos Nao-Funcionais (NFRs)

### NFR-1: Compressao de Fotos

Reutiliza `compress-image.ts` existente. Nenhuma alteracao necessaria.
- Max input: 10MB
- Max output: 200KB (JPEG)
- Max dimensao: 1200px
- Formatos aceitos: JPG, PNG, WebP, PDF

### NFR-2: Dados de Preco/Regiao para Analytics

- Consultas de agregacao devem executar em < 2 segundos para ate 10.000 registros
- Indices necessarios: `gasto(empresa_id, categoria_id, data)` onde `litros IS NOT NULL`
- Considerar materialized view para dashboards com muitos dados (> 50.000 registros)

### NFR-3: Row Level Security (RLS)

A tabela `gasto` ja possui RLS configurado:
- **Motorista:** `motorista_id = fn_get_motorista_id()` -- ve e gerencia apenas seus proprios gastos
- **Dono/Admin:** `empresa_id = fn_get_empresa_id()` -- ve e gerencia todos os gastos da empresa

Para o dashboard BI (FR-6):
- Adicionar verificacao de role no middleware/server action: `role = 'dono'` exclusivo
- RLS existente ja garante isolamento por empresa

### NFR-4: Mobile-First

- Formulario de lancamento otimizado para celular (motoristas em rota)
- Inputs numericos com `inputMode="decimal"` para teclado numerico
- Botao de foto com acesso direto a camera (`capture="environment"`)
- Tamanhos de toque minimos de 44x44px
- Formulario em coluna unica, sem scroll horizontal

### NFR-5: Offline Resilience (Futuro)

- [AUTO-DECISION] Nao incluido no MVP. Razao: motoristas geralmente tem sinal de dados em postos de combustivel. Complexidade de sync offline nao justifica no MVP. Avaliar em versao futura.

---

## 5. Regras de Acesso

> **ATUALIZADO v2.0:** Admin pode ver relatorios de gastos mas NAO previsoes de lucro/margem.

| Role | Lancar Nota | Ver Notas Proprias | Ver Todas as Notas | BI: Relatorios de Gastos | BI: Previsoes e Margem de Lucro |
|------|-------------|--------------------|--------------------|--------------------------|-------------------------------|
| motorista | Sim | Sim | Nao | Nao | Nao |
| admin | Sim | N/A | Sim | **Sim** (FR-BI-1 a FR-BI-7) | **Nao** |
| dono | Sim | N/A | Sim | **Sim** | **Sim** (FR-BI-8, FR-BI-9) |

[AUTO-DECISION] Admin ve relatorios mas nao previsoes de lucro? -> Sim. (Razao: o stakeholder disse "somente o dono acessa o BI" para previsoes de lucro. Relatorios de gastos sao dados operacionais que o admin precisa para gestao dia-a-dia. Previsoes de lucro e margem sao dados estrategicos exclusivos do dono.)

**Enforcement:**
- Lancamento: RLS existente na tabela `gasto` (motorista ve so seus, dono/admin ve todos)
- Dashboard BI Relatorios (FR-BI-1 a FR-BI-7): Verificacao de `role IN ('dono', 'admin')` no server action + middleware da rota `/dashboard/bi/gastos`
- Dashboard BI Previsoes (FR-BI-8, FR-BI-9): Verificacao de `role = 'dono'` no server action + middleware da rota `/dashboard/bi/previsoes`
- A rota `/dashboard/bi` nao deve aparecer na sidebar para `role = 'motorista'`
- As sub-rotas de previsao/margem nao devem aparecer para `role = 'admin'`

---

## 6. Relacao com Entidades Existentes

### Diagrama de Relacionamento

```
empresa (1) ----< viagem (N)
                    |
                    | viagem_id (FK existente)
                    v
                  gasto (N) ----< foto_comprovante (N)
                    |                   (Storage: bucket comprovantes)
                    |
                    | categoria_id (FK existente)
                    v
              categoria_gasto
              (nome = 'Combustivel')
```

### Entidades Impactadas

| Entidade | Alteracao | Detalhes |
|----------|-----------|---------|
| `gasto` | ADD colunas | `litros` (INTEGER, centilitros), `posto_local` (TEXT), `tipo_combustivel` (combustivel_tipo) |
| `combustivel_preco` | Nenhuma | Tabela de referencia existente, coexiste com dados reais |
| `viagem` | Nenhuma | Ja possui `km_estimado`, `km_saida`, `km_chegada` |
| `foto_comprovante` | Nenhuma | Reutilizada integralmente |
| `categoria_gasto` | Nenhuma | Seed "Combustivel" ja existe (id fixo do seed) |
| `fechamento` | Nenhuma | Ja inclui gastos de combustivel automaticamente |

### Entidades Existentes Reutilizadas

1. **`gasto`** -- entidade principal, estendida com 3 colunas
2. **`foto_comprovante`** -- armazenamento de comprovantes, sem alteracao
3. **`combustivel_preco`** -- precos de referencia por regiao (admin configura), coexiste com precos reais dos lancamentos
4. **`compress-image.ts`** -- compressao client-side, sem alteracao
5. **`ComprovantesUpload.tsx`** -- componente de upload, sem alteracao
6. **`consumo-calc.ts`** -- sera atualizado para usar dados reais (FR-8)
7. **`viagem-calc.ts`** -- pode ser estendido com calculo de custo real de combustivel

---

## 7. Priorizacao MoSCoW

### Must Have (MVP)

| ID | Feature | Justificativa |
|----|---------|---------------|
| FR-1 | Lancamento de nota de combustivel dentro de viagem ativa | Core do pedido do stakeholder |
| FR-2 | Campos: litros, valor, posto, data, tipo combustivel | Dados essenciais para todo o restante |
| FR-3 | Upload de foto do comprovante | Pedido explicito do stakeholder |
| FR-4 | Calculo automatico de preco por litro | Derivado, custo zero |
| NFR-3 | RLS (motorista so ve seus, dono ve tudo) | Seguranca basica |
| NFR-4 | Mobile-first | Motoristas usam celular |

### Should Have

| ID | Feature | Justificativa |
|----|---------|---------------|
| FR-5 | Media de preco por regiao | Pedido do stakeholder, mas depende de volume de dados |
| FR-8 | Estimativa de gasto baseada em historico real | Evolucao natural da Story 3.3 |

### Could Have

| ID | Feature | Justificativa |
|----|---------|---------------|
| FR-BI-1..7 | Dashboard BI de gastos completos (relatorios) | Alto valor, escopo expandido por stakeholder |
| FR-BI-10 / FR-7 | Filtros BI (periodo, caminhao, motorista, categoria, rota) | Depende de FR-6 |

### Want to Have (pos-MVP, alta prioridade)

| ID | Feature | Justificativa |
|----|---------|---------------|
| FR-BI-8 | Previsao de custo para proxima viagem | Depende de volume de dados historicos |
| FR-BI-9 | Margem de lucro estimada | Depende de campo receita na viagem |

### Won't Have (MVP)

| Feature | Razao |
|---------|-------|
| IA para previsao de lucro | Complexidade desproporcional, requer volume de dados |
| Geocodificacao automatica de postos | Requer API de mapas, custo adicional |
| Offline mode / sync | Complexidade de conflitos, baixo ROI no MVP |
| Integracao com APIs de preco de combustivel (ANP) | Custo de API, dados internos sao mais relevantes |
| Multi-empresa / filtro por CNPJ ativo | Single-tenant no MVP |

---

## 8. Estimativa de Complexidade

### Stories Geradas

> **ATUALIZADO v2.0:** Story S6 dividida em S6a (relatorios de gastos) e S6b (previsoes/margem).
> Total aumentou de 7 para 8 stories.

| # | Story | Complexidade | Dependencia | Cobre FRs |
|---|-------|-------------|-------------|-----------|
| S1 | Migracao: adicionar colunas `litros`, `posto_local`, `tipo_combustivel` na tabela `gasto` | Pequena (1 migracao SQL) | Nenhuma | -- |
| S2 | Formulario de nota de combustivel dentro de viagem ativa (FR-1, FR-2, FR-4) | Media (UI + validacao + server action) | S1 | FR-1, FR-2, FR-4 |
| S3 | Upload de foto no formulario de combustivel (FR-3) | Pequena (reutiliza ComprovantesUpload) | S2 | FR-3 |
| S4 | Atualizar `consumo-calc.ts` para usar dados reais (FR-8) | Media (logica de agregacao + fallback) | S1 | FR-8 |
| S5 | Media de preco por regiao -- server action + exibicao (FR-5) | Media (agregacao SQL + componente) | S1, S2 | FR-5 |
| S6a | **Dashboard BI de Gastos -- relatorios por categoria, viagem, caminhao, motorista** | Grande (nova pagina, graficos, acesso dono+admin) | S1, S2 | FR-BI-1 a FR-BI-7 |
| S6b | **Dashboard BI Previsoes -- estimativa de custo, margem de lucro, tendencias** | Grande (logica preditiva, acesso somente dono) | S6a, S5 | FR-BI-8, FR-BI-9 |
| S7 | Filtros do dashboard BI (FR-7 / FR-BI-10) | Media (multi-select, URL params, filtro categoria) | S6a | FR-7, FR-BI-10 |

**Total: 8 stories**

### Mapeamento Story 5.5 (Epic original)

A Story 5.5 do epic original (Dashboard BI) agora se desdobra em:
- **5.5a** = S6a: Dashboard de Gastos (breakdown por categoria, por viagem, por caminhao/motorista)
- **5.5b** = S6b: Previsoes e Estimativas (estimativa de lucro, custo projetado, tendencias)

### Sequencia Recomendada

```
S1 (migracao) --> S2 (formulario) --> S3 (foto) --> S4 (consumo real) --> S5 (media regiao)
                                                                              |
                                                                              v
                                                          S6a (BI gastos) --> S7 (filtros)
                                                              |
                                                              v
                                                          S6b (BI previsoes)
```

S1 a S3 sao Must Have e devem ser entregues juntas.
S4 e S5 sao Should Have e podem ser entregues em seguida.
S6a e S7 sao Could Have e devem ser planejadas como um bloco.
S6b e Want to Have (pos-MVP) e depende de volume de dados para ter valor real.

### Dependencias com Sistema Existente

| Dependencia | Status | Risco |
|-------------|--------|-------|
| Tabela `gasto` com RLS | Existe | Nenhum |
| Tabela `foto_comprovante` + Storage | Existe | Nenhum |
| Componente `ComprovantesUpload.tsx` | Existe | Nenhum |
| `compress-image.ts` | Existe | Nenhum |
| Enum `combustivel_tipo` | Existe | Nenhum |
| Tabela `combustivel_preco` | Existe | Nenhum (coexiste) |
| `consumo-calc.ts` | Existe, sera modificado | Baixo (funcao isolada) |
| Pagina de viagem (detalhe) | Existe | Baixo (adicionar botao) |
| Sidebar / navegacao | Existe | Baixo (adicionar link BI para role=dono) |

---

## 9. Migracao de Dados Necessaria

```sql
-- Nova migracao: add_litros_posto_tipo_to_gasto.sql

ALTER TABLE gasto
  ADD COLUMN litros INTEGER CHECK (litros IS NULL OR litros > 0),
  ADD COLUMN posto_local TEXT,
  ADD COLUMN tipo_combustivel combustivel_tipo;

COMMENT ON COLUMN gasto.litros IS 'Litros em centilitros (45.7L = 4570). Preenchido apenas para gastos de combustivel.';
COMMENT ON COLUMN gasto.posto_local IS 'Nome/local do posto de combustivel. Texto livre.';
COMMENT ON COLUMN gasto.tipo_combustivel IS 'Tipo de combustivel: diesel_s10 ou diesel_comum.';

-- Indice para queries de analytics
CREATE INDEX idx_gasto_combustivel_analytics
  ON gasto (empresa_id, data DESC)
  WHERE litros IS NOT NULL;
```

Nenhuma migracao de dados existentes necessaria. Gastos antigos de combustivel terao `litros = NULL`, o que e tratado corretamente pelo fallback em `consumo-calc.ts`.

---

## 10. Riscos e Mitigacoes

> **ATUALIZADO v2.0:** Novos riscos adicionados para o BI expandido.

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|--------------|---------|-----------|
| Motorista nao preenche litros | Alta | Dados de BI de combustivel incompletos | Tornar litros obrigatorio quando categoria = Combustivel. Exibir alerta educativo. |
| Motorista nao registra todos os gastos da viagem | Alta | BI subestima custo real da viagem | UX educativa no app: exibir checklist de gastos ao finalizar viagem ("voce registrou pedagios? alimentacao?"). Nao bloquear finalizacao. |
| Dados de regiao imprecisos (texto livre) | Media | Media de preco por regiao ruidosa | No MVP, aceitar texto livre. Futuro: autocomplete de cidades. |
| Volume baixo de dados para previsoes | Media | Previsoes pouco confiaveis | Exibir "dados insuficientes" quando < 3 viagens concluidas na rota. Nao exibir previsao, apenas historico. |
| Complexidade do BI expandido atrasa entrega | Media | Stories S6a/S6b mais longas que estimado | Dividir S6a em sub-stories por metrica se necessario. Entregar metricas incrementalmente. |
| Performance de queries de agregacao com todos os gastos | Media | Dashboard lento | Indices em `gasto(empresa_id, viagem_id, categoria_id, data)`. Materialized view se > 50k registros. |
| Campo receita da viagem nao existe | Alta | FR-BI-9 (margem de lucro) nao pode ser calculada | Verificar se `viagem` tem campo de receita. Se nao, adicionar migracao na S6b ou criar S0 de migracao. |
| Motorista sem sinal de dados no posto | Baixa | Nao consegue lancar | Priorizar formulario leve. Offline mode em versao futura. |

---

## 11. Metricas de Sucesso

> **ATUALIZADO v2.0:** Metricas expandidas para BI completo.

| Metrica | Meta (3 meses apos lancamento) |
|---------|-------------------------------|
| % de viagens com pelo menos 1 nota de combustivel | > 70% |
| % de viagens com gastos registrados em >= 3 categorias | > 50% |
| % de notas com foto de comprovante | > 50% |
| Variacao de preco real vs. referencia (combustivel_preco) | < 15% |
| Uso do dashboard BI Gastos pelo dono | >= 2x por semana |
| Uso do dashboard BI Previsoes pelo dono | >= 1x por semana |
| Media de gastos registrados por viagem concluida | >= 5 lancamentos |
| % de viagens com custo total calculavel (todos os gastos) | > 60% |

---

## 12. Fora de Escopo (Explicito)

1. Integracao com API de mapas para calcular distancia automaticamente
2. OCR/leitura automatica de notas fiscais pela foto
3. Integracao com sistemas de posto de combustivel
4. Notificacoes push sobre variacao de preco
5. Exportacao de relatorios BI em PDF/Excel (planejado pos-MVP)
6. Multi-empresa / filtro por CNPJ ativo (preparar infraestrutura, nao implementar)
7. Machine learning para deteccao de anomalias em gastos (gasto fora do padrao)
8. Comparacao com benchmarks de mercado (custo medio do setor por rota)
9. Dashboard BI para role=motorista (apenas dono e admin)
