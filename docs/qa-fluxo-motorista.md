# Auditoria QA -- Fluxo do Motorista (Siga Bem)

**Data:** 2026-03-29
**Auditor:** Quinn (QA Agent)
**Escopo:** Fluxo completo do motorista -- todas as funcionalidades que o motorista precisa utilizar no sistema

---

## Resumo Executivo

| Categoria | PASS | FAIL | NOT_IMPLEMENTED | TOTAL |
|-----------|------|------|-----------------|-------|
| Listagem de Viagens | 2 | 0 | 0 | 2 |
| Criacao de Viagem | 3 | 0 | 0 | 3 |
| Edicao e Lock | 3 | 0 | 0 | 3 |
| Gastos/Despesas | 3 | 1 | 1 | 5 |
| Upload de Comprovante | 3 | 0 | 0 | 3 |
| Abastecimento | 3 | 0 | 0 | 3 |
| Historico de Viagens | 3 | 0 | 0 | 3 |
| Status da Viagem | 2 | 0 | 0 | 2 |
| RLS (Supabase) | 4 | 0 | 0 | 4 |
| Sidebar/Menu | 3 | 0 | 0 | 3 |
| **TOTAL** | **29** | **1** | **1** | **31** |

**Veredicto geral: NEEDS_WORK** -- 1 falha funcional e 1 funcionalidade ausente identificadas.

---

## 1. Acesso do Motorista a Listagem de Viagens

### 1.1 Query filtra por motorista_id quando role=motorista?

**Resultado: PASS**

A funcao `listViagens()` em `app/(dashboard)/viagens/actions.ts` (linha 526-616) nao filtra explicitamente por motorista_id no codigo da aplicacao, mas a tabela `viagem` possui RLS habilitado com a policy `viagem_select`:

```sql
CREATE POLICY viagem_select ON viagem
  FOR SELECT USING (
    empresa_id = fn_get_empresa_id()
    AND (
      fn_get_user_role() IN ('dono', 'admin')
      OR motorista_id = fn_get_motorista_id()
    )
  );
```

O motorista so consegue ver viagens onde `motorista_id = fn_get_motorista_id()`. A filtragem e feita no nivel do banco via RLS.

### 1.2 Botao "Nova Viagem" aparece para motorista?

**Resultado: PASS**

O arquivo `app/(dashboard)/viagens/page.tsx` (linhas 34-42) renderiza o botao "Nova Viagem" incondicionalmente -- sem verificacao de role. Isso e correto, pois o motorista PODE criar viagens (requisito 7 do stakeholder). A migration `20260330_add_editavel_motorista_to_viagem.sql` atualizou a RLS policy de INSERT para incluir `motorista`:

```sql
CREATE POLICY viagem_insert ON viagem
  FOR INSERT WITH CHECK (
    empresa_id = fn_get_empresa_id()
    AND fn_get_user_role() IN ('dono', 'admin', 'motorista')
  );
```

---

## 2. Criacao de Viagem pelo Motorista

### 2.1 Motorista consegue acessar /viagens/nova?

**Resultado: PASS**

O arquivo `app/(dashboard)/viagens/nova/page.tsx` (linhas 7-65) verifica apenas se o usuario esta autenticado. Nao ha bloqueio por role. O motorista acessa normalmente e a pagina ja detecta `isMotorista` para adaptar o formulario.

### 2.2 createViagem permite motorista?

**Resultado: PASS**

A funcao `createViagem()` em `app/(dashboard)/viagens/actions.ts` (linhas 180-248):
- NAO bloqueia motorista (nenhum `if (role === 'motorista') return error`)
- Verifica se motorista tem `motorista_id` vinculado (linha 193-195)
- Define `editavelMotorista = true` quando o criador e motorista (linha 215)
- Forca `motorista_id` do proprio motorista (linha 216)

### 2.3 Campo editavel_motorista e setado como true quando motorista cria?

**Resultado: PASS**

Linha 215: `const editavelMotorista = isMotorista;` -- quando motorista cria, `editavel_motorista = true`. Quando dono/admin cria, fica `false`. O INSERT na linha 235 envia este valor.

---

## 3. Edicao e Lock de Campos

### 3.1 Pagina de edicao verifica editavel_motorista?

**Resultado: PASS**

O arquivo `app/(dashboard)/viagens/[id]/editar/page.tsx` (linhas 44-55):
- Calcula `camposEditaveis`: `role === 'dono' OR (editavel_motorista === true AND status === 'planejada')`
- Define `camposLocked = !camposEditaveis`
- Se motorista E campos locked, redireciona para detalhe (linha 53-55)

### 3.2 ViagemForm respeita campos locked?

**Resultado: PASS**

O arquivo `components/viagens/ViagemForm.tsx`:
- Recebe prop `camposLocked` (linha 69)
- Campos origem, destino, valor_total recebem `disabled={camposLocked}` (linhas 275, 293, 343)
- Exibe aviso visual quando campos estao locked (linhas 206-209)

### 3.3 updateViagem verifica lock no servidor?

**Resultado: PASS**

A funcao `updateViagem()` em `app/(dashboard)/viagens/actions.ts` (linhas 255-347):
- Busca viagem existente para checar `editavel_motorista` (linha 271)
- Calcula `camposEditaveis` com a mesma logica (linhas 305-307)
- Detecta se campos core mudaram (linhas 309-312)
- REJEITA se mudaram e nao sao editaveis (linhas 314-318)
- Forca valores originais no UPDATE quando locked (linhas 328-330)

---

## 4. Inclusao de Gastos/Despesas

### 4.1 Motorista pode acessar /gastos/novo?

**Resultado: PASS**

O arquivo `app/(dashboard)/gastos/novo/page.tsx` (linhas 12-62):
- Nenhum bloqueio por role
- Detecta `isMotorista` para pre-preencher e travar o campo motorista_id
- Motorista ve apenas a si proprio no select (via `listMotoristasAtivos`)

### 4.2 createGasto permite motorista?

**Resultado: PASS**

A funcao `createGasto()` em `app/(dashboard)/gastos/actions.ts` (linhas 146-214):
- Nao bloqueia motorista
- Forca `motorista_id` do proprio usuario (linhas 173-189)

### 4.3 Categorias incluem combustivel, pedagio, alimentacao, manutencao, pneu?

**Resultado: PASS**

A migration `20260328180500` insere 11 categorias seed:
- Pedagio, Combustivel, Pneu, Manutencao, Lavagem, Estacionamento, Alimentacao, Hospedagem, Seguro, Multa, Outros

Todas as categorias exigidas pelo stakeholder estao presentes.

### 4.4 Gasto pode ser vinculado a uma viagem (via formulario geral)?

**Resultado: FAIL**

**Problema critico:** O `GastoForm.tsx` NAO tem campo `viagem_id`. O schema `gastoSchema` em `actions.ts` nao inclui `viagem_id`. O `createGasto()` nao envia `viagem_id` no INSERT.

O tipo `GastoFormData` em `types/gasto.ts` tem `viagem_id: string | null`, mas o formulario nao usa este campo.

A UNICA forma de vincular um gasto a uma viagem e via abastecimento (que seta `viagem_id` automaticamente). Gastos manuais de pedagio, alimentacao, pneu, manutencao, etc. NAO ficam vinculados a nenhuma viagem.

**Impacto:** O motorista nao consegue associar despesas de pedagio, alimentacao, pneu ou manutencao a uma viagem especifica. Isso impossibilita o calculo correto de custo por viagem.

### 4.5 Gasto de categorias nao-combustivel dentro da viagem?

**Resultado: NOT_IMPLEMENTED**

Nao existe um formulario dentro da pagina de detalhe da viagem para registrar gastos de categorias diferentes de combustivel. O `AbastecimentoSection` so registra abastecimentos (categoria Combustivel). Nao existe um equivalente `DespesaSection` para pedagio, alimentacao, manutencao, pneu.

---

## 5. Upload de Foto do Comprovante

### 5.1 ComprovantesUpload funciona para motorista?

**Resultado: PASS**

O componente `components/gastos/ComprovantesUpload.tsx` nao verifica role. A RLS de `foto_comprovante` permite que motorista insira/delete/leia comprovantes dos proprios gastos (policies na migration `20260328180600`).

### 5.2 GastoForm tem integracao com ComprovantesUpload?

**Resultado: PASS**

O `EditarGastoClient.tsx` integra `GastoForm` + `ComprovantesUpload` na mesma pagina. O `AbastecimentoForm.tsx` tambem oferece upload apos salvar. O fluxo e: criar gasto -> apos salvar, upload aparece (para abastecimento) ou editar gasto -> upload disponivel.

### 5.3 Foto vinculada ao gasto via tabela foto_comprovante?

**Resultado: PASS**

A tabela `foto_comprovante` possui `gasto_id UUID NOT NULL REFERENCES gasto(id) ON DELETE CASCADE`. O `comprovante-actions.ts` cria o registro com `gasto_id` e armazena no bucket `comprovantes` do Supabase Storage.

---

## 6. Abastecimento dentro da Viagem

### 6.1 AbastecimentoForm permite motorista?

**Resultado: PASS**

O componente nao verifica role. A action `createAbastecimento()` em `app/(dashboard)/viagens/[id]/actions.ts` (linhas 68-182):
- Permite motorista (sem bloqueio por role)
- Para motorista, verifica se e o motorista da viagem (linhas 136-147)
- Valida que a viagem esta `em_andamento` (linhas 107-109)

### 6.2 AbastecimentoSection aparece para motorista?

**Resultado: PASS**

O componente e renderizado condicionalmente apenas por status (`viagem.status === 'em_andamento'`), nao por role. Na pagina de detalhe da viagem (`app/(dashboard)/viagens/[id]/page.tsx`, linha 271), o motorista ve a secao quando a viagem esta em andamento.

### 6.3 createAbastecimento verifica role?

**Resultado: PASS**

Verifica autenticacao, status da viagem, e se motorista e o dono da viagem. Campos registrados incluem: litros, valor, UF, tipo combustivel, posto, odometro -- todos exigidos pelo stakeholder.

---

## 7. Historico de Viagens

### 7.1 Viagens concluidas aparecem na listagem?

**Resultado: PASS**

A funcao `listViagens()` nao filtra por status por padrao. O RLS permite que motorista veja todas as suas viagens (qualquer status). A pagina de listagem mostra todas.

### 7.2 Motorista pode ver detalhes de viagem concluida?

**Resultado: PASS**

A pagina `app/(dashboard)/viagens/[id]/page.tsx` usa `getViagem()` que faz SELECT com RLS. O motorista acessa detalhes de qualquer viagem sua, incluindo concluidas. O unico redirecionamento e por status na pagina de EDICAO, nao na de visualizacao.

### 7.3 Lista de abastecimentos aparece em viagens concluidas?

**Resultado: PASS**

Na pagina de detalhe (linha 284): `<AbastecimentoList abastecimentos={abastecimentos} />` e renderizado FORA do condicional de status. O comentario no codigo confirma: "visible for ALL statuses, including concluida" (linha 283).

---

## 8. Status da Viagem

### 8.1 Motorista pode iniciar/concluir?

**Resultado: PASS**

O `ViagemStatusActions.tsx` renderiza botoes baseado em `VIAGEM_STATUS_TRANSITIONS`, sem verificacao de role. O motorista ve os botoes "Iniciar Viagem" (planejada -> em_andamento) e "Concluir Viagem" (em_andamento -> concluida).

### 8.2 updateViagemStatus permite motorista?

**Resultado: PASS**

A funcao `updateViagemStatus()` (linhas 354-416) nao bloqueia por role. A RLS policy `viagem_update` permite motorista atualizar suas proprias viagens:

```sql
CREATE POLICY viagem_update ON viagem
  FOR UPDATE USING (
    empresa_id = fn_get_empresa_id()
    AND (
      fn_get_user_role() IN ('dono', 'admin')
      OR motorista_id = fn_get_motorista_id()
    )
  );
```

---

## 9. RLS no Supabase

### 9.1 Motorista bloqueado de ver viagens de outros?

**Resultado: PASS**

Policy `viagem_select`: `motorista_id = fn_get_motorista_id()` para role motorista.

### 9.2 Motorista bloqueado de ver gastos de outros?

**Resultado: PASS**

Policy "Motorista gerencia proprios gastos": `motorista_id = fn_get_motorista_id()` com escopo `FOR ALL` (SELECT, INSERT, UPDATE, DELETE).

### 9.3 Comprovantes isolados por motorista?

**Resultado: PASS**

Policies `foto_comprovante` usam subquery: `gasto_id IN (SELECT id FROM gasto WHERE motorista_id = fn_get_motorista_id())`.

### 9.4 Motorista pode inserir viagens (RLS)?

**Resultado: PASS**

Policy `viagem_insert` atualizada para incluir `'motorista'` no CHECK (migration 20260330).

---

## 10. Sidebar/Menu

### 10.1 Quais links o motorista ve?

**Resultado: PASS**

O arquivo `app/(dashboard)/layout.tsx` (linhas 7-22):
- `navLinks` (visiveis para TODOS): Dashboard, Empresa, Viagens, Gastos, Fechamentos, Financeiro
- `adminLinks` (condicionais): Motoristas, Caminhoes, Vinculos, Usuarios, Combustivel

### 10.2 Links de admin ficam escondidos para motorista?

**Resultado: PASS**

Linha 38: `const showAdminLinks = currentUsuario.role === 'dono' || currentUsuario.role === 'admin';`
Motorista NAO ve os links administrativos. Verificado no JSX (linha 74-89).

### 10.3 Link de BI fica escondido para motorista?

**Resultado: PASS**

Linha 39: `const showBILink = currentUsuario.role === 'dono';`
Apenas dono ve o BI Financeiro. Motorista e admin nao veem.

---

## GAPS Identificados

### GAP-1: Vincular gasto manual a viagem (FAIL -- Severidade ALTA)

**Descricao:** O formulario geral de gastos (`GastoForm.tsx`) nao possui campo `viagem_id`. Gastos de pedagio, alimentacao, manutencao, pneu, hospedagem etc. nao podem ser associados a uma viagem.

**Impacto no motorista:**
- Motorista registra pedagio de R$ 150 durante uma viagem SP -> BH, mas nao consegue vincular a essa viagem
- Impossivel calcular custo total real de uma viagem (combustivel fica vinculado via abastecimento, mas outros gastos nao)
- Fechamento financeiro por viagem fica incompleto

**Correcao sugerida:**
1. Adicionar campo opcional `viagem_id` ao schema do `gastoSchema` em `actions.ts`
2. Adicionar select de viagem (apenas em_andamento + planejada do motorista) no `GastoForm.tsx`
3. Enviar `viagem_id` no INSERT de `createGasto()`

**Arquivos afetados:**
- `app/(dashboard)/gastos/actions.ts` -- adicionar viagem_id ao schema e INSERT
- `components/gastos/GastoForm.tsx` -- adicionar select de viagens
- `app/(dashboard)/gastos/novo/page.tsx` -- carregar viagens disponiveis

### GAP-2: Formulario de despesas gerais dentro da viagem (NOT_IMPLEMENTED -- Severidade MEDIA)

**Descricao:** A pagina de detalhe da viagem so tem o `AbastecimentoSection` para registrar combustivel. Nao existe equivalente para pedagio, alimentacao, manutencao, pneu etc.

**Impacto no motorista:**
- Para registrar um pedagio durante uma viagem, o motorista precisa navegar para /gastos/novo separadamente
- Mesmo navegando para /gastos/novo, nao consegue vincular a viagem (ver GAP-1)
- Fluxo descontinuo e pouco intuitivo para um publico 60+

**Correcao sugerida:**
1. Criar componente `DespesaRapidaSection` similar ao `AbastecimentoSection`
2. Permitir selecionar categoria (pedagio, alimentacao, manutencao, pneu, etc.)
3. Valor + descricao + upload de comprovante
4. Automaticamente vincula viagem_id, motorista_id e caminhao_id da viagem atual
5. Renderizar na pagina de detalhe quando `status === 'em_andamento'`

---

## Observacoes Positivas

1. **RLS robusto** -- Todas as tabelas relevantes possuem policies corretas para isolamento do motorista
2. **Lock de 3 niveis** -- Sistema de `editavel_motorista` bem implementado: dono cria locked, motorista cria desbloqueado
3. **Abastecimento completo** -- Todos os campos exigidos presentes (litros, valor, posto, UF, tipo combustivel)
4. **Upload de comprovante** -- Funcional com compressao de imagem, preview, lightbox
5. **Sidebar correta** -- Links administrativos devidamente escondidos
6. **createViagem para motorista** -- Implementado corretamente com forcagem de motorista_id
7. **Historico de abastecimentos** -- Visivel em viagens concluidas, com resumo

---

## Matriz de Decisao

| Item | Status | Bloqueio para producao? |
|------|--------|------------------------|
| GAP-1: viagem_id em gastos | FAIL | SIM -- fluxo financeiro incompleto |
| GAP-2: despesas gerais na viagem | NOT_IMPLEMENTED | NAO -- workaround via /gastos/novo |

**Recomendacao:** Resolver GAP-1 antes de ir para producao. GAP-2 pode ser uma story separada.

---

*Auditoria realizada por Quinn (QA Agent) em 2026-03-29*
*Arquivos analisados: 21 arquivos de codigo + 6 migrations SQL*
