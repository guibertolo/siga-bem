# Arquitetura: Notas de Combustivel Vinculadas a Viagens

**Autor:** Aria (Architect Agent)
**Data:** 2026-03-29
**Status:** Proposta

---

## 1. Contexto e Objetivo

O motorista precisa registrar notas de combustivel (litros, valor, foto do comprovante) durante uma viagem ativa. O sistema deve calcular media de preco por regiao e fornecer um dashboard BI (somente dono) com previsoes de lucro por caminhao, motorista e CNPJ.

---

## 2. Estado Atual do Dominio

### 2.1 Entidades Existentes Relevantes

| Entidade | Campos-chave | Observacao |
|----------|-------------|------------|
| `gasto` | valor (centavos), categoria_id, motorista_id, caminhao_id, viagem_id, km_registro, foto_url | Vinculo opcional com viagem. Sem campo `litros` |
| `categoria_gasto` | nome, icone, cor | Seed inclui "Combustivel" (icone: fuel, cor: #EF4444) |
| `foto_comprovante` | gasto_id, storage_path, thumbnail_path | 1:N com gasto, storage no bucket `comprovantes` |
| `viagem` | status (enum), motorista_id, caminhao_id, km_saida, km_chegada, km_estimado | Status `em_andamento` = viagem ativa |
| `combustivel_preco` | regiao, tipo (diesel_s10/diesel_comum), preco_centavos, data_referencia | Precos de referencia por empresa/regiao |

### 2.2 Gaps Identificados

1. **Sem campo `litros` no gasto** -- O proprio `consumo-calc.ts` documenta isso como limitacao do MVP: "Future enhancement: calculate from fuel expense records when a 'litros' field is added to the gasto table."
2. **Sem campo `preco_litro` no gasto** -- Necessario para calculo de media por regiao
3. **Sem geolocalizacao no gasto** -- Nao ha cidade/estado/coordenadas para agregar por regiao
4. **Sem dashboard BI** -- Nao existe rota ou componente de analytics

---

## 3. Decisao Arquitetural: Estender `gasto` (Opcao B)

### Analise Comparativa

| Criterio | Opcao A (tabela nova) | Opcao B (estender gasto) |
|----------|----------------------|--------------------------|
| Reutiliza fluxo existente | Nao | Sim -- form, actions, RLS, comprovantes |
| Duplicacao de dados | Alta (valor, motorista, caminhao, viagem) | Zero |
| Impacto no fechamento | Precisa atualizar fn_calcular_fechamento | Nenhum (ja soma gastos) |
| Campos nullable | N/A | 4 campos (aceitavel) |
| Complexidade de queries BI | Join com gasto para cruzar | Direto na mesma tabela |
| Modelo de permissoes (RLS) | Novo set de policies | Herda as existentes |
| Impacto no comprovante | Nova FK ou polimorfismo | Zero (foto_comprovante ja referencia gasto) |
| Esforco de implementacao | ~3 stories | ~2 stories |

### Decisao: Opcao B -- Estender `gasto`

**Justificativa:**

1. **O gasto de combustivel JA E um gasto.** A categoria "Combustivel" ja existe no seed. Criar uma tabela separada violaria a normalizacao -- teriamos duas fontes de verdade para despesas.

2. **O fluxo de comprovantes ja funciona.** `foto_comprovante` referencia `gasto_id`. Criar `nota_combustivel` exigiria ou duplicar esse mecanismo ou criar um FK polimorfico.

3. **O fechamento financeiro ja soma gastos.** `fn_calcular_fechamento` soma `gasto.valor` por motorista/periodo. Uma tabela nova ficaria fora desse calculo sem refatoracao.

4. **4 campos nullable sao aceitaveis.** Os campos extras (litros, preco_litro, cidade_abastecimento, uf_abastecimento) so tem valor quando `categoria_id` = Combustivel. Isso e um padrao de "subtype columns" bem estabelecido -- aceitavel quando a quantidade de campos e pequena e o dominio compartilha 90% da estrutura.

5. **O proprio codigo pede isso.** `consumo-calc.ts` explicitamente aguarda um campo `litros` no gasto.

**Trade-offs aceitos:**
- Campos nullable que so fazem sentido para combustivel
- Precisa de validacao na camada de aplicacao (se categoria = Combustivel, litros e preco_litro sao obrigatorios)

---

## 4. Schema Proposto

### 4.1 Migration: Adicionar campos de combustivel ao `gasto`

```sql
-- =============================================================================
-- Migration: Add fuel-specific fields to gasto + BI views
-- Feature: Notas de Combustivel Vinculadas a Viagens
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. ADD COLUMNS to gasto
-- ---------------------------------------------------------------------------
ALTER TABLE gasto
  ADD COLUMN litros NUMERIC(10,3) CHECK (litros IS NULL OR litros > 0),
  ADD COLUMN preco_litro_centavos INTEGER CHECK (preco_litro_centavos IS NULL OR preco_litro_centavos > 0),
  ADD COLUMN cidade_abastecimento TEXT,
  ADD COLUMN uf_abastecimento CHAR(2);

COMMENT ON COLUMN gasto.litros IS 'Litros abastecidos. Obrigatorio quando categoria = Combustivel. NUMERIC para precisao de fracao (ex: 150.500 litros).';
COMMENT ON COLUMN gasto.preco_litro_centavos IS 'Preco por litro em centavos (R$ 6,50 = 650). Obrigatorio quando categoria = Combustivel.';
COMMENT ON COLUMN gasto.cidade_abastecimento IS 'Cidade onde ocorreu o abastecimento. Opcional, usado para media por regiao.';
COMMENT ON COLUMN gasto.uf_abastecimento IS 'UF do abastecimento (ex: SP, MG). Usado para agregacao regional.';

-- Constraint: se tem litros, deve ter preco_litro e vice-versa
ALTER TABLE gasto
  ADD CONSTRAINT ck_gasto_combustivel_consistency
    CHECK (
      (litros IS NULL AND preco_litro_centavos IS NULL)
      OR (litros IS NOT NULL AND preco_litro_centavos IS NOT NULL)
    );

-- ---------------------------------------------------------------------------
-- 2. INDEX for BI queries (combustivel-specific)
-- ---------------------------------------------------------------------------
CREATE INDEX idx_gasto_combustivel_regiao
  ON gasto (uf_abastecimento, cidade_abastecimento)
  WHERE litros IS NOT NULL;

CREATE INDEX idx_gasto_combustivel_viagem
  ON gasto (viagem_id, categoria_id)
  WHERE viagem_id IS NOT NULL AND litros IS NOT NULL;

CREATE INDEX idx_gasto_combustivel_caminhao_data
  ON gasto (caminhao_id, data DESC)
  WHERE litros IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 3. VIEW: media de preco por regiao (UF)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW view_combustivel_media_regiao AS
SELECT
  g.empresa_id,
  g.uf_abastecimento AS uf,
  g.cidade_abastecimento AS cidade,
  COUNT(*) AS qtd_abastecimentos,
  ROUND(AVG(g.preco_litro_centavos))::INTEGER AS preco_medio_centavos,
  MIN(g.preco_litro_centavos) AS preco_min_centavos,
  MAX(g.preco_litro_centavos) AS preco_max_centavos,
  SUM(g.litros)::NUMERIC(12,3) AS total_litros,
  SUM(g.valor) AS total_gasto_centavos,
  MIN(g.data) AS primeira_data,
  MAX(g.data) AS ultima_data
FROM gasto g
WHERE g.litros IS NOT NULL
  AND g.uf_abastecimento IS NOT NULL
GROUP BY g.empresa_id, g.uf_abastecimento, g.cidade_abastecimento;

COMMENT ON VIEW view_combustivel_media_regiao IS 'Media de preco de combustivel por UF e cidade. Filtrada por empresa via RLS.';

-- ---------------------------------------------------------------------------
-- 4. VIEW: consumo por caminhao (km/l real)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW view_consumo_caminhao AS
SELECT
  g.empresa_id,
  g.caminhao_id,
  c.placa,
  c.modelo,
  COUNT(*) AS qtd_abastecimentos,
  SUM(g.litros)::NUMERIC(12,3) AS total_litros,
  SUM(g.valor) AS total_gasto_centavos,
  ROUND(AVG(g.preco_litro_centavos))::INTEGER AS preco_medio_centavos
FROM gasto g
JOIN caminhao c ON c.id = g.caminhao_id
WHERE g.litros IS NOT NULL
  AND g.caminhao_id IS NOT NULL
GROUP BY g.empresa_id, g.caminhao_id, c.placa, c.modelo;

COMMENT ON VIEW view_consumo_caminhao IS 'Totais de combustivel por caminhao. Base para calculo de km/l real.';

-- ---------------------------------------------------------------------------
-- 5. RPC: fn_combustivel_resumo_bi
-- Dashboard BI: totais por caminhao, motorista, periodo
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_combustivel_resumo_bi(
  p_empresa_id UUID,
  p_periodo_inicio DATE DEFAULT NULL,
  p_periodo_fim DATE DEFAULT NULL
)
RETURNS TABLE (
  caminhao_id UUID,
  caminhao_placa TEXT,
  motorista_id UUID,
  motorista_nome TEXT,
  qtd_abastecimentos BIGINT,
  total_litros NUMERIC(12,3),
  total_gasto_centavos BIGINT,
  preco_medio_litro_centavos INTEGER,
  km_rodados INTEGER,
  km_por_litro NUMERIC(6,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    g.caminhao_id,
    c.placa AS caminhao_placa,
    g.motorista_id,
    m.nome AS motorista_nome,
    COUNT(*)::BIGINT AS qtd_abastecimentos,
    SUM(g.litros)::NUMERIC(12,3) AS total_litros,
    SUM(g.valor)::BIGINT AS total_gasto_centavos,
    ROUND(AVG(g.preco_litro_centavos))::INTEGER AS preco_medio_litro_centavos,
    -- km_rodados: soma das distancias das viagens concluidas do caminhao no periodo
    COALESCE((
      SELECT SUM(v.km_chegada - v.km_saida)::INTEGER
      FROM viagem v
      WHERE v.caminhao_id = g.caminhao_id
        AND v.status = 'concluida'
        AND v.km_saida IS NOT NULL
        AND v.km_chegada IS NOT NULL
        AND (p_periodo_inicio IS NULL OR v.data_saida::DATE >= p_periodo_inicio)
        AND (p_periodo_fim IS NULL OR v.data_saida::DATE <= p_periodo_fim)
    ), 0)::INTEGER AS km_rodados,
    -- km/l: km_rodados / total_litros
    CASE
      WHEN SUM(g.litros) > 0 THEN
        ROUND(
          COALESCE((
            SELECT SUM(v.km_chegada - v.km_saida)
            FROM viagem v
            WHERE v.caminhao_id = g.caminhao_id
              AND v.status = 'concluida'
              AND v.km_saida IS NOT NULL
              AND v.km_chegada IS NOT NULL
              AND (p_periodo_inicio IS NULL OR v.data_saida::DATE >= p_periodo_inicio)
              AND (p_periodo_fim IS NULL OR v.data_saida::DATE <= p_periodo_fim)
          ), 0)::NUMERIC / SUM(g.litros),
        2)
      ELSE 0
    END AS km_por_litro
  FROM gasto g
  JOIN caminhao c ON c.id = g.caminhao_id
  JOIN motorista m ON m.id = g.motorista_id
  WHERE g.empresa_id = p_empresa_id
    AND g.litros IS NOT NULL
    AND (p_periodo_inicio IS NULL OR g.data >= p_periodo_inicio)
    AND (p_periodo_fim IS NULL OR g.data <= p_periodo_fim)
  GROUP BY g.caminhao_id, c.placa, g.motorista_id, m.nome;
END;
$$;

COMMENT ON FUNCTION fn_combustivel_resumo_bi IS 'Resumo BI de combustivel por caminhao e motorista. Somente dono/admin deve chamar.';

-- ---------------------------------------------------------------------------
-- 6. RPC: fn_previsao_lucro_viagem
-- Estimativa de lucro real baseada em consumo historico
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_previsao_lucro_viagem(
  p_empresa_id UUID,
  p_caminhao_id UUID,
  p_km_estimado INTEGER,
  p_valor_frete_centavos INTEGER,
  p_percentual_motorista NUMERIC(5,2)
)
RETURNS TABLE (
  km_estimado INTEGER,
  consumo_medio_km_l NUMERIC(6,2),
  consumo_fonte TEXT,
  preco_medio_combustivel_centavos INTEGER,
  custo_combustivel_estimado_centavos INTEGER,
  valor_motorista_centavos INTEGER,
  lucro_estimado_centavos INTEGER,
  margem_percentual NUMERIC(5,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_litros NUMERIC;
  v_total_km INTEGER;
  v_km_l NUMERIC(6,2);
  v_fonte TEXT;
  v_preco_medio INTEGER;
  v_custo_comb INTEGER;
  v_valor_mot INTEGER;
BEGIN
  -- Buscar consumo medio real do caminhao (ultimos 6 meses)
  SELECT SUM(litros), 0
  INTO v_total_litros, v_total_km
  FROM gasto
  WHERE empresa_id = p_empresa_id
    AND caminhao_id = p_caminhao_id
    AND litros IS NOT NULL
    AND data >= (CURRENT_DATE - INTERVAL '6 months');

  SELECT COALESCE(SUM(v.km_chegada - v.km_saida), 0)
  INTO v_total_km
  FROM viagem v
  WHERE v.empresa_id = p_empresa_id
    AND v.caminhao_id = p_caminhao_id
    AND v.status = 'concluida'
    AND v.km_saida IS NOT NULL
    AND v.km_chegada IS NOT NULL
    AND v.data_saida >= (CURRENT_DATE - INTERVAL '6 months');

  IF v_total_litros > 0 AND v_total_km > 0 THEN
    v_km_l := ROUND(v_total_km::NUMERIC / v_total_litros, 2);
    v_fonte := 'historico';
  ELSE
    v_km_l := 3.0;  -- Padrao cegonheiro
    v_fonte := 'padrao';
  END IF;

  -- Preco medio de combustivel (ultimos 3 meses, mesma empresa)
  SELECT COALESCE(ROUND(AVG(preco_litro_centavos))::INTEGER, 650)
  INTO v_preco_medio
  FROM gasto
  WHERE empresa_id = p_empresa_id
    AND litros IS NOT NULL
    AND data >= (CURRENT_DATE - INTERVAL '3 months');

  -- Calculos
  v_custo_comb := ROUND(p_km_estimado::NUMERIC / v_km_l * v_preco_medio)::INTEGER;
  v_valor_mot := ROUND(p_valor_frete_centavos * p_percentual_motorista / 100)::INTEGER;

  RETURN QUERY SELECT
    p_km_estimado,
    v_km_l,
    v_fonte,
    v_preco_medio,
    v_custo_comb,
    v_valor_mot,
    (p_valor_frete_centavos - v_valor_mot - v_custo_comb)::INTEGER,
    CASE
      WHEN p_valor_frete_centavos > 0 THEN
        ROUND(((p_valor_frete_centavos - v_valor_mot - v_custo_comb)::NUMERIC / p_valor_frete_centavos) * 100, 2)
      ELSE 0
    END;
END;
$$;

COMMENT ON FUNCTION fn_previsao_lucro_viagem IS 'Estima lucro de uma viagem baseado em consumo historico real. Centavos.';
```

### 4.2 Nota sobre `litros` como NUMERIC vs INTEGER

**Decisao:** NUMERIC(10,3) para litros.

Diferente de valores monetarios (que DEVEM ser INTEGER centavos, conforme CON-003), litros sao uma medida fisica que naturalmente tem fracao. Notas fiscais de combustivel registram litros com 3 casas decimais (ex: 150.500 litros). Usar INTEGER aqui perderia precisao sem ganho.

CON-003 se aplica a valores MONETARIOS. `preco_litro_centavos` e INTEGER (centavos) conforme a convencao.

---

## 5. Impacto no Sistema Existente

### 5.1 Componentes que Precisam Mudar

| Componente | Arquivo | Alteracao |
|-----------|---------|-----------|
| **GastoForm** | `components/gastos/GastoForm.tsx` | Adicionar campos condicionais: litros, preco_litro, cidade, UF (visivel quando categoria = Combustivel) |
| **GastoFormData** (type) | `types/gasto.ts` | Adicionar `litros`, `preco_litro`, `cidade_abastecimento`, `uf_abastecimento` opcionais |
| **Gasto** (type) | `types/gasto.ts` | Adicionar os 4 campos |
| **database.ts** | `types/database.ts` | Adicionar campos ao interface Gasto |
| **gastos/actions.ts** | `app/(dashboard)/gastos/actions.ts` | Processar campos de combustivel no create/update |
| **consumo-calc.ts** | `lib/utils/consumo-calc.ts` | Implementar calculo REAL usando dados de `gasto.litros` (substituir o stub MVP) |
| **viagem-calc.ts** | `lib/utils/viagem-calc.ts` | Adicionar `calcularCustoCombustivel()` usando dados reais |
| **EstimativaViagem** | `components/viagens/EstimativaViagem.tsx` | Usar dados reais de consumo em vez do fallback 3.0 km/l |
| **GastoList/GastoTable** | `components/gastos/GastoList.tsx`, `GastoTable.tsx` | Mostrar litros e preco/litro quando aplicavel |
| **Viagem detail** | `app/(dashboard)/viagens/[id]/page.tsx` | Mostrar gastos de combustivel da viagem com totais |
| **gastos query** | `lib/queries/gastos.ts` | Incluir campos de combustivel no select |

### 5.2 Componentes Novos

| Componente | Arquivo Proposto | Descricao |
|-----------|-----------------|-----------|
| **CombustivelBIDashboard** | `components/bi/CombustivelDashboard.tsx` | Dashboard principal BI com graficos |
| **PrecoRegionalChart** | `components/bi/PrecoRegionalChart.tsx` | Grafico de media de preco por UF |
| **ConsumoChart** | `components/bi/ConsumoChart.tsx` | Grafico de km/l por caminhao |
| **LucroSimulator** | `components/bi/LucroSimulator.tsx` | Simulador de previsao de lucro |
| **BI page** | `app/(dashboard)/bi/page.tsx` | Rota do dashboard BI |
| **BI actions** | `app/(dashboard)/bi/actions.ts` | Server actions para queries BI |
| **bi queries** | `lib/queries/combustivel-bi.ts` | Queries de agregacao para BI |

### 5.3 Actions e Queries Necessarias

**Server Actions novas:**

| Action | Arquivo | Descricao |
|--------|---------|-----------|
| `getCombustivelResumoBI()` | `app/(dashboard)/bi/actions.ts` | Chama `fn_combustivel_resumo_bi` |
| `getPrevisaoLucro()` | `app/(dashboard)/bi/actions.ts` | Chama `fn_previsao_lucro_viagem` |
| `getMediaRegional()` | `app/(dashboard)/bi/actions.ts` | Query na `view_combustivel_media_regiao` |

**Actions existentes a alterar:**

| Action | Arquivo | Alteracao |
|--------|---------|-----------|
| `createGasto()` | `app/(dashboard)/gastos/actions.ts` | Validar/persistir litros, preco_litro, cidade, UF |
| `updateGasto()` | `app/(dashboard)/gastos/actions.ts` | Idem |

**Queries novas:**

| Query | Arquivo | Descricao |
|-------|---------|-----------|
| `getCombustivelPorViagem()` | `lib/queries/combustivel-bi.ts` | Gastos de combustivel de uma viagem especifica |
| `getConsumoRealCaminhao()` | `lib/queries/combustivel-bi.ts` | Consumo real (km/l) historico de um caminhao |

---

## 6. Restricoes de Seguranca

### 6.1 RLS

Os novos campos herdam a RLS existente do `gasto` -- nenhuma policy nova necessaria. As views usam a clausula `empresa_id` que e filtrada pelo RLS nas queries do Supabase client.

As RPCs usam `SECURITY DEFINER` e recebem `p_empresa_id` como parametro. A camada de aplicacao (server actions) DEVE validar que o usuario autenticado pertence a empresa antes de chamar.

### 6.2 Dashboard BI -- Acesso Restrito

O dashboard BI deve ser restrito a `dono` e `admin`. Implementar via:
1. Middleware check na rota `app/(dashboard)/bi/`
2. Server action validation em cada query BI
3. Componente de UI nao renderiza link no sidebar para `motorista`

### 6.3 Upload de Fotos

Sem impacto -- ja funciona via `foto_comprovante` vinculado ao `gasto_id`.

---

## 7. Validacao na Camada de Aplicacao

Quando a categoria selecionada e "Combustivel":
- `litros` e **obrigatorio**, deve ser > 0
- `preco_litro` e **obrigatorio**, deve ser > 0
- `cidade_abastecimento` e **recomendado** (warning, nao blocking)
- `uf_abastecimento` e **recomendado** (warning, nao blocking)
- `viagem_id` e **recomendado** (para vincular a viagem ativa)
- `valor` (centavos) deve ser igual a `litros * preco_litro_centavos` (auto-calculado ou validado)

O form deve auto-calcular `valor` quando `litros` e `preco_litro` sao preenchidos.

---

## 8. Fluxo do Motorista (UX)

```
Motorista acessa viagem ativa (status = em_andamento)
  -> Botao "Registrar Abastecimento"
  -> Form pre-preenchido:
       - viagem_id (auto)
       - caminhao_id (auto, da viagem)
       - motorista_id (auto, do usuario)
       - categoria_id (auto = "Combustivel")
       - data (auto = hoje)
  -> Motorista preenche:
       - litros
       - preco por litro
       - cidade / UF (opcional)
       - foto do comprovante
  -> Sistema calcula:
       - valor total = litros * preco_litro
  -> Salva como gasto normal com campos extras
```

---

## 9. Estimativa de Complexidade

### Dimensoes (1-5)

| Dimensao | Score | Justificativa |
|----------|-------|---------------|
| Scope | 3 | ~15 arquivos afetados |
| Integration | 2 | Sem APIs externas, tudo interno |
| Infrastructure | 2 | 1 migration, 2 views, 2 RPCs |
| Knowledge | 2 | Equipe ja conhece o padrao gasto/comprovante |
| Risk | 2 | Baixo risco, backward compatible |

**Total: 11 pontos -- Classe STANDARD**

### Stories Propostas

| # | Story | Descricao | Estimativa |
|---|-------|-----------|------------|
| 1 | **Migration + Types** | Migration com ALTER TABLE, views, RPCs. Atualizar types TS. | P (1-2 dias) |
| 2 | **Form Combustivel** | Campos condicionais no GastoForm, validacao, auto-calculo valor. Botao "Registrar Abastecimento" na viagem. | M (2-3 dias) |
| 3 | **consumo-calc real** | Implementar calculo real de km/l usando historico de gastos com litros. Atualizar EstimativaViagem. | P (1-2 dias) |
| 4 | **Dashboard BI** | Pagina /bi com graficos: media por regiao, consumo por caminhao, simulador de lucro. | G (3-5 dias) |

**Total: 4 stories, ~7-12 dias de implementacao**

### Dependencias

```
Story 1 (Migration) -> Story 2 (Form) -> Story 3 (Consumo real)
Story 1 (Migration) -> Story 4 (Dashboard BI)
```

Stories 3 e 4 podem ser paralelizadas apos Story 2.

---

## 10. Backward Compatibility

**100% backward compatible:**

- Todos os novos campos sao nullable (ALTER TABLE ADD COLUMN com CHECK ... IS NULL OR ...)
- Gastos existentes continuam funcionando com `litros = NULL`
- `fn_calcular_fechamento` nao e afetada (soma `gasto.valor`, que continua existindo)
- Nenhuma coluna existente e removida ou renomeada
- Views sao novas (CREATE, nao REPLACE de existentes)
- RPCs sao novas

---

## 11. Consideracoes Futuras (Fora do Escopo)

1. **Geocodificacao automatica** -- Usar API de geolocalizacao do dispositivo para preencher cidade/UF automaticamente
2. **OCR da nota fiscal** -- Extrair litros e preco automaticamente da foto do comprovante
3. **Integracao ANP** -- Comparar precos com a tabela oficial da Agencia Nacional de Petroleo
4. **Alertas de preco** -- Notificar quando preco por litro esta acima da media regional
5. **Export CSV/PDF dos dados BI** -- Exportar relatorios de combustivel

---

## 12. Diagrama de Relacionamentos (Pos-Alteracao)

```
empresa
  |
  +-- motorista
  |     |
  |     +-- gasto -----> categoria_gasto
  |     |     |
  |     |     +-- foto_comprovante
  |     |     |
  |     |     +-- [NOVO] litros, preco_litro_centavos
  |     |     +-- [NOVO] cidade_abastecimento, uf_abastecimento
  |     |     |
  |     |     +-- viagem_id (FK opcional)
  |     |
  |     +-- viagem
  |           |
  |           +-- viagem_veiculo
  |
  +-- caminhao
  |
  +-- combustivel_preco (referencia, nao gasto real)
  |
  +-- [VIEW] view_combustivel_media_regiao
  +-- [VIEW] view_consumo_caminhao
  +-- [RPC]  fn_combustivel_resumo_bi
  +-- [RPC]  fn_previsao_lucro_viagem
```

---

## 13. Checklist de Implementacao

- [ ] Migration DDL executada com sucesso
- [ ] Types TypeScript atualizados (gasto.ts, database.ts)
- [ ] GastoForm com campos condicionais de combustivel
- [ ] Validacao: litros + preco_litro obrigatorios para categoria Combustivel
- [ ] Auto-calculo de valor = litros * preco_litro
- [ ] Botao "Registrar Abastecimento" na pagina de viagem ativa
- [ ] consumo-calc.ts usando dados reais
- [ ] EstimativaViagem usando consumo real
- [ ] Rota /bi com restricao dono/admin
- [ ] Grafico de media de preco por regiao
- [ ] Grafico de consumo (km/l) por caminhao
- [ ] Simulador de previsao de lucro
- [ ] Testes unitarios para calculos
- [ ] Testes de integracao para RPCs
