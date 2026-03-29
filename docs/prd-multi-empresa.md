# PRD: Suporte Multi-Empresa no FrotaViva

**Versao:** 1.0
**Data:** 2026-03-29
**Autor:** @pm (Bob/Morgan)
**Status:** Draft
**Projeto:** FrotaViva (siga-bem)

---

## 1. Contexto e Problema

### 1.1 Situacao Atual

O FrotaViva opera com vinculo 1:1 entre usuario e empresa. A tabela `usuario` possui `empresa_id UUID NOT NULL`, ou seja, cada usuario pertence a exatamente UMA empresa. As funcoes RLS `fn_get_empresa_id()` e `fn_get_user_role()` fazem `SELECT ... WHERE auth_id = auth.uid() LIMIT 1`, retornando sempre um unico registro.

### 1.2 Necessidade do Stakeholder

> "O mesmo patrao pode ter varios CNPJ e trabalhar em varias transportadoras diferentes. Ele teria que selecionar na entrada qual CNPJ ou razao social que ele ira acompanhar naquele momento."

### 1.3 Realidade do Setor

No mercado de transporte de cegonheiros, e comum que:
- Um proprietario tenha multiplos CNPJs (empresas diferentes ou filiais)
- Um motorista preste servico para mais de uma transportadora
- Um administrador gerencie frotas de empresas distintas
- O papel (role) do usuario varie por empresa (dono em uma, admin em outra)

---

## 2. Fluxos de Entrada

### 2.1 Fluxo A: Usuario com 1 empresa (sem alteracao)

```
Login → Autenticacao Supabase → Busca vinculos em usuario_empresa
→ Resultado: 1 vinculo → Redireciona direto ao Dashboard (como hoje)
```

**Comportamento:** Identico ao atual. Nenhuma tela intermediaria. O usuario nem percebe a mudanca.

### 2.2 Fluxo B: Usuario com N empresas

```
Login → Autenticacao Supabase → Busca vinculos em usuario_empresa
→ Resultado: N vinculos → Tela de Selecao de Empresa
→ Usuario seleciona CNPJ/Razao Social → Define empresa_ativa
→ Redireciona ao Dashboard com contexto da empresa selecionada
```

**Tela de Selecao:**
- Lista de cards com: Razao Social, CNPJ, Role do usuario naquela empresa
- Empresas inativas aparecem com badge "Inativa" e ficam desabilitadas
- Ultima empresa usada aparece destacada (UX de conveniencia)
- Sem paginacao (cenario real: maximo 5-10 empresas por usuario)

---

## 3. Requisitos Funcionais

### FR-1: Tela de Selecao de Empresa apos Login

**Descricao:** Quando o usuario autenticado possui vinculo com mais de uma empresa ativa, exibir tela intermediaria para selecao de qual empresa operar.

**Criterios de Aceite:**
- [ ] Listar todas empresas ativas vinculadas ao usuario
- [ ] Exibir: razao_social, cnpj, nome_fantasia (se houver), role do usuario
- [ ] Empresas inativas aparecem desabilitadas com badge visual
- [ ] Ao selecionar, definir `empresa_ativa` no registro do usuario e redirecionar ao dashboard
- [ ] Se usuario tem apenas 1 empresa ativa, pular esta tela (bypass automatico)
- [ ] Persistir ultima empresa selecionada para convenience no proximo login

### FR-2: Switch de Empresa no Header/Sidebar

**Descricao:** Permitir trocar de empresa sem fazer logout, via componente no header ou sidebar.

**Criterios de Aceite:**
- [ ] Dropdown/seletor no header mostrando empresa ativa atual (razao_social ou nome_fantasia)
- [ ] Ao abrir, listar todas empresas vinculadas ao usuario
- [ ] Ao trocar, atualizar `empresa_ativa` e recarregar contexto do dashboard
- [ ] Trocar empresa invalida cache do React e forca re-fetch de todos os dados
- [ ] Indicar visualmente qual empresa esta ativa
- [ ] Apenas usuarios com multiplas empresas veem o seletor (1 empresa = label estatico)

### FR-3: Sessao Filtrada pela Empresa Ativa

**Descricao:** Todas as queries, RLS policies, e dados exibidos devem respeitar a empresa atualmente selecionada.

**Criterios de Aceite:**
- [ ] `fn_get_empresa_id()` retorna a `empresa_ativa` do usuario (nao mais `empresa_id` fixo)
- [ ] Todas as tabelas com RLS continuam funcionando sem alteracao de policies
- [ ] Dados de viagens, gastos, motoristas, caminhoes, fechamentos — tudo filtrado pela empresa ativa
- [ ] Nenhum dado de outra empresa vaza em nenhuma tela
- [ ] Server actions validam que a empresa_ativa pertence ao usuario

### FR-4: Role Variavel por Empresa

**Descricao:** O papel do usuario pode ser diferente em cada empresa. Ex: dono na Empresa A, admin na Empresa B, motorista na Empresa C.

**Criterios de Aceite:**
- [ ] `fn_get_user_role()` retorna o role da empresa ativa, nao um role global
- [ ] Menus e permissoes se adaptam ao role da empresa ativa
- [ ] Ao trocar empresa, as permissoes mudam imediatamente (admin links aparecem/desaparecem)
- [ ] Um usuario pode ser dono em uma empresa e motorista em outra simultaneamente

### FR-5: Cadastrar Nova Empresa

**Descricao:** Permitir que um usuario crie/vincule um novo CNPJ ao seu perfil.

**Criterios de Aceite:**
- [ ] Formulario para cadastro de nova empresa (CNPJ, razao social, dados)
- [ ] Validacao de CNPJ unico (nao pode duplicar empresa existente)
- [ ] Ao criar, o vinculo `usuario_empresa` e criado automaticamente com role `dono`
- [ ] Se CNPJ ja existe no sistema, exibir mensagem orientando solicitar convite ao dono
- [ ] Acessivel via tela de selecao de empresa ("+ Adicionar Empresa")

### FR-6: Convidar Usuario para Empresa Existente

**Descricao:** O dono ou admin de uma empresa pode convidar outros usuarios para operar naquela empresa.

**Criterios de Aceite:**
- [ ] Formulario de convite: email, role desejado (admin ou motorista)
- [ ] Se usuario ja existe no sistema, criar vinculo `usuario_empresa` pendente
- [ ] Se usuario nao existe, enviar convite por email (fluxo existente de aceitar-convite)
- [ ] Dono pode convidar como admin ou motorista
- [ ] Admin pode convidar apenas como motorista
- [ ] Limite de usuarios por empresa conforme plano contratado

---

## 4. Modelagem de Dados

### 4.1 Nova Tabela: `usuario_empresa`

```sql
CREATE TABLE usuario_empresa (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id  UUID NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  empresa_id  UUID NOT NULL REFERENCES empresa(id) ON DELETE RESTRICT,
  role        usuario_role NOT NULL DEFAULT 'motorista',
  ativo       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_usuario_empresa UNIQUE (usuario_id, empresa_id)
);

CREATE INDEX idx_ue_usuario ON usuario_empresa (usuario_id);
CREATE INDEX idx_ue_empresa ON usuario_empresa (empresa_id);
CREATE INDEX idx_ue_usuario_ativo ON usuario_empresa (usuario_id) WHERE ativo = TRUE;
```

**Semantica:**
- Relacionamento N:N entre `usuario` e `empresa`
- Cada vinculo tem seu proprio `role` (dono/admin/motorista)
- `ativo = false` desabilita o acesso do usuario aquela empresa sem apagar historico

### 4.2 Alteracao na Tabela `usuario`

```sql
-- empresa_id deixa de ser "empresa unica" e passa a ser "empresa ativa"
-- Renomear conceptualmente (sem renomear coluna para manter retrocompatibilidade)
COMMENT ON COLUMN usuario.empresa_id IS 'Empresa ativa no momento (contexto atual da sessao).';

-- Remover NOT NULL para permitir estado "nenhuma empresa selecionada" (pos-login, pre-selecao)
ALTER TABLE usuario ALTER COLUMN empresa_id DROP NOT NULL;

-- Adicionar coluna para lembrar ultima empresa usada
ALTER TABLE usuario ADD COLUMN ultima_empresa_id UUID REFERENCES empresa(id);
```

**Decisao de design:** Manter `usuario.empresa_id` como "empresa ativa" em vez de criar mecanismo de sessao separado. Motivo: todas as funcoes RLS (`fn_get_empresa_id()`) ja leem `usuario.empresa_id`. Assim, a mudanca no banco e minima — apenas o significado da coluna muda de "empresa do usuario" para "empresa ativa do usuario".

### 4.3 Funcoes RLS Atualizadas

```sql
-- fn_get_empresa_id: retorna empresa ATIVA (sem alteracao de nome ou assinatura)
CREATE OR REPLACE FUNCTION fn_get_empresa_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT empresa_id FROM usuario WHERE auth_id = auth.uid() LIMIT 1;
$$;
-- NOTA: continua funcionando porque empresa_id agora SIGNIFICA empresa ativa

-- fn_get_user_role: retorna role DA EMPRESA ATIVA (mudanca real)
CREATE OR REPLACE FUNCTION fn_get_user_role()
RETURNS usuario_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT ue.role
  FROM usuario u
  JOIN usuario_empresa ue ON ue.usuario_id = u.id AND ue.empresa_id = u.empresa_id
  WHERE u.auth_id = auth.uid()
  LIMIT 1;
$$;
```

### 4.4 RLS da `usuario_empresa`

```sql
ALTER TABLE usuario_empresa ENABLE ROW LEVEL SECURITY;

-- Usuario ve seus proprios vinculos
CREATE POLICY "ue_select_own"
  ON usuario_empresa FOR SELECT
  USING (usuario_id = (SELECT id FROM usuario WHERE auth_id = auth.uid()));

-- Dono/admin da empresa podem ver vinculos da empresa
CREATE POLICY "ue_select_empresa"
  ON usuario_empresa FOR SELECT
  USING (empresa_id = fn_get_empresa_id());

-- Dono da empresa pode inserir vinculos
CREATE POLICY "ue_insert"
  ON usuario_empresa FOR INSERT
  WITH CHECK (
    empresa_id = fn_get_empresa_id()
    AND fn_get_user_role() IN ('dono', 'admin')
  );

-- Dono pode atualizar vinculos
CREATE POLICY "ue_update"
  ON usuario_empresa FOR UPDATE
  USING (
    empresa_id = fn_get_empresa_id()
    AND fn_get_user_role() = 'dono'
  );
```

### 4.5 Migracao de Dados Existentes

```sql
-- Migrar vinculos existentes de usuario para usuario_empresa
INSERT INTO usuario_empresa (usuario_id, empresa_id, role)
SELECT id, empresa_id, role FROM usuario
WHERE empresa_id IS NOT NULL
ON CONFLICT (usuario_id, empresa_id) DO NOTHING;
```

**Risco mitigado:** A migracao e aditiva. Nenhum dado existente e alterado ou removido. O vinculo 1:1 atual simplesmente se torna o primeiro registro na tabela N:N.

---

## 5. Impacto no Sistema Existente

### 5.1 Impacto ALTO — Requer alteracao

| Componente | Arquivo | Alteracao Necessaria |
|-----------|---------|---------------------|
| `fn_get_user_role()` | Migration SQL | JOIN com `usuario_empresa` para buscar role da empresa ativa |
| `getCurrentUsuario()` | `lib/auth/get-user-role.ts` | Retornar role da empresa ativa (via `usuario_empresa`) |
| `getUserRole()` | `lib/auth/get-user-role.ts` | Mesma alteracao |
| `requireRole()` | `lib/auth/get-user-role.ts` | Validar role contra empresa ativa |
| Dashboard Layout | `app/(dashboard)/layout.tsx` | Adicionar seletor de empresa no header |
| Login redirect | `app/(auth)/` | Redirecionar para tela de selecao quando N > 1 |
| Convite de usuario | `app/(dashboard)/usuarios/actions.ts` | Criar vinculo em `usuario_empresa` em vez de setar `empresa_id` |
| Aceitar convite | `app/(auth)/aceitar-convite/actions.ts` | Criar vinculo em `usuario_empresa` |
| Tipo `Usuario` | `types/usuario.ts` | Adicionar `ultima_empresa_id`, tornar `empresa_id` opcional |

### 5.2 Impacto BAIXO — Funciona sem alteracao

| Componente | Motivo |
|-----------|--------|
| Todas as RLS policies existentes | Continuam usando `fn_get_empresa_id()` que retorna `empresa_id` do usuario |
| Queries de viagens, gastos, motoristas, caminhoes | Filtram por `empresa_id = fn_get_empresa_id()` — sem mudanca |
| Server actions (24 arquivos) | Usam `getCurrentUsuario()` que retornara empresa ativa |
| Fechamentos | Filtrados por empresa via RLS |
| BI Financeiro | Filtrado por empresa via RLS |
| Configuracoes combustivel | Filtradas por empresa via RLS |

### 5.3 Impacto na Seguranca

| Risco | Mitigacao |
|-------|-----------|
| Vazamento de dados entre empresas | `fn_get_empresa_id()` continua sendo o unico ponto de filtragem. RLS nao muda. |
| Usuario seta empresa_ativa para empresa que nao tem vinculo | Server action de troca valida existencia de vinculo ativo em `usuario_empresa` |
| Escalacao de privilegio (motorista tenta ser dono) | Role vem de `usuario_empresa.role`, nao de input do usuario |
| Empresa inativa sendo acessada | Check `empresa.ativa = true` na troca de empresa |

---

## 6. Stories Estimadas

### Epic: Suporte Multi-Empresa

| # | Story | Complexidade | Estimativa | Dependencia |
|---|-------|-------------|-----------|-------------|
| ME-1 | Criar tabela `usuario_empresa` + migracao de dados | Media | 3 pts | — |
| ME-2 | Atualizar `fn_get_user_role()` para consultar `usuario_empresa` | Media | 3 pts | ME-1 |
| ME-3 | Atualizar `getCurrentUsuario()` e `getUserRole()` para retornar role da empresa ativa | Media | 3 pts | ME-2 |
| ME-4 | Tela de selecao de empresa pos-login (FR-1) | Grande | 5 pts | ME-3 |
| ME-5 | Switch de empresa no header/sidebar (FR-2) | Grande | 5 pts | ME-3 |
| ME-6 | Server action de troca de empresa ativa (FR-3) | Media | 3 pts | ME-1 |
| ME-7 | Atualizar fluxo de convite para criar vinculo N:N (FR-6) | Media | 3 pts | ME-1 |
| ME-8 | Atualizar aceitar-convite para criar vinculo N:N | Pequena | 2 pts | ME-7 |
| ME-9 | Cadastro de nova empresa pelo usuario (FR-5) | Media | 3 pts | ME-1 |
| ME-10 | Testes E2E: multi-empresa, troca, permissoes | Grande | 5 pts | ME-4, ME-5 |

**Total estimado:** 35 pontos (~3-4 sprints de 2 semanas)

### Ordem de Implementacao Sugerida

```
Sprint 1: ME-1 → ME-2 → ME-3 → ME-6 (fundacao)
Sprint 2: ME-4 → ME-5 (experiencia do usuario)
Sprint 3: ME-7 → ME-8 → ME-9 (convites e cadastro)
Sprint 4: ME-10 (testes e estabilizacao)
```

---

## 7. Priorizacao MoSCoW

### MUST HAVE (MVP Multi-Empresa)

| Req | Justificativa |
|-----|--------------|
| FR-1: Tela de selecao pos-login | Sem isso, usuario com N empresas nao consegue operar |
| FR-3: Sessao filtrada por empresa ativa | Integridade dos dados; sem isso, dados vazam entre empresas |
| FR-4: Role variavel por empresa | Sem isso, um dono que e motorista em outra empresa teria permissoes erradas |
| Tabela `usuario_empresa` | Pre-requisito tecnico para tudo |
| Migracao de dados 1:1 → N:N | Manter compatibilidade com usuarios existentes |

### SHOULD HAVE (Primeira iteracao pos-MVP)

| Req | Justificativa |
|-----|--------------|
| FR-2: Switch de empresa no header | Muito desejavel para UX, mas usuario pode fazer logout/login como workaround |
| FR-6: Convidar usuario para empresa | Ja existe fluxo de convite, precisa adaptar para N:N |

### COULD HAVE (Proximas sprints)

| Req | Justificativa |
|-----|--------------|
| FR-5: Cadastrar nova empresa | Pode ser feito manualmente pelo suporte inicialmente |
| Ultima empresa selecionada (persistencia) | Nice-to-have de UX |

### WON'T HAVE (Fora de escopo por ora)

| Req | Justificativa |
|-----|--------------|
| Dashboard consolidado multi-empresa | Complexidade muito alta, demanda propria |
| Transferencia de propriedade entre empresas | Cenario raro, tratavel manualmente |
| Hierarquia de empresas (matriz/filial) | Over-engineering para o momento |
| Roles customizados por empresa | Os 3 roles atuais (dono/admin/motorista) atendem |

---

## 8. Riscos e Mitigacoes

| # | Risco | Probabilidade | Impacto | Mitigacao |
|---|-------|--------------|---------|-----------|
| R1 | RLS break apos mudanca em `fn_get_user_role()` | Media | Critico | Testes automatizados com cenarios multi-empresa antes de deploy |
| R2 | Performance degradada com JOIN adicional na `fn_get_user_role()` | Baixa | Baixo | Index composto em `usuario_empresa(usuario_id, empresa_id)` ja previsto |
| R3 | Estado inconsistente: `empresa_id` nulo apos login | Media | Alto | Middleware redireciona para tela de selecao se `empresa_id IS NULL` |
| R4 | Cache do React serve dados da empresa anterior apos switch | Media | Alto | Invalidar cache com `revalidatePath('/')` apos troca de empresa |
| R5 | Migracao de dados falha em producao | Baixa | Critico | Migracao aditiva (INSERT, nao UPDATE/DELETE), testada em staging |
| R6 | 24 arquivos de server actions precisam de alteracao | Baixa | Medio | Nao precisam — todos usam `fn_get_empresa_id()` via RLS |

---

## 9. Decisoes de Design

### [AUTO-DECISION] Manter `empresa_id` na tabela `usuario`?

**Decisao:** SIM, manter como "empresa ativa" em vez de remover.

**Razao:** Todas as funcoes RLS (`fn_get_empresa_id()`) ja leem `usuario.empresa_id`. Se removermos a coluna, precisariamos alterar TODAS as RLS policies de TODAS as tabelas (empresa, usuario, motorista, caminhao, motorista_caminhao, categoria_gasto, gasto, viagem, viagem_veiculo, foto_comprovante, fechamento). Manter a coluna com semantica alterada (de "empresa unica" para "empresa ativa") minimiza o impacto a praticamente zero nas policies existentes.

### [AUTO-DECISION] Usar sessao/cookie vs coluna no banco para empresa ativa?

**Decisao:** Coluna no banco (`usuario.empresa_id`).

**Razao:** As funcoes RLS executam no Postgres e precisam saber a empresa ativa. Se usarmos cookie/sessao, precisariamos de um mecanismo para passar contexto ao Postgres (ex: `SET LOCAL`), que e complexo e error-prone com Supabase. Manter no banco garante que o RLS funciona nativamente.

### [AUTO-DECISION] Remover `role` da tabela `usuario`?

**Decisao:** NAO remover imediatamente. Manter como campo legado ate migracao completa.

**Razao:** Alguns server actions podem ler `usuario.role` diretamente. A migracao segura e: (1) criar `usuario_empresa`, (2) atualizar `fn_get_user_role()` para ler de `usuario_empresa`, (3) depois deprecar `usuario.role` em sprint futura.

---

## 10. Metricas de Sucesso

| Metrica | Meta | Como Medir |
|---------|------|-----------|
| Usuarios com multiplas empresas cadastrados | >= 5 em 30 dias | `SELECT count(DISTINCT usuario_id) FROM usuario_empresa GROUP BY usuario_id HAVING count(*) > 1` |
| Tempo de troca de empresa | < 2 segundos | Observacao de UX |
| Incidentes de vazamento de dados | 0 | Testes E2E + monitoramento |
| Tickets de suporte sobre acesso multi-empresa | < 3/mes | Helpdesk |

---

## Apendice A: Tabelas Impactadas pelo RLS via `fn_get_empresa_id()`

Todas estas tabelas usam `empresa_id = fn_get_empresa_id()` em suas policies e **NAO precisam de alteracao** porque a funcao continuara retornando o valor correto (empresa ativa):

1. `empresa` (SELECT, UPDATE)
2. `usuario` (SELECT, INSERT, UPDATE)
3. `motorista` (SELECT, INSERT, UPDATE)
4. `caminhao` (SELECT, INSERT)
5. `motorista_caminhao` (SELECT, INSERT)
6. `categoria_gasto` (SELECT)
7. `gasto` (SELECT, INSERT)
8. `viagem` (SELECT, INSERT)
9. `viagem_veiculo` (SELECT)
10. `foto_comprovante` (SELECT, INSERT)
11. `fechamento` (SELECT, INSERT)
