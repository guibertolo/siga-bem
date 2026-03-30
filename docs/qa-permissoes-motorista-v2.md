# Auditoria de Permissoes do Motorista — FrotaViva v2

**Data:** 2026-03-29
**Auditor:** Quinn (QA Agent)
**Escopo:** Todos os formularios e rotas acessiveis pelo role `motorista`
**Regra de ouro:** O motorista e um funcionario. Nao escolhe caminhao, motorista, percentual, nem valor do frete (exceto se ele criou a viagem).

---

## Resumo Executivo

| Severidade | Qtd | Status |
|------------|-----|--------|
| BLOQUEANTE | 2 | Abertos |
| ALTO       | 3 | Abertos |
| MEDIO      | 4 | Abertos |

**Veredito geral: NEEDS_WORK** — ha 2 problemas bloqueantes que permitem ao motorista alterar campos financeiros que deveriam ser controlados exclusivamente pelo dono.

---

## 1. Nova Viagem (`app/(dashboard)/viagens/nova/page.tsx` + `ViagemForm.tsx`)

### 1.1 Selecao de Motorista — OK
- **O que acontece:** Quando `isMotorista=true`, o campo motorista e escondido (`{!isMotorista && ...}`). O `motorista_id` e pre-definido como `motoristas[0].id` (que e o proprio motorista, filtrado no server pela action `listMotoristasAtivos`).
- **Server enforcement:** `createViagem` em `actions.ts` forca `motoristaId = usuario.motorista_id!` quando `isMotorista=true`.
- **Veredicto:** PASS

### 1.2 Selecao de Caminhao — OK (parcial)
- **O que acontece:** O motorista ve apenas caminhoes vinculados a ele via `listCaminhoesPorMotorista(usuario.motorista_id)`. Se nao tem vinculo, ve mensagem de bloqueio.
- **Nota:** Se o motorista tem multiplos vinculos ativos, pode escolher entre eles. Isso e aceitavel — o dono ja definiu quais caminhoes estao vinculados.
- **Veredicto:** PASS

### 1.3 Percentual de Pagamento — BLOQUEANTE
- **Arquivo:** `components/viagens/ViagemForm.tsx` linhas 352-366
- **O que acontece hoje:** O campo `percentual_pagamento` e exibido como input editavel para TODOS os roles, incluindo motorista. O motorista pode definir qualquer valor de 0 a 100%.
- **O que deveria acontecer:** Para motorista, o percentual deveria ser:
  - `hidden` (nao exibido) com valor default 0, OU
  - `readonly` com o valor pre-definido pelo vinculo motorista-caminhao, OU
  - Omitido do formulario, com o servidor aplicando o percentual configurado pelo dono
- **Server enforcement:** NENHUMA. O `createViagem` aceita e salva qualquer valor de percentual enviado pelo motorista.
- **Impacto:** Motorista pode definir percentual de 100% e receber o valor integral do frete.
- **Severidade:** **BLOQUEANTE**

### 1.4 Valor do Frete — CONDICIONAL (OK para motorista-criador)
- **O que acontece:** Quando o motorista cria a viagem (`editavel_motorista=true`), ele pode definir o valor do frete. Isso e o comportamento esperado pela Story 3.4.
- **Veredicto:** PASS (dentro do escopo da Story 3.4)

---

## 2. Editar Viagem (`app/(dashboard)/viagens/[id]/editar/page.tsx`)

### 2.1 Lock de campos do dono — OK
- **O que acontece:** Se a viagem foi criada pelo dono (`editavel_motorista=false`), o motorista e redirecionado para a pagina de detalhes (linha 53-55).
- **Server enforcement:** `updateViagem` verifica `coreFieldChanged && !camposEditaveis` e bloqueia alteracao.
- **Veredicto:** PASS

### 2.2 Motorista oculto — OK
- **O que acontece:** Campo motorista oculto quando `isMotorista=true`.
- **Veredicto:** PASS

### 2.3 Percentual de Pagamento na Edicao — BLOQUEANTE
- **Arquivo:** `components/viagens/ViagemForm.tsx` linhas 352-366
- **O que acontece hoje:** Mesmo na edicao, o campo `percentual_pagamento` e editavel para o motorista. Ele pode alterar o percentual de uma viagem que ele mesmo criou.
- **O que deveria acontecer:** Motorista NAO deve poder alterar percentual, mesmo em viagens que ele criou. O percentual e uma decisao do dono.
- **Server enforcement:** NENHUMA. `updateViagem` nao valida se o motorista esta alterando o percentual.
- **Severidade:** **BLOQUEANTE**

### 2.4 Caminhao na Edicao — OK
- Caminhoes carregados via vinculo do motorista atual.
- **Veredicto:** PASS

---

## 3. Registrar Abastecimento (`components/abastecimento/AbastecimentoForm.tsx`)

### 3.1 Motorista e Caminhao pre-preenchidos — OK
- **O que acontece:** O componente recebe `motoristaNome` e `caminhaoPlaca` como props e os exibe como texto readonly dentro de um bloco `bg-surface-muted` (linhas 221-239). Nao ha inputs editaveis para esses campos.
- **Veredicto:** PASS

### 3.2 Viagem vinculada — OK
- **O que acontece:** O `viagemId` e recebido como prop e enviado fixo no submit. O motorista nao pode alterar.
- **Veredicto:** PASS

---

## 4. Novo Gasto (`app/(dashboard)/gastos/novo/page.tsx` + `GastoForm.tsx`)

### 4.1 Motorista fixo — ALTO (falha condicional)
- **Arquivo:** `app/(dashboard)/gastos/novo/page.tsx` linhas 34-37
- **O que acontece hoje:** `motoristaFixo` so e definido quando `motoristasResult.data?.length === 1`. Se por algum motivo o motorista tiver 0 registros no resultado (edge case: motorista desativado mas usuario ativo), `motoristaFixo` sera `null` e o motorista vera o dropdown de motoristas.
- **Mitigacao existente:** O server action `createGasto` forca `motoristaId = motoristaRecord.id` para role motorista (linhas 177-192), independente do que foi enviado pelo form. Isso e a defesa real.
- **O que deveria acontecer:** O UI deveria SEMPRE travar o motorista para role motorista, sem depender do count === 1.
- **Severidade:** **ALTO** (mitigado pelo server, mas UI inconsistente)

### 4.2 Caminhao livre no form de gastos — ALTO
- **Arquivo:** `components/gastos/GastoForm.tsx` linhas 279-298, `app/(dashboard)/gastos/actions.ts` linhas 125-144
- **O que acontece hoje:** A action `listCaminhoesAtivos()` retorna TODOS os caminhoes ativos da empresa, sem filtro por motorista. Quando o motorista cria um gasto SEM vincular a uma viagem, ele pode selecionar qualquer caminhao da empresa.
- **O que deveria acontecer:** Motorista so deveria ver caminhoes vinculados a ele (como faz o ViagemForm). A `listCaminhoesAtivos` deveria filtrar por vinculo quando o role e motorista.
- **Server enforcement:** NENHUMA. O `createGasto` aceita qualquer `caminhao_id` valido.
- **Severidade:** **ALTO** (exposicao de dados + associacao incorreta de gasto a caminhao alheio)

### 4.3 Viagem dropdown — OK
- **O que acontece:** `listViagensAtivas()` depende do RLS da tabela `viagem` que ja filtra por `motorista_id = fn_get_motorista_id()`. O motorista so ve suas proprias viagens.
- **Veredicto:** PASS

### 4.4 Auto-fill motorista/caminhao ao selecionar viagem — OK
- **O que acontece:** Ao selecionar viagem, `handleViagemChange` preenche e trava motorista e caminhao.
- **Veredicto:** PASS

---

## 5. Criar Vinculo Motorista-Caminhao (`/vinculos/novo`)

### 5.1 Bloqueio de acesso — OK
- **Sidebar:** Link `/vinculos` so aparece para `dono`/`admin` (esta dentro de `adminLinks`).
- **Page-level:** `vinculos/page.tsx` chama `listVinculos()` que usa `requireRole(['dono', 'admin'])` e exibe mensagem "sem permissao".
- **Action-level:** `createVinculo()` usa `requireRole(['dono', 'admin'])`.
- **Veredicto:** PASS

### 5.2 Acesso direto por URL — MEDIO
- **O que acontece:** Se motorista navega para `/vinculos`, a pagina renderiza mas mostra "Voce nao tem permissao". A pagina `/vinculos/novo` tambem mostra a mensagem.
- **O que deveria acontecer:** Redirecionar para `/dashboard` ao inves de renderizar pagina parcial com mensagem de erro.
- **Severidade:** **MEDIO** (funcionalidade bloqueada, mas UX fraca)

---

## 6. Sidebar e Navegacao

### 6.1 Desktop Sidebar — OK
- **O que acontece:** `motoristaLinks` contem apenas `/dashboard` e `/viagens`. Links admin (`/motoristas`, `/caminhoes`, `/vinculos`, `/usuarios`, `/configuracoes/combustivel`) so aparecem quando `showAdminLinks=true` (role dono/admin). Link BI so aparece para `dono`.
- **Veredicto:** PASS

### 6.2 Mobile Sidebar — OK
- **O que acontece:** Recebe as mesmas props condicionais (`navLinks`, `showAdminLinks`, `showBILink`) do layout.
- **Veredicto:** PASS

---

## 7. Paginas que motorista NAO deve acessar (acesso direto por URL)

| Rota | Protecao | Veredicto | Severidade |
|------|----------|-----------|------------|
| `/gastos` | Sem bloqueio de role no page. RLS filtra dados. Motorista ve seus proprios gastos. | MEDIO | MEDIO |
| `/gastos/novo` | Acessivel. Server action protege motorista_id. | OK | — |
| `/fechamentos` | Sem bloqueio de role no page. Actions retornam "Permissao insuficiente" para listFechamentos. Mas `listFechamentos` NAO bloqueia motorista — apenas RLS filtra. Motorista ve seus proprios fechamentos. | MEDIO | MEDIO |
| `/financeiro/historico` | Acessivel. Adapta UI baseado em role (isMotorista). Motorista ve proprios acertos. | OK | — |
| `/bi` | `redirect('/dashboard')` se role !== 'dono'. | PASS | — |
| `/empresa` | Acessivel. `getEmpresa()` nao valida role. Motorista ve dados da empresa (CNPJ, razao social, endereco). | MEDIO | MEDIO |
| `/motoristas` | `listMotoristas()` usa `requireRole(['dono', 'admin'])`. Renderiza pagina mas sem dados. | OK (parcial) | — |
| `/caminhoes` | `listCaminhoes()` usa `requireRole(['dono', 'admin'])`. Mostra mensagem "sem permissao". | PASS | — |
| `/vinculos` | `listVinculos()` usa `requireRole(['dono', 'admin'])`. Mostra mensagem "sem permissao". | PASS | — |
| `/usuarios` | Redirect para `/dashboard` se role === 'motorista'. | PASS | — |
| `/configuracoes/combustivel` | `listCombustivelPrecos()` NAO valida role — retorna precos para qualquer usuario. Actions de escrita bloqueiam motorista. | MEDIO | MEDIO |

---

## 8. Detalhamento dos Problemas

### P1 — BLOQUEANTE: Motorista pode definir/alterar percentual de pagamento

| Campo | Detalhe |
|-------|---------|
| **Arquivo** | `components/viagens/ViagemForm.tsx` linhas 352-366 |
| **Hoje** | Campo `percentual_pagamento` e um input editavel sem nenhuma restricao por role |
| **Esperado** | Campo deve ser `hidden` ou `readOnly` para motorista. Valor deve vir do vinculo ou ser 0. |
| **Server** | `createViagem` e `updateViagem` NAO validam/forçam percentual para motorista |
| **Impacto** | Motorista pode definir 100% de comissao e ficar com todo o valor do frete |
| **Fix sugerido** | (1) No ViagemForm: quando `isMotorista=true`, renderizar campo hidden com value=0 ou valor do vinculo. (2) No server: quando role=motorista, ignorar percentual enviado e aplicar o do vinculo ativo. |

### P2 — ALTO: Motorista ve todos os caminhoes da empresa no form de gastos

| Campo | Detalhe |
|-------|---------|
| **Arquivo** | `app/(dashboard)/gastos/actions.ts` — `listCaminhoesAtivos()` linhas 125-144 |
| **Hoje** | Retorna todos os caminhoes ativos da empresa sem filtro por vinculo |
| **Esperado** | Motorista deve ver apenas caminhoes vinculados a ele |
| **Server** | `createGasto` aceita qualquer `caminhao_id` valido da empresa |
| **Impacto** | (1) Exposicao de informacao (placas de caminhoes alheios). (2) Gasto pode ser associado a caminhao errado. |
| **Fix sugerido** | Na `listCaminhoesAtivos`, quando role=motorista, filtrar por vinculos ativos (igual a `listCaminhoesPorMotorista`). |

### P3 — ALTO: UI do motorista_fixo depende de count === 1

| Campo | Detalhe |
|-------|---------|
| **Arquivo** | `app/(dashboard)/gastos/novo/page.tsx` linhas 34-37 |
| **Hoje** | `motoristaFixo` so e setado se `motoristasResult.data?.length === 1` |
| **Esperado** | Para role motorista, SEMPRE travar motorista. Usar `usuario.motorista_id` ou o primeiro da lista. |
| **Mitigacao** | Server action forca motorista_id correto. Problema e apenas de UI. |
| **Fix sugerido** | Mudar logica: `const motoristaFixo = isMotorista ? (motoristasResult.data?.[0]?.id ?? null) : null;` |

### P4 — MEDIO: Paginas admin renderizam conteudo parcial ao inves de redirecionar

| Campo | Detalhe |
|-------|---------|
| **Arquivos** | `/vinculos/page.tsx`, `/caminhoes/page.tsx` |
| **Hoje** | Mostram mensagem "Voce nao tem permissao" mas renderizam o layout da pagina |
| **Esperado** | `redirect('/dashboard')` imediato, como faz `/usuarios/page.tsx` |
| **Fix sugerido** | Adicionar `if (usuario.role === 'motorista') redirect('/dashboard')` no inicio |

### P5 — MEDIO: /empresa acessivel por motorista sem restricao

| Campo | Detalhe |
|-------|---------|
| **Arquivo** | `app/(dashboard)/empresa/page.tsx` |
| **Hoje** | Motorista pode ver CNPJ, razao social, endereco, telefone e email da empresa |
| **Esperado** | Motorista nao deveria acessar detalhes completos da empresa. No maximo o nome fantasia. |
| **Fix sugerido** | Adicionar role check no page ou na action `getEmpresa` |

### P6 — MEDIO: /configuracoes/combustivel leitura acessivel por motorista

| Campo | Detalhe |
|-------|---------|
| **Arquivo** | `app/(dashboard)/configuracoes/combustivel/actions.ts` — `listCombustivelPrecos()` linhas 190-210 |
| **Hoje** | Retorna precos para qualquer role. Pagina nao bloqueia acesso. |
| **Esperado** | So dono/admin devem acessar configuracoes de combustivel |
| **Nota** | Link nao aparece na sidebar do motorista, entao acesso so e possivel por URL direto |
| **Fix sugerido** | Adicionar role check na action e/ou redirect no page |

### P7 — MEDIO: /gastos lista acessivel por motorista sem role check explicito

| Campo | Detalhe |
|-------|---------|
| **Arquivo** | `app/(dashboard)/gastos/page.tsx` |
| **Hoje** | Pagina acessivel. RLS filtra corretamente so gastos do motorista. Mas link `/gastos` NAO esta na sidebar do motorista. |
| **Esperado** | Se nao e para o motorista acessar, bloquear. Se e, adicionar o link na sidebar. |
| **Nota** | O motorista pode criar gastos de dentro de uma viagem. A pagina de listagem pode ser util. Decisao de produto. |
| **Fix sugerido** | [AUTO-DECISION] Manter acessivel via URL (dados ja filtrados por RLS) mas documentar como decisao consciente |

---

## 9. Matriz de Controle de Acesso — Estado Atual

| Recurso | Motorista (UI) | Motorista (Server/RLS) | Dono/Admin |
|---------|---------------|----------------------|------------|
| Selecionar motorista (viagem) | Oculto | Forcado no server | Livre |
| Selecionar caminhao (viagem) | Filtrado por vinculo | Aceita qualquer | Livre |
| Definir percentual (viagem) | **EDITAVEL** | **SEM PROTECAO** | Livre |
| Definir valor frete (viagem propria) | Editavel | Aceita | Livre |
| Definir valor frete (viagem do dono) | Locked | Bloqueado | Livre |
| Selecionar motorista (gasto) | Locked (condicional) | Forcado no server | Livre |
| Selecionar caminhao (gasto) | **VE TODOS** | **SEM FILTRO** | Livre |
| Abastecimento campos | Readonly | Vinculado a viagem | Livre |
| Criar vinculo | Bloqueado | requireRole | Livre |
| Criar fechamento | Sem link | Bloqueado na action | Livre |
| Ver BI | Redirect | Redirect | Livre |
| Ver empresa | **ACESSIVEL** | Sem restricao | Livre |
| Ver precos combustivel | **ACESSIVEL (URL)** | Sem restricao leitura | Livre |

---

## 10. Recomendacoes Priorizadas

### Imediato (Sprint atual)
1. **P1 — Bloquear percentual para motorista** no ViagemForm + server actions
2. **P2 — Filtrar caminhoes por vinculo** no GastoForm/actions

### Proximo Sprint
3. **P3 — Corrigir logica motoristaFixo** no form de gastos
4. **P4 — Redirect ao inves de mensagem** nas paginas admin
5. **P5 — Bloquear /empresa** para motorista
6. **P6 — Bloquear /configuracoes/combustivel** leitura para motorista

### Backlog
7. **P7 — Decidir se /gastos** entra na sidebar do motorista

---

*Gerado por Quinn (QA Agent) em 2026-03-29*
