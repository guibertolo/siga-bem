# PRD: Onboarding Unificado de Motorista

**Versao:** 1.0
**Data:** 2026-03-29
**Autor:** Bob (PM Agent)
**Status:** Draft
**Stakeholder:** Patrao (dono da empresa de cegonheiros)

---

## 1. Problema

O fluxo atual de cadastro e ativacao de um motorista no FrotaViva exige **3 etapas desconectadas**, cada uma em tela diferente, sem vinculacao automatica:

| Etapa | Tela | Ator | Resultado |
|-------|------|------|-----------|
| 1. Cadastrar motorista | `/motoristas/cadastro` | Patrao | Registro na tabela `motorista` (sem `usuario_id`) |
| 2. Convidar usuario | `/usuarios` > modal "Convidar" | Patrao | Email enviado via `inviteUserByEmail` |
| 3. Vincular motorista ao usuario | Nao existe na UI | Ninguem (manual no banco) | `motorista.usuario_id` e `usuario.motorista_id` ficam NULL |

**Consequencias do fluxo atual:**

- O motorista recebe um convite generico, sem vinculo com seu registro de motorista.
- O campo `motorista.usuario_id` NUNCA e preenchido via UI -- so manualmente no banco.
- O campo `usuario.motorista_id` tambem NUNCA e preenchido automaticamente.
- O patrao precisa navegar entre 2 telas e lembrar de fazer as 2 acoes.
- Nao existe feedback visual de que o motorista "esta pronto para usar o app".

---

## 2. Objetivo

Permitir que o patrao, em **uma unica tela** (`/motoristas/cadastro`), cadastre os dados do motorista e opcionalmente ja crie sua conta de acesso ao sistema, com vinculacao automatica entre `motorista` e `usuario`.

### Metricas de sucesso

| Metrica | Antes | Depois |
|---------|-------|--------|
| Etapas para motorista ficar operacional | 3+ (2 telas + SQL manual) | 1 (1 tela) |
| Vinculacao motorista-usuario automatica | 0% | 100% |
| Motoristas com `usuario_id = NULL` | Todos | Apenas os sem conta |

---

## 3. Analise do Sistema Atual (Evidencias do Codigo)

### 3.1 Modelo de dados

**Tabela `motorista`:**
- `usuario_id UUID REFERENCES usuario(id)` -- FK opcional, existe mas nunca e preenchida via UI
- Campos obrigatorios: nome, cpf, cnh_numero, cnh_categoria, cnh_validade
- Campos opcionais: telefone, observacao

**Tabela `usuario`:**
- `auth_id UUID NOT NULL` -- referencia `auth.users(id)` do Supabase Auth
- `motorista_id UUID REFERENCES motorista(id)` -- FK bidirecional, tambem nunca preenchida
- `role usuario_role` -- enum: dono, motorista, admin
- `email TEXT NOT NULL`

**Vinculo bidirecional ja existe no schema:**
- `motorista.usuario_id -> usuario.id`
- `usuario.motorista_id -> motorista.id`

Conclusao: o banco JA suporta o vinculo. O problema e 100% de UI e server action.

### 3.2 Server action `createMotorista`

Arquivo: `app/(dashboard)/motoristas/actions.ts`

A action atual:
1. Valida role (dono/admin)
2. Valida schema (zod)
3. Checa CPF duplicado
4. Insere na tabela `motorista` com `usuario_id = NULL` (nunca preenche)
5. Retorna o motorista criado

**Nao faz nenhuma operacao de auth/usuario.**

### 3.3 Server action `inviteUsuario`

Arquivo: `app/(dashboard)/usuarios/actions.ts`

A action atual:
1. Valida role (dono/admin)
2. Chama `adminClient.auth.admin.inviteUserByEmail()` com metadata: `empresa_id`, `role`, `nome`
3. **NAO passa `motorista_id`** no metadata
4. O convite redireciona para `/aceitar-convite`

### 3.4 Fluxo de aceitacao do convite

Arquivo: `app/(auth)/aceitar-convite/actions.ts`

A action `completeInviteAcceptance`:
1. Pega user do Supabase Auth
2. Extrai metadata: `empresa_id`, `role`, `nome`
3. Cria registro `usuario` com esses dados
4. **NAO preenche `motorista_id`** (porque nunca recebeu esse dado)
5. **NAO atualiza `motorista.usuario_id`** (porque nao sabe qual motorista e)

---

## 4. Pesquisa de Melhores Praticas

### 4.1 Como outros SaaS fazem onboarding de usuarios secundarios

| Plataforma | Metodo | Fluxo |
|-----------|--------|-------|
| **Notion** | Email invite + magic link | Admin convida, usuario clica link, define senha |
| **Slack** | Email invite + link de workspace | Admin adiciona email, usuario clica e entra |
| **Vhub/Truckpad** (frotas) | Admin cadastra + senha temporaria | Gestor cria conta do motorista, repassa credenciais pessoalmente |
| **Cobli** (telemetria frotas) | Admin cadastra + email automatico | Gestor preenche dados + email, motorista recebe link |
| **Linear** | Email invite + magic link | Admin convida, usuario clica link |

**Padrao dominante em SaaS B2B:** Admin preenche dados + email, sistema envia link/convite automaticamente.

**Padrao dominante em frotas/logistica (publico 45-65 anos):** Gestor cria conta E repassa credenciais pessoalmente, porque o motorista muitas vezes nao tem fluencia digital para gerenciar emails de convite.

### 4.2 Magic Link vs Senha Temporaria -- Analise de Seguranca

| Criterio | Magic Link | Senha Temporaria (mostrada na tela) |
|----------|-----------|--------------------------------------|
| Senha trafega em texto? | Nao | Sim (na tela do patrao) |
| Exige acesso ao email? | Sim | Nao |
| Risco de phishing | Baixo | Nenhum (nao usa email) |
| Risco de interceptacao | Link pode vazar | Senha pode ser anotada |
| Compativel com WhatsApp? | Sim (enviar link) | Sim (enviar print/texto) |
| Publico 55+ consegue usar? | Medio (precisa entender "clique no link do email") | Alto (patrao explica: "sua senha e X") |
| Requer reset se perder? | Sim (reenviar magic link) | Sim (gerar nova senha) |
| Conformidade LGPD | Melhor (sem senha armazenada pelo patrao) | Aceitavel (senha temporaria, forcada troca no primeiro login) |

### 4.3 Email obrigatorio ou opcional?

**Recomendacao: opcional, com consequencias claras.**

- Se o patrao informa email: conta e criada automaticamente, motorista recebe acesso.
- Se o patrao NAO informa email: motorista e cadastrado apenas como registro operacional (sem login). Pode ser vinculado depois.

Justificativa: muitos motoristas de cegonheiro nao possuem email ou nao usam email regularmente. Forcar email bloquearia o cadastro. A conta pode ser criada depois quando o motorista tiver email.

---

## 5. Opcoes de Credenciais -- Analise Detalhada

### Opcao A: Magic Link via Email

```
Patrao informa email -> Sistema envia magic link -> Motorista clica -> Define senha
```

| Aspecto | Avaliacao |
|---------|-----------|
| Seguranca | Alta -- senha nunca trafega |
| UX para motorista 55+ | Baixa -- "verifique seu email" e confuso |
| UX para patrao | Media -- precisa ter email do motorista |
| Complexidade tecnica | Baixa -- Supabase ja suporta nativamente |
| Risco operacional | Alto -- motorista pode nunca clicar no link |

### Opcao B: Patrao define email + senha temporaria na tela

```
Patrao informa email + senha -> Sistema cria conta -> Mostra confirmacao
```

| Aspecto | Avaliacao |
|---------|-----------|
| Seguranca | Baixa -- patrao ve e anota a senha |
| UX para motorista 55+ | Alta -- patrao explica pessoalmente |
| UX para patrao | Alta -- controle total |
| Complexidade tecnica | Media -- precisa criar auth user via admin API |
| Risco operacional | Medio -- senha pode ser esquecida se nao anotada |

### Opcao C: Email + senha automatica mostrada UMA VEZ (RECOMENDADA)

```
Patrao informa email -> Sistema gera senha segura -> Mostra na tela UMA VEZ -> Patrao anota/envia
```

| Aspecto | Avaliacao |
|---------|-----------|
| Seguranca | Media-Alta -- senha gerada pelo sistema, nao escolhida |
| UX para motorista 55+ | Alta -- patrao repassa pessoalmente ou por WhatsApp |
| UX para patrao | Alta -- so precisa do email, sistema faz o resto |
| Complexidade tecnica | Media -- criar auth user com senha via admin API |
| Risco operacional | Medio -- se perder, precisa resetar (botao na UI) |

### Opcao D: Hibrida (RECOMENDACAO FINAL)

```
Patrao informa email -> Sistema cria conta + envia magic link
                     -> TAMBEM mostra senha temporaria na tela como fallback
```

**Melhor dos dois mundos:**
- Motorista tech-savvy: clica no magic link do email e define sua propria senha.
- Motorista 55+: patrao anota a senha temporaria da tela e repassa pessoalmente.
- Em ambos os casos, flag `force_password_change = true` no primeiro login.

| Aspecto | Avaliacao |
|---------|-----------|
| Seguranca | Media-Alta -- magic link como primario, senha como fallback |
| UX para motorista 55+ | Muito Alta -- 2 caminhos de acesso |
| UX para patrao | Alta -- email e suficiente, senha e bonus visual |
| Complexidade tecnica | Media-Alta -- precisa dos 2 fluxos |
| Risco operacional | Baixo -- 2 formas de acessar |

---

## 6. Recomendacao Final

### 6.1 Opcao recomendada: C (Senha Automatica Mostrada na Tela)

**Justificativa para o publico-alvo:**

1. **Perfil do motorista cegonheiro:** Predominantemente homens 40-65 anos, familiaridade digital variavel, frequentemente usam o celular para WhatsApp mas raramente para email.

2. **Contexto de uso real:** O patrao cadastra o motorista na presenca dele (no escritorio ou na base). Poder mostrar a senha na tela e o motorista anotar/salvar e o fluxo mais natural.

3. **Simplicidade tecnica:** Usa `supabase.auth.admin.createUser()` que aceita email + password diretamente. Nao depende de email delivery ou clique em links.

4. **Fallback seguro:** Se o motorista perder a senha, o patrao pode resetar pela UI (botao "Gerar Nova Senha" no perfil do motorista).

[AUTO-DECISION] Opcao D (hibrida) seria ideal, mas a complexidade extra nao se justifica para o MVP. O magic link pode ser adicionado como melhoria futura. -> Opcao C para MVP (reason: publico 55+, simplicidade, menor risco de "convite nao clicado")

### 6.2 Como o formulario de motorista deve mudar

**Estado atual do `MotoristaForm.tsx`:**
- Campos: nome*, cpf*, cnh_numero*, cnh_categoria*, cnh_validade*, telefone, observacao
- Nenhum campo de email
- Nenhuma logica de criacao de usuario

**Estado proposto:**

```
[Secao 1: Dados do Motorista] (existente, sem mudancas)
  - Nome*
  - CPF*
  - CNH Numero* + Categoria*
  - CNH Validade*
  - Telefone
  - Observacao

[Secao 2: Acesso ao Sistema] (NOVA, com toggle)
  - [Toggle] "Criar conta de acesso para este motorista"
    - Se ativado:
      - Email* (campo novo)
      - [Info box] "Uma senha temporaria sera gerada automaticamente.
                    Voce podera ve-la e copiar apos salvar."
    - Se desativado:
      - [Info box] "O motorista sera cadastrado sem acesso ao sistema.
                    Voce pode criar a conta depois."
```

**Apos salvar com sucesso (toggle ativado):**

```
[Modal/Card de Sucesso]
  "Motorista cadastrado com sucesso!"

  Credenciais de acesso:
  +--------------------------+
  | Email: joao@email.com    |
  | Senha: Xk9#mL2p          |
  +--------------------------+
  [Copiar Credenciais]  [Enviar por WhatsApp]

  ATENCAO: Esta senha sera exibida apenas uma vez.
  Anote-a agora ou envie ao motorista.

  [Ir para Lista de Motoristas]
```

### 6.3 Mudancas tecnicas necessarias

#### Backend (Server Actions)

**Arquivo: `app/(dashboard)/motoristas/actions.ts`**

Nova action `createMotoristaComConta`:
1. Validar dados do motorista (schema existente + email)
2. Verificar email duplicado no `auth.users`
3. Gerar senha temporaria segura (12 chars, upper+lower+number+special)
4. `adminClient.auth.admin.createUser({ email, password, email_confirm: true })`
5. Inserir `motorista` com `usuario_id` preenchido
6. Inserir `usuario` com `auth_id`, `empresa_id`, `role: 'motorista'`, `motorista_id`
7. Retornar `{ success, motorista, credenciais: { email, senha } }`

**IMPORTANTE:** Toda a operacao deve ser atomica. Se qualquer passo falhar apos a criacao do auth user, fazer cleanup (deletar auth user criado).

#### Fluxo de aceitacao do convite

**Arquivo: `app/(auth)/aceitar-convite/actions.ts`**

Mudanca na action `completeInviteAcceptance`:
- Adicionar `motorista_id` ao metadata do convite
- Se `motorista_id` presente, preencher `usuario.motorista_id` e `motorista.usuario_id`

#### Formulario

**Arquivo: `components/motoristas/MotoristaForm.tsx`**

- Adicionar toggle "Criar conta de acesso"
- Adicionar campo de email (condicional ao toggle)
- Adicionar validacao de email
- Novo tipo `MotoristaFormData` expandido com campos opcionais: `criar_conta`, `email`

#### Modal de credenciais

**Novo componente: `components/motoristas/CredenciaisModal.tsx`**
- Exibe email + senha gerada
- Botao copiar (clipboard API)
- Botao "Enviar por WhatsApp" (deep link: `https://wa.me/?text=...`)
- Aviso de exibicao unica

#### Funcionalidade extra: Reset de senha

**Na tela de detalhes do motorista:**
- Botao "Gerar Nova Senha" (visivel apenas se motorista tem `usuario_id`)
- Gera nova senha temporaria via `adminClient.auth.admin.updateUserById()`
- Mostra modal com nova senha (mesmo pattern do cadastro)

---

## 7. Fluxo Completo Proposto

```
PATRAO abre /motoristas/cadastro
  |
  v
Preenche dados do motorista (nome, CPF, CNH, etc.)
  |
  v
Toggle "Criar conta de acesso" = OFF por padrao
  |
  +-- [OFF] --> Clica "Cadastrar Motorista"
  |              |
  |              v
  |            Cria motorista SEM usuario_id
  |            Redireciona para /motoristas
  |
  +-- [ON] --> Preenche email do motorista
               |
               v
             Clica "Cadastrar Motorista"
               |
               v
             Server Action:
               1. Gera senha temporaria
               2. Cria auth user (email + senha)
               3. Cria registro motorista
               4. Cria registro usuario (role: motorista)
               5. Vincula motorista.usuario_id <-> usuario.motorista_id
               |
               v
             Exibe Modal de Credenciais
               - Email + Senha na tela
               - Botao Copiar
               - Botao WhatsApp
               - Aviso "exibida apenas uma vez"
               |
               v
             Patrao anota/envia credenciais
               |
               v
             Clica "Ir para Lista"
               |
               v
             MOTORISTA recebe credenciais
               -> Faz login com email + senha temporaria
               -> (Futuro: tela de "Alterar Senha" no primeiro login)
```

---

## 8. Historias Estimadas

Esta feature gera **4 stories** de desenvolvimento:

| # | Story | Complexidade | Dependencia |
|---|-------|-------------|-------------|
| S1 | **Server Action: `createMotoristaComConta`** -- Criar action que gera auth user + motorista + usuario em transacao atomica, com rollback se falhar. Inclui geracao de senha segura. | Media (5 pts) | Nenhuma |
| S2 | **UI: Expandir `MotoristaForm` com secao de acesso** -- Toggle criar conta, campo email condicional, validacao de email, novo schema zod. | Media (5 pts) | S1 |
| S3 | **UI: Modal de Credenciais + integracao WhatsApp** -- Componente `CredenciaisModal` com exibicao de senha, botao copiar (Clipboard API), deep link WhatsApp. | Pequena (3 pts) | S2 |
| S4 | **Reset de Senha do Motorista** -- Botao na tela de detalhes/edicao para gerar nova senha temporaria e exibir no modal. | Pequena (3 pts) | S1 |

**Total estimado:** 16 pontos (4 stories)

**Story opcional futura:**
| S5 | **Force Password Change no Primeiro Login** -- Middleware que detecta senha temporaria e redireciona para tela de troca. | Media (5 pts) | S1 |

---

## 9. Riscos e Mitigacoes

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|--------------|---------|-----------|
| Motorista perde a senha temporaria | Alta | Medio | Botao "Gerar Nova Senha" na UI (Story S4) |
| Email informado incorreto | Media | Alto | Validacao de formato + confirmacao visual antes de salvar |
| Falha parcial (auth user criado mas motorista nao) | Baixa | Alto | Transacao atomica com rollback + cleanup do auth user |
| Motorista nao tem email | Media | Baixo | Toggle OFF = cadastro sem conta (fluxo atual preservado) |
| Rate limit do Supabase Auth na criacao de users | Baixa | Medio | Tratamento de erro com mensagem clara para o patrao |
| Patrao esquece de repassar credenciais | Media | Medio | Permitir reexibir/gerar nova senha a qualquer momento |

---

## 10. Fora de Escopo (MVP)

- Magic link como alternativa de login (futuro, Opcao D)
- Onboarding do motorista no app mobile (futuro)
- Login por telefone/SMS (futuro)
- Bulk import de motoristas via CSV (futuro)
- Tela de "Alterar Senha" forcada no primeiro login (Story S5, pos-MVP)
- Notificacao por email ao patrao quando motorista faz primeiro login

---

## 11. Criterios de Aceite (Alto Nivel)

1. Patrao consegue cadastrar motorista SEM criar conta (toggle OFF) -- comportamento atual preservado.
2. Patrao consegue cadastrar motorista E criar conta em uma unica tela (toggle ON).
3. Ao criar conta, a senha temporaria e exibida na tela UMA VEZ com opcao de copiar.
4. Ao criar conta, `motorista.usuario_id` e `usuario.motorista_id` sao preenchidos automaticamente.
5. O motorista consegue fazer login com email + senha temporaria imediatamente apos o cadastro.
6. Se a criacao do auth user falhar, o motorista NAO e criado (atomicidade).
7. Se o motorista ja existe com conta, o toggle nao e exibido na tela de edicao.
8. Patrao pode gerar nova senha para motorista que ja tem conta.

---

## 12. Decisoes Arquiteturais

| Decisao | Escolha | Justificativa |
|---------|---------|---------------|
| API de criacao de usuario | `supabase.auth.admin.createUser()` | Cria user com senha definida, sem necessidade de email |
| Confirmacao de email | `email_confirm: true` | Pula verificacao de email (patrao garante validade) |
| Geracao de senha | Crypto-random 12 chars | Equilibrio seguranca/usabilidade para publico-alvo |
| Vinculacao motorista-usuario | Bidirecional (ambas FKs) | Schema ja suporta, manter consistencia |
| Atomicidade | Try/catch com cleanup manual | Supabase nao suporta transacoes cross-table via JS SDK |
| Campo email no form | Opcional (toggle-driven) | Nao bloquear cadastro de motoristas sem email |
