# Multi-Empresa Consolidada -- Estudo de Viabilidade Tecnica

**Data:** 2026-03-30
**Autor:** Aria (Architect Agent)
**Status:** RESEARCH -- Proposta para validacao

---

## 1. Resumo Executivo

O stakeholder deseja que donos com multiplas empresas (CNPJs) possam visualizar dados consolidados de todas as empresas simultaneamente, em vez de alternar uma por uma via EmpresaSwitcher. Este documento analisa o impacto em cada camada do sistema e recomenda a abordagem de menor risco.

**Recomendacao principal:** Abordagem "Empresa: Todas" (opcao virtual no switcher existente) com alteracao minima no schema e redeficao cirurgica de `fn_get_empresa_id()` para retornar array quando "Todas" esta selecionada.

---

## 2. Arquitetura Atual

### 2.1 Funcoes RLS (nucleo do problema)

```
fn_get_empresa_id()    -> UUID  (retorna 1 ID)
fn_get_user_role()     -> usuario_role  (role na empresa ativa)
fn_get_motorista_id()  -> UUID  (motorista vinculado ao usuario)
fn_get_user_empresas() -> TABLE (todas as empresas do usuario)
```

O `fn_get_empresa_id()` e o ponto central: ele le `usuario.empresa_id` (campo unico) e TODAS as RLS policies comparam `empresa_id = fn_get_empresa_id()`.

### 2.2 Fluxo do switch atual

```
EmpresaSwitcher (UI)
  -> switchEmpresa() server action
    -> supabase.rpc('fn_switch_empresa', { p_empresa_id })
      -> UPDATE usuario SET empresa_id = p_empresa_id
        -> fn_get_empresa_id() agora retorna o novo ID
          -> RLS filtra por novo ID automaticamente
```

### 2.3 Inventario de RLS policies que usam fn_get_empresa_id()

| Tabela | Policies | Operacoes |
|--------|----------|-----------|
| `empresa` | 2 | SELECT, UPDATE |
| `usuario` | 3 | SELECT, INSERT, UPDATE |
| `motorista` | 4 | SELECT (2), INSERT, UPDATE |
| `caminhao` | 2 | ALL, SELECT |
| `motorista_caminhao` | 2 | ALL, SELECT |
| `categoria_gasto` | 2 | SELECT, ALL |
| `gasto` | 1 | ALL (dono/admin) |
| `foto_comprovante` | 2 | ALL, INSERT |
| `viagem` | 4 | SELECT, INSERT, UPDATE, DELETE |
| `viagem_veiculo` | 2 | ALL, SELECT |
| `fechamento` | 4 | SELECT, INSERT, UPDATE, DELETE |
| `fechamento_item` | 3 | SELECT, INSERT, DELETE |
| `usuario_empresa` | 4 | SELECT (2), INSERT, UPDATE, DELETE |
| `alerta_dispensado` | 3 | SELECT, INSERT, DELETE |
| `storage.objects` | 3 | INSERT, SELECT, DELETE |
| **TOTAL** | **~41 policies** | |

Adicionalmente, 3 policies em `storage.objects` usam `fn_get_empresa_id()::text` para filtrar pasta no bucket.

---

## 3. Analise de Opcoes

### Opcao A: Multi-select real (array em usuario.selected_empresas)

**Schema:** Adicionar `usuario.selected_empresas UUID[]` + reescrever `fn_get_empresa_id()` para retornar array.

**Impacto:**
- Mudar retorno de `fn_get_empresa_id()` de UUID para UUID[] **quebra todas as 41 policies** (operador `=` nao funciona com array)
- Precisaria mudar todas as policies de `= fn_get_empresa_id()` para `= ANY(fn_get_empresa_id())` ou usar operador `@>`
- Riscos: cada policy precisa teste individual, risco de regressao alto
- Complexidade de UI: multi-select com checkboxes, estado intermediario

**Esforco:** ALTO (3-5 dias)
**Risco:** ALTO

### Opcao B: Nova funcao fn_get_selected_empresas() retornando array

**Schema:** Adicionar `usuario.selected_empresas UUID[]`. Manter `fn_get_empresa_id()` existente. Criar `fn_get_selected_empresas()`.

**Impacto:**
- fn_get_empresa_id() continua retornando UUID unico (nao quebra nada)
- TODAS as 41 policies precisariam ser reescritas para usar `empresa_id = ANY(fn_get_selected_empresas())`
- Mesma escala de mudanca da Opcao A, apenas diferente funcao

**Esforco:** ALTO (3-5 dias)
**Risco:** ALTO

### Opcao C: Sentinela NULL = "Todas" (RECOMENDADA)

**Conceito:** Quando o usuario seleciona "Todas as empresas", `usuario.empresa_id` e setado para `NULL`. O `fn_get_empresa_id()` retorna `NULL`. Uma nova funcao wrapper substitui a logica de comparacao.

**Problema fundamental:** `empresa_id = NULL` nunca e true em SQL. Entao NAO podemos simplesmente setar NULL.

**Variante C2 -- "Todas" via funcao inteligente (VIAVEL):**

Redefinir `fn_get_empresa_id()` para retornar `NULL` quando modo "todas" esta ativo, E criar uma funcao helper:

```sql
CREATE OR REPLACE FUNCTION fn_empresa_match(p_empresa_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE
    WHEN fn_get_empresa_id() IS NULL THEN
      -- Modo "Todas": verificar se empresa esta vinculada ao usuario
      p_empresa_id IN (
        SELECT ue.empresa_id FROM usuario_empresa ue
        JOIN usuario u ON u.id = ue.usuario_id
        WHERE u.auth_id = auth.uid() AND ue.ativo = true
      )
    ELSE
      -- Modo normal: comparacao direta
      p_empresa_id = fn_get_empresa_id()
  END;
$$;
```

**Impacto:** Ainda precisa reescrever TODAS as 41 policies de `empresa_id = fn_get_empresa_id()` para `fn_empresa_match(empresa_id)`.

**Esforco:** ALTO (2-3 dias so de RLS)
**Risco:** MEDIO (funcao centralizada, mas 41 policies alteradas)

### Opcao D: "Empresa: Todas" com query-side filtering (RECOMENDADA -- SIMPLEST)

**Conceito:** NAO alterar RLS. NAO alterar fn_get_empresa_id(). Em vez disso, implementar a consolidacao **na camada de aplicacao**.

**Mecanismo:**
1. UI adiciona opcao "Todas as empresas" ao switcher
2. Quando selecionada, a aplicacao faz N queries (uma por empresa) e consolida no servidor
3. `fn_get_empresa_id()` continua retornando UM uuid -- a app faz switch + query em loop

**Desvantagem critica:** N roundtrips ao banco, cada um envolvendo `fn_switch_empresa()` + query + switch back. Lento, fragil, concorrencia perigosa.

**DESCARTADA** por performance e race conditions.

### Opcao E: "Empresa: Todas" com RLS bypass via view + service role (NAO RECOMENDADA)

Criar views com SECURITY DEFINER que bypassam RLS e filtram por array de empresas do usuario.

**Risco de seguranca:** Qualquer bug no view expoe dados cross-tenant. Viola o principio de defense-in-depth que o RLS prove.

**DESCARTADA** por risco de seguranca.

### Opcao F: Redeficao cirurgica de fn_get_empresa_id() (RECOMENDADA FINAL)

**Conceito:** O truque e que `fn_get_empresa_id()` NAO precisa mudar seu retorno. Em vez disso, criamos uma nova funcao e reescrevemos as policies de leitura (SELECT) para usar operador `IN`, mantendo as policies de escrita (INSERT/UPDATE/DELETE) inalteradas.

**Justificativa arquitetural:** O modo consolidado e SOMENTE LEITURA. O dono nao precisa criar viagem, gasto ou motorista em "modo todas" -- ele precisa VER dados consolidados. Operacoes de escrita sempre exigem uma empresa especifica.

```sql
-- Nova funcao: retorna todas as empresas ativas do usuario
CREATE OR REPLACE FUNCTION fn_get_user_empresa_ids()
RETURNS UUID[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT ARRAY(
    SELECT ue.empresa_id
    FROM usuario u
    JOIN usuario_empresa ue ON ue.usuario_id = u.id AND ue.ativo = true
    JOIN empresa e ON e.id = ue.empresa_id AND e.ativa = true
    WHERE u.auth_id = auth.uid()
  );
$$;
```

**Diferencial:** So alterar policies de **SELECT**. Policies de INSERT/UPDATE/DELETE continuam usando `fn_get_empresa_id()` (empresa ativa unica).

---

## 4. Opcao F Detalhada: Analise de Impacto por Tabela

### 4.1 Principio: Leitura consolidada, escrita isolada

| Operacao | Modo Consolidado | Funcao RLS |
|----------|-----------------|------------|
| SELECT | Todas as empresas | `empresa_id = ANY(fn_get_user_empresa_ids())` |
| INSERT | Empresa ativa (unica) | `empresa_id = fn_get_empresa_id()` (SEM MUDANCA) |
| UPDATE | Empresa ativa (unica) | `empresa_id = fn_get_empresa_id()` (SEM MUDANCA) |
| DELETE | Empresa ativa (unica) | `empresa_id = fn_get_empresa_id()` (SEM MUDANCA) |

### 4.2 Condicional: So ampliar SELECT quando modo consolidado ativo

Para evitar impacto de performance no modo normal (single empresa), a funcao pode ser condicional:

```sql
CREATE OR REPLACE FUNCTION fn_is_consolidated_mode()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT consolidated_mode FROM usuario WHERE auth_id = auth.uid();
$$;
```

E as policies SELECT ficam:

```sql
CREATE POLICY "viagem_select" ON viagem FOR SELECT USING (
  CASE
    WHEN fn_is_consolidated_mode() THEN
      empresa_id = ANY(fn_get_user_empresa_ids())
    ELSE
      empresa_id = fn_get_empresa_id()
  END
  AND (
    fn_get_user_role() IN ('dono', 'admin')
    OR motorista_id = fn_get_motorista_id()
  )
);
```

### 4.3 Tabelas que precisam de SELECT reescrito

| Tabela | Policy SELECT atual | Mudanca necessaria |
|--------|--------------------|--------------------|
| empresa | `id = fn_get_empresa_id()` | `id = ANY(fn_get_user_empresa_ids())` when consolidated |
| usuario | `empresa_id = fn_get_empresa_id()` | Condicional |
| motorista | `empresa_id = fn_get_empresa_id()` (2 policies) | Condicional |
| caminhao | `empresa_id = fn_get_empresa_id()` (2 policies) | Condicional |
| motorista_caminhao | `empresa_id = fn_get_empresa_id()` | Condicional |
| categoria_gasto | `empresa_id = fn_get_empresa_id()` | Condicional |
| gasto | `empresa_id = fn_get_empresa_id()` | Condicional |
| foto_comprovante | `empresa_id = fn_get_empresa_id()` | Condicional |
| viagem | `empresa_id = fn_get_empresa_id()` | Condicional |
| viagem_veiculo | `empresa_id = fn_get_empresa_id()` | Condicional |
| fechamento | `empresa_id = fn_get_empresa_id()` | Condicional |
| fechamento_item | via subquery `f.empresa_id = fn_get_empresa_id()` | Condicional |
| usuario_empresa | `empresa_id = fn_get_empresa_id()` | Condicional |
| alerta_dispensado | `empresa_id = fn_get_empresa_id()` | Condicional |
| **TOTAL SELECT** | **~20 policies** | |

**Nota:** Policies de INSERT/UPDATE/DELETE (~21 policies) NAO sao alteradas.

### 4.4 Performance

**Cenario normal (single empresa):**
- `fn_is_consolidated_mode()` retorna `false` -> cai no `ELSE` -> `empresa_id = fn_get_empresa_id()` (index seek, identico ao atual)
- Overhead: 1 lookup adicional em `usuario` (ja cached pelo Postgres per-statement)

**Cenario consolidado:**
- `empresa_id = ANY(fn_get_user_empresa_ids())` -> PostgreSQL executa index scan com array de UUIDs
- Todos os indices existentes em `empresa_id` funcionam com `= ANY(...)` (PostgreSQL usa Bitmap Index Scan)
- Para 2-5 empresas (caso tipico de dono de frota), overhead e negligivel
- Para 10+ empresas, testes de performance seriam necessarios

**Referencia:** PostgreSQL docs confirmam que `= ANY(ARRAY[...])` usa indices btree normalmente quando o array e pequeno (<100 elementos).

### 4.5 Storage Policies

As 3 policies em `storage.objects` usam `fn_get_empresa_id()::text` para filtrar pasta. No modo consolidado:

```sql
-- Opcao 1: Nao alterar storage (leitura de comprovantes exige empresa ativa)
-- Opcao 2: Alterar para ANY
(storage.foldername(name))[1] = ANY(
  SELECT unnest(fn_get_user_empresa_ids())::text
)
```

**Recomendacao:** Nao alterar storage policies na v1. O dono pode ver a lista consolidada de gastos, e ao clicar em um gasto especifico, a foto carrega via empresa_id do gasto (que ja esta disponivel no SELECT).

---

## 5. Impacto por Feature

### 5.1 Dashboard KPIs
- **Mudanca:** Nenhuma em server actions. RLS ja filtra. Quando consolidated=true, SELECT retorna dados de todas as empresas.
- **UI:** KPIs automaticamente somam valores de todas as empresas.
- **Adicao necessaria:** Nenhuma.

### 5.2 Viagens list
- **Mudanca:** Adicionar coluna "Empresa" na tabela quando consolidated=true.
- **Server action:** Nenhuma mudanca (RLS ampliado automaticamente retorna mais rows).
- **JOIN necessario:** viagem JOIN empresa (para nome) -- ja disponivel via empresa_id na row.

### 5.3 Gastos list
- **Igual a Viagens:** Adicionar coluna "Empresa" quando consolidado.

### 5.4 Motoristas list
- **Igual:** Coluna "Empresa" visivel em modo consolidado.
- **Atencao:** Motorista com mesmo CPF em 2 empresas aparecera 2x (correto, sao registros distintos).

### 5.5 Caminhoes list
- **Igual:** Coluna "Empresa" quando consolidado.

### 5.6 BI (Business Intelligence)
- **Dashboard BI:** Graficos automaticamente agregam dados cross-empresa.
- **Atencao:** Algumas metricas (margem, km/L) fazem sentido consolidadas; outras (ranking de motorista) podem ser confusas cross-empresa.
- **Recomendacao:** Adicionar filtro de empresa no BI mesmo em modo consolidado, para drill-down.

### 5.7 Fechamentos
- **Modo consolidado:** Lista todos os fechamentos de todas as empresas.
- **Criacao de fechamento:** SEMPRE requer empresa ativa especifica (INSERT policy nao muda).
- **UI:** Coluna "Empresa" quando consolidado.

### 5.8 Vinculos (motorista_caminhao)
- **Leitura consolidada:** Mostra todos os vinculos.
- **Criacao:** Requer empresa ativa.

---

## 6. Isolamento de Dados e UX

### 6.1 Distincao de empresa por item

**Quando consolidado, TODA tabela de dados deve mostrar coluna "Empresa":**
- Nome fantasia (ou razao social como fallback)
- Pode ser coluna fixa ou badge/tag colorido por empresa
- Cores consistentes por empresa (derivadas do ID, estilo hash -> cor)

### 6.2 Operacoes de escrita em modo consolidado

**Regra: modo consolidado e READ-ONLY para dados.**

Quando o usuario tenta criar/editar/excluir em modo consolidado:
- Opcao A (UX simples): Desabilitar botoes de criacao. Mostrar tooltip "Selecione uma empresa para criar."
- Opcao B (UX melhor): Ao criar, mostrar dropdown "Em qual empresa?" antes do formulario.
- **Recomendacao:** Opcao A para v1 (simplicidade). Opcao B para v2.

### 6.3 fn_get_user_role() em modo consolidado

**Problema:** O role pode ser diferente em cada empresa (dono em uma, admin em outra). Em modo consolidado, qual role aplicar?

**Solucao:** Para SELECTs consolidados, o role nao importa tanto (dono ve tudo em suas empresas). O `fn_get_user_role()` continua retornando o role da empresa ativa. Para escritas, a empresa ativa define o role.

**Caso especifico de motorista:** Um motorista NUNCA deve ver modo consolidado (nao faz sentido business). A feature e exclusiva para role `dono` (ou `admin` com permissao).

---

## 7. Migracao Necessaria

### 7.1 Schema change (1 migration)

```sql
-- 1. Adicionar flag de modo consolidado
ALTER TABLE usuario ADD COLUMN consolidated_mode BOOLEAN NOT NULL DEFAULT false;

-- 2. Funcao helper
CREATE OR REPLACE FUNCTION fn_is_consolidated_mode() ...;

-- 3. Funcao que retorna array de empresa_ids
CREATE OR REPLACE FUNCTION fn_get_user_empresa_ids() ...;

-- 4. Funcao para ativar/desativar modo consolidado
CREATE OR REPLACE FUNCTION fn_set_consolidated_mode(p_enabled BOOLEAN)
RETURNS BOOLEAN ...;

-- 5. Reescrever ~20 SELECT policies
DROP POLICY ... ; CREATE POLICY ... ;
```

### 7.2 Lista de alteracoes

| Camada | Itens | Estimativa |
|--------|-------|------------|
| **Migration SQL** | 1 migration (schema + funcoes + 20 policies) | 4h |
| **Server actions** | 1 nova action: `setConsolidatedMode()` | 1h |
| **EmpresaSwitcher** | Adicionar opcao "Todas as empresas" + toggle | 2h |
| **Data tables** | Adicionar coluna "Empresa" condicional em 8 tabelas | 4h |
| **Dashboard KPIs** | Nenhuma mudanca (dados ja consolidam via RLS) | 0h |
| **BI** | Adicionar filtro de empresa (opcional) | 2h |
| **Botoes de escrita** | Desabilitar/esconder em modo consolidado | 2h |
| **Testes** | RLS policies (20 policies x 2 modos = 40 cenarios) | 4h |
| **TOTAL** | | **~19h (2-3 dias)** |

---

## 8. Alternativa Simplificada: "Empresa: Todas" sem schema change

### Variante Minima

Em vez de `consolidated_mode` persistente no schema, usar **session state via cookie/localStorage**:

1. Cookie `frotaviva_consolidated=true` (gerenciado no client)
2. Server actions leem o cookie e decidem:
   - Se consolidated=false: comportamento atual
   - Se consolidated=true: fazem switch sequencial (fn_switch_empresa + query + restore)

**Problema:** Race condition e N roundtrips (ver Opcao D descartada).

**Melhor variante minima:** Usar `consolidated_mode` no banco (como proposto), mas com a menor migration possivel.

---

## 9. Riscos e Mitigacoes

| Risco | Severidade | Mitigacao |
|-------|-----------|-----------|
| Performance com `= ANY(array)` em tabelas grandes | BAIXA | Array tipicamente tem 2-5 itens; Postgres usa index scan |
| Regressao em RLS policies reescritas | MEDIA | Testes unitarios por policy, migration reversivel |
| fn_get_user_role() retorna role da empresa ativa, nao da empresa do item | BAIXA | Modo consolidado e read-only; role serve para filtrar escrita |
| Motorista vendo modo consolidado | MEDIA | Guard na UI e na funcao: so dono/admin pode ativar |
| Storage policies nao consolidam | BAIXA | v1 nao altera storage; fotos acessadas via detalhe do gasto |
| Confusao de dados cross-empresa em BI | MEDIA | Labels claros de empresa em toda tabela/grafico |

---

## 10. Seguranca

### 10.1 RLS continua como barreira

O modelo proposto NAO bypassa RLS. A funcao `fn_get_user_empresa_ids()` retorna SOMENTE empresas vinculadas ao usuario autenticado via `usuario_empresa.ativo = true`. Nao ha risco de leak cross-tenant.

### 10.2 Auditoria

A funcao `fn_set_consolidated_mode()` deve logar:
```sql
RAISE LOG 'consolidated_mode set to % for usuario auth_id=%', p_enabled, auth.uid();
```

### 10.3 Restricao de role

SOMENTE usuarios com role `dono` ou `admin` (em pelo menos uma empresa) podem ativar modo consolidado. A funcao valida isso.

---

## 11. Recomendacao Final

### Abordagem: Opcao F -- Redeficao cirurgica de SELECT policies

**Justificativa:**
1. **Menor risco:** Policies de escrita (INSERT/UPDATE/DELETE) nao sao alteradas
2. **Performance preservada:** Modo normal usa path identico ao atual (CASE -> ELSE)
3. **Seguranca mantida:** RLS continua ativo, funcao retorna apenas empresas do usuario
4. **Escopo controlado:** ~20 policies SELECT + 1 migration + UI incremental
5. **Backward compatible:** Usuarios que nunca ativam consolidado nao percebem mudanca

### Proximo passo

1. Criar story para implementacao (Epic 9 ou similar)
2. @data-engineer detalha a migration SQL com testes
3. @dev implementa UI (EmpresaSwitcher + coluna Empresa nas tabelas)
4. @qa valida cada policy reescrita com testes de integracao

### Sequencia sugerida de stories

| Story | Descricao | Deps |
|-------|-----------|------|
| 9.1 | Migration: consolidated_mode + funcoes + reescrita de SELECT policies | -- |
| 9.2 | Server action: setConsolidatedMode + getConsolidatedMode | 9.1 |
| 9.3 | EmpresaSwitcher: opcao "Todas as Empresas" | 9.2 |
| 9.4 | Data tables: coluna "Empresa" condicional | 9.3 |
| 9.5 | Modo consolidado: desabilitar operacoes de escrita | 9.3 |
| 9.6 | BI: labels de empresa + filtro drill-down | 9.4 |

---

## Apendice A: fn_get_empresa_id() atual

```sql
-- Definida em migration 20260328180100
CREATE OR REPLACE FUNCTION fn_get_empresa_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT empresa_id FROM usuario WHERE auth_id = auth.uid() LIMIT 1;
$$;
```

## Apendice B: Exemplo de policy reescrita

**Antes (viagem SELECT):**
```sql
CREATE POLICY viagem_select ON viagem FOR SELECT USING (
  empresa_id = fn_get_empresa_id()
  AND (
    fn_get_user_role() IN ('dono', 'admin')
    OR motorista_id = fn_get_motorista_id()
  )
);
```

**Depois:**
```sql
CREATE POLICY viagem_select ON viagem FOR SELECT USING (
  CASE
    WHEN fn_is_consolidated_mode() THEN
      empresa_id = ANY(fn_get_user_empresa_ids())
    ELSE
      empresa_id = fn_get_empresa_id()
  END
  AND (
    fn_get_user_role() IN ('dono', 'admin')
    OR motorista_id = fn_get_motorista_id()
  )
);
```

## Apendice C: Inventario completo de policies a alterar

```
-- SELECT policies (ALTERAR)
empresa: "Usuarios visualizam propria empresa"
usuario: "usuario_select_empresa"
motorista: "motorista_select_empresa"
motorista: "motorista_select_self" (nao alterar, e por motorista_id)
caminhao: "Dono e admin gerenciam caminhoes" (FOR ALL -- precisa split?)
caminhao: "Motorista visualiza caminhoes da empresa"
motorista_caminhao: "Dono e admin gerenciam vinculos" (FOR ALL)
motorista_caminhao: "motorista_caminhao_select_restricted"
categoria_gasto: "Categorias da empresa visiveis para membros"
gasto: "Dono e admin gerenciam gastos" (FOR ALL)
foto_comprovante: "Dono e admin gerenciam comprovantes" (FOR ALL)
viagem: "viagem_select"
viagem_veiculo: "empresa_viagem_veiculo_all" (FOR ALL)
viagem_veiculo: "motorista_viagem_veiculo_own"
fechamento: "fechamento_select"
fechamento_item: "fechamento_item_select"
usuario_empresa: "ue_select_empresa"
alerta_dispensado: "alerta_select"

-- NOTA: Policies "FOR ALL" (caminhao, gasto, foto_comprovante, vinculos, viagem_veiculo)
-- usam a mesma USING clause para SELECT e escrita. Para suportar modo consolidado
-- apenas em leitura, essas policies FOR ALL precisam ser DIVIDIDAS em:
--   1. Policy FOR SELECT (com modo consolidado)
--   2. Policy FOR INSERT/UPDATE/DELETE (sem mudanca)
-- Isso aumenta o numero de policies, mas e necessario para isolar leitura de escrita.
```

**Total de policies a alterar ou dividir: ~18-22**

---

*Analise concluida. Aguardando validacao do stakeholder para prosseguir com stories.*
