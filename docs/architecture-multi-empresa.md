# Arquitetura: Suporte Multi-Empresa (Multi-Tenant por Usuario)

**Autor:** @architect (Aria)
**Data:** 2026-03-29
**Versao:** 2.0 -- Alinhado com PO review
**Status:** Validado pelo PO

---

## Changelog v2.0

| Gap | Descricao | Decisao PO | Secao Atualizada |
|-----|-----------|-----------|------------------|
| **GAP-1** | `ON DELETE CASCADE` vs `RESTRICT` em `usuario_empresa.empresa_id` | RESTRICT (nao deletar empresa com vinculos) | Secao 4, Migration |
| **GAP-2** | `fn_get_user_role()` -- JOIN vs sync | COMBINAR: JOIN no SQL + sync como fallback | Secao 4, funcoes 5 e 6.3 |
| **GAP-3** | `requireRole()` le `usuario.role` direto | Sync em `fn_switch_empresa()` garante compatibilidade | Secao 6.3 (nova subsecao) |
| **ADD-1** | `updated_at` ausente em `usuario_empresa` | Adicionado com trigger | Secao 4, Migration |
| **ADD-2** | Policy INSERT sem restricao de role por caller | Documentado: dono convida qualquer role, admin apenas motorista | Secao 4, Policies |

---

## 1. Resumo Executivo

O requisito e permitir que um usuario (tipicamente dono) gerencie multiplas empresas (CNPJs) a partir de uma unica conta Supabase Auth. Hoje o modelo e 1:1 (usuario -> empresa). A proposta e adicionar uma tabela N:N (`usuario_empresa`) mantendo `usuario.empresa_id` como ponteiro da "empresa ativa", garantindo retrocompatibilidade total.

---

## 2. Analise do Estado Atual

### 2.1 Modelo de Dados Atual

```
auth.users (Supabase Auth)
    |
    | auth_id (1:1)
    v
usuario
    |
    | empresa_id (N:1, NOT NULL)
    v
empresa
```

**Ponto critico:** `usuario.empresa_id` e a coluna-chave que permeia TODO o sistema:
- **42 ocorrencias** em 13 server actions no app layer
- **46 ocorrencias** de `fn_get_empresa_id()` em 12 migrations SQL
- **10 tabelas** com coluna `empresa_id` e RLS baseado em `fn_get_empresa_id()`

### 2.2 Funcao RLS Central: `fn_get_empresa_id()`

```sql
-- Definicao atual (migration 180100)
CREATE OR REPLACE FUNCTION fn_get_empresa_id()
RETURNS UUID AS $$
  SELECT empresa_id FROM usuario WHERE auth_id = auth.uid() LIMIT 1;
$$;
```

Esta funcao e usada em TODAS as RLS policies de TODAS as tabelas. Ela retorna `usuario.empresa_id` do usuario autenticado.

### 2.3 Tabelas com RLS baseado em `fn_get_empresa_id()`

| Tabela | Policies usando fn_get_empresa_id() |
|--------|-------------------------------------|
| empresa | SELECT, UPDATE |
| usuario | SELECT, INSERT, UPDATE |
| motorista | SELECT, INSERT, UPDATE |
| caminhao | SELECT, UPDATE |
| motorista_caminhao | SELECT, UPDATE |
| categoria_gasto | SELECT (custom), INSERT |
| gasto | SELECT, INSERT |
| foto_comprovante | SELECT, INSERT, DELETE + storage policies |
| viagem | SELECT, INSERT, UPDATE, DELETE |
| combustivel_preco | SELECT/INSERT/UPDATE/DELETE (all) |
| viagem_veiculo | SELECT/INSERT/UPDATE/DELETE, DELETE trigger |
| fechamento | SELECT, INSERT, UPDATE, DELETE |

---

## 3. Avaliacao da Estrategia Proposta

### 3.1 Estrategia: `usuario.empresa_id` como "empresa ativa" + tabela N:N

**Veredicto: FUNCIONA sem alterar queries/RLS existentes.**

A razao e estrutural: toda a camada RLS depende exclusivamente de `fn_get_empresa_id()`, que le `usuario.empresa_id`. Se atualizarmos esse campo para apontar para outra empresa, TODAS as policies automaticamente filtram pela nova empresa. Nenhuma policy, nenhuma query, nenhum server action precisa mudar.

### 3.2 Fluxo de Troca de Empresa

```
1. Usuario clica "Trocar empresa" na UI
2. Frontend chama server action: switchEmpresa(novaEmpresaId)
3. Server action:
   a. Valida que existe vinculo em usuario_empresa
   b. UPDATE usuario SET empresa_id = novaEmpresaId WHERE id = uid
   c. Invalida cache (revalidatePath)
4. Proxima request: fn_get_empresa_id() retorna novo empresa_id
5. TODAS as queries/RLS filtram pela nova empresa automaticamente
```

### 3.3 Por que funciona sem mudar nada existente

| Camada | Impacto | Razao |
|--------|---------|-------|
| **RLS (46 ocorrencias)** | ZERO mudancas | `fn_get_empresa_id()` continua lendo `usuario.empresa_id` |
| **Server Actions (42 refs)** | ZERO mudancas | Todas usam `currentUsuario.empresa_id` que reflete o valor atualizado |
| **Types** | ZERO mudancas | `Usuario.empresa_id: string` continua valido |
| **Middleware** | ZERO mudancas | Apenas verifica sessao, nao toca empresa |
| **get-user-role.ts** | ZERO mudancas | `requireRole()` le `usuario.role` que e sincronizado via `fn_switch_empresa()` (ver GAP-3) |
| **Storage paths** | ZERO mudancas | Path `{empresa_id}/...` usa o valor corrente |

### 3.4 Riscos e Mitigacoes

| Risco | Severidade | Mitigacao |
|-------|-----------|-----------|
| Race condition: troca de empresa durante operacao | Media | Troca e um UPDATE atomico; requests em voo usam o valor lido no inicio |
| Cache stale apos troca | Media | `revalidatePath('/')` apos switch + React `cache()` e per-request |
| Usuario tenta trocar para empresa sem vinculo | Alta | CHECK em `switchEmpresa` + RLS na tabela `usuario_empresa` |
| `LIMIT 1` em `fn_get_empresa_id()` com multiplos registros usuario | Baixa | Nao se aplica: cada auth_id tem 1 registro em `usuario` (UNIQUE constraint) |
| Storage: fotos de empresa A acessiveis apos trocar para B | Baixa | Storage policies ja usam `fn_get_empresa_id()` - filtram automaticamente |

---

## 4. Migration Proposta

```sql
-- =============================================================================
-- Migration: Suporte Multi-Empresa (usuario_empresa N:N)
-- Versao: 2.0 (alinhado com PO review)
-- Prerequisito: 20260328180100 (usuario table)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. TABLE: usuario_empresa (vinculo N:N com role por empresa)
-- ---------------------------------------------------------------------------
-- [GAP-1] ON DELETE RESTRICT para empresa_id: impede deletar empresa que
-- tenha vinculos. Mais seguro que CASCADE — decisao do PO.
-- ON DELETE CASCADE em usuario_id: se usuario for removido, seus vinculos vao junto.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuario_empresa (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id  UUID NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  empresa_id  UUID NOT NULL REFERENCES empresa(id) ON DELETE RESTRICT,
  role        usuario_role NOT NULL DEFAULT 'admin',
  ativo       BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_usuario_empresa UNIQUE (usuario_id, empresa_id)
);

COMMENT ON TABLE usuario_empresa IS 'Vinculo N:N entre usuario e empresa. Permite que um usuario gerencie multiplas empresas com roles independentes.';
COMMENT ON COLUMN usuario_empresa.role IS 'Role do usuario NESTA empresa especifica. Pode diferir entre empresas.';
COMMENT ON COLUMN usuario_empresa.empresa_id IS 'FK para empresa com ON DELETE RESTRICT — empresa com vinculos nao pode ser deletada (GAP-1).';

-- ---------------------------------------------------------------------------
-- 1b. TRIGGER: auto-update updated_at (ADD-1)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_usuario_empresa_updated_at
  BEFORE UPDATE ON usuario_empresa
  FOR EACH ROW
  EXECUTE FUNCTION fn_update_updated_at();

-- ---------------------------------------------------------------------------
-- 2. INDEXES
-- ---------------------------------------------------------------------------
CREATE INDEX idx_ue_usuario ON usuario_empresa (usuario_id) WHERE ativo = true;
CREATE INDEX idx_ue_empresa ON usuario_empresa (empresa_id) WHERE ativo = true;

-- ---------------------------------------------------------------------------
-- 3. SEED: Migrar vinculos existentes (1:1 -> N:N)
-- Para cada usuario existente, cria um registro em usuario_empresa
-- com a empresa_id e role atuais.
-- ---------------------------------------------------------------------------
INSERT INTO usuario_empresa (usuario_id, empresa_id, role, ativo)
SELECT id, empresa_id, role, true
FROM usuario
WHERE empresa_id IS NOT NULL
ON CONFLICT (usuario_id, empresa_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4. RLS: Policies para usuario_empresa
-- ---------------------------------------------------------------------------
ALTER TABLE usuario_empresa ENABLE ROW LEVEL SECURITY;

-- SELECT: usuario ve seus proprios vinculos
CREATE POLICY "ue_select_own"
  ON usuario_empresa FOR SELECT
  USING (usuario_id = (SELECT id FROM usuario WHERE auth_id = auth.uid()));

-- SELECT: dono/admin da empresa ve todos os vinculos da empresa
CREATE POLICY "ue_select_empresa"
  ON usuario_empresa FOR SELECT
  USING (empresa_id = fn_get_empresa_id() AND fn_get_user_role() IN ('dono', 'admin'));

-- ---------------------------------------------------------------------------
-- INSERT: regras de convite por role (ADD-2)
-- Dono pode convidar QUALQUER role (dono, admin, motorista)
-- Admin pode convidar APENAS motorista
-- Motorista NAO pode convidar ninguem
-- ---------------------------------------------------------------------------
CREATE POLICY "ue_insert_dono"
  ON usuario_empresa FOR INSERT
  WITH CHECK (
    empresa_id = fn_get_empresa_id()
    AND fn_get_user_role() = 'dono'
  );

CREATE POLICY "ue_insert_admin"
  ON usuario_empresa FOR INSERT
  WITH CHECK (
    empresa_id = fn_get_empresa_id()
    AND fn_get_user_role() = 'admin'
    AND role = 'motorista'
  );

-- UPDATE: dono pode alterar role/ativo de vinculos da sua empresa
CREATE POLICY "ue_update_dono"
  ON usuario_empresa FOR UPDATE
  USING (
    empresa_id = fn_get_empresa_id()
    AND fn_get_user_role() = 'dono'
  );

-- DELETE: dono pode remover vinculos (exceto o proprio)
CREATE POLICY "ue_delete_dono"
  ON usuario_empresa FOR DELETE
  USING (
    empresa_id = fn_get_empresa_id()
    AND fn_get_user_role() = 'dono'
    AND usuario_id != (SELECT id FROM usuario WHERE auth_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 5. FUNCTION: fn_get_user_role (GAP-2 RESOLVIDO)
--
-- Estrategia COMBINADA (decisao PO):
--   SOURCE OF TRUTH: JOIN com usuario_empresa (role correto para empresa ativa)
--   FALLBACK: fn_switch_empresa() sincroniza usuario.role para app-layer
--
-- Esta funcao e usada por RLS policies em 12 migrations.
-- O JOIN garante que o role retornado e SEMPRE o da empresa ativa,
-- mesmo se a sync em usuario.role estiver desatualizada.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_get_user_role()
RETURNS TEXT AS $$
  SELECT ue.role::TEXT
  FROM usuario u
  JOIN usuario_empresa ue ON ue.usuario_id = u.id AND ue.empresa_id = u.empresa_id
  WHERE u.auth_id = auth.uid()
    AND ue.ativo = true
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION fn_get_user_role IS 'Retorna role do usuario na empresa ativa via JOIN com usuario_empresa (source of truth). GAP-2 v2.0.';

-- ---------------------------------------------------------------------------
-- 6. FUNCTION: fn_switch_empresa (troca empresa ativa com validacao + sync role)
--
-- GAP-2 parte 2: apos trocar empresa_id, SINCRONIZA usuario.role
-- com o role em usuario_empresa. Isso garante que:
--   - RLS (via fn_get_user_role JOIN) funciona SEMPRE
--   - App-layer (via requireRole lendo usuario.role) funciona TAMBEM
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_switch_empresa(p_empresa_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usuario_id UUID;
  v_vinculo_exists BOOLEAN;
BEGIN
  -- Buscar usuario autenticado
  SELECT id INTO v_usuario_id
  FROM usuario
  WHERE auth_id = auth.uid();

  IF v_usuario_id IS NULL THEN
    RAISE EXCEPTION 'Usuario nao encontrado';
  END IF;

  -- Verificar vinculo ativo em usuario_empresa
  SELECT EXISTS(
    SELECT 1 FROM usuario_empresa
    WHERE usuario_id = v_usuario_id
      AND empresa_id = p_empresa_id
      AND ativo = true
  ) INTO v_vinculo_exists;

  IF NOT v_vinculo_exists THEN
    RAISE EXCEPTION 'Usuario nao possui vinculo ativo com esta empresa';
  END IF;

  -- Atualizar empresa ativa E sincronizar role (GAP-2 + GAP-3)
  UPDATE usuario
  SET empresa_id = p_empresa_id,
      role = (
        SELECT ue.role FROM usuario_empresa ue
        WHERE ue.usuario_id = v_usuario_id
          AND ue.empresa_id = p_empresa_id
          AND ue.ativo = true
      )
  WHERE id = v_usuario_id;

  RETURN true;
END;
$$;

COMMENT ON FUNCTION fn_switch_empresa IS 'Troca a empresa ativa do usuario autenticado. Valida vinculo e sincroniza usuario.role com usuario_empresa.role (GAP-2/GAP-3 v2.0).';

-- ---------------------------------------------------------------------------
-- 7. FUNCTION: fn_get_user_empresas (lista empresas do usuario)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_get_user_empresas()
RETURNS TABLE (
  empresa_id UUID,
  razao_social TEXT,
  nome_fantasia TEXT,
  cnpj VARCHAR(18),
  role usuario_role,
  is_active BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ue.empresa_id,
    e.razao_social,
    e.nome_fantasia,
    e.cnpj,
    ue.role,
    (ue.empresa_id = u.empresa_id) AS is_active
  FROM usuario_empresa ue
  JOIN empresa e ON e.id = ue.empresa_id
  JOIN usuario u ON u.id = ue.usuario_id
  WHERE u.auth_id = auth.uid()
    AND ue.ativo = true
    AND e.ativa = true
  ORDER BY e.razao_social;
$$;

COMMENT ON FUNCTION fn_get_user_empresas IS 'Lista todas as empresas vinculadas ao usuario autenticado com indicacao de qual e a ativa.';
```

---

## 5. Componentes que Precisam Mudar

### 5.1 Novos Componentes (a criar)

| Componente | Tipo | Descricao |
|------------|------|-----------|
| `app/(dashboard)/empresa/switch/actions.ts` | Server Action | `switchEmpresa()` chamando `fn_switch_empresa()` + `revalidatePath('/')` |
| `app/(dashboard)/empresa/switch/page.tsx` | Page | Tela de selecao de empresa (entrada pos-login) |
| `components/empresa-switcher.tsx` | Component | Dropdown/modal no header do dashboard para trocar empresa |
| `types/usuario-empresa.ts` | Type | Interface `UsuarioEmpresa` |
| `lib/queries/empresas.ts` | Query | `getUserEmpresas()` chamando `fn_get_user_empresas()` |

### 5.2 Componentes Existentes a Modificar

| Componente | Mudanca | Esforco |
|------------|---------|---------|
| `app/(dashboard)/layout.tsx` | Adicionar `<EmpresaSwitcher />` no header | P |
| `app/(dashboard)/empresa/actions.ts` > `createEmpresa()` | Apos criar empresa+usuario, tambem inserir em `usuario_empresa` | P |
| `app/(auth)/aceitar-convite/actions.ts` | Apos aceitar convite, inserir em `usuario_empresa` | P |
| `lib/supabase/middleware.ts` | Redirecionar para `/empresa/switch` se usuario tem >1 empresa e nenhuma selecionada | M |
| `types/usuario.ts` | Sem mudanca (empresa_id continua string) | - |
| `types/database.ts` | Adicionar tipo `UsuarioEmpresa` | P |

### 5.3 Componentes que NAO Precisam Mudar (GAP-3 Resolvido)

| Categoria | Quantidade | Razao |
|-----------|-----------|-------|
| Server Actions com `.eq('empresa_id', ...)` | 13 arquivos, 42 refs | Leem `currentUsuario.empresa_id` que ja reflete a empresa ativa |
| RLS Policies com `fn_get_empresa_id()` | 12 migrations, 46 refs | Funcao continua retornando `usuario.empresa_id` |
| **`lib/auth/get-user-role.ts` (20 call sites)** | **1 arquivo, 20 chamadas** | **`requireRole()` le `usuario.role` que e sincronizado por `fn_switch_empresa()`. Nenhuma mudanca necessaria no app-layer.** |
| Storage policies (foto_comprovante) | 3 policies | Usam `fn_get_empresa_id()::text` |
| Todas as pages/components do dashboard | ~20+ arquivos | Consomem dados ja filtrados |

---

## 6. Consideracoes de Seguranca

### 6.1 Isolamento de Dados (CRITICO)

A troca de empresa e atomica (single UPDATE). Entre o UPDATE e a proxima query, nao ha window de vazamento porque:
- RLS e avaliado no momento da query, nao no momento do login
- `fn_get_empresa_id()` le o valor ATUAL de `usuario.empresa_id`
- Nao ha cache de RLS no Supabase

### 6.2 Validacao de Vinculo

`fn_switch_empresa()` e `SECURITY DEFINER` e valida o vinculo ANTES de atualizar. Mesmo que alguem tente chamar diretamente, a funcao rejeita se nao houver vinculo ativo.

### 6.3 Role por Empresa -- Estrategia Dual (GAP-2 + GAP-3 Resolvidos)

A arquitetura multi-empresa usa uma estrategia de **duas camadas** para o role do usuario:

#### Camada 1: Source of Truth (RLS -- banco de dados)

`fn_get_user_role()` faz JOIN com `usuario_empresa` para obter o role da empresa ativa:

```sql
SELECT ue.role::TEXT
FROM usuario u
JOIN usuario_empresa ue ON ue.usuario_id = u.id AND ue.empresa_id = u.empresa_id
WHERE u.auth_id = auth.uid() AND ue.ativo = true
LIMIT 1;
```

Todas as RLS policies que chamam `fn_get_user_role()` usam esta funcao. O JOIN garante que o role retornado e SEMPRE o correto para a empresa ativa, independente do estado de `usuario.role`.

#### Camada 2: Sync para App-Layer (GAP-3)

O arquivo `lib/auth/get-user-role.ts` contem 3 funcoes:

| Funcao | O que faz | Como obtem role |
|--------|-----------|-----------------|
| `getUserRole()` | Retorna role do usuario | `.select('role').eq('auth_id', user.id).single()` |
| `getCurrentUsuario()` | Retorna registro completo | `.select('...').eq('auth_id', user.id).single()` |
| `requireRole(allowedRoles)` | Valida se usuario tem role permitido | Chama `getCurrentUsuario()` e verifica `usuario.role` |

Estas 3 funcoes leem `usuario.role` diretamente da tabela `usuario`. Para que retornem o role correto da empresa ativa, `fn_switch_empresa()` sincroniza `usuario.role` com `usuario_empresa.role` no momento da troca:

```sql
UPDATE usuario
SET empresa_id = p_empresa_id,
    role = (SELECT ue.role FROM usuario_empresa ue
            WHERE ue.usuario_id = v_usuario_id AND ue.empresa_id = p_empresa_id AND ue.ativo = true)
WHERE id = v_usuario_id;
```

**Resultado:** As 20 chamadas de `requireRole()` nos 4 arquivos de server actions (`motoristas/actions.ts`, `vinculos/actions.ts`, `caminhoes/actions.ts`, `usuarios/actions.ts`) continuam funcionando sem nenhuma alteracao de codigo.

#### Por que duas camadas?

| Cenario | Qual camada resolve? |
|---------|---------------------|
| RLS policy avalia permissao (ex: INSERT em motorista) | Camada 1 (JOIN -- sempre correto) |
| Server action chama `requireRole(['dono', 'admin'])` | Camada 2 (sync -- correto apos switch) |
| Seed inicial (migracao 1:1 -> N:N) | Ambas (seed popula `usuario_empresa` e `usuario.role` ja existe) |
| Bug: sync falha mas JOIN funciona | RLS continua seguro (camada 1 e independente) |

**Trade-off:** A duplicacao de role (em `usuario_empresa` e em `usuario`) adiciona complexidade, mas evita refatorar 20 call sites de `requireRole()` e todos os server actions que leem `usuario.role`. A camada 1 (JOIN) e o safety net que garante seguranca mesmo se a sync falhar.

### 6.4 Protecao contra Delecao de Empresa (GAP-1)

Com `ON DELETE RESTRICT` na FK `usuario_empresa.empresa_id`, uma empresa NAO pode ser deletada enquanto tiver vinculos ativos ou inativos. O fluxo seguro para remover uma empresa e:

```
1. Desativar todos os vinculos (UPDATE usuario_empresa SET ativo = false)
2. Deletar os registros de usuario_empresa
3. Somente entao: DELETE FROM empresa WHERE id = ...
```

Isso previne delecao acidental de empresas com usuarios vinculados, protegendo historico e integridade referencial.

### 6.5 Restricoes de Convite por Role (ADD-2)

As policies de INSERT em `usuario_empresa` implementam a seguinte matriz de permissoes:

| Caller Role | Pode convidar como... |
|-------------|----------------------|
| **dono** | dono, admin, motorista (qualquer role) |
| **admin** | motorista (apenas) |
| **motorista** | ninguem (sem policy de INSERT) |

Isso e enforced via duas policies separadas (`ue_insert_dono` e `ue_insert_admin`), com a policy de admin contendo `AND role = 'motorista'` no WITH CHECK.

---

## 7. Fluxo de Onboarding Ajustado

### 7.1 Novo Usuario Cria Primeira Empresa (sem mudanca)
```
signup -> createEmpresa() -> insere empresa + usuario (role=dono) + usuario_empresa
```

### 7.2 Usuario Existente Cria Segunda Empresa
```
dashboard -> "Nova Empresa" -> createEmpresa()
  -> insere nova empresa
  -> insere usuario_empresa (role=dono)
  -> switch para nova empresa (fn_switch_empresa sincroniza role)
```

### 7.3 Usuario Convidado para Empresa Existente
```
aceitar-convite -> cria usuario se nao existe
  -> insere usuario_empresa (role do convite)
  -> set empresa_id = empresa do convite
  -> set role = role do convite (sync)
```

---

## 8. Estimativa de Stories

| # | Story | Pontos | Dependencias |
|---|-------|--------|-------------|
| S1 | Migration: tabela `usuario_empresa` + funcoes SQL + seed dados existentes | 3 | Nenhuma |
| S2 | Server Action `switchEmpresa` + query `getUserEmpresas` | 2 | S1 |
| S3 | Componente `EmpresaSwitcher` no layout do dashboard | 3 | S2 |
| S4 | Tela de selecao de empresa pos-login (quando >1 empresa) | 3 | S2 |
| S5 | Ajuste em `createEmpresa` e `aceitar-convite` para inserir em `usuario_empresa` | 2 | S1 |
| S6 | Sincronizacao de `usuario.role` na troca + testes E2E de isolamento | 3 | S1, S2 |
| **Total** | | **16 pts** | |

### Ordem de Execucao Recomendada

```
S1 (migration) -> S5 (ajustes onboarding) -> S2 (switch action) -> S3 (switcher UI)
                                                                  -> S4 (tela selecao)
                                           -> S6 (sync role + testes)
```

---

## 9. Trade-offs da Estrategia

### Opcao Escolhida: `empresa_id` como ponteiro mutavel + `usuario_empresa` N:N

**Vantagens:**
- ZERO mudancas em queries existentes (42 refs intocadas)
- ZERO mudancas em RLS policies (46 refs intocadas)
- ZERO mudancas em types
- ZERO mudancas em `requireRole()` e seus 20 call sites (garantido pela sync)
- Retrocompatibilidade total
- Troca de empresa e instantanea (1 UPDATE atomico que atualiza empresa_id + role)
- Seed automatico dos vinculos existentes
- Seguranca em duas camadas (JOIN no RLS + sync no app)

**Desvantagens:**
- `usuario.empresa_id` muda de "empresa do usuario" para "empresa ativa do usuario" (semantica diferente)
- `usuario.role` passa a ser duplicado (existe em `usuario` e em `usuario_empresa`) -- trade-off aceito para evitar refatoracao de 20 call sites
- Se o UPDATE falhar, usuario fica na empresa anterior (fail-safe, nao fail-open)
- Race condition teorica se usuario troca empresa em 2 abas simultaneas (ultima ganha)

### Alternativa Descartada: Session/Cookie-based

Armazenar empresa ativa em cookie/session em vez de no banco.

**Razao da rejeicao:** `fn_get_empresa_id()` e executada DENTRO do Postgres via RLS. Ela nao tem acesso a cookies. Para funcionar, precisariamos passar `empresa_id` como parametro em TODA query, mudando 42 server actions + reescrevendo todas as RLS policies. Impacto inviavel.

### Alternativa Descartada: Multiplos registros `usuario` por `auth_id`

Criar um registro `usuario` por empresa.

**Razao da rejeicao:** `usuario.auth_id` tem constraint UNIQUE. Remover essa constraint quebraria `fn_get_empresa_id()` (que usa `LIMIT 1`) e todas as queries que assumem 1 usuario por auth_id. Impacto massivo.

---

## 10. Checklist de Validacao Pre-Implementacao

- [ ] Migration aplicada em ambiente de desenvolvimento
- [ ] Seed verifica que todos os vinculos existentes foram migrados
- [ ] `fn_switch_empresa` rejeita empresa sem vinculo
- [ ] Apos switch, queries de todas as 12 tabelas retornam dados da nova empresa
- [ ] Storage policies filtram fotos pela nova empresa ativa
- [ ] `usuario.role` sincronizado com `usuario_empresa.role` apos switch (GAP-2/GAP-3)
- [ ] `requireRole()` retorna role correto da empresa ativa sem alteracao de codigo (GAP-3)
- [ ] Race condition: 2 switches simultaneos nao corrompem dados
- [ ] Convite para empresa existente cria vinculo em `usuario_empresa`
- [ ] `createEmpresa` cria vinculo em `usuario_empresa`
- [ ] UI de selecao aparece somente quando usuario tem >1 empresa
- [ ] ON DELETE RESTRICT impede deletar empresa com vinculos (GAP-1)
- [ ] `updated_at` atualiza automaticamente via trigger (ADD-1)
- [ ] Admin so consegue convidar motorista, nao admin/dono (ADD-2)
- [ ] Dono consegue convidar qualquer role (ADD-2)

---

## Apendice A: Rastreabilidade dos Gaps Resolvidos

### GAP-1: ON DELETE CASCADE -> RESTRICT

- **Origem:** Doc v1.0 usava `CASCADE`, PRD usava `RESTRICT`
- **Decisao PO:** RESTRICT (mais seguro)
- **Implementacao:** Migration secao 1, linha `REFERENCES empresa(id) ON DELETE RESTRICT`
- **Impacto:** Empresa com vinculos nao pode ser deletada. Requer fluxo explicito de remocao.

### GAP-2: fn_get_user_role() -- JOIN vs sync

- **Origem:** Doc v1.0 sincronizava via `fn_switch_empresa()` apenas. PRD fazia JOIN.
- **Decisao PO:** COMBINAR ambos
- **Implementacao:**
  - `fn_get_user_role()`: reescrita com JOIN (Migration secao 5)
  - `fn_switch_empresa()`: UPDATE atomico de `empresa_id` + `role` (Migration secao 6)
- **Impacto:** RLS usa JOIN (source of truth). App usa sync (compatibilidade).

### GAP-3: requireRole() le usuario.role direto

- **Origem:** `lib/auth/get-user-role.ts` faz `.select('role').eq('auth_id', user.id).single()`
- **Decisao PO:** Sync em `fn_switch_empresa()` garante compatibilidade
- **Implementacao:** `fn_switch_empresa()` sincroniza `usuario.role` (mesmo UPDATE atomico do GAP-2)
- **Impacto:** 20 chamadas de `requireRole()` em 4 arquivos de server actions continuam funcionando sem mudanca. Zero refatoracao no app-layer.
- **Arquivos verificados:**
  - `app/(dashboard)/motoristas/actions.ts` (6 chamadas)
  - `app/(dashboard)/vinculos/actions.ts` (5 chamadas)
  - `app/(dashboard)/caminhoes/actions.ts` (5 chamadas)
  - `app/(dashboard)/usuarios/actions.ts` (4 chamadas)

### ADD-1: updated_at em usuario_empresa

- **Origem:** Tabela faltava coluna `updated_at` + trigger
- **Implementacao:** Coluna + trigger `trg_usuario_empresa_updated_at` (Migration secao 1b)

### ADD-2: Policy INSERT com restricao de role

- **Origem:** Policy original permitia apenas dono inserir, sem granularidade
- **Implementacao:** Duas policies separadas: `ue_insert_dono` (qualquer role) + `ue_insert_admin` (apenas motorista)
- **Impacto:** Admin pode convidar motoristas. Dono pode convidar qualquer role. Motorista nao convida.
