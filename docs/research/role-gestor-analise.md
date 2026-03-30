# Analise: Role "Gestor" no FrotaViva

**Data:** 2026-03-30
**Autor:** Atlas (AIOX Analyst)
**Nivel de confianca:** ALTO (baseado em auditoria completa do codebase + pesquisa de mercado)

---

## 1. Pesquisa de Mercado: Como Transportadoras Brasileiras Estruturam suas Equipes

### Realidade do Mercado

No Brasil, a estrutura de gestao de frotas em transportadoras de pequeno e medio porte (publico-alvo do FrotaViva) segue um padrao tipico:

| Cargo | Quem ocupa | Responsabilidades |
|-------|-----------|-------------------|
| **Dono/Socio** | Proprietario(s) da empresa | Decisoes financeiras finais, contratacao/demissao, acesso a CNPJ, contratos bancarios, definicao de percentuais |
| **Gestor de Frota** | Funcionario de confianca, parente, ou o proprio dono | Operacao do dia-a-dia: escalar motoristas, monitorar viagens, controlar gastos, fazer acertos |
| **Motorista** | Motorista (CLT ou agregado) | Executa viagens, registra gastos no trajeto, recebe acertos |

**Fonte:** O gestor de frotas supervisiona todas as atividades relacionadas aos veiculos da empresa, desde controle de combustivel, gestao de motoristas e gestao dos gastos. Em empresas de pequeno porte, frequentemente o proprio dono acumula essas responsabilidades ou delega para um profissional da equipe existente.

### O que o Dono NUNCA delega (tipicamente)

1. **Criacao de empresa** -- cadastro de CNPJ, dados fiscais
2. **Definicao de percentuais de pagamento** -- quanto cada motorista ganha por frete
3. **Pagamento final** -- marcar acerto como "pago" (envolve dinheiro saindo do caixa)
4. **Convidar outros admins/gestores** -- decisao de quem tem acesso ao sistema
5. **Alterar roles de usuarios** -- promover/rebaixar
6. **Acesso a BI/relatorios estrategicos** -- visao macro do negocio
7. **Editar dados da empresa** -- razao social, CNPJ

### O que o Gestor faz no dia-a-dia

1. **Cadastrar motoristas e caminhoes** -- operacional
2. **Criar e gerenciar vinculos motorista/caminhao** -- escalacao
3. **Criar e acompanhar viagens** -- core operacional
4. **Registrar e controlar gastos** -- acompanhamento diario
5. **Criar fechamentos/acertos** -- preparar para o dono aprovar
6. **Invalidar viagens** -- quando ha problemas operacionais
7. **Visualizar historico financeiro** -- para prestar contas ao dono

### O que o Gestor NAO deve fazer

1. Marcar acerto como "pago" (e dinheiro do dono)
2. Alterar percentuais de pagamento
3. Convidar outros gestores ou admins
4. Editar dados da empresa
5. Acessar BI estrategico completo (pode ver parcial)
6. Excluir dados historicos

---

## 2. Mapeamento Atual de Permissoes no Codebase

### 2.1 Funcao `requireRole()` -- 20+ call sites

Localizado em `lib/auth/get-user-role.ts` (L55-73). Aceita array de roles permitidos e lanca erro se o usuario nao tem permissao.

### 2.2 Matriz de Permissoes ATUAL

Auditoria completa de todos os server actions e pages:

| Dominio | Funcao/Acao | dono | admin | motorista | Arquivo |
|---------|-------------|:----:|:-----:|:---------:|---------|
| **Motoristas** | listMotoristas | OK | OK | BLOQ | `motoristas/actions.ts` |
| | createMotorista | OK | OK | BLOQ | `motoristas/actions.ts` (L56) |
| | updateMotorista | OK | OK | BLOQ | `motoristas/actions.ts` (L157) |
| | softDeleteMotorista | OK | OK | BLOQ | `motoristas/actions.ts` (L322) |
| | reactivateMotorista | OK | OK | BLOQ | `motoristas/actions.ts` (L376) |
| | listMotoristasAtivos | OK | OK | BLOQ | `motoristas/actions.ts` (L404) |
| | listMotoristasComVinculo | OK | OK | BLOQ | `motoristas/actions.ts` (L434) |
| | listMotoristasParaOnboarding | OK | OK | BLOQ | `motoristas/actions.ts` (L473) |
| **Caminhoes** | listCaminhoes | OK | OK | BLOQ | `caminhoes/actions.ts` (L86) |
| | createCaminhao | OK | OK | BLOQ | `caminhoes/actions.ts` (L113) |
| | updateCaminhao | OK | OK | BLOQ | `caminhoes/actions.ts` (L144) |
| | softDeleteCaminhao | OK | OK | BLOQ | `caminhoes/actions.ts` (L219) |
| | reactivateCaminhao | OK | OK | BLOQ | `caminhoes/actions.ts` (L294) |
| **Vinculos** | createVinculo | OK | OK | BLOQ | `vinculos/actions.ts` (L47) |
| | encerrarVinculo | OK | OK | BLOQ | `vinculos/actions.ts` (L141) |
| | listVinculos | OK | OK | BLOQ | `vinculos/actions.ts` (L186) |
| | getActiveMotoristas | OK | OK | BLOQ | `vinculos/actions.ts` (L248) |
| | getActiveCaminhoes | OK | OK | BLOQ | `vinculos/actions.ts` (L278) |
| **Viagens** | createViagem | OK | OK | OK (propria) | `viagens/actions.ts` (L180) |
| | updateViagem | OK | OK | PARCIAL | `viagens/actions.ts` (L274) |
| | updateViagemStatus | OK | OK | OK | `viagens/actions.ts` (L372) |
| | deleteViagem | OK | OK | BLOQ | `viagens/actions.ts` (L491) |
| | invalidarViagem | OK | OK | BLOQ | `viagens/actions.ts` (L665) |
| | listViagens | OK | OK | OK (proprias) | `viagens/actions.ts` (L566) |
| **Gastos** | listGastosFiltered | OK | OK | OK (proprios) | `gastos/actions.ts` |
| | canExport | OK | OK | BLOQ | `gastos/page.tsx` (L71) |
| **Fechamentos** | createFechamento | OK | OK | BLOQ | `fechamentos/actions.ts` (L333) |
| | listFechamentos | OK | OK | OK (proprios) | `fechamentos/actions.ts` (L488) |
| | fecharFechamento | OK | OK | BLOQ | `fechamentos/actions.ts` (L610) |
| | reabrirFechamento | OK | OK | BLOQ | `fechamentos/actions.ts` (L620) |
| | marcarComoPago | OK | OK | BLOQ | `fechamentos/actions.ts` (L630) |
| | deleteFechamento | OK | OK | BLOQ | `fechamentos/actions.ts` (L712) |
| | previewFechamento | OK | OK | BLOQ | `fechamentos/actions.ts` (L94) |
| | getViagensPendentesAcerto | OK | OK | BLOQ | `fechamentos/actions.ts` (L258) |
| **Financeiro** | getFechamentosHistorico | OK | OK | OK (proprios) | `financeiro/historico/actions.ts` |
| | getResumoFinanceiro | OK | OK | BLOQ | `financeiro/historico/actions.ts` (L113) |
| | reabrirFechamento (historico) | OK | OK | BLOQ | `financeiro/historico/actions.ts` (L189) |
| **BI** | Todas funcoes BI | OK | BLOQ | BLOQ | `bi/actions.ts` -- `requireDono()` |
| **Empresa** | createEmpresa | OK | -- | -- | `empresa/actions.ts` (L34) |
| | updateEmpresa | OK | -- | -- | `empresa/actions.ts` (L124) |
| | createEmpresaAdicional | OK | -- | -- | `empresa/actions.ts` (L175) |
| | getEmpresa | OK | OK | OK | `empresa/actions.ts` (L280) |
| **Usuarios** | listUsuarios | OK | OK | BLOQ | `usuarios/actions.ts` (L18) |
| | inviteUsuario | OK | OK | BLOQ | `usuarios/actions.ts` (L49) |
| | updateUsuarioRole | OK | BLOQ | BLOQ | `usuarios/actions.ts` (L95) -- `requireRole(['dono'])` |
| | toggleUsuarioAtivo | OK | OK | BLOQ | `usuarios/actions.ts` (L150) |
| **Combustivel** | createCombustivelPreco | OK | OK | BLOQ | `configuracoes/combustivel/actions.ts` (L60) |
| | updateCombustivelPreco | OK | OK | BLOQ | `configuracoes/combustivel/actions.ts` (L110) |
| | deleteCombustivelPreco | OK | OK | BLOQ | `configuracoes/combustivel/actions.ts` (L160) |
| | getMediaPorRegiao | OK | BLOQ | BLOQ | `configuracoes/combustivel/actions.ts` (L258) -- `role !== 'dono'` |

### 2.3 Sidebar/Navegacao (layout.tsx)

| Secao | dono | admin | motorista |
|-------|:----:|:-----:|:---------:|
| Inicio | OK | OK | OK |
| Empresa | OK | OK | BLOQ |
| Viagens | OK | OK | "Minhas Viagens" |
| Gastos | OK | OK | BLOQ |
| Acertos | OK | OK | BLOQ |
| Resumo dos Gastos (BI) | OK | BLOQ | BLOQ |
| Motoristas | OK | OK | BLOQ |
| Caminhoes | OK | OK | BLOQ |
| Vinculos Mot./Cam. | OK | OK | BLOQ |
| Usuarios | OK | OK | BLOQ |
| Preco Combustivel | OK | OK | BLOQ |

### 2.4 Edicao de Campos de Viagem (3-level lock)

```
camposEditaveis = role === 'dono'
  OR (editavel_motorista === true AND status === 'planejada')
```

**Achado importante:** Apenas `dono` pode editar campos core (origem, destino, valor) de qualquer viagem. O `admin` atual NAO pode editar campos core de viagens criadas pelo dono -- apenas as criadas por motorista quando ainda planejadas. Isso ja e uma diferenciacao dono vs admin.

### 2.5 RLS (Banco de Dados)

| Tabela | SELECT | INSERT | UPDATE | DELETE |
|--------|--------|--------|--------|--------|
| usuario | dono/admin: empresa inteira; motorista: so proprio | dono/admin | dono/admin + proprio (motorista) | -- |
| empresa | empresa_id match | -- | dono only | -- |
| motorista_caminhao | dono/admin: empresa; motorista: so proprios | dono/admin | dono/admin | -- |

---

## 3. Decisao: Reaproveitar "admin" ou Criar "gestor"?

### Opcao A: Reaproveitar "admin" como gestor intermediario

**Pros:**
- Zero mudanca no schema (enum `usuario_role` ja tem 'admin')
- Zero mudanca em RLS policies
- Maioria dos `requireRole(['dono', 'admin'])` continua funcionando
- Convite ja permite role 'admin'
- Nenhuma migration necessaria para o enum

**Contras:**
- O nome "admin" nao comunica bem o papel para usuarios brasileiros (gestor de frota)
- Precisaria mudar label no UI de "Admin" para "Gestor"

### Opcao B: Criar novo role "gestor"

**Pros:**
- Nome semanticamente correto
- Separacao clara entre admin tecnico e gestor operacional

**Contras:**
- Requer ALTER TYPE para o enum (migration)
- Requer atualizar TODOS os `requireRole(['dono', 'admin'])` call sites (~20+)
- Requer atualizar RLS policies que referenciam 'admin'
- Requer atualizar InviteUsuarioInput type
- Requer atualizar layout.tsx, sidebar, etc.
- Alto risco de regressao com muitos pontos de mudanca

### [AUTO-DECISION] Reaproveitar ou criar? -> Reaproveitar 'admin' como gestor (reason: o role 'admin' ja existe no schema, no enum, nas policies RLS, e em 20+ call sites. Criar um novo role envolveria migracoes de enum + refatoracao de todos os call sites com risco alto. O caminho limpo e dar ao 'admin' o significado real de "gestor" e ajustar apenas os pontos onde as permissoes precisam divergir do dono. A label no UI muda de "Admin" para "Gestor".)

---

## 4. Matriz de Permissoes PROPOSTA para o Role Gestor (admin repurposed)

### Legenda
- **TOTAL** = acesso completo a funcao
- **PARCIAL** = acesso com restricoes (detalhado na coluna Restricao)
- **BLOQ** = sem acesso
- **AUDIT** = acao gera registro de auditoria

| Dominio | Funcao | dono | gestor (admin) | motorista | Restricao Gestor | Audit |
|---------|--------|:----:|:--------------:|:---------:|------------------|:-----:|
| **Motoristas** | CRUD completo | TOTAL | TOTAL | BLOQ | -- | -- |
| | Criar login (via invite) | TOTAL | PARCIAL | BLOQ | So pode convidar role=motorista | SIM |
| **Caminhoes** | CRUD completo | TOTAL | TOTAL | BLOQ | -- | -- |
| **Vinculos** | Criar/encerrar | TOTAL | TOTAL | BLOQ | -- | -- |
| **Viagens** | Criar | TOTAL | TOTAL | PARCIAL | -- | -- |
| | Editar campos core | TOTAL | PARCIAL | BLOQ | So viagens status='planejada' | -- |
| | Editar campos nao-core | TOTAL | TOTAL | BLOQ | -- | -- |
| | Cancelar/invalidar | TOTAL | TOTAL | BLOQ | Motivo obrigatorio (ja existe) | SIM |
| | Excluir | TOTAL | TOTAL | BLOQ | So status='planejada' (ja existe) | -- |
| | Alterar status | TOTAL | TOTAL | OK | -- | -- |
| **Gastos** | Visualizar todos | TOTAL | TOTAL | PARCIAL | -- | -- |
| | Exportar | TOTAL | TOTAL | BLOQ | -- | -- |
| | Criar/editar | TOTAL | TOTAL | PARCIAL | -- | -- |
| | Excluir | TOTAL | BLOQ | BLOQ | **NOVO: gestor nao deleta gastos** | -- |
| **Fechamentos** | Criar acerto | TOTAL | TOTAL | BLOQ | -- | SIM |
| | Fechar acerto | TOTAL | TOTAL | BLOQ | -- | SIM |
| | Reabrir acerto | TOTAL | BLOQ | BLOQ | **NOVO: so dono reabe** | -- |
| | Marcar como pago | TOTAL | BLOQ | BLOQ | **NOVO: so dono paga** | SIM |
| | Excluir acerto | TOTAL | BLOQ | BLOQ | **NOVO: so dono exclui** | -- |
| | Visualizar/preview | TOTAL | TOTAL | BLOQ | -- | -- |
| | Viagens pendentes acerto | TOTAL | TOTAL | BLOQ | -- | -- |
| **Financeiro** | Resumo financeiro | TOTAL | PARCIAL | BLOQ | Ve totais, mas sem detalhe de pagamentos | -- |
| | Historico fechamentos | TOTAL | TOTAL | PARCIAL | -- | -- |
| | Reabrir (historico) | TOTAL | BLOQ | BLOQ | **NOVO: so dono** | -- |
| **BI** | Acesso completo | TOTAL | BLOQ | BLOQ | **MANTER: BI e estrategico, so dono** | -- |
| | BI basico (futuro) | TOTAL | PARCIAL | BLOQ | Futuro: KPIs operacionais sem margem | -- |
| **Empresa** | Visualizar dados | TOTAL | PARCIAL | BLOQ | Ve nome fantasia, mas NAO ve CNPJ | -- |
| | Editar dados | TOTAL | BLOQ | BLOQ | **MANTER: so dono** | -- |
| | Criar nova empresa | TOTAL | BLOQ | BLOQ | **MANTER: so dono** | -- |
| **Usuarios** | Listar | TOTAL | TOTAL | BLOQ | -- | -- |
| | Convidar | TOTAL | PARCIAL | BLOQ | **NOVO: so pode convidar motorista** | SIM |
| | Alterar role | TOTAL | BLOQ | BLOQ | **MANTER: so dono** | SIM |
| | Ativar/desativar | TOTAL | PARCIAL | BLOQ | So motoristas, nao outros gestores | SIM |
| **Combustivel** | CRUD precos | TOTAL | TOTAL | BLOQ | -- | -- |
| | Media por regiao | TOTAL | BLOQ | BLOQ | **MANTER: dado estrategico** | -- |
| **Sidebar** | BI (Resumo Gastos) | OK | BLOQ | BLOQ | -- | -- |
| | Demais menus | OK | OK | PARCIAL | -- | -- |

---

## 5. Mudancas Necessarias no Codebase (Resumo Executivo)

### 5.1 Mudancas que RESTRINGEM o admin (atuais permissoes demais)

Estas sao as mudancas que realmente diferenciam o gestor do dono. Atualmente dono e admin tem permissoes identicas em quase tudo.

| # | Arquivo | Mudanca | Impacto |
|---|---------|---------|---------|
| 1 | `fechamentos/actions.ts` | `marcarComoPago`: trocar `role === 'motorista'` por `requireRole(['dono'])` | MEDIO |
| 2 | `fechamentos/actions.ts` | `reabrirFechamento`: trocar `role === 'motorista'` por `requireRole(['dono'])` | MEDIO |
| 3 | `fechamentos/actions.ts` | `deleteFechamento`: trocar `role === 'motorista'` por `requireRole(['dono'])` | MEDIO |
| 4 | `financeiro/historico/actions.ts` | `reabrirFechamento`: trocar `['dono', 'admin']` por `['dono']` | BAIXO |
| 5 | `usuarios/actions.ts` | `inviteUsuario`: se `currentUsuario.role === 'admin'` e `input.role !== 'motorista'` -> rejeitar | BAIXO |
| 6 | `usuarios/actions.ts` | `toggleUsuarioAtivo`: se `currentUsuario.role === 'admin'` e `targetUser.role !== 'motorista'` -> rejeitar | BAIXO |
| 7 | `viagens/actions.ts` | `updateViagem` campos core: incluir admin na regra de lock (atualmente so `role === 'dono'` desbloqueia) | BAIXO |
| 8 | `empresa/page.tsx` | Ocultar CNPJ para role admin | BAIXO |
| 9 | `empresa/actions.ts` | `updateEmpresa` RLS ja restringe a dono -- ok | NENHUM |
| 10 | `configuracoes/combustivel/actions.ts` | `getMediaPorRegiao` ja restringe a dono -- ok | NENHUM |
| 11 | `bi/actions.ts` | `requireDono()` ja restringe a dono -- ok | NENHUM |

### 5.2 Mudanca de Label no UI

| Local | De | Para |
|-------|----|------|
| `invite-modal.tsx` | "admin" / "Admin" | "gestor" / "Gestor" |
| `usuario-list.tsx` | Exibicao de role "admin" | "Gestor" |
| Qualquer badge/tag de role | "Admin" | "Gestor" |

**NOTA:** O valor no banco permanece `'admin'` (sem migration). Apenas o display label muda.

### 5.3 Nenhuma Mudanca Necessaria (ja corretos)

- `requireRole(['dono', 'admin'])` nos CRUDs de motoristas, caminhoes, vinculos -- gestor precisa de tudo isso
- `requireRole(['dono'])` para `updateUsuarioRole` -- ja restringe a dono
- `requireDono()` no BI -- ja restringe
- RLS policies no banco -- ja diferenciam dono/admin/motorista corretamente
- Sidebar: `showBILink = role === 'dono'` ja esconde BI do admin
- Sidebar: `showAdminLinks = role === 'dono' || role === 'admin'` -- correto para gestor

---

## 6. Trilha de Auditoria (Audit Trail)

### 6.1 O que ja existe

O sistema ja registra `created_by` em viagens e `fechado_por`/`pago_por` em fechamentos. Isso e um comeco.

### 6.2 O que PRECISA existir para o dono auditar o gestor

| Evento | Dados a registrar | Prioridade |
|--------|-------------------|------------|
| Gestor criou fechamento/acerto | usuario_id, motorista_id, periodo, valores | ALTA |
| Gestor fechou acerto | usuario_id, fechamento_id, timestamp | ALTA |
| Gestor invalidou viagem | usuario_id, viagem_id, motivo, status anterior | ALTA |
| Gestor convidou motorista | usuario_id, email convidado, role | ALTA |
| Gestor ativou/desativou usuario | usuario_id, target_id, acao | MEDIA |
| Gestor criou/editou motorista | usuario_id, motorista_id, campos alterados | MEDIA |
| Gestor criou/editou viagem | usuario_id, viagem_id, campos alterados | MEDIA |
| Gestor alterou preco combustivel | usuario_id, preco_id, valor anterior/novo | MEDIA |
| Gestor criou/encerrou vinculo | usuario_id, vinculo_id | BAIXA |

### 6.3 Proposta de Implementacao: Tabela `audit_log`

```sql
CREATE TABLE audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id  UUID NOT NULL REFERENCES empresa(id),
  usuario_id  UUID NOT NULL REFERENCES usuario(id),
  acao        TEXT NOT NULL,           -- 'fechamento.fechar', 'viagem.invalidar', etc.
  entidade    TEXT NOT NULL,           -- 'fechamento', 'viagem', 'usuario', etc.
  entidade_id UUID,                    -- ID do registro afetado
  dados       JSONB,                   -- { campo: valor_anterior -> valor_novo }
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: somente dono ve audit logs
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dono_ve_audit" ON audit_log
  FOR SELECT USING (
    empresa_id = fn_get_empresa_id()
    AND fn_get_user_role() = 'dono'
  );

-- INSERT: qualquer role autenticado (o sistema insere)
CREATE POLICY "sistema_insere_audit" ON audit_log
  FOR INSERT WITH CHECK (
    empresa_id = fn_get_empresa_id()
  );
```

### 6.4 Tela de Auditoria (futuro)

Uma pagina `/auditoria` acessivel somente pelo dono, com:
- Filtros por usuario, tipo de acao, periodo
- Timeline cronologica
- Exportacao CSV

---

## 7. Resumo das Recomendacoes

### Fase 1 -- Diferenciar permissoes (1-2 stories)

1. Restringir `marcarComoPago`, `reabrirFechamento`, `deleteFechamento` a dono-only
2. Restringir convite de admin: gestor so convida motorista
3. Restringir `toggleUsuarioAtivo`: gestor so desativa motorista
4. Mudar label "Admin" -> "Gestor" no UI
5. Ajustar `updateViagem` para que gestor tenha mesma restricao de campos core que admin ja tem (verificar se a logica `role === 'dono'` deve incluir admin para viagens planejadas)

### Fase 2 -- Audit trail (1-2 stories)

1. Criar tabela `audit_log` com migration
2. Implementar helper `logAudit()` reutilizavel
3. Adicionar chamadas de audit nos pontos ALTA prioridade
4. Criar pagina `/auditoria` para o dono

### Fase 3 -- Refinamentos (1 story)

1. Ocultar CNPJ para gestor na pagina de empresa
2. Considerar BI parcial para gestor (KPIs operacionais sem margens)
3. Implementar audit nos pontos MEDIA prioridade

---

## 8. Estimativa de Impacto

| Metrica | Valor |
|---------|-------|
| Arquivos a modificar (Fase 1) | 5-7 |
| Migrations novas | 0 (Fase 1), 1 (Fase 2) |
| Pontos de requireRole a ajustar | ~8 |
| Risco de regressao | BAIXO (mudancas pontuais, nao estruturais) |
| Compatibilidade com multi-empresa | TOTAL (role esta em `usuario` e `usuario_empresa`) |

---

## Fontes

- [Principais cargos para exercer a gestao de frotas - Prolog](https://prologapp.com/blog/funcoes-na-gestao-de-frotas/)
- [O que faz um gestor de frotas - Infleet](https://infleet.com.br/blog/o-que-faz-um-gestor-de-frotas-transportes/)
- [Gestor de Frotas: funcoes, competencias e salario - Localiza](https://frotas.localiza.com/blog/o-que-faz-um-gestor-de-frotas)
- [Gestor de Frotas: responsabilidades - Delta Global](https://blog.deltaglobal.com.br/gestor-de-frotas-suas-responsabilidade/)
- [Gestor de frota: responsabilidades e formacao - Cobli](https://www.cobli.co/blog/gestor-de-frota/)
- [Gestor de frotas: profissao - Frota 162](https://www.frota162.com.br/blog/gestor-de-frota-profissao/)
- Auditoria completa do codebase FrotaViva (20+ server actions, RLS policies, layout.tsx)
