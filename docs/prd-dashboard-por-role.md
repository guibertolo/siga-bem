# PRD: Dashboard por Role — FrotaViva

**Versao:** 1.0
**Data:** 2026-03-29
**Autor:** Bob (PM / @pm)
**Status:** Draft
**Prioridade:** Alta
**Dependencias:** Stories 7.x (multi-empresa), UX Spec `ux-dashboard-por-role.md`

---

## 1. Contexto e Problema

O dashboard atual do FrotaViva exibe os mesmos 3 cards (Viagens em andamento, Gastos do mes, Acertos pendentes) para todos os perfis. Isso gera dois problemas concretos:

1. **Motorista ve informacao irrelevante:** Gastos totais da empresa e acertos pendentes nao sao acaonaveis por um motorista. Ele precisa ver seus ganhos, suas viagens e sua agenda.

2. **Dono sem visao multi-empresa:** O dono que gerencia multiplos CNPJs nao tem forma de ver um panorama consolidado. Precisa trocar manualmente de empresa e somar mentalmente. A solicitacao do stakeholder e clara: "cards por CNPJ, mostrando motoristas ativos em viagem, separado por CNPJ ou em visao micro."

---

## 2. Personas e Necessidades

### 2.1 Motorista — Perfil Operacional

O motorista e um funcionario. Sua perspectiva e individual e orientada a acao imediata.

| Necessidade | Justificativa | Dado |
|-------------|---------------|------|
| Viagem ativa | "Onde estou indo? Quanto vou ganhar?" | `viagem.status = 'em_andamento'` do motorista |
| Meus ganhos do mes | "Quanto ja fiz este mes?" | `SUM(valor_total * percentual_pagamento / 100)` de viagens concluidas no mes |
| Proxima viagem | "Tem viagem me esperando?" | Primeira viagem `planejada` do motorista por `data_saida ASC` |
| Viagens concluidas no mes | "Quantas viagens ja fiz?" | `COUNT(*)` de viagens concluidas no mes |

**O que o motorista NAO ve:**
- Gastos totais da empresa
- Acertos de outros motoristas
- BI / previsoes / margens
- Dados de outros motoristas ou da frota como um todo

### 2.2 Dono — Perfil de Gestao (Visao MACRO: Multi-CNPJ)

O dono gerencia multiplas empresas/CNPJs. Na visao macro ele precisa de um panorama consolidado sem trocar de empresa.

#### 2.2.1 Cards por CNPJ/Empresa

Cada empresa vinculada ao dono aparece como um card individual:

| Campo | Dado | Fonte |
|-------|------|-------|
| Razao social / Nome fantasia | Identificacao | `empresa.razao_social`, `empresa.nome_fantasia` |
| CNPJ | Referencia fiscal | `empresa.cnpj` |
| Motoristas em viagem | "3 de 5 em viagem" | `COUNT(viagem.status='em_andamento')` vs `COUNT(motorista.ativo=true)` por empresa |
| Viagens em andamento | Contagem | `COUNT(viagem.status='em_andamento')` por empresa |
| Gasto do mes (total) | Controle financeiro | `SUM(gasto.valor)` no mes, por empresa |
| Receita do mes (total frete) | Faturamento | `SUM(viagem.valor_total)` de viagens concluidas no mes, por empresa |
| Margem | Resultado | `Receita - Gastos` (centavos) |

**Acao:** Clicar no card navega para a visao micro daquela empresa (troca empresa ativa via `fn_switch_empresa()`).

#### 2.2.2 Totais Consolidados

Barra de totalizacao no topo, somando todas as empresas:

| Metrica | Calculo |
|---------|---------|
| Total motoristas ativos | Soma de motoristas ativos em viagem de todas as empresas |
| Total viagens em andamento | Soma de viagens `em_andamento` de todas as empresas |
| Total gastos do mes | Soma de gastos de todas as empresas |
| Total receita do mes | Soma de receita de todas as empresas |
| Margem consolidada | Receita total - Gastos total |

#### 2.2.3 Alertas Rapidos

Painel lateral ou secao abaixo dos cards:

| Alerta | Regra | Severidade |
|--------|-------|------------|
| Acertos pendentes | `fechamento.status = 'aberto'` com contagem e valor total | Media |
| Viagens sem motorista | *Reservado para implementacao futura — hoje toda viagem exige `motorista_id`* | Baixa |
| CNH vencendo | *Reservado — tabela `motorista` nao possui campo `cnh_validade` atualmente* | Baixa |

**[AUTO-DECISION]** Alertas "Viagens sem motorista" e "CNH vencendo" estao listados como desejaveis pelo stakeholder, porem o schema atual nao suporta diretamente. Recomendacao: implementar apenas "Acertos pendentes" na v1 e criar stories separadas para os demais alertas quando o schema for estendido. Razao: evitar alteracao de schema fora do escopo do dashboard.

### 2.3 Dono — Perfil de Gestao (Visao MICRO: 1 Empresa)

Quando o dono seleciona uma empresa ou ja esta operando dentro de uma, o dashboard mostra:

| Secao | Componente | Dados |
|-------|-----------|-------|
| Viagens em andamento | Cards com origem-destino, motorista, caminhao | `viagem.status = 'em_andamento'` (ja existe: `ViagemAtivaCard` DonoView) |
| Gastos do mes | Total + breakdown por categoria | `GastoSummaryCard` (total) + cards de categoria (novo) |
| Acertos pendentes | Contagem + valor total, link para lista | `FechamentoSummaryCard` (ja existe) |
| Motoristas | Quem esta em viagem vs quem esta livre | Lista de motoristas com status |
| Caminhoes | Quais estao rodando vs quais parados | Lista de caminhoes com status |

### 2.4 Admin — Perfil Delegado

| Acesso | Descricao |
|--------|-----------|
| Igual ao dono micro (1 empresa) | Ve a mesma visao micro da empresa onde e admin |
| Sem visao macro multi-CNPJ | Admin nao gerencia multiplos CNPJs |
| Sem BI / previsoes / margem | Acesso ao BI (`/bi`) e exclusivo do dono |

---

## 3. Arquitetura de Dados

### 3.1 Visao Macro — Query Cross-Empresa

A visao macro do dono precisa consultar dados de TODAS as empresas vinculadas, nao apenas da empresa ativa. Isso e uma mudanca arquitetural significativa porque o sistema atual (RLS via `fn_get_empresa_id()`) filtra TUDO pela empresa ativa.

**Estrategia proposta:** Criar uma funcao RPC `SECURITY DEFINER` que:
1. Busca todos os `empresa_id` do dono via `usuario_empresa`
2. Para cada empresa, agrega viagens, gastos, motoristas e receita
3. Retorna JSON consolidado

```sql
-- fn_dashboard_macro(p_usuario_id UUID)
-- Retorna array de objetos, 1 por empresa
-- SECURITY DEFINER para bypassar RLS (consulta cross-empresa)
```

**Justificativa:** Nao e possivel fazer queries cross-empresa com RLS ativo (cada query so ve a empresa ativa). A funcao `SECURITY DEFINER` e o padrao ja usado em `fn_get_user_empresas()` e `fn_switch_empresa()`.

**Risco:** Funcoes SECURITY DEFINER bypassam RLS. A funcao DEVE validar que o `p_usuario_id` corresponde ao `auth.uid()` e que os vinculos em `usuario_empresa` estao ativos.

### 3.2 Visao Micro — Queries Existentes

A visao micro usa exatamente as queries existentes. Nenhuma alteracao necessaria:

| Query | Arquivo | Status |
|-------|---------|--------|
| `getDashboardData()` | `dashboard/actions.ts` | Existente |
| `getViagemAtiva()` | `dashboard/actions.ts` | Existente |
| `getViagensEmAndamento()` | `viagens/actions.ts` | Existente |
| `getGastosMesAtual()` | `gastos/actions.ts` | Existente |
| `getFechamentosPendentes()` | `dashboard/actions.ts` | Existente |

**Novas queries para micro (motoristas/caminhoes com status):**
- `getMotoristasComStatus()` — lista motoristas com indicacao de quem esta em viagem
- `getCaminhoesComStatus()` — lista caminhoes com indicacao de quais estao rodando

### 3.3 Visao Motorista — Queries Novas

Conforme UX spec `ux-dashboard-por-role.md` secao 5.4:

| Query | Funcao | Status |
|-------|--------|--------|
| Ganhos do mes | `getMotoristaData()` | Nova (spec pronta) |
| Viagens concluidas | `getMotoristaData()` | Nova (spec pronta) |
| Proxima viagem | `getMotoristaData()` | Nova (spec pronta) |

---

## 4. Regras de Roteamento por Role

```
usuario.role === 'motorista'
  -> Dashboard Motorista (ViagemAtiva + MeusGanhos + ViagensConcluidas + ProximaViagem)

usuario.role === 'dono' && usuario tem >1 empresa vinculada && esta em /dashboard (macro)
  -> Dashboard Dono Macro (Totais + Cards por CNPJ + Alertas)

usuario.role === 'dono' && esta operando dentro de 1 empresa (micro)
  -> Dashboard Dono Micro (ViagemAtiva + Gastos + Acertos + Motoristas + Caminhoes)

usuario.role === 'admin'
  -> Dashboard Admin (= Dono Micro, sem BI)
```

**[AUTO-DECISION]** Sobre a rota de entrada do dono multi-empresa: o dono com >1 empresa deve ver primeiro a visao macro ao acessar `/dashboard`. Se tem apenas 1 empresa, cai direto na visao micro. Razao: o stakeholder pediu explicitamente "visualizacao facil de todos os CNPJs" como tela principal. A visao micro e um drill-down.

---

## 5. Layout e Responsividade

### 5.1 Grid Responsivo

| Breakpoint | Colunas | Componente |
|------------|---------|-----------|
| Mobile (`< 640px`) | 1 coluna | Cards empilhados verticalmente |
| Tablet (`640px-1023px`) | 2 colunas | Cards em grid 2x |
| Desktop (`>= 1024px`) | 3 colunas | Cards em grid 3x |

**Classe Tailwind:** `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6`

### 5.2 Acessibilidade (Publico 60+)

| Regra | Implementacao |
|-------|--------------|
| Botoes grandes | `min-h-[56px]` em CTAs principais, `min-h-[48px]` em secundarios (padrao ja usado) |
| Sem jargao | Labels em portugues simples: "Ganhos", "Viagens", "Gastos", nao "KPI", "Metrics" |
| Fontes legiveis | `text-base` (16px) minimo para corpo, `text-2xl+` para titulos e valores |
| Contraste | Seguir tokens do design system (ja validados para WCAG AA) |
| Touch targets | Minimo 44x44px em areas clicaveis (padrao iOS/Android) |
| `tabular-nums` | Em todos os valores monetarios para alinhamento consistente |

### 5.3 Mobile-First

A implementacao segue mobile-first (padrao do projeto). O CSS base define o layout mobile, com breakpoints adicionando complexidade.

---

## 6. Componentes — Mapa de Criacao e Modificacao

### 6.1 Dashboard Motorista

| Componente | Status | Story |
|-----------|--------|-------|
| `ViagemAtivaCard` (MotoristaView) | Existente | -- |
| `MeusGanhosCard` | Criar | S-DASH-1 |
| `ViagensConcludasCard` | Criar | S-DASH-1 |
| `ProximaViagemCard` | Criar | S-DASH-1 |
| `getMotoristaData()` em `actions.ts` | Criar | S-DASH-1 |
| `dashboard/page.tsx` (renderizacao condicional) | Modificar | S-DASH-1 |

### 6.2 Dashboard Dono Macro

| Componente | Status | Story |
|-----------|--------|-------|
| `DashboardMacro` (page/wrapper) | Criar | S-DASH-2 |
| `MacroTotaisBar` | Criar | S-DASH-2 |
| `EmpresaCard` | Criar | S-DASH-2 |
| `AlertasRapidosPanel` | Criar | S-DASH-2 |
| `fn_dashboard_macro` (RPC SQL) | Criar | S-DASH-2 |
| `getDashboardMacro()` em `actions.ts` | Criar | S-DASH-2 |

### 6.3 Dashboard Dono Micro

| Componente | Status | Story |
|-----------|--------|-------|
| `ViagemAtivaCard` (DonoView) | Existente | -- |
| `GastoSummaryCard` | Existente | -- |
| `FechamentoSummaryCard` | Existente | -- |
| `ViagemSummaryCard` | Existente | -- |
| `MotoristasStatusList` | Criar | S-DASH-3 |
| `CaminhoesStatusList` | Criar | S-DASH-3 |
| `GastoBreakdownMini` (categorias resumidas) | Criar | S-DASH-3 |
| `getMotoristasComStatus()` | Criar | S-DASH-3 |
| `getCaminhoesComStatus()` | Criar | S-DASH-3 |

### 6.4 Dashboard Admin

Reutiliza o Dashboard Dono Micro. Diferenca:
- Sem link para BI (`showBILink = false`, ja implementado no layout)
- Sem card de margem/previsao

---

## 7. Wireframes Textuais

### 7.1 Dashboard Motorista

```
+------------------------------------------------+
|  Inicio                                         |
|  Ola, Joao                                      |
+------------------------------------------------+
|                                                  |
|  [======= VIAGEM ATIVA (amarelo) =======]       |
|  Em Viagem: Sao Paulo -> Rio de Janeiro          |
|  Caminhao: ABC-1234 - Scania R450                |
|  Frete: R$ 8.500,00                              |
|  [Ir para Viagem] [+ Despesa] [+ Abastecimento] |
|                                                  |
+------------------------------------------------+
|                                                  |
|  +------------------+  +------------------+      |
|  | Meus Ganhos      |  | Viagens          |      |
|  | R$ 4.250,00      |  | Concluidas       |      |
|  | (verde)          |  | 12               |      |
|  | Este mes         |  | Este mes         |      |
|  +------------------+  +------------------+      |
|                                                  |
|  +------------------+                            |
|  | Proxima Viagem   |                            |
|  | RJ -> MG         |                            |
|  | Saida: 02/04     |                            |
|  | Frete: R$ 6.800  |                            |
|  | [borda azul]     |                            |
|  +------------------+                            |
+------------------------------------------------+
```

### 7.2 Dashboard Dono Macro (Multi-CNPJ)

```
+------------------------------------------------+
|  Inicio                                         |
|  Ola, Carlos                                    |
+------------------------------------------------+
|                                                  |
|  RESUMO GERAL (barra consolidada)               |
|  +----------+  +----------+  +----------+       |
|  | 8 mot.   |  | 5 viagens|  | Margem   |       |
|  | em viagem|  | rodando  |  | R$ 32k   |       |
|  +----------+  +----------+  +----------+       |
|                                                  |
+------------------------------------------------+
|                                                  |
|  MINHAS EMPRESAS                                 |
|                                                  |
|  +--------------------+  +--------------------+  |
|  | Transportes Silva  |  | Cegonhas Express   |  |
|  | CNPJ: 12.345.678/  |  | CNPJ: 98.765.432/  |  |
|  | 0001-90             |  | 0001-10             |  |
|  |                     |  |                     |  |
|  | Motoristas: 3/5     |  | Motoristas: 5/8     |  |
|  | em viagem           |  | em viagem           |  |
|  |                     |  |                     |  |
|  | Viagens: 3          |  | Viagens: 2          |  |
|  | Gastos: R$ 18.200   |  | Gastos: R$ 24.500   |  |
|  | Receita: R$ 35.000  |  | Receita: R$ 45.700  |  |
|  | Margem: R$ 16.800   |  | Margem: R$ 21.200   |  |
|  |                     |  |                     |  |
|  | [Ver detalhes ->]   |  | [Ver detalhes ->]   |  |
|  +--------------------+  +--------------------+  |
|                                                  |
+------------------------------------------------+
|                                                  |
|  ALERTAS                                         |
|  ! 3 acertos pendentes (R$ 4.500,00)            |
|                                                  |
+------------------------------------------------+
```

### 7.3 Dashboard Dono Micro (1 Empresa)

```
+------------------------------------------------+
|  Inicio - Transportes Silva                     |
|  [< Voltar para visao geral]                    |
+------------------------------------------------+
|                                                  |
|  [======= VIAGENS ATIVAS (amarelo) =======]     |
|  3 viagens em andamento                          |
|  SP->RJ (Joao - ABC-1234)              [Ver]    |
|  MG->BA (Pedro - DEF-5678)             [Ver]    |
|  RS->SC (Ana - GHI-9012)               [Ver]    |
|                                                  |
+------------------------------------------------+
|                                                  |
|  +------------------+  +------------------+      |
|  | Viagens          |  | Gastos           |      |
|  | Em andamento     |  | R$ 18.200,00     |      |
|  | 3                |  | Este mes         |      |
|  +------------------+  +------------------+      |
|                                                  |
|  +------------------+                            |
|  | Acertos          |                            |
|  | Pendentes: 2     |                            |
|  | R$ 3.200,00      |                            |
|  +------------------+                            |
|                                                  |
+------------------------------------------------+
|                                                  |
|  MOTORISTAS                                      |
|  +------------------------------------------+   |
|  | Joao Silva      | Em viagem (SP->RJ)     |   |
|  | Pedro Santos    | Em viagem (MG->BA)     |   |
|  | Ana Costa       | Em viagem (RS->SC)     |   |
|  | Carlos Lima     | Livre                  |   |
|  | Maria Souza     | Livre                  |   |
|  +------------------------------------------+   |
|                                                  |
|  CAMINHOES                                       |
|  +------------------------------------------+   |
|  | ABC-1234 Scania R450  | Rodando (Joao)   |   |
|  | DEF-5678 Volvo FH     | Rodando (Pedro)  |   |
|  | GHI-9012 MB Actros    | Rodando (Ana)    |   |
|  | JKL-3456 Scania R440  | Parado           |   |
|  +------------------------------------------+   |
|                                                  |
+------------------------------------------------+
```

---

## 8. Stories Estimadas

### S-DASH-1: Dashboard Motorista — Cards Personalizados
**Pontos:** 3
**Dependencias:** Nenhuma (queries sao sobre tabelas existentes)

**Escopo:**
- Criar `MeusGanhosCard`, `ViagensConcludasCard`, `ProximaViagemCard`
- Criar `getMotoristaData()` em `actions.ts`
- Modificar `dashboard/page.tsx` para renderizacao condicional
- Otimizar data fetching (nao carregar dados do dono para motorista)

**Acceptance Criteria:**
1. Motorista ve: Viagem Ativa + Meus Ganhos + Viagens Concluidas + Proxima Viagem
2. Motorista NAO ve: Gastos totais, Acertos pendentes
3. Ganhos mostram soma do percentual de viagens concluidas no mes
4. Proxima Viagem mostra primeira viagem planejada ou estado vazio
5. Cards responsivos (1/2/3 colunas)
6. Valores monetarios em verde (ganhos) com `tabular-nums`

**Referencia UX:** `docs/ux-dashboard-por-role.md` (spec completa com SQL, props, e wireframes)

---

### S-DASH-2: Dashboard Dono Macro — Visao Multi-CNPJ
**Pontos:** 8
**Dependencias:** Stories 7.x (multi-empresa) devem estar implementadas

**Escopo:**
- Criar funcao RPC `fn_dashboard_macro` (SECURITY DEFINER, cross-empresa)
- Criar `getDashboardMacro()` server action
- Criar `MacroTotaisBar` (consolidado de todas as empresas)
- Criar `EmpresaCard` (card individual por CNPJ)
- Criar `AlertasRapidosPanel` (acertos pendentes cross-empresa)
- Modificar `dashboard/page.tsx` para rotear: dono com >1 empresa -> macro
- Navegacao: clicar no EmpresaCard troca empresa ativa e navega para micro
- Types: `DashboardMacroData`, `EmpresaMacroItem`, `MacroTotais`

**Acceptance Criteria:**
1. Dono com >1 empresa ve visao macro ao acessar `/dashboard`
2. Dono com 1 empresa ve visao micro direto
3. Barra de totais mostra soma consolidada
4. Cada empresa aparece como card com: razao social, CNPJ, motoristas em viagem, viagens, gastos, receita, margem
5. Clicar no card troca empresa e navega para dashboard micro
6. Alertas mostram acertos pendentes de TODAS as empresas
7. Grid responsivo (1/2/3 colunas para cards de empresa)
8. Funcao RPC valida que usuario autenticado e dono com vinculos ativos

**Riscos:**
- Funcao SECURITY DEFINER cross-empresa precisa validacao de seguranca rigorosa
- Performance: N queries por empresa pode ser lento se dono tiver muitas empresas

**Mitigacao:**
- Funcao SQL faz tudo em uma query com JOINs e GROUP BY (sem N+1)
- Limitar a 10 empresas por dono (constraint de produto)

---

### S-DASH-3: Dashboard Dono Micro — Motoristas e Caminhoes com Status
**Pontos:** 5
**Dependencias:** Nenhuma (dados existem, queries novas sobre tabelas existentes)

**Escopo:**
- Criar `MotoristasStatusList` (quem esta em viagem vs livre)
- Criar `CaminhoesStatusList` (quais estao rodando vs parados)
- Criar `GastoBreakdownMini` (resumo de gastos por categoria no dashboard)
- Criar `getMotoristasComStatus()` e `getCaminhoesComStatus()` em `actions.ts`
- Modificar `dashboard/page.tsx` para incluir as novas secoes na visao micro
- Navegacao: "Voltar para visao geral" quando dono tem >1 empresa

**Acceptance Criteria:**
1. Lista de motoristas mostra nome + status (em viagem com destino / livre)
2. Lista de caminhoes mostra placa+modelo + status (rodando com motorista / parado)
3. Breakdown de gastos mostra top 5 categorias com valor e porcentagem
4. Secoes responsivas e acessiveis
5. Link "Voltar para visao geral" aparece apenas para dono com >1 empresa
6. Listas limitadas a 10 itens com link "Ver todos" quando ha mais

---

### S-DASH-4: Dashboard Admin — Reutilizacao do Micro
**Pontos:** 1
**Dependencias:** S-DASH-3

**Escopo:**
- Garantir que admin ve dashboard micro sem BI/margem
- Verificar que `showBILink` e `showAdminLinks` ja funcionam corretamente
- Testar isolamento: admin NAO acessa visao macro

**Acceptance Criteria:**
1. Admin ve mesmos cards que dono micro
2. Admin NAO ve link para BI/Resumo dos Gastos
3. Admin NAO ve visao macro mesmo que tenha vinculos em >1 empresa
4. Layout responsivo identico ao dono micro

---

### Resumo de Estimativas

| Story | Descricao | Pontos | Prioridade |
|-------|-----------|--------|------------|
| S-DASH-1 | Dashboard Motorista | 3 | P0 (critico) |
| S-DASH-2 | Dashboard Dono Macro | 8 | P1 (alto) |
| S-DASH-3 | Dashboard Dono Micro enriquecido | 5 | P1 (alto) |
| S-DASH-4 | Dashboard Admin | 1 | P2 (medio) |
| **Total** | | **17 pts** | |

### Ordem de Execucao Recomendada

```
S-DASH-1 (motorista)  -->  S-DASH-3 (micro dono)  -->  S-DASH-4 (admin)
                           S-DASH-2 (macro dono, depende de 7.x)
```

S-DASH-1 pode comecar imediatamente (sem dependencias). S-DASH-2 depende da infraestrutura multi-empresa (stories 7.x). S-DASH-3 e S-DASH-4 podem ser paralelizados com S-DASH-2.

---

## 9. Decisoes Autonomas Documentadas

| # | Pergunta | Decisao | Razao |
|---|----------|---------|-------|
| AD-1 | Alertas "Viagens sem motorista" e "CNH vencendo" entram na v1? | NAO. Apenas "Acertos pendentes" | Schema nao suporta CNH validade; toda viagem exige motorista_id hoje |
| AD-2 | Visao macro e a tela principal do dono multi-empresa? | SIM | Stakeholder pediu "visualizacao facil de todos os CNPJs" como prioridade |
| AD-3 | Margem no card de empresa = Receita - Gastos simples? | SIM | Receita = `SUM(viagem.valor_total)` de concluidas; Gastos = `SUM(gasto.valor)`. Calculo simples e compreensivel para publico 60+ |
| AD-4 | Admin pode ver visao macro? | NAO | Admin opera dentro de 1 empresa. Visao macro e exclusiva do dono |
| AD-5 | Limite de empresas por dono no macro? | 10 empresas | Performance da query cross-empresa; cenario realista para cegonheiros |

---

## 10. Avaliacao de Riscos

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|--------------|---------|-----------|
| Query cross-empresa lenta para muitas empresas | Media | Alto | Funcao SQL com JOINs otimizados + limite de 10 empresas |
| SECURITY DEFINER bypassando RLS indevidamente | Baixa | Critico | Validacao de `auth.uid()` na funcao + review de seguranca |
| Motorista com dados inconsistentes no `motorista_id` | Baixa | Medio | Fallback para estado vazio quando `motorista_id IS NULL` |
| Performance do dashboard macro com dados volumosos | Media | Medio | Agregacao no SQL, nao no app; cache de dados com React `cache()` |
| Dono com 1 empresa nao entende por que nao ve o macro | Baixa | Baixo | Explicar na UI: "Cadastre mais empresas para ver o panorama geral" |

---

## 11. Metricas de Sucesso

| Metrica | Meta | Como medir |
|---------|------|-----------|
| Motorista encontra seus ganhos | < 3 segundos apos login | Observacao de uso |
| Dono identifica empresa com problemas | < 10 segundos na visao macro | Cards com alertas visuais (vermelho/amarelo) |
| Tempo de carga do dashboard macro | < 2 segundos | Performance da query `fn_dashboard_macro` |
| Zero vazamento cross-empresa | 0 incidentes | Teste de seguranca: dono A nao ve dados de dono B |

---

## 12. Fora de Escopo (v1)

- Grafico de tendencia no dashboard (existe no BI)
- Notificacoes push para motorista
- Campo `cnh_validade` na tabela motorista (alerta CNH vencendo)
- Viagens sem motorista designado (schema atual exige `motorista_id`)
- Drag-and-drop para reordenar cards
- Customizacao de quais cards o usuario quer ver
- Dashboard em tempo real (WebSocket) — refresh manual e suficiente para v1
