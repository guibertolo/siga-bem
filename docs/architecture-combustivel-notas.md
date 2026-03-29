# Arquitetura: Notas de Combustivel + BI Completo de Gastos

**Autor:** Aria (Architect Agent)
**Data:** 2026-03-29
**Versao:** 2.0 -- Alinhado com PO review
**Status:** Aprovado (convergido com PRD v2.0 e PO review)

> **Changelog v2.0 (2026-03-29):**
> - Abordagem convergida: ESTENDER `gasto` com colunas diretas (sem tabela separada)
> - `litros` como NUMERIC(10,3) (medida fisica, CON-003 nao se aplica)
> - `preco_litro` DERIVADO, nao armazenado (calculo: `valor / litros`)
> - Localicacao: `posto_local` TEXT + `uf_abastecimento` CHAR(2), ambos opcionais
> - Acesso BI: somente `dono` (stakeholder explicito). Admin ve relatorios de gastos normais.
> - BI expandido para TODOS os gastos (nao so combustivel): pedagio, alimentacao, manutencao, pneu, hospedagem, lavagem, etc.
> - Consumo padrao fallback: 3.0 km/l (consistente com `consumo-calc.ts` existente)
> - Migration SQL convergida com PRD e PO review

---

## 1. Contexto e Objetivo

O motorista precisa registrar notas de combustivel (litros, valor, foto do comprovante) durante uma viagem ativa. O sistema deve:

1. Capturar litros abastecidos e calcular preco por litro automaticamente
2. Calcular media de preco por regiao a partir de dados reais
3. Fornecer um **dashboard BI COMPLETO** (somente dono) com analise de **TODOS os gastos** da viagem -- combustivel, pedagio, alimentacao, manutencao, pneu, hospedagem, lavagem, estacionamento, seguro, multa, outros
4. Previsao de custo total por viagem e margem de lucro estimada
5. Filtros por caminhao, motorista, periodo e categoria de gasto

---

## 2. Estado Atual do Dominio

### 2.1 Entidades Existentes Relevantes

| Entidade | Campos-chave | Observacao |
|----------|-------------|------------|
| `gasto` | valor (centavos), categoria_id, motorista_id, caminhao_id, viagem_id, km_registro, foto_url | Vinculo opcional com viagem. Sem campo `litros` |
| `categoria_gasto` | nome, icone, cor | Seed inclui "Combustivel" (icone: fuel, cor: #EF4444) e todas as outras categorias |
| `foto_comprovante` | gasto_id, storage_path, thumbnail_path | 1:N com gasto, storage no bucket `comprovantes` |
| `viagem` | status (enum), motorista_id, caminhao_id, km_saida, km_chegada, km_estimado | Status `em_andamento` = viagem ativa |
| `combustivel_preco` | regiao, tipo (diesel_s10/diesel_comum), preco_centavos, data_referencia | Precos de referencia por empresa/regiao |

### 2.2 Gaps Identificados

1. **Sem campo `litros` no gasto** -- O proprio `consumo-calc.ts` documenta isso como limitacao do MVP: "Future enhancement: calculate from fuel expense records when a 'litros' field is added to the gasto table."
2. **Sem geolocalizacao no gasto** -- Nao ha cidade/estado/coordenadas para agregar por regiao
3. **Sem dashboard BI** -- Nao existe rota ou componente de analytics

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

2. **O fluxo de comprovantes ja funciona.** `foto_comprovante` referencia `gasto_id`. Criar `nota_combustivel` ou `abastecimento_detalhe` exigiria ou duplicar esse mecanismo ou criar um FK polimorfico.

3. **O fechamento financeiro ja soma gastos.** `fn_calcular_fechamento` soma `gasto.valor` por motorista/periodo. Uma tabela nova ficaria fora desse calculo sem refatoracao.

4. **4 campos nullable sao aceitaveis.** Os campos extras (litros, tipo_combustivel, posto_local, uf_abastecimento) so tem valor quando `categoria_id` = Combustivel. Isso e um padrao de "subtype columns" bem estabelecido -- aceitavel quando a quantidade de campos e pequena e o dominio compartilha 90% da estrutura.

5. **O proprio codigo pede isso.** `consumo-calc.ts` explicitamente aguarda um campo `litros` no gasto.

**Nota sobre divergencia com @data-engineer:** O @data-engineer propôs uma tabela `abastecimento_detalhe` (Opcao Hibrida). Essa abordagem foi descartada pelo @pm e @architect porque: (a) adiciona complexidade desnecessaria de JOINs para queries BI; (b) requer RLS duplicada; (c) requer transacao atomica de 2 inserts; (d) 4 campos nullable e um trade-off aceitavel para a simplicidade obtida.

**Trade-offs aceitos:**
- Campos nullable que so fazem sentido para combustivel
- Precisa de validacao na camada de aplicacao (se categoria = Combustivel, litros e obrigatorio)

---

## 4. Schema Convergido

### 4.1 Decisoes de Tipo (Convergidas com PO)

| Campo | Tipo | Justificativa |
|-------|------|---------------|
| `litros` | NUMERIC(10,3) | Medida fisica com 3 casas decimais (notas fiscais registram ex: 150.500L). CON-003 (centavos) aplica-se a valores MONETARIOS, nao a medidas fisicas. |
| `preco_litro` | **DERIVADO** (nao armazenado) | Calculado como `valor / (litros * 100)` centavos/litro, ou `(valor / 100.0) / litros` reais/litro. Elimina risco de inconsistencia entre valor, litros e preco_litro. |
| `tipo_combustivel` | `combustivel_tipo` (enum existente) | Reutiliza enum `diesel_s10`, `diesel_comum` ja existente |
| `posto_local` | TEXT (opcional) | Nome do posto. Opcional porque motorista pode nao saber/lembrar |
| `uf_abastecimento` | CHAR(2) (opcional) | Estado do abastecimento. Opcional pelo mesmo motivo |

### 4.2 Migration SQL Convergida (FINAL)

```sql
-- =============================================================================
-- Migration: Add fuel-specific fields to gasto + BI views/RPCs
-- Feature: Notas de Combustivel + BI Completo de Gastos
-- Version: 2.0 (convergido com PO review)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. ADD COLUMNS to gasto
-- ---------------------------------------------------------------------------
ALTER TABLE gasto
  ADD COLUMN litros NUMERIC(10,3) CHECK (litros IS NULL OR litros > 0),
  ADD COLUMN tipo_combustivel combustivel_tipo,
  ADD COLUMN posto_local TEXT,
  ADD COLUMN uf_abastecimento CHAR(2);

COMMENT ON COLUMN gasto.litros IS 'Litros abastecidos. NUMERIC(10,3) para precisao de fracao (ex: 150.500). Obrigatorio quando categoria = Combustivel.';
COMMENT ON COLUMN gasto.tipo_combustivel IS 'Tipo de combustivel: diesel_s10 ou diesel_comum. Reutiliza enum existente.';
COMMENT ON COLUMN gasto.posto_local IS 'Nome/local do posto de combustivel. Texto livre, opcional.';
COMMENT ON COLUMN gasto.uf_abastecimento IS 'UF do abastecimento (ex: SP, MG). Opcional. Usado para agregacao regional.';

-- NOTA: preco_litro NAO e armazenado. E derivado: valor / (litros * 100) centavos/litro
-- Isso garante consistencia: valor = litros * preco_litro, sem risco de divergencia.

-- ---------------------------------------------------------------------------
-- 2. INDEX for analytics (combustivel + BI geral)
-- ---------------------------------------------------------------------------
CREATE INDEX idx_gasto_combustivel_analytics
  ON gasto (empresa_id, data DESC)
  WHERE litros IS NOT NULL;

CREATE INDEX idx_gasto_viagem_categoria
  ON gasto (viagem_id, categoria_id)
  WHERE viagem_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 3. VIEW: media de preco de combustivel por regiao (UF)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW view_combustivel_media_regiao AS
SELECT
  g.empresa_id,
  g.uf_abastecimento AS uf,
  g.tipo_combustivel,
  COUNT(*) AS qtd_abastecimentos,
  -- preco_litro derivado: valor(centavos) / litros / 100 = reais/litro
  ROUND(AVG(g.valor::NUMERIC / g.litros / 100), 4) AS preco_medio_litro_reais,
  ROUND(MIN(g.valor::NUMERIC / g.litros / 100), 4) AS preco_min_litro_reais,
  ROUND(MAX(g.valor::NUMERIC / g.litros / 100), 4) AS preco_max_litro_reais,
  SUM(g.litros)::NUMERIC(12,3) AS total_litros,
  SUM(g.valor) AS total_gasto_centavos,
  MIN(g.data) AS primeira_data,
  MAX(g.data) AS ultima_data
FROM gasto g
WHERE g.litros IS NOT NULL
  AND g.litros > 0
  AND g.uf_abastecimento IS NOT NULL
GROUP BY g.empresa_id, g.uf_abastecimento, g.tipo_combustivel;

COMMENT ON VIEW view_combustivel_media_regiao IS 'Media de preco de combustivel por UF. preco_litro derivado de valor/litros. Filtrada por empresa via RLS.';

-- ---------------------------------------------------------------------------
-- 4. VIEW: consumo combustivel por caminhao
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
  ROUND(AVG(g.valor::NUMERIC / g.litros / 100), 4) AS preco_medio_litro_reais
FROM gasto g
JOIN caminhao c ON c.id = g.caminhao_id
WHERE g.litros IS NOT NULL
  AND g.litros > 0
  AND g.caminhao_id IS NOT NULL
GROUP BY g.empresa_id, g.caminhao_id, c.placa, c.modelo;

COMMENT ON VIEW view_consumo_caminhao IS 'Totais de combustivel por caminhao. preco_litro derivado.';

-- ---------------------------------------------------------------------------
-- 5. VIEW: BI geral - breakdown de gastos por categoria e viagem
--    (BI COMPLETO: todos os tipos de gasto, nao so combustivel)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW view_bi_gastos_viagem AS
SELECT
  g.empresa_id,
  g.viagem_id,
  v.origem,
  v.destino,
  v.km_estimado,
  v.km_saida,
  v.km_chegada,
  cg.id AS categoria_id,
  cg.nome AS categoria_nome,
  cg.icone AS categoria_icone,
  cg.cor AS categoria_cor,
  COUNT(*) AS qtd_gastos,
  SUM(g.valor) AS total_centavos,
  AVG(g.valor)::BIGINT AS media_centavos,
  MIN(g.data) AS primeira_data,
  MAX(g.data) AS ultima_data
FROM gasto g
JOIN viagem v ON v.id = g.viagem_id
JOIN categoria_gasto cg ON cg.id = g.categoria_id
WHERE g.viagem_id IS NOT NULL
GROUP BY g.empresa_id, g.viagem_id, v.origem, v.destino,
         v.km_estimado, v.km_saida, v.km_chegada,
         cg.id, cg.nome, cg.icone, cg.cor;

COMMENT ON VIEW view_bi_gastos_viagem IS 'Breakdown de gastos por categoria para cada viagem. Base do BI completo (todos os tipos de gasto).';

-- ---------------------------------------------------------------------------
-- 6. VIEW: BI geral - totais por caminhao (todas as categorias)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW view_bi_gastos_caminhao AS
SELECT
  g.empresa_id,
  g.caminhao_id,
  c.placa,
  c.modelo,
  cg.nome AS categoria_nome,
  COUNT(*) AS qtd_gastos,
  SUM(g.valor) AS total_centavos,
  MIN(g.data) AS primeira_data,
  MAX(g.data) AS ultima_data
FROM gasto g
JOIN caminhao c ON c.id = g.caminhao_id
JOIN categoria_gasto cg ON cg.id = g.categoria_id
WHERE g.caminhao_id IS NOT NULL
GROUP BY g.empresa_id, g.caminhao_id, c.placa, c.modelo, cg.nome;

COMMENT ON VIEW view_bi_gastos_caminhao IS 'Totais de gastos por caminhao e categoria. BI completo.';

-- ---------------------------------------------------------------------------
-- 7. VIEW: BI geral - totais por motorista (todas as categorias)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW view_bi_gastos_motorista AS
SELECT
  g.empresa_id,
  g.motorista_id,
  m.nome AS motorista_nome,
  cg.nome AS categoria_nome,
  COUNT(*) AS qtd_gastos,
  SUM(g.valor) AS total_centavos,
  MIN(g.data) AS primeira_data,
  MAX(g.data) AS ultima_data
FROM gasto g
JOIN motorista m ON m.id = g.motorista_id
JOIN categoria_gasto cg ON cg.id = g.categoria_id
GROUP BY g.empresa_id, g.motorista_id, m.nome, cg.nome;

COMMENT ON VIEW view_bi_gastos_motorista IS 'Totais de gastos por motorista e categoria. BI completo.';

-- ---------------------------------------------------------------------------
-- 8. VIEW: BI geral - tendencia mensal (todas as categorias)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW view_bi_tendencia_mensal AS
SELECT
  g.empresa_id,
  DATE_TRUNC('month', g.data)::DATE AS mes,
  cg.nome AS categoria_nome,
  cg.cor AS categoria_cor,
  COUNT(*) AS qtd_gastos,
  SUM(g.valor) AS total_centavos
FROM gasto g
JOIN categoria_gasto cg ON cg.id = g.categoria_id
GROUP BY g.empresa_id, DATE_TRUNC('month', g.data), cg.nome, cg.cor
ORDER BY mes DESC;

COMMENT ON VIEW view_bi_tendencia_mensal IS 'Tendencia mensal de gastos por categoria. Base para grafico de linhas empilhadas.';

-- ---------------------------------------------------------------------------
-- 9. RPC: fn_bi_resumo_completo
--    Resumo geral de TODOS os gastos para o dashboard BI
--    ACESSO: somente dono
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_bi_resumo_completo(
  p_empresa_id UUID,
  p_periodo_inicio DATE DEFAULT NULL,
  p_periodo_fim DATE DEFAULT NULL,
  p_caminhao_id UUID DEFAULT NULL,
  p_motorista_id UUID DEFAULT NULL
)
RETURNS TABLE (
  categoria_nome TEXT,
  categoria_icone TEXT,
  categoria_cor TEXT,
  qtd_gastos BIGINT,
  total_centavos BIGINT,
  percentual_do_total NUMERIC(5,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_geral BIGINT;
BEGIN
  -- Calcular total geral primeiro para percentuais
  SELECT COALESCE(SUM(g.valor), 0)
  INTO v_total_geral
  FROM gasto g
  WHERE g.empresa_id = p_empresa_id
    AND (p_periodo_inicio IS NULL OR g.data >= p_periodo_inicio)
    AND (p_periodo_fim IS NULL OR g.data <= p_periodo_fim)
    AND (p_caminhao_id IS NULL OR g.caminhao_id = p_caminhao_id)
    AND (p_motorista_id IS NULL OR g.motorista_id = p_motorista_id);

  RETURN QUERY
  SELECT
    cg.nome,
    cg.icone,
    cg.cor,
    COUNT(*)::BIGINT,
    SUM(g.valor)::BIGINT,
    CASE
      WHEN v_total_geral > 0
      THEN ROUND((SUM(g.valor)::NUMERIC / v_total_geral) * 100, 2)
      ELSE 0
    END
  FROM gasto g
  JOIN categoria_gasto cg ON cg.id = g.categoria_id
  WHERE g.empresa_id = p_empresa_id
    AND (p_periodo_inicio IS NULL OR g.data >= p_periodo_inicio)
    AND (p_periodo_fim IS NULL OR g.data <= p_periodo_fim)
    AND (p_caminhao_id IS NULL OR g.caminhao_id = p_caminhao_id)
    AND (p_motorista_id IS NULL OR g.motorista_id = p_motorista_id)
  GROUP BY cg.nome, cg.icone, cg.cor
  ORDER BY SUM(g.valor) DESC;
END;
$$;

COMMENT ON FUNCTION fn_bi_resumo_completo IS 'Resumo BI de TODOS os gastos por categoria com percentuais. Acesso: somente dono.';

-- ---------------------------------------------------------------------------
-- 10. RPC: fn_bi_custo_por_viagem
--     Custo total de uma viagem com breakdown por categoria
--     ACESSO: somente dono
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_bi_custo_por_viagem(
  p_empresa_id UUID,
  p_viagem_id UUID
)
RETURNS TABLE (
  viagem_id UUID,
  origem TEXT,
  destino TEXT,
  km_rodados INTEGER,
  custo_por_km_centavos INTEGER,
  categoria_nome TEXT,
  qtd_gastos BIGINT,
  total_centavos BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id AS viagem_id,
    v.origem,
    v.destino,
    CASE
      WHEN v.km_chegada IS NOT NULL AND v.km_saida IS NOT NULL
      THEN (v.km_chegada - v.km_saida)::INTEGER
      ELSE NULL
    END AS km_rodados,
    CASE
      WHEN v.km_chegada IS NOT NULL AND v.km_saida IS NOT NULL
           AND (v.km_chegada - v.km_saida) > 0
      THEN (SUM(g.valor) OVER (PARTITION BY v.id) / (v.km_chegada - v.km_saida))::INTEGER
      ELSE NULL
    END AS custo_por_km_centavos,
    cg.nome AS categoria_nome,
    COUNT(*)::BIGINT AS qtd_gastos,
    SUM(g.valor)::BIGINT AS total_centavos
  FROM gasto g
  JOIN viagem v ON v.id = g.viagem_id
  JOIN categoria_gasto cg ON cg.id = g.categoria_id
  WHERE g.empresa_id = p_empresa_id
    AND g.viagem_id = p_viagem_id
  GROUP BY v.id, v.origem, v.destino, v.km_saida, v.km_chegada, cg.nome
  ORDER BY SUM(g.valor) DESC;
END;
$$;

COMMENT ON FUNCTION fn_bi_custo_por_viagem IS 'Breakdown de custo por categoria para uma viagem especifica. Acesso: somente dono.';

-- ---------------------------------------------------------------------------
-- 11. RPC: fn_previsao_custo_viagem
--     Previsao de custo TOTAL para uma viagem (todos os gastos)
--     Baseada em historico de rotas similares
--     ACESSO: somente dono
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_previsao_custo_viagem(
  p_empresa_id UUID,
  p_caminhao_id UUID,
  p_km_estimado INTEGER,
  p_valor_frete_centavos INTEGER DEFAULT NULL,
  p_percentual_motorista NUMERIC(5,2) DEFAULT NULL
)
RETURNS TABLE (
  -- Combustivel
  consumo_medio_km_l NUMERIC(6,2),
  consumo_fonte TEXT,
  preco_medio_combustivel_centavos INTEGER,
  custo_combustivel_estimado_centavos INTEGER,
  -- Outros gastos (media historica)
  custo_pedagio_estimado_centavos INTEGER,
  custo_alimentacao_estimado_centavos INTEGER,
  custo_outros_estimado_centavos INTEGER,
  custo_total_estimado_centavos INTEGER,
  -- Margem (se frete informado)
  valor_motorista_centavos INTEGER,
  lucro_estimado_centavos INTEGER,
  margem_percentual NUMERIC(5,2),
  viagens_base_calculo INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_litros NUMERIC;
  v_total_km INTEGER;
  v_km_l NUMERIC(6,2);
  v_fonte TEXT;
  v_preco_medio INTEGER;
  v_custo_comb INTEGER;
  v_custo_pedagio INTEGER;
  v_custo_alimentacao INTEGER;
  v_custo_outros INTEGER;
  v_custo_total INTEGER;
  v_valor_mot INTEGER;
  v_viagens_base INTEGER;
BEGIN
  -- 1. Consumo medio real do caminhao (ultimos 6 meses)
  SELECT SUM(litros)
  INTO v_total_litros
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
    v_km_l := 3.0;  -- Padrao cegonheiro (consistente com consumo-calc.ts)
    v_fonte := 'padrao';
  END IF;

  -- 2. Preco medio de combustivel (ultimos 3 meses)
  SELECT COALESCE(
    ROUND(AVG(valor::NUMERIC / litros / 100) * 100)::INTEGER,
    650
  )
  INTO v_preco_medio
  FROM gasto
  WHERE empresa_id = p_empresa_id
    AND litros IS NOT NULL
    AND litros > 0
    AND data >= (CURRENT_DATE - INTERVAL '3 months');

  -- 3. Custo combustivel estimado
  v_custo_comb := ROUND(p_km_estimado::NUMERIC / v_km_l * v_preco_medio)::INTEGER;

  -- 4. Media historica de outros gastos por km (ultimas viagens concluidas)
  SELECT
    COUNT(DISTINCT v.id),
    COALESCE(ROUND(AVG(CASE WHEN cg.nome = 'Pedagio' THEN custo_km ELSE NULL END) * p_km_estimado)::INTEGER, 0),
    COALESCE(ROUND(AVG(CASE WHEN cg.nome = 'Alimentacao' THEN custo_km ELSE NULL END) * p_km_estimado)::INTEGER, 0),
    COALESCE(ROUND(AVG(CASE WHEN cg.nome NOT IN ('Combustivel', 'Pedagio', 'Alimentacao') THEN custo_km ELSE NULL END) * p_km_estimado)::INTEGER, 0)
  INTO v_viagens_base, v_custo_pedagio, v_custo_alimentacao, v_custo_outros
  FROM (
    SELECT
      g.viagem_id,
      cg.nome,
      SUM(g.valor)::NUMERIC / NULLIF(v.km_chegada - v.km_saida, 0) AS custo_km
    FROM gasto g
    JOIN viagem v ON v.id = g.viagem_id
    JOIN categoria_gasto cg ON cg.id = g.categoria_id
    WHERE g.empresa_id = p_empresa_id
      AND g.caminhao_id = p_caminhao_id
      AND v.status = 'concluida'
      AND v.km_saida IS NOT NULL
      AND v.km_chegada IS NOT NULL
      AND (v.km_chegada - v.km_saida) > 0
      AND v.data_saida >= (CURRENT_DATE - INTERVAL '6 months')
    GROUP BY g.viagem_id, cg.nome, v.km_chegada, v.km_saida
  ) sub
  JOIN viagem v ON v.id = sub.viagem_id
  JOIN categoria_gasto cg ON cg.nome = sub.nome;

  -- Se nao ha historico suficiente, zerar estimativas de outros gastos
  IF v_viagens_base < 3 THEN
    v_custo_pedagio := 0;
    v_custo_alimentacao := 0;
    v_custo_outros := 0;
  END IF;

  v_custo_total := v_custo_comb + v_custo_pedagio + v_custo_alimentacao + v_custo_outros;

  -- 5. Margem (se frete informado)
  IF p_valor_frete_centavos IS NOT NULL AND p_percentual_motorista IS NOT NULL THEN
    v_valor_mot := ROUND(p_valor_frete_centavos * p_percentual_motorista / 100)::INTEGER;
  ELSE
    v_valor_mot := 0;
  END IF;

  RETURN QUERY SELECT
    v_km_l,
    v_fonte,
    v_preco_medio,
    v_custo_comb,
    v_custo_pedagio,
    v_custo_alimentacao,
    v_custo_outros,
    v_custo_total,
    v_valor_mot,
    CASE
      WHEN p_valor_frete_centavos IS NOT NULL
      THEN (p_valor_frete_centavos - v_valor_mot - v_custo_total)::INTEGER
      ELSE NULL
    END,
    CASE
      WHEN p_valor_frete_centavos IS NOT NULL AND p_valor_frete_centavos > 0
      THEN ROUND(((p_valor_frete_centavos - v_valor_mot - v_custo_total)::NUMERIC / p_valor_frete_centavos) * 100, 2)
      ELSE NULL
    END,
    COALESCE(v_viagens_base, 0)::INTEGER;
END;
$$;

COMMENT ON FUNCTION fn_previsao_custo_viagem IS 'Previsao de custo TOTAL de uma viagem (combustivel + pedagio + alimentacao + outros). Usa historico real quando disponivel, fallback 3.0 km/l. Acesso: somente dono.';
```

---

## 5. Restricoes de Seguranca e Acesso

### 5.1 RLS

Os novos campos herdam a RLS existente do `gasto` -- nenhuma policy nova necessaria. As views usam a clausula `empresa_id` que e filtrada pelo RLS nas queries do Supabase client.

As RPCs usam `SECURITY DEFINER` e recebem `p_empresa_id` como parametro. A camada de aplicacao (server actions) DEVE validar que o usuario autenticado pertence a empresa antes de chamar.

### 5.2 Dashboard BI -- Acesso SOMENTE DONO

> **DECISAO DO STAKEHOLDER (explicita):** "Somente o dono tera acesso ao BI."

O dashboard BI e restrito **exclusivamente** a `role = 'dono'`. Admin NAO tem acesso ao BI.

- Admin ve relatorios de gastos normais (listagens, filtros na pagina /gastos existente)
- Admin NAO ve o dashboard BI com previsoes de lucro, margem, tendencias
- Motorista NAO ve o BI

**Implementar via:**

| Camada | Mecanismo | Detalhes |
|--------|-----------|---------|
| Rota | Middleware em `app/(dashboard)/bi/` | `role !== 'dono'` → redirect 403 |
| Server Action | Validacao em cada action BI | `if (role !== 'dono') throw ForbiddenError` |
| Sidebar | Condicional | Link `/bi` so aparece para `role === 'dono'` |

### 5.3 Upload de Fotos

Sem impacto -- ja funciona via `foto_comprovante` vinculado ao `gasto_id`.

---

## 6. Validacao na Camada de Aplicacao

Quando a categoria selecionada e "Combustivel":
- `litros` e **obrigatorio**, deve ser > 0
- `tipo_combustivel` e **obrigatorio** (diesel_s10 ou diesel_comum)
- `posto_local` e **opcional** (motorista pode nao saber)
- `uf_abastecimento` e **opcional** (motorista pode nao saber)
- `viagem_id` e **recomendado** (para vincular a viagem ativa)
- `valor` (centavos) e preenchido pelo motorista independentemente

O form deve calcular e exibir `preco_por_litro = valor / litros` em tempo real como campo readonly (informativo, nao armazenado).

---

## 7. Fluxo do Motorista (UX)

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
       - litros (NUMERIC, 3 decimais)
       - valor total (centavos, como ja faz)
       - tipo combustivel (select: diesel_s10/diesel_comum)
       - posto / local (opcional, texto livre)
       - UF (opcional, select ou texto)
       - foto do comprovante
  -> Sistema calcula e exibe:
       - preco por litro (derivado, readonly)
  -> Salva como gasto normal com campos extras de combustivel
```

---

## 8. Impacto no Sistema Existente

### 8.1 Componentes que Precisam Mudar

| Componente | Arquivo | Alteracao |
|-----------|---------|-----------|
| **GastoForm** | `components/gastos/GastoForm.tsx` | Adicionar campos condicionais: litros, tipo_combustivel, posto_local, UF (visivel quando categoria = Combustivel) |
| **GastoFormData** (type) | `types/gasto.ts` | Adicionar `litros`, `tipo_combustivel`, `posto_local`, `uf_abastecimento` opcionais |
| **Gasto** (type) | `types/gasto.ts` | Adicionar os 4 campos |
| **database.ts** | `types/database.ts` | Adicionar campos ao interface Gasto |
| **gastos/actions.ts** | `app/(dashboard)/gastos/actions.ts` | Processar campos de combustivel no create/update |
| **consumo-calc.ts** | `lib/utils/consumo-calc.ts` | Implementar calculo REAL usando dados de `gasto.litros` (substituir o stub MVP) |
| **viagem-calc.ts** | `lib/utils/viagem-calc.ts` | Adicionar `calcularCustoCombustivel()` usando dados reais |
| **EstimativaViagem** | `components/viagens/EstimativaViagem.tsx` | Usar dados reais de consumo em vez do fallback 3.0 km/l |
| **GastoList/GastoTable** | `components/gastos/GastoList.tsx`, `GastoTable.tsx` | Mostrar litros e preco/litro quando aplicavel |
| **Viagem detail** | `app/(dashboard)/viagens/[id]/page.tsx` | Mostrar gastos de combustivel da viagem com totais |
| **gastos query** | `lib/queries/gastos.ts` | Incluir campos de combustivel no select |

### 8.2 Componentes Novos

| Componente | Arquivo Proposto | Descricao |
|-----------|-----------------|-----------|
| **BIDashboard** | `components/bi/BIDashboard.tsx` | Dashboard principal BI com graficos de TODOS os gastos |
| **GastoBreakdownChart** | `components/bi/GastoBreakdownChart.tsx` | Grafico pizza/barras de breakdown por categoria |
| **TendenciaMensalChart** | `components/bi/TendenciaMensalChart.tsx` | Grafico de linhas empilhadas de tendencia mensal |
| **CustoViagem** | `components/bi/CustoViagem.tsx` | Detalhamento de custo por viagem |
| **RankingCaminhao** | `components/bi/RankingCaminhao.tsx` | Ranking de caminhoes por custo total |
| **RankingMotorista** | `components/bi/RankingMotorista.tsx` | Ranking de motoristas por custo total |
| **PrecoRegionalChart** | `components/bi/PrecoRegionalChart.tsx` | Grafico de media de preco de combustivel por UF |
| **PrevisaoCusto** | `components/bi/PrevisaoCusto.tsx` | Simulador de previsao de custo total + margem |
| **BI page** | `app/(dashboard)/bi/page.tsx` | Rota do dashboard BI (somente dono) |
| **BI actions** | `app/(dashboard)/bi/actions.ts` | Server actions para queries BI |
| **bi queries** | `lib/queries/bi.ts` | Queries de agregacao para BI completo |

### 8.3 Server Actions

**Novas (BI - somente dono):**

| Action | Arquivo | Descricao |
|--------|---------|-----------|
| `getBIResumoCompleto()` | `app/(dashboard)/bi/actions.ts` | Chama `fn_bi_resumo_completo` |
| `getBICustoViagem()` | `app/(dashboard)/bi/actions.ts` | Chama `fn_bi_custo_por_viagem` |
| `getPrevisaoCusto()` | `app/(dashboard)/bi/actions.ts` | Chama `fn_previsao_custo_viagem` |
| `getMediaRegional()` | `app/(dashboard)/bi/actions.ts` | Query na `view_combustivel_media_regiao` |
| `getTendenciaMensal()` | `app/(dashboard)/bi/actions.ts` | Query na `view_bi_tendencia_mensal` |

**Existentes a alterar:**

| Action | Arquivo | Alteracao |
|--------|---------|-----------|
| `createGasto()` | `app/(dashboard)/gastos/actions.ts` | Validar/persistir litros, tipo_combustivel, posto_local, uf_abastecimento |
| `updateGasto()` | `app/(dashboard)/gastos/actions.ts` | Idem |

---

## 9. Estimativa de Complexidade

### Dimensoes (1-5)

| Dimensao | Score | Justificativa |
|----------|-------|---------------|
| Scope | 4 | ~20 arquivos afetados (BI expandido) |
| Integration | 2 | Sem APIs externas, tudo interno |
| Infrastructure | 2 | 1 migration, 6 views, 3 RPCs |
| Knowledge | 2 | Equipe ja conhece o padrao gasto/comprovante |
| Risk | 2 | Baixo risco, backward compatible |

**Total: 12 pontos -- Classe STANDARD**

### Stories Propostas (alinhadas com PRD v2.0)

| # | Story | Descricao | Estimativa |
|---|-------|-----------|------------|
| S1 | **Migration + Types** | ALTER TABLE gasto (4 colunas), views, RPCs. Atualizar types TS. | P (1-2 dias) |
| S2 | **Form Combustivel** | Campos condicionais no GastoForm, validacao, derivacao preco/litro. Botao "Registrar Abastecimento" na viagem. | M (2-3 dias) |
| S3 | **Upload Foto** | Reutiliza ComprovantesUpload. Pequena integracao. | P (0.5-1 dia) |
| S4 | **consumo-calc real** | Implementar calculo real de km/l usando historico de gastos com litros. Fallback 3.0 km/l. | P (1-2 dias) |
| S5 | **Media preco por regiao** | Server action + componente de exibicao. | M (1-2 dias) |
| S6a | **Dashboard BI Gastos** | Pagina /bi com breakdown por categoria, custo por viagem/caminhao/motorista, tendencia mensal. Acesso somente dono. | G (3-5 dias) |
| S6b | **Dashboard BI Previsoes** | Previsao de custo total, margem de lucro estimada. Acesso somente dono. | G (3-4 dias) |
| S7 | **Filtros BI** | Multi-select de periodo, caminhao, motorista, categoria, rota. | M (2-3 dias) |

**Total: 8 stories, ~12-20 dias de implementacao**

### Dependencias

```
S1 (migration) --> S2 (form) --> S3 (foto) --> S4 (consumo real) --> S5 (media regiao)
                                                                          |
                                                                          v
                                                       S6a (BI gastos) --> S7 (filtros)
                                                           |
                                                           v
                                                       S6b (BI previsoes)
```

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

1. **Geocodificacao automatica** -- Usar API de geolocalizacao do dispositivo para preencher UF automaticamente
2. **OCR da nota fiscal** -- Extrair litros e preco automaticamente da foto do comprovante
3. **Integracao ANP** -- Comparar precos com a tabela oficial da Agencia Nacional de Petroleo
4. **Alertas de preco** -- Notificar quando preco por litro esta acima da media regional
5. **Export CSV/PDF dos dados BI** -- Exportar relatorios
6. **Dashboard BI para admin** -- Se stakeholder expandir acesso futuramente
7. **Offline mode** -- Para motoristas sem sinal de dados

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
  |     |     +-- [NOVO] litros NUMERIC(10,3)
  |     |     +-- [NOVO] tipo_combustivel (enum)
  |     |     +-- [NOVO] posto_local TEXT
  |     |     +-- [NOVO] uf_abastecimento CHAR(2)
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
  +-- [VIEW] view_combustivel_media_regiao (combustivel por UF)
  +-- [VIEW] view_consumo_caminhao (combustivel por caminhao)
  +-- [VIEW] view_bi_gastos_viagem (TODOS gastos por viagem+categoria)
  +-- [VIEW] view_bi_gastos_caminhao (TODOS gastos por caminhao+categoria)
  +-- [VIEW] view_bi_gastos_motorista (TODOS gastos por motorista+categoria)
  +-- [VIEW] view_bi_tendencia_mensal (TODOS gastos mensal+categoria)
  +-- [RPC]  fn_bi_resumo_completo (breakdown geral)
  +-- [RPC]  fn_bi_custo_por_viagem (custo detalhado por viagem)
  +-- [RPC]  fn_previsao_custo_viagem (previsao total + margem)
```

---

## 13. Checklist de Implementacao

### Migration e Types
- [ ] Migration DDL executada com sucesso (ALTER TABLE + views + RPCs)
- [ ] Types TypeScript atualizados (gasto.ts, database.ts) com 4 novos campos
- [ ] Nenhum campo `preco_litro` armazenado (derivado somente)

### Form de Combustivel
- [ ] GastoForm com campos condicionais (litros, tipo_combustivel, posto_local, UF) quando categoria = Combustivel
- [ ] Validacao: litros + tipo_combustivel obrigatorios para categoria Combustivel
- [ ] Exibicao de preco/litro derivado como campo readonly
- [ ] Botao "Registrar Abastecimento" na pagina de viagem ativa

### Consumo Real
- [ ] consumo-calc.ts usando dados reais de litros
- [ ] Fallback 3.0 km/l quando sem historico
- [ ] EstimativaViagem usando consumo real

### Dashboard BI (somente dono)
- [ ] Rota /bi com restricao `role === 'dono'` (middleware + server action)
- [ ] Admin NAO tem acesso ao /bi
- [ ] Link no sidebar so aparece para dono
- [ ] Breakdown de gastos por categoria (pizza + barras)
- [ ] Custo por viagem com detalhamento
- [ ] Ranking de caminhoes e motoristas por custo
- [ ] Tendencia mensal (linhas empilhadas)
- [ ] Media de preco de combustivel por UF
- [ ] Previsao de custo total (combustivel + pedagio + alimentacao + outros)
- [ ] Margem de lucro estimada (se frete informado)
- [ ] Filtros: periodo, caminhao, motorista, categoria

### Testes
- [ ] Testes unitarios para derivacao de preco/litro
- [ ] Testes unitarios para consumo-calc.ts com dados reais e fallback
- [ ] Testes de integracao para RPCs
- [ ] Teste de acesso: dono ve BI, admin NAO ve BI, motorista NAO ve BI

---

## 14. Rastreabilidade de Decisoes (PO Review)

| # | Divergencia | Resolucao | Fonte |
|---|-------------|-----------|-------|
| 1 | Tabela separada vs estender gasto | Estender `gasto` com 4 colunas | @pm + @architect convergem |
| 2 | litros INTEGER centilitros vs NUMERIC | NUMERIC(10,3) -- medida fisica, nao monetaria | PO review |
| 3 | preco_litro armazenado vs derivado | Derivado: `valor / litros`. Nao armazenar. | PO review |
| 4 | Acesso BI: dono+admin vs somente dono | Somente dono. Stakeholder explicito. | PO review |
| 5 | Campos de localizacao (cidade+UF vs posto+UF) | `posto_local` TEXT + `uf_abastecimento` CHAR(2), ambos opcionais | PO review |
| 6 | Consumo fallback 2.5 vs 3.0 km/l | 3.0 km/l (consistente com consumo-calc.ts existente) | PO review |
| 7 | BI so combustivel vs BI completo | BI completo de TODOS os gastos | Stakeholder esclarecimento v2.0 |
| 8 | Migration SQL | Convergida conforme ajustes acima | PO review final |
