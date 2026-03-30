# Validacao Arquitetural: Onboarding de Motorista x Multi-Empresa

**Autor:** @architect (Aria)
**Data:** 2026-03-29
**Status:** Revisao Completa
**Escopo:** Interacao entre Epic 7 (Multi-Empresa) e Epic 8 (Onboarding Motorista)

---

## 1. A action de criar motorista usa empresa_id do contexto atual?

### Veredicto: SIM -- funciona corretamente.

**Evidencia no codigo (`app/(dashboard)/motoristas/actions.ts`, linhas 37-84):**

```typescript
currentUsuario = await requireRole(['dono', 'admin']);
// ...
const { data: existing } = await supabase
  .from('motorista')
  .select('id')
  .eq('empresa_id', currentUsuario.empresa_id)  // <-- empresa ativa
  .eq('cpf', formattedCPF)
  .maybeSingle();
// ...
const { data: motorista } = await supabase
  .from('motorista')
  .insert({
    empresa_id: currentUsuario.empresa_id,       // <-- empresa ativa
    // ...
  })
```

**Fluxo completo:**

1. `requireRole()` chama `getCurrentUsuario()` que le `usuario.empresa_id` da tabela `usuario`.
2. Apos Epic 7, `usuario.empresa_id` reflete a **empresa ativa** (atualizada por `fn_switch_empresa()`).
3. O `currentUsuario.empresa_id` usado no INSERT e sempre a empresa ativa.
4. Se o patrao esta na "Empresa A" quando cadastra o motorista, `currentUsuario.empresa_id` = ID da Empresa A.
5. RLS na tabela `motorista` usa `fn_get_empresa_id()` que tambem le `usuario.empresa_id`.

**Conclusao:** O motorista vai para a empresa correta. Nenhuma mudanca necessaria na `createMotorista` existente.

**Para a `createMotoristaComConta` (Story 8.1):** O mesmo pattern sera usado (AC 7 da story: `empresa_id = empresa_id do usuario autenticado`). A story 8.1 ja preve a insercao em `usuario_empresa` (AC 8), garantindo que o vinculo N:N tambem e criado.

---

## 2. O motorista pode ser vinculado a multiplas empresas?

### Veredicto: SIM, com ressalvas.

**Analise por camada:**

| Camada | Suporte Multi-Empresa | Detalhes |
|--------|----------------------|----------|
| Tabela `motorista` | 1:1 com empresa | `motorista.empresa_id` vincula a UMA empresa |
| Tabela `usuario` | N:N via `usuario_empresa` | O usuario do motorista pode ter vinculos com multiplas empresas |
| RLS `motorista` | Filtra por `fn_get_empresa_id()` | Cada empresa ve apenas seus motoristas |

**Cenario: Mesmo motorista em duas empresas do mesmo patrao**

Existem duas abordagens possiveis:

### Abordagem A: Dois registros `motorista` (uma por empresa) -- ATUAL

O patrao cadastra o motorista na Empresa A (cria registro motorista + usuario). Depois, troca para Empresa B e cadastra o mesmo motorista novamente. Resultado: dois registros `motorista` independentes, um por empresa. O `usuario` do motorista (se criado) fica vinculado apenas a primeira empresa via `motorista.usuario_id`.

**Problema:** O CPF do motorista e unico por empresa (`eq('empresa_id', ...).eq('cpf', ...)`), mas nao entre empresas. Entao o mesmo CPF pode existir em Empresa A e Empresa B. Porem, o `auth.users` do Supabase exige email unico globalmente -- nao e possivel criar dois auth users com o mesmo email.

### Abordagem B: Vinculo N:N de motorista com empresa -- NAO EXISTE

Hoje nao existe uma tabela `motorista_empresa` equivalente a `usuario_empresa`. A tabela `motorista` tem `empresa_id` como FK direta (1:N, nao N:N).

### Recomendacao

Para o MVP, a Abordagem A e aceitavel com uma restricao:

- **Se o toggle "Criar conta" esta ON:** o motorista so pode ter conta (auth user + usuario) em UMA empresa. O email e unico no Supabase Auth.
- **Se o toggle esta OFF:** pode ter registros `motorista` em multiplas empresas sem conflito.
- **Cenario futuro:** Se necessario que o mesmo motorista (com 1 conta) opere em 2 empresas, seria preciso criar uma tabela `motorista_empresa` N:N, similar ao `usuario_empresa`. Mas isso adiciona complexidade significativa e nao e necessario para o MVP.

**[AUTO-DECISION]** Motorista com conta pode existir em apenas uma empresa no MVP? -> SIM (reason: Supabase Auth exige email unico, criar tabela N:N adicional nao justifica complexidade para o cenario do cegonheiro, onde motorista tipicamente trabalha para 1 patrao por vez).

---

## 3. UX -- O patrao sabe em qual empresa esta?

### Veredicto: PARCIALMENTE SUFICIENTE -- recomendo reforco no formulario.

**O que ja existe (via Story 7.3 -- EmpresaSwitcher):**

- Nome da empresa ativa no sidebar (`nome_fantasia` ou `razao_social`)
- Dropdown para trocar se o usuario tem multiplas empresas
- Indicador visual da empresa ativa na lista

**Gap identificado:**

O sidebar mostra a empresa ativa **globalmente**, mas no formulario de cadastro de motorista nao ha reforco visual. Considere o cenario:

1. Patrao tem Empresa A e Empresa B.
2. Patrao entra no sistema na Empresa A.
3. Patrao abre o formulario de motorista.
4. Patrao preenche tudo e clica em cadastrar.
5. Mas ele esqueceu que trocou para Empresa B em outra aba 10 minutos atras.

O sidebar mostra a empresa, mas em telas de acao critica (cadastro), um reforco contextual reduz erros.

### Recomendacao: Banner contextual no formulario de cadastro

Adicionar no topo do formulario de motorista (e em qualquer formulario de criacao de entidade):

```
[InfoBox azul/neutro]
Cadastrando para: Transportadora ABC Ltda (CNPJ: 12.345.678/0001-90)
```

**Custo:** Baixo (1-2 horas de implementacao). Apenas ler `currentUsuario.empresa_id`, buscar `empresa.razao_social` e `empresa.cnpj`, exibir no topo do form.

**Beneficio:** Elimina ambiguidade em cenario multi-CNPJ. O patrao ve explicitamente para qual empresa esta cadastrando.

**Severidade:** SHOULD (recomendado, nao bloqueante). O EmpresaSwitcher do sidebar ja oferece visibilidade, mas o reforco no form e uma camada extra de seguranca UX especialmente valiosa para o publico 45-65 anos.

---

## 4. Gaps Identificados entre Epic 7 e Epic 8

### GAP-A: `completeInviteAcceptance` nao insere em `usuario_empresa` (CRITICO)

**Arquivo:** `app/(auth)/aceitar-convite/actions.ts`

**Situacao atual (linhas 52-59):**
```typescript
await adminClient.from('usuario').insert({
  auth_id: user.id,
  empresa_id: empresaId,
  nome: nome,
  email: user.email ?? '',
  role: role,
  ativo: true,
});
```

**Problema:** A action insere em `usuario` mas NAO insere em `usuario_empresa`. Apos Epic 7, o `fn_get_user_role()` faz JOIN com `usuario_empresa`. Se nao houver registro la, o JOIN retorna NULL e TODAS as RLS policies que usam `fn_get_user_role()` falham silenciosamente -- o usuario convidado nao consegue ver nem inserir nada.

**Impacto:** Qualquer usuario convidado apos a migration do Epic 7 fica com acesso quebrado.

**Resolucao:** Story 7.5 do Epic 7 ja preve este ajuste (`Ajuste em createEmpresa e aceitar-convite para inserir em usuario_empresa`). Verificar que a implementacao da Story 7.5 aconteca ANTES ou em paralelo com o Epic 8.

**Nota:** A Story 8.1 (`createMotoristaComConta`) ja inclui a insercao em `usuario_empresa` (AC 8). Entao o fluxo de onboarding de motorista via Epic 8 esta correto. O gap e especificamente no fluxo de convite legado via `/aceitar-convite`.

---

### GAP-B: `createMotoristaComConta` nao passa `motorista_id` no metadata do convite

**Contexto:** O PRD menciona que `completeInviteAcceptance` deveria receber `motorista_id` para preencher o vinculo bidirecional. Porem, a Story 8.1 NAO usa o fluxo de convite -- ela cria o auth user diretamente via `adminClient.auth.admin.createUser()` com senha, sem enviar convite por email.

**Conclusao:** Este nao e realmente um gap, porque o Epic 8 usa um fluxo diferente (criacao direta, nao convite). O vinculo bidirecional e feito na propria `createMotoristaComConta` (ACs 6-9). GAP INEXISTENTE para o Epic 8.

---

### GAP-C: `listMotoristas` nao filtra por `empresa_id` explicitamente

**Arquivo:** `app/(dashboard)/motoristas/actions.ts`, linhas 231-234:
```typescript
const { data: motoristas } = await supabase
  .from('motorista')
  .select('id, nome, cpf, ...')
  .order('nome', { ascending: true });
```

**Analise:** A query NAO inclui `.eq('empresa_id', ...)`. Ela depende 100% de RLS (`fn_get_empresa_id()`) para filtrar motoristas da empresa ativa.

**Veredicto:** Funciona corretamente. RLS filtra automaticamente. Porem, a ausencia de filtro explicito pode causar confusao para desenvolvedores futuros que lerem o codigo e nao perceberem que RLS esta ativo.

**Recomendacao:** Adicionar comentario no codigo documentando a dependencia de RLS, ou adicionar `.eq('empresa_id', currentUsuario.empresa_id)` como filtro explicito redundante (defense in depth). Severidade: LOW.

---

### GAP-D: Ordem de implementacao entre Epics 7 e 8

**Dependencia critica:** A Story 8.1 insere em `usuario_empresa` (AC 8). Isso pressupoe que a tabela `usuario_empresa` ja exista (criada na Story 7.1).

**Se Epic 8 for implementado ANTES de Epic 7:**
- `usuario_empresa` nao existe -> INSERT falha
- `fn_get_user_role()` nao faz JOIN -> role pode funcionar pelo fallback atual, mas inconsistente
- `fn_switch_empresa()` nao existe -> trocar empresa e impossivel

**Recomendacao:** Implementar no minimo as Stories 7.1 (migration) e 7.5 (ajustes onboarding) ANTES de iniciar a Story 8.1.

**Ordem segura:**
```
7.1 (migration usuario_empresa) -> 7.5 (ajustes aceitar-convite) -> 8.1 (createMotoristaComConta) -> 8.2-8.6
```

---

### GAP-E: `updateMotorista` nao verifica troca de empresa

**Arquivo:** `app/(dashboard)/motoristas/actions.ts`, linhas 138-150:
```typescript
const { data: motorista } = await supabase
  .from('motorista')
  .update({ ... })
  .eq('id', motoristaId)
  .select()
  .single();
```

**Cenario de risco:** O patrao esta na Empresa A e tenta editar um motorista que pertence a Empresa B (passando o ID diretamente na URL). O RLS impede o UPDATE porque `motorista.empresa_id != fn_get_empresa_id()`. O resultado e um erro generico.

**Veredicto:** Funciona por RLS (seguro), mas o erro retornado e generico ("Erro ao atualizar motorista"). Idealmente, deveria retornar "Motorista nao encontrado" para evitar revelar que o ID existe em outra empresa. Severidade: LOW.

---

## 5. Recomendacoes para as Stories 8.x

### 5.1 Adicoes OBRIGATORIAS (bloqueantes)

| Story | Adicao | Razao |
|-------|--------|-------|
| **8.1** | Adicionar pre-requisito explicito: "Story 7.1 DEVE estar implementada" | INSERT em `usuario_empresa` falha sem a tabela |
| **8.1** | Verificar se email ja existe em `auth.users` E se ja existe `motorista` com esse email na empresa | Previne duplicidade em cenario multi-empresa |

### 5.2 Adicoes RECOMENDADAS (nao bloqueantes)

| Story | Adicao | Razao | Esforco |
|-------|--------|-------|---------|
| **8.2** | AC novo: "No topo do formulario, exibir nome e CNPJ da empresa ativa" | Reforco visual para evitar cadastro na empresa errada | P |
| **8.2** | AC novo: "Se usuario tem >1 empresa, exibir InfoBox com empresa ativa no formulario" | Condicional -- so reforco se multi-empresa | P |
| **8.1** | AC novo: "Verificar se email ja esta vinculado a um usuario com role motorista em OUTRA empresa do mesmo patrao. Se sim, exibir aviso: 'Este email ja esta cadastrado na empresa X. Deseja criar um registro separado?'" | Previne confusao do patrao ao cadastrar mesmo motorista em 2 CNPJs | M |
| **8.4** | Garantir que a pagina `/perfil` funciona apos troca de empresa (dados do usuario mudam de role) | Se motorista na empresa A e admin na empresa B, o perfil deve refletir o role correto | P |
| **8.6** | Garantir que `force_password_change` funciona cross-empresa | Flag esta em `usuario`, nao em `usuario_empresa` -- persiste entre trocas. Comportamento correto. | - (sem acao) |

### 5.3 Cenarios de teste multi-empresa a adicionar

Os seguintes cenarios de teste devem ser adicionados ao plano de QA do Epic 8:

1. **Patrao com 2 empresas cadastra motorista na Empresa A** -> motorista.empresa_id = Empresa A
2. **Patrao troca para Empresa B e cadastra o MESMO motorista (mesmo CPF)** -> segundo registro criado com empresa_id = Empresa B, sem conflito de CPF
3. **Patrao tenta criar conta (toggle ON) com mesmo email em Empresa A e B** -> segundo cadastro falha no `createUser` (email duplicado no Supabase Auth). Erro tratado graciosamente.
4. **Patrao na Empresa A lista motoristas** -> NAO ve motoristas da Empresa B
5. **Patrao troca para Empresa B e lista motoristas** -> ve apenas motoristas da Empresa B
6. **Motorista com conta tenta acessar dados de outra empresa** -> RLS bloqueia

---

## 6. Diagrama de Fluxo: Onboarding Motorista com Multi-Empresa

```
PATRAO logado (empresa ativa = Empresa A)
  |
  +-- Sidebar mostra: "Transportadora ABC" (EmpresaSwitcher, Story 7.3)
  |
  v
Abre /motoristas/cadastro
  |
  +-- [RECOMENDADO] Topo do form: "Cadastrando para: Transportadora ABC (CNPJ: 12.345.678/0001-90)"
  |
  v
Preenche dados do motorista
  |
  +-- Toggle "Criar acesso" = OFF
  |     |
  |     v
  |   createMotorista()
  |     |
  |     +-- requireRole(['dono','admin']) -> currentUsuario.empresa_id = Empresa A
  |     +-- INSERT motorista (empresa_id = Empresa A)
  |     +-- RLS: fn_get_empresa_id() = Empresa A (match)
  |     v
  |   Motorista criado SEM conta
  |
  +-- Toggle "Criar acesso" = ON
        |
        v
      createMotoristaComConta()
        |
        +-- requireRole(['dono','admin']) -> currentUsuario.empresa_id = Empresa A
        +-- createUser(email, senha) -> auth_id
        +-- INSERT motorista (empresa_id = Empresa A)
        +-- INSERT usuario (empresa_id = Empresa A, role = motorista)
        +-- INSERT usuario_empresa (empresa_id = Empresa A, role = motorista)  <-- Epic 7
        +-- UPDATE vinculo bidirecional
        v
      Modal: credenciais exibidas UMA VEZ
```

---

## 7. Resumo de Riscos

| Risco | Severidade | Probabilidade | Mitigacao |
|-------|-----------|--------------|-----------|
| Story 8.1 implementada antes da 7.1 (tabela nao existe) | ALTA | Media | Documentar dependencia explicita |
| `aceitar-convite` nao insere em `usuario_empresa` (GAP-A) | ALTA | Alta (se 7.5 nao implementada) | Implementar 7.5 antes de 8.x |
| Patrao cadastra motorista na empresa errada | MEDIA | Media (com >1 CNPJ) | InfoBox no formulario (recomendacao 5.2) |
| Mesmo email para motorista em 2 empresas | BAIXA | Baixa | Erro tratado pelo Supabase Auth (email unico) |
| Race condition: troca de empresa durante cadastro | BAIXA | Muito Baixa | `requireRole()` le empresa no inicio da action |

---

## 8. Conclusao

O fluxo de onboarding de motorista (Epic 8) e **arquiteturalmente compativel** com multi-empresa (Epic 7), com as seguintes condicoes:

1. **OBRIGATORIO:** Implementar Story 7.1 (migration `usuario_empresa`) antes da Story 8.1.
2. **OBRIGATORIO:** Implementar Story 7.5 (ajuste em `aceitar-convite`) para inserir em `usuario_empresa`.
3. **RECOMENDADO:** Adicionar InfoBox no formulario de cadastro mostrando empresa ativa + CNPJ.
4. **RECOMENDADO:** Adicionar testes de QA cross-empresa conforme secao 5.3.

O design atual do `createMotorista` e do `createMotoristaComConta` (Story 8.1) ja usa `currentUsuario.empresa_id` corretamente. O RLS garante isolamento de dados entre empresas. A Story 8.1 ja preve a insercao em `usuario_empresa`. O principal risco e a ordem de implementacao -- os Epics tem dependencia sequencial.
