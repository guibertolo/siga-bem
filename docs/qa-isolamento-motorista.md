# Auditoria de Isolamento de Dados do Motorista — FrotaViva

**Data:** 2026-03-29
**Auditor:** Quinn (QA Agent)
**Veredicto Geral:** NEEDS_WORK (4 falhas encontradas, 2 bloqueantes)

---

## Regra de Ouro

> O motorista e um funcionario isolado. Ele SO pode ver/acessar dados que pertencem a ELE.
> Nunca dados de outros motoristas, da empresa inteira ou de outros caminhoes que nao o dele.

---

## Resumo Executivo

| Camada | Status |
|--------|--------|
| RLS (Supabase) | SOLIDO — viagem, gasto, fechamento filtram por `fn_get_motorista_id()` |
| Server Actions | PARCIAL — maioria com defesa em profundidade, 4 brechas identificadas |
| UI (Sidebar) | SOLIDO — links admin/BI corretamente escondidos para motorista |
| Middleware | SOLIDO — todas as rotas protegidas por auth session |

---

## Auditoria por Funcionalidade

### 1. Viagens (/viagens)

| Aspecto | Esperado | Atual | Veredicto |
|---------|----------|-------|-----------|
| RLS SELECT | Filtra por `motorista_id = fn_get_motorista_id()` | SIM — policy `viagem_select` | PASS |
| `listViagens()` | Filtra por motorista_id no app | NAO — depende 100% do RLS | PASS (RLS garante) |
| `getViagem()` | Motorista so ve sua viagem | SIM — RLS filtra | PASS |
| `createViagem()` | Motorista cria com seu motorista_id | SIM — forca `usuario.motorista_id` | PASS |
| `updateViagem()` | Motorista so edita suas | SIM — RLS filtra, + lock de campos core | PASS |
| `deleteViagem()` | Motorista NAO pode deletar | SIM — check `role === 'motorista'` retorna erro | PASS |
| `getViagensEmAndamento()` | Motorista ve so suas | NAO — **sem filtro por motorista_id no app** | **FAIL** |

**FAIL — `getViagensEmAndamento()` (linha 621-641):** Usa `supabase.from('viagem').select('id', {count:'exact', head:true}).eq('status','em_andamento')` sem filtrar por motorista. O RLS no Supabase ja filtra por motorista_id, entao o COUNT retornara apenas as viagens do motorista. **Severidade: BAIXA** — o RLS protege, mas a funcao nao demonstra defense-in-depth.

### 2. Gastos (/gastos)

| Aspecto | Esperado | Atual | Veredicto |
|---------|----------|-------|-----------|
| RLS SELECT | Filtra por `motorista_id = fn_get_motorista_id()` | SIM — policy "Motorista gerencia proprios gastos" | PASS |
| `listGastos()` | Motorista ve so seus | SIM — RLS filtra | PASS |
| `createGasto()` | Forca motorista_id do usuario | SIM — busca via `usuario_id` e forca | PASS |
| `updateGasto()` | Verifica ownership | SIM — compara `motorista_id` com registro do user | PASS |
| `deleteGasto()` | Verifica ownership | SIM — mesma verificacao | PASS |
| `getGasto()` | Verifica ownership | SIM — check explicito para role motorista | PASS |
| `getGastosMesAtual()` | Motorista ve so seus gastos | NAO — **sem filtro por motorista_id no app** | **FAIL** |
| `listViagensAtivas()` | Motorista ve so suas viagens | NAO — **sem filtro por motorista_id no app** | **FAIL** |

**FAIL — `getGastosMesAtual()` (linha 547-573):** Nao filtra por motorista_id. O RLS protege, mas no dashboard o motorista veria "Total de gastos" mostrando so os seus (correto por RLS), porem sem defense-in-depth. **Severidade: BAIXA.**

**FAIL — `listViagensAtivas()` (linha 579-607):** Lista viagens planejadas/em_andamento SEM filtrar por motorista_id. O RLS filtra, mas se o motorista estiver preenchendo um gasto e selecionar uma viagem, ele so vera as suas (por RLS). **Severidade: BAIXA.**

### 3. Acerto de Contas (/fechamentos)

| Aspecto | Esperado | Atual | Veredicto |
|---------|----------|-------|-----------|
| RLS SELECT | Filtra por motorista | SIM — `motorista_id = fn_get_motorista_id()` | PASS |
| `listFechamentos()` | Motorista ve so seus | SIM — RLS filtra, + comment indica motorista role | PASS |
| `getFechamentoDetalhado()` | Motorista ve so seus | SIM — RLS filtra | PASS |
| `createFechamento()` | Motorista NAO pode criar | SIM — `role === 'motorista'` retorna erro | PASS |
| `fecharFechamento()` | Motorista NAO pode fechar | SIM — check de role | PASS |
| `deleteFechamento()` | Motorista NAO pode deletar | SIM — check de role | PASS |
| `listMotoristasParaFechamento()` | Motorista NAO ve lista | SIM — retorna "Permissao insuficiente" | PASS |
| `previewFechamento()` | Motorista NAO pode gerar | SIM — check de role | PASS |

### 4. Historico de Acertos (/financeiro/historico)

| Aspecto | Esperado | Atual | Veredicto |
|---------|----------|-------|-----------|
| `getFechamentosHistorico()` | Motorista ve so seus | SIM — filtra `motorista_id = usuario.motorista_id` | PASS |
| `getResumoFinanceiro()` | Motorista NAO ve resumo | SIM — retorna zeros para motorista | PASS |
| `reabrirFechamento()` | Motorista NAO pode reabrir | SIM — check `dono/admin` | PASS |
| `fetchFechamentoFilterOptions()` | Motorista NAO ve lista de motoristas | **PARCIAL** — retorna todos motoristas ativos | **FAIL** |

**FAIL — `fetchFechamentoFilterOptions()` (linha 264-291):** NAO verifica role nem filtra por motorista. Retorna lista de TODOS motoristas ativos da empresa via RLS (empresa_id). O motorista que acesse esta funcao veria nomes/IDs de todos os colegas motoristas. **Severidade: MEDIA** — vazamento de informacao (nomes de outros motoristas). Note que o RLS da tabela motorista permite que o motorista veja apenas seu proprio registro, entao na pratica o RLS da tabela protege — MAS a query nao especifica empresa_id explicitamente, dependendo apenas do RLS. Na pratica, por causa do RLS `motorista_select_self` e `motorista_select_empresa` (este ultimo so para dono/admin), o motorista so veria a si mesmo. **Reavaliacao: PASS (RLS protege).**

### 5. Motoristas (/motoristas)

| Aspecto | Esperado | Atual | Veredicto |
|---------|----------|-------|-----------|
| Sidebar | Link NAO aparece para motorista | SIM — `showAdminLinks` = false para motorista | PASS |
| `listMotoristas()` | Requer dono/admin | SIM — `requireRole(['dono','admin'])` | PASS |
| `createMotorista()` | Requer dono/admin | SIM | PASS |
| `updateMotorista()` | Requer dono/admin | SIM | PASS |
| `getMotorista()` | Requer dono/admin | SIM | PASS |

### 6. Caminhoes (/caminhoes)

| Aspecto | Esperado | Atual | Veredicto |
|---------|----------|-------|-----------|
| Sidebar | Link NAO aparece para motorista | SIM — `showAdminLinks` = false | PASS |
| `listCaminhoes()` | Requer dono/admin | SIM — `requireRole(['dono','admin'])` | PASS |
| `createCaminhao()` | Requer dono/admin | SIM | PASS |
| `updateCaminhao()` | Requer dono/admin | SIM | PASS |
| RLS Caminhao | Motorista ve todos da empresa (SELECT) | SIM — policy "Motorista visualiza caminhoes da empresa" | NOTA |

**NOTA sobre RLS de caminhao:** A policy permite SELECT de TODOS caminhoes da empresa para o motorista. Isso e necessario para que o motorista possa selecionar um caminhao ao criar viagem/gasto. NAO e uma falha, mas merece atencao — o motorista ve placas de TODOS os caminhoes. Considerar se deveria ver apenas o caminhao vinculado a ele.

### 7. Vinculos (/vinculos)

| Aspecto | Esperado | Atual | Veredicto |
|---------|----------|-------|-----------|
| Sidebar | Link NAO aparece para motorista | SIM | PASS |
| `listVinculos()` | Requer dono/admin | SIM — `requireRole(['dono','admin'])` | PASS |
| `createVinculo()` | Requer dono/admin | SIM | PASS |
| `encerrarVinculo()` | Requer dono/admin | SIM | PASS |

### 8. Usuarios (/usuarios)

| Aspecto | Esperado | Atual | Veredicto |
|---------|----------|-------|-----------|
| Sidebar | Link NAO aparece para motorista | SIM | PASS |
| `listUsuarios()` | Requer dono/admin | SIM — `requireRole(['dono','admin'])` | PASS |
| `inviteUsuario()` | Requer dono/admin | SIM | PASS |
| `updateUsuarioRole()` | Requer dono | SIM | PASS |
| `toggleUsuarioAtivo()` | Requer dono/admin | SIM | PASS |

### 9. Configuracoes (/configuracoes/combustivel)

| Aspecto | Esperado | Atual | Veredicto |
|---------|----------|-------|-----------|
| Sidebar | Link NAO aparece para motorista | SIM | PASS |
| `createCombustivelPreco()` | Motorista bloqueado | SIM — `role === 'motorista'` retorna erro | PASS |
| `updateCombustivelPreco()` | Motorista bloqueado | SIM | PASS |
| `deleteCombustivelPreco()` | Motorista bloqueado | SIM | PASS |
| `listCombustivelPrecos()` | Motorista ve precos? | SIM — nao ha check de role | NOTA |
| `getPrecoDieselAtual()` | Motorista ve preco? | SIM — necessario para calculo | PASS |

**NOTA sobre `listCombustivelPrecos()`:** Nao bloqueia motorista. Porem o sidebar esconde o link, e o RLS (empresa_combustivel_all) filtra por empresa_id. Motorista poderia acessar diretamente a URL /configuracoes/combustivel e ver precos. Considerar se isso e um problema — precos de combustivel nao sao dados sensiveis. **Severidade: BAIXA.**

### 10. BI/Resumo dos Gastos (/bi)

| Aspecto | Esperado | Atual | Veredicto |
|---------|----------|-------|-----------|
| Sidebar | Link NAO aparece para motorista | SIM — `showBILink = role === 'dono'` | PASS |
| Todas actions BI | Requerem role=dono | SIM — `requireDono()` em todas | PASS |

### 11. Empresa (/empresa)

| Aspecto | Esperado | Atual | Veredicto |
|---------|----------|-------|-----------|
| Sidebar | Link aparece para todos (navLinks) | SIM — motorista ve link "Empresa" | NOTA |
| `getEmpresa()` | Motorista ve dados da empresa | SIM — sem check de role | NOTA |
| `updateEmpresa()` | Motorista pode editar? | NAO — RLS "Dono edita propria empresa" bloqueia | PASS |
| `createEmpresa()` | Qualquer autenticado | SIM — faz sentido para onboarding | PASS |

**NOTA sobre visibilidade da empresa:** O motorista tem acesso a pagina /empresa e pode ver dados como CNPJ, razao social, endereco. Isso pode ser aceitavel (ele trabalha para a empresa e pode precisar do CNPJ para notas) mas merece decisao consciente do produto.

### 12. Sidebar — Links visiveis para role=motorista

**Arquivo:** `app/(dashboard)/layout.tsx`

| Grupo | Links | Motorista ve? | Veredicto |
|-------|-------|---------------|-----------|
| navLinks | Inicio, Empresa, Viagens, Gastos, Acerto de Contas, Historico de Acertos | SIM | PASS |
| BI | Resumo dos Gastos | NAO (`showBILink = role === 'dono'`) | PASS |
| adminLinks | Motoristas, Caminhoes, Vinculos, Usuarios, Preco Combustivel | NAO (`showAdminLinks` = false) | PASS |
| Perfil | Meu Perfil | SIM | PASS |
| Sair | Sair | SIM | PASS |

### 13. RLS no Supabase — Analise Completa

| Tabela | Politica Motorista | Filtra por motorista_id? | Veredicto |
|--------|-------------------|--------------------------|-----------|
| **viagem** | `motorista_id = fn_get_motorista_id()` | SIM | PASS |
| **gasto** | `motorista_id = fn_get_motorista_id()` | SIM | PASS |
| **fechamento** | `motorista_id = fn_get_motorista_id()` | SIM | PASS |
| **fechamento_item** | via EXISTS no parent fechamento | SIM (indireto) | PASS |
| **motorista** | `id = fn_get_motorista_id()` | SIM — ve apenas si mesmo | PASS |
| **caminhao** | `empresa_id = fn_get_empresa_id()` | NAO — ve todos da empresa | NOTA |
| **motorista_caminhao** | `empresa_id = fn_get_empresa_id()` | NAO — ve todos da empresa | NOTA |
| **usuario** | `empresa_id = fn_get_empresa_id()` | NAO — ve todos da empresa | NOTA |
| **empresa** | `id = fn_get_empresa_id()` | N/A — ve propria empresa | PASS |
| **combustivel_preco** | `empresa_id = fn_get_empresa_id()` | NAO — ve todos da empresa | NOTA |
| **categoria_gasto** | Global + empresa | N/A — dados de referencia | PASS |

**NOTA sobre tabelas com isolamento apenas por empresa:**
- `caminhao`: Motorista ve todos os caminhoes. Necessario para selects em formularios.
- `motorista_caminhao`: Motorista ve todos os vinculos. Porem a UI esconde a pagina.
- `usuario`: Motorista pode ler dados de todos usuarios da empresa (nomes, emails, roles). A UI esconde a pagina /usuarios, mas a RLS permite SELECT. **Risco potencial de vazamento de dados pessoais.**

### 14. Server Actions — Defense in Depth

| Funcao | Tem check de role? | Tem filtro por motorista no app? | RLS protege? | Veredicto |
|--------|-------------------|----------------------------------|-------------|-----------|
| `listViagens()` | NAO | NAO | SIM | PASS (RLS) |
| `getViagem()` | NAO | NAO | SIM | PASS (RLS) |
| `createViagem()` | SIM (motorista_id forcado) | SIM | SIM | PASS |
| `updateViagem()` | SIM (campos core lockados) | NAO | SIM | PASS (RLS) |
| `deleteViagem()` | SIM (bloqueia motorista) | N/A | SIM | PASS |
| `listGastos()` | NAO | NAO | SIM | PASS (RLS) |
| `createGasto()` | SIM (motorista_id forcado) | SIM | SIM | PASS |
| `updateGasto()` | SIM (ownership check) | SIM | SIM | PASS |
| `deleteGasto()` | SIM (ownership check) | SIM | SIM | PASS |
| `getGasto()` | SIM (ownership check) | SIM | SIM | PASS |
| `listFechamentos()` | NAO | NAO | SIM | PASS (RLS) |
| `getFechamentoDetalhado()` | NAO | NAO | SIM | PASS (RLS) |
| `createFechamento()` | SIM (bloqueia motorista) | N/A | SIM | PASS |
| `getViagemAtiva()` | SIM (filtra motorista_id) | SIM | SIM | PASS |
| `listCaminhoes()` | SIM (requireRole) | N/A | SIM | PASS |
| `listMotoristas()` | SIM (requireRole) | N/A | SIM | PASS |

---

## Issues Encontrados

### BLOQUEANTE

Nenhum issue bloqueante real foi encontrado. O RLS do Supabase fornece isolamento solido em todas as tabelas criticas (viagem, gasto, fechamento).

### MEDIA

| # | Issue | Local | Descricao | Correcao |
|---|-------|-------|-----------|----------|
| M1 | RLS de `usuario` aberto para leitura | `20260328180100_create_usuario_table.sql:113` | Motorista pode ler `nome, email, role` de TODOS usuarios da empresa via RLS (`empresa_id = fn_get_empresa_id()`). A UI esconde /usuarios, mas uma chamada direta ao Supabase client expoe os dados. | Adicionar policy motorista com `USING (auth_id = auth.uid())` para isolar leitura. |
| M2 | RLS de `motorista_caminhao` aberto para leitura | `20260328180400_create_motorista_caminhao.sql:68` | Motorista ve TODOS vinculos da empresa (motorista + caminhao). Permite saber quais motoristas usam quais caminhoes. | Restringir para `motorista_id = fn_get_motorista_id()`. |

### BAIXA

| # | Issue | Local | Descricao | Correcao |
|---|-------|-------|-----------|----------|
| B1 | Falta defense-in-depth em `getViagensEmAndamento()` | `viagens/actions.ts:621-641` | Nao filtra por motorista_id no app. RLS protege. | Adicionar `if (role==='motorista') query.eq('motorista_id', motorista_id)` |
| B2 | Falta defense-in-depth em `getGastosMesAtual()` | `gastos/actions.ts:547-573` | Mesma situacao. | Idem |
| B3 | Falta defense-in-depth em `listViagensAtivas()` | `gastos/actions.ts:579-607` | Lista viagens ativas sem filtro por motorista no app. | Idem |
| B4 | `listCombustivelPrecos()` nao bloqueia motorista | `configuracoes/combustivel/actions.ts:190-213` | Motorista poderia acessar URL direta e ver precos. | Adicionar check `role === 'motorista'` ou aceitar como aceitavel. |
| B5 | Caminhao RLS permite SELECT de todos da empresa | `20260328180300_create_caminhao.sql:73-75` | Motorista ve placas/modelos de todos caminhoes. Necessario para formularios, mas expoe inventario completo. | Considerar restringir para caminhoes vinculados ao motorista. |

### NOTAS (nao sao falhas, sao decisoes de produto)

| # | Nota | Decisao Necessaria |
|---|------|--------------------|
| N1 | Motorista ve pagina /empresa com dados da empresa | Aceitavel? Motorista precisa do CNPJ? |
| N2 | Motorista ve link "Empresa" no sidebar | Esconder para motorista? |
| N3 | Motorista ve link "Acerto de Contas" e "Historico de Acertos" | Correto — ve apenas seus proprios acertos |

---

## Conclusao

O isolamento de dados do motorista no FrotaViva e **fundamentalmente solido**. A camada de RLS do Supabase garante que as tabelas criticas (viagem, gasto, fechamento) filtram por `motorista_id = fn_get_motorista_id()`, impedindo acesso cruzado entre motoristas.

As falhas encontradas sao:
1. **Vazamento de dados de usuarios** (M1) — motorista pode ler dados de outros usuarios via RLS
2. **Vazamento de vinculos** (M2) — motorista ve todos vinculos motorista-caminhao
3. **Falta de defense-in-depth** (B1-B3) — funcoes do dashboard confiam 100% no RLS sem filtro adicional no app

**Recomendacao:** Corrigir M1 e M2 criando novas migrations com policies mais restritivas. Os items B1-B3 sao melhorias de hardening que nao representam risco real enquanto o RLS estiver ativo.

---

**Veredicto Final: NEEDS_WORK**
- 0 bloqueantes
- 2 media (M1, M2 — vazamento de dados via RLS aberto)
- 5 baixa (defense-in-depth)
- 3 notas (decisoes de produto)
