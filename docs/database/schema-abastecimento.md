# Schema Design: Abastecimento (Notas de Combustivel)

**Data:** 2026-03-29
**Autor:** Dara (Data Engineer)
**Status:** Proposta para revisao

---

## 1. Analise do Schema Atual

### 1.1 Relacao gasto <-> viagem

A tabela `gasto` ja possui `viagem_id UUID` com FK para `viagem(id) ON DELETE SET NULL` (adicionada na migration `180700`). Isso significa que qualquer gasto, incluindo combustivel, ja pode ser vinculado a uma viagem. Porem, o vinculo e **opcional** (nullable).

### 1.2 Tabela gasto - campos existentes

```
gasto
  id              UUID PK
  empresa_id      UUID NOT NULL -> empresa
  categoria_id    UUID NOT NULL -> categoria_gasto
  motorista_id    UUID NOT NULL -> motorista
  caminhao_id     UUID          -> caminhao (nullable)
  viagem_id       UUID          -> viagem (nullable)
  valor           INTEGER       -- centavos
  data            DATE
  descricao       TEXT
  foto_url        TEXT          -- URL principal no Storage
  km_registro     INTEGER
  created_by      UUID          -> usuario
```

A categoria "Combustivel" ja existe como seed (icone `fuel`, cor `#EF4444`, ordem 2).

### 1.3 Tabela combustivel_preco

Armazena **precos de referencia** por empresa e regiao para **estimativas de custo**. NAO armazena abastecimentos reais. Campos:

```
combustivel_preco
  id               UUID PK
  empresa_id       UUID NOT NULL -> empresa
  regiao           TEXT (default 'Geral')
  tipo             combustivel_tipo ENUM ('diesel_s10', 'diesel_comum')
  preco_centavos   INTEGER       -- preco por litro em centavos
  data_referencia  DATE
  fonte            TEXT
  ativo            BOOLEAN
```

### 1.4 Tabela foto_comprovante

Vinculada a `gasto` via `gasto_id UUID NOT NULL -> gasto(id) ON DELETE CASCADE`. Multiplas fotos por gasto. Campos:

```
foto_comprovante
  id             UUID PK
  empresa_id     UUID NOT NULL -> empresa
  gasto_id       UUID NOT NULL -> gasto
  storage_path   TEXT
  thumbnail_path TEXT
  content_type   VARCHAR(50)
  size_bytes     INTEGER
```

---

## 2. Decisao: Opcao A (nova tabela) vs Opcao B (estender gasto)

### Analise comparativa

| Criterio | Opcao A (tabela `abastecimento`) | Opcao B (estender `gasto`) |
|----------|----------------------------------|----------------------------|
| Normalizacao | Dados especificos isolados | Campos nullable poluem gasto |
| Queries BI | JOINs simples, views dedicadas | WHERE categoria = 'Combustivel' |
| Complexidade app | Duas APIs (gasto + abastecimento) | Uma API (gasto com campos extras) |
| Fotos | Precisa nova relacao ou adaptar foto_comprovante | Reutiliza foto_comprovante diretamente |
| Consistencia | Duplica empresa_id, motorista_id, viagem_id | Dados ja existem em gasto |
| Fechamento financeiro | Precisa adaptar fn_calcular_fechamento | Fechamento ja soma gastos automaticamente |
| RLS | Novas policies | Policies existentes cobrem |

### [AUTO-DECISION] Nova tabela ou estender gasto? -> **Opcao B estendida** (reason: a tabela `gasto` ja vincula a viagem, ja tem categoria Combustivel, ja tem foto_comprovante, ja integra com fechamento financeiro. Criar tabela separada duplicaria dados e quebraria o fluxo de fechamento. A solucao e criar uma tabela complementar `abastecimento_detalhe` que extende gasto com dados especificos de combustivel, mantendo gasto como registro financeiro canonico.)

### Decisao final: Opcao Hibrida

**Tabela `abastecimento_detalhe`** que complementa `gasto` com dados especificos de combustivel. O registro financeiro continua em `gasto`, o detalhe tecnico (litros, preco/litro, posto, localizacao) fica em `abastecimento_detalhe`.

**Vantagens:**
- Gasto continua sendo a unica fonte de verdade financeira
- Fechamento financeiro funciona sem alteracao
- foto_comprovante reutilizada sem mudancas
- RLS de gasto cobre automaticamente
- Queries BI fazem JOIN gasto + abastecimento_detalhe
- Sem campos nullable poluindo gasto generico
- Sem duplicacao de empresa_id/motorista_id/viagem_id

---

## 3. Proposta de Schema

### 3.1 Tabela: abastecimento_detalhe

```sql
-- =============================================================================
-- Migration: Create abastecimento_detalhe table
-- Complementa gasto com dados especificos de abastecimento de combustivel.
-- O registro financeiro (valor em centavos) permanece em gasto.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. TABLE: abastecimento_detalhe
-- ---------------------------------------------------------------------------
CREATE TABLE abastecimento_detalhe (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gasto_id        UUID NOT NULL UNIQUE REFERENCES gasto(id) ON DELETE CASCADE,
  litros          NUMERIC(10,2) NOT NULL,
  preco_litro     NUMERIC(10,4) NOT NULL,  -- R$/litro (ex: 6.4590)
  tipo_combustivel combustivel_tipo NOT NULL DEFAULT 'diesel_s10',
  km_odometro     INTEGER,                  -- leitura do odometro no momento
  posto           TEXT,                      -- nome do posto
  bandeira        TEXT,                      -- bandeira (Shell, BR, Ipiranga, etc)
  cidade          TEXT NOT NULL,
  estado          CHAR(2) NOT NULL,
  observacao      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT ck_abdet_litros CHECK (litros > 0),
  CONSTRAINT ck_abdet_preco CHECK (preco_litro > 0),
  CONSTRAINT ck_abdet_km CHECK (km_odometro IS NULL OR km_odometro >= 0),
  CONSTRAINT ck_abdet_estado CHECK (estado ~ '^[A-Z]{2}$')
);

COMMENT ON TABLE abastecimento_detalhe IS
  'Detalhes de abastecimento vinculados a um gasto de categoria Combustivel. Relacao 1:1 com gasto.';
COMMENT ON COLUMN abastecimento_detalhe.gasto_id IS
  'FK 1:1 para gasto. O gasto contem valor (centavos), motorista, viagem, empresa.';
COMMENT ON COLUMN abastecimento_detalhe.preco_litro IS
  'Preco por litro em reais com 4 casas decimais. Validacao: gasto.valor/100 ~= litros * preco_litro.';
COMMENT ON COLUMN abastecimento_detalhe.km_odometro IS
  'Leitura do odometro no momento do abastecimento. Usado para calcular consumo medio.';

-- ---------------------------------------------------------------------------
-- 2. TRIGGER: auto-update updated_at
-- ---------------------------------------------------------------------------
CREATE TRIGGER trg_abastecimento_detalhe_updated_at
  BEFORE UPDATE ON abastecimento_detalhe
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. INDEXES
-- ---------------------------------------------------------------------------
-- gasto_id ja tem UNIQUE index implicito
CREATE INDEX idx_abdet_cidade_estado ON abastecimento_detalhe (estado, cidade);
CREATE INDEX idx_abdet_tipo_combustivel ON abastecimento_detalhe (tipo_combustivel);

-- ---------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------
ALTER TABLE abastecimento_detalhe ENABLE ROW LEVEL SECURITY;

-- Herda acesso do gasto pai: quem pode ver o gasto pode ver o detalhe
CREATE POLICY "abdet_select"
  ON abastecimento_detalhe FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM gasto g
      WHERE g.id = abastecimento_detalhe.gasto_id
      AND g.empresa_id = fn_get_empresa_id()
      AND (
        fn_get_user_role() IN ('dono', 'admin')
        OR g.motorista_id = fn_get_motorista_id()
      )
    )
  );

-- Motorista pode inserir detalhe nos proprios gastos
CREATE POLICY "abdet_insert"
  ON abastecimento_detalhe FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM gasto g
      WHERE g.id = abastecimento_detalhe.gasto_id
      AND g.empresa_id = fn_get_empresa_id()
      AND (
        fn_get_user_role() IN ('dono', 'admin')
        OR g.motorista_id = fn_get_motorista_id()
      )
    )
  );

-- Motorista pode atualizar detalhe dos proprios gastos
CREATE POLICY "abdet_update"
  ON abastecimento_detalhe FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM gasto g
      WHERE g.id = abastecimento_detalhe.gasto_id
      AND g.empresa_id = fn_get_empresa_id()
      AND (
        fn_get_user_role() IN ('dono', 'admin')
        OR g.motorista_id = fn_get_motorista_id()
      )
    )
  );

-- Dono/admin pode deletar
CREATE POLICY "abdet_delete"
  ON abastecimento_detalhe FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM gasto g
      WHERE g.id = abastecimento_detalhe.gasto_id
      AND g.empresa_id = fn_get_empresa_id()
      AND fn_get_user_role() IN ('dono', 'admin')
    )
  );
```

### 3.2 Validacao de consistencia: trigger de integridade

```sql
-- ---------------------------------------------------------------------------
-- 5. TRIGGER: validar que o gasto e de categoria Combustivel
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_validate_abastecimento_gasto()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_cat_nome TEXT;
BEGIN
  SELECT cg.nome INTO v_cat_nome
  FROM gasto g
  JOIN categoria_gasto cg ON cg.id = g.categoria_id
  WHERE g.id = NEW.gasto_id;

  IF v_cat_nome IS NULL THEN
    RAISE EXCEPTION 'Gasto % nao encontrado', NEW.gasto_id;
  END IF;

  IF v_cat_nome <> 'Combustivel' THEN
    RAISE EXCEPTION 'Gasto % nao e de categoria Combustivel (categoria: %)', NEW.gasto_id, v_cat_nome;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_abastecimento_gasto
  BEFORE INSERT OR UPDATE ON abastecimento_detalhe
  FOR EACH ROW EXECUTE FUNCTION fn_validate_abastecimento_gasto();
```

---

## 4. Views e RPCs para BI

### 4.1 View: Media de preco por regiao

```sql
CREATE OR REPLACE VIEW vw_media_combustivel_regiao AS
SELECT
  g.empresa_id,
  ad.estado,
  ad.cidade,
  ad.tipo_combustivel,
  COUNT(*)                                      AS total_abastecimentos,
  ROUND(AVG(ad.preco_litro), 4)                AS preco_medio_litro,
  ROUND(MIN(ad.preco_litro), 4)                AS preco_min_litro,
  ROUND(MAX(ad.preco_litro), 4)                AS preco_max_litro,
  SUM(ad.litros)                                AS total_litros,
  SUM(g.valor)                                  AS total_centavos,
  MIN(g.data)                                   AS primeira_data,
  MAX(g.data)                                   AS ultima_data
FROM abastecimento_detalhe ad
JOIN gasto g ON g.id = ad.gasto_id
GROUP BY g.empresa_id, ad.estado, ad.cidade, ad.tipo_combustivel;

COMMENT ON VIEW vw_media_combustivel_regiao IS
  'Media de preco de combustivel por cidade/estado. Filtrar por empresa_id via RLS do gasto.';
```

### 4.2 View: Custo combustivel por caminhao

```sql
CREATE OR REPLACE VIEW vw_custo_combustivel_caminhao AS
SELECT
  g.empresa_id,
  g.caminhao_id,
  c.placa,
  c.modelo,
  ad.tipo_combustivel,
  COUNT(*)                                      AS total_abastecimentos,
  SUM(g.valor)                                  AS total_centavos,
  SUM(ad.litros)                                AS total_litros,
  ROUND(AVG(ad.preco_litro), 4)                AS preco_medio_litro,
  -- Consumo medio: km_percorrido / litros (se tiver dados de odometro)
  CASE
    WHEN COUNT(ad.km_odometro) >= 2
    THEN ROUND(
      (MAX(ad.km_odometro) - MIN(ad.km_odometro))::NUMERIC
      / NULLIF(SUM(ad.litros), 0), 2
    )
  END                                           AS km_por_litro_estimado,
  MIN(g.data)                                   AS primeiro_abastecimento,
  MAX(g.data)                                   AS ultimo_abastecimento
FROM abastecimento_detalhe ad
JOIN gasto g ON g.id = ad.gasto_id
JOIN caminhao c ON c.id = g.caminhao_id
WHERE g.caminhao_id IS NOT NULL
GROUP BY g.empresa_id, g.caminhao_id, c.placa, c.modelo, ad.tipo_combustivel;

COMMENT ON VIEW vw_custo_combustivel_caminhao IS
  'Total de combustivel por caminhao com estimativa de km/l.';
```

### 4.3 View: Custo combustivel por motorista

```sql
CREATE OR REPLACE VIEW vw_custo_combustivel_motorista AS
SELECT
  g.empresa_id,
  g.motorista_id,
  m.nome AS motorista_nome,
  ad.tipo_combustivel,
  COUNT(*)                                      AS total_abastecimentos,
  SUM(g.valor)                                  AS total_centavos,
  SUM(ad.litros)                                AS total_litros,
  ROUND(AVG(ad.preco_litro), 4)                AS preco_medio_litro,
  MIN(g.data)                                   AS primeiro_abastecimento,
  MAX(g.data)                                   AS ultimo_abastecimento
FROM abastecimento_detalhe ad
JOIN gasto g ON g.id = ad.gasto_id
JOIN motorista m ON m.id = g.motorista_id
GROUP BY g.empresa_id, g.motorista_id, m.nome, ad.tipo_combustivel;

COMMENT ON VIEW vw_custo_combustivel_motorista IS
  'Total de combustivel por motorista.';
```

### 4.4 View: Custo combustivel por viagem

```sql
CREATE OR REPLACE VIEW vw_custo_combustivel_viagem AS
SELECT
  g.empresa_id,
  g.viagem_id,
  v.origem,
  v.destino,
  v.km_estimado,
  v.motorista_id,
  m.nome AS motorista_nome,
  COUNT(*)                                      AS total_abastecimentos,
  SUM(g.valor)                                  AS total_centavos,
  SUM(ad.litros)                                AS total_litros,
  ROUND(AVG(ad.preco_litro), 4)                AS preco_medio_litro,
  CASE
    WHEN v.km_estimado IS NOT NULL AND SUM(ad.litros) > 0
    THEN ROUND(v.km_estimado::NUMERIC / SUM(ad.litros), 2)
  END                                           AS km_por_litro_viagem
FROM abastecimento_detalhe ad
JOIN gasto g ON g.id = ad.gasto_id
JOIN viagem v ON v.id = g.viagem_id
JOIN motorista m ON m.id = v.motorista_id
WHERE g.viagem_id IS NOT NULL
GROUP BY g.empresa_id, g.viagem_id, v.origem, v.destino, v.km_estimado,
         v.motorista_id, m.nome;

COMMENT ON VIEW vw_custo_combustivel_viagem IS
  'Custo de combustivel por viagem com km/l estimado.';
```

### 4.5 Funcao: Estimativa de custo de viagem

```sql
CREATE OR REPLACE FUNCTION fn_estimativa_custo_viagem(
  p_empresa_id UUID,
  p_km_estimado INTEGER,
  p_consumo_medio_km_l NUMERIC DEFAULT NULL,
  p_tipo_combustivel combustivel_tipo DEFAULT 'diesel_s10'
)
RETURNS TABLE (
  consumo_usado_km_l NUMERIC,
  preco_medio_litro NUMERIC,
  litros_estimados NUMERIC,
  custo_estimado_centavos INTEGER,
  fonte_consumo TEXT,
  fonte_preco TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_consumo NUMERIC;
  v_preco NUMERIC;
  v_fonte_consumo TEXT;
  v_fonte_preco TEXT;
BEGIN
  -- 1. Determinar consumo medio (km/l)
  IF p_consumo_medio_km_l IS NOT NULL THEN
    v_consumo := p_consumo_medio_km_l;
    v_fonte_consumo := 'parametro_manual';
  ELSE
    -- Buscar consumo medio do historico da empresa (ultimos 90 dias)
    SELECT ROUND(
      (MAX(ad.km_odometro) - MIN(ad.km_odometro))::NUMERIC
      / NULLIF(SUM(ad.litros), 0), 2
    )
    INTO v_consumo
    FROM abastecimento_detalhe ad
    JOIN gasto g ON g.id = ad.gasto_id
    WHERE g.empresa_id = p_empresa_id
      AND ad.tipo_combustivel = p_tipo_combustivel
      AND ad.km_odometro IS NOT NULL
      AND g.data >= CURRENT_DATE - INTERVAL '90 days';

    v_fonte_consumo := 'historico_empresa_90d';

    -- Fallback: valor padrao cegonheiro (~2.5 km/l)
    IF v_consumo IS NULL OR v_consumo <= 0 THEN
      v_consumo := 2.5;
      v_fonte_consumo := 'padrao_cegonheiro';
    END IF;
  END IF;

  -- 2. Determinar preco medio por litro
  -- Primeiro: preco mais recente da tabela combustivel_preco
  SELECT cp.preco_centavos::NUMERIC / 100
  INTO v_preco
  FROM combustivel_preco cp
  WHERE cp.empresa_id = p_empresa_id
    AND cp.tipo = p_tipo_combustivel
    AND cp.ativo = true
  ORDER BY cp.data_referencia DESC
  LIMIT 1;

  IF v_preco IS NOT NULL THEN
    v_fonte_preco := 'combustivel_preco';
  ELSE
    -- Fallback: media dos abastecimentos reais dos ultimos 30 dias
    SELECT ROUND(AVG(ad.preco_litro), 4)
    INTO v_preco
    FROM abastecimento_detalhe ad
    JOIN gasto g ON g.id = ad.gasto_id
    WHERE g.empresa_id = p_empresa_id
      AND ad.tipo_combustivel = p_tipo_combustivel
      AND g.data >= CURRENT_DATE - INTERVAL '30 days';

    v_fonte_preco := 'media_abastecimentos_30d';

    -- Ultimo fallback
    IF v_preco IS NULL THEN
      v_preco := 6.50;
      v_fonte_preco := 'padrao_nacional';
    END IF;
  END IF;

  -- 3. Calcular estimativa
  RETURN QUERY SELECT
    v_consumo,
    v_preco,
    ROUND(p_km_estimado::NUMERIC / v_consumo, 2),
    (ROUND(p_km_estimado::NUMERIC / v_consumo * v_preco * 100))::INTEGER,
    v_fonte_consumo,
    v_fonte_preco;
END;
$$;

COMMENT ON FUNCTION fn_estimativa_custo_viagem IS
  'Estima custo de combustivel para uma viagem dado km e consumo medio.
   Usa historico real quando disponivel, com fallbacks seguros.
   Retorna litros estimados, custo em centavos e fontes de dados usadas.';
```

---

## 5. Estrategia de Indices

### Indices ja cobertos

| Tabela | Indice | Queries que atende |
|--------|--------|--------------------|
| `gasto` | `idx_gasto_empresa_data` | Dashboard: gastos por periodo |
| `gasto` | `idx_gasto_motorista` | Gastos do motorista |
| `gasto` | `idx_gasto_caminhao` | Gastos por caminhao |
| `gasto` | `idx_gasto_categoria` | Filtro por tipo (Combustivel) |
| `gasto` | `idx_gasto_motorista_data` | Historico motorista |

### Indices novos (abastecimento_detalhe)

| Indice | Proposito |
|--------|-----------|
| `UNIQUE(gasto_id)` | Implicito pela constraint UNIQUE. Garante 1:1. |
| `idx_abdet_cidade_estado` | View `vw_media_combustivel_regiao` (GROUP BY estado, cidade) |
| `idx_abdet_tipo_combustivel` | Filtro por tipo diesel |

### Indice recomendado em gasto (novo)

```sql
-- Indice para queries BI que filtram gasto por categoria + viagem
CREATE INDEX idx_gasto_viagem
  ON gasto (viagem_id) WHERE viagem_id IS NOT NULL;
```

Este indice ja seria util mesmo sem abastecimento_detalhe, pois a view `vw_custo_combustivel_viagem` faz JOIN gasto-viagem.

---

## 6. Foto do Comprovante

### Decisao: Reutilizar foto_comprovante existente

**Sim.** A tabela `foto_comprovante` ja esta vinculada a `gasto` via `gasto_id`. Como o abastecimento e um `gasto`, o fluxo de foto funciona automaticamente:

1. Motorista cria `gasto` com categoria "Combustivel"
2. Motorista cria `abastecimento_detalhe` vinculado ao gasto
3. Motorista faz upload de foto via `foto_comprovante` (vinculada ao mesmo gasto_id)

**Nenhuma alteracao necessaria em foto_comprovante.**

O storage path continua: `{empresa_id}/{gasto_id}/{timestamp}.{ext}`

---

## 7. Fluxo de Dados Completo

```
Motorista lanca nota de combustivel:

1. INSERT gasto (
     empresa_id, categoria_id='Combustivel', motorista_id,
     caminhao_id, viagem_id, valor=centavos, data, km_registro
   )
   -> Retorna gasto.id

2. INSERT abastecimento_detalhe (
     gasto_id, litros, preco_litro, tipo_combustivel,
     km_odometro, posto, bandeira, cidade, estado
   )

3. INSERT foto_comprovante (
     empresa_id, gasto_id, storage_path, content_type, size_bytes
   )
   -> Upload da foto para bucket 'comprovantes'

Tudo em uma transacao. Se falhar, rollback completo.
```

---

## 8. Diagrama ER (Relacoes Relevantes)

```
empresa (1) ----< (N) gasto
                       |
                       |-- (1:1) abastecimento_detalhe  [NOVO]
                       |-- (1:N) foto_comprovante
                       |
viagem  (1) ----< (N) gasto
motorista (1) --< (N) gasto
caminhao (1) ---< (N) gasto

combustivel_preco  -- tabela de referencia independente
                   -- usada por fn_estimativa_custo_viagem
```

---

## 9. Plano de Rollback

```sql
-- Rollback: remover abastecimento_detalhe e objetos dependentes
-- Ordem reversa de criacao

DROP TRIGGER IF EXISTS trg_validate_abastecimento_gasto ON abastecimento_detalhe;
DROP FUNCTION IF EXISTS fn_validate_abastecimento_gasto();

DROP VIEW IF EXISTS vw_custo_combustivel_viagem;
DROP VIEW IF EXISTS vw_custo_combustivel_motorista;
DROP VIEW IF EXISTS vw_custo_combustivel_caminhao;
DROP VIEW IF EXISTS vw_media_combustivel_regiao;

DROP FUNCTION IF EXISTS fn_estimativa_custo_viagem(UUID, INTEGER, NUMERIC, combustivel_tipo);

DROP INDEX IF EXISTS idx_gasto_viagem;

DROP TRIGGER IF EXISTS trg_abastecimento_detalhe_updated_at ON abastecimento_detalhe;
DROP TABLE IF EXISTS abastecimento_detalhe;
```

---

## 10. Migration Completa (pronta para aplicar)

**Arquivo sugerido:** `supabase/migrations/20260329180000_create_abastecimento_detalhe.sql`

A migration deve conter, nesta ordem:
1. CREATE TABLE abastecimento_detalhe
2. TRIGGER updated_at
3. INDEXES
4. RLS policies (4 policies: select, insert, update, delete)
5. TRIGGER validacao categoria combustivel
6. INDEX idx_gasto_viagem em gasto
7. VIEW vw_media_combustivel_regiao
8. VIEW vw_custo_combustivel_caminhao
9. VIEW vw_custo_combustivel_motorista
10. VIEW vw_custo_combustivel_viagem
11. FUNCTION fn_estimativa_custo_viagem

Todo o SQL ja esta documentado nas secoes acima, pronto para consolidacao em arquivo unico.

---

## 11. Checklist Pre-Implementacao

- [ ] Revisar se ENUM `combustivel_tipo` (`diesel_s10`, `diesel_comum`) cobre todos os tipos necessarios (etanol? gasolina? provavelmente nao para cegonheiros)
- [ ] Confirmar se `bandeira` precisa ser ENUM ou TEXT livre
- [ ] Validar se cidade/estado devem ser NOT NULL (motorista pode nao saber?)
- [ ] Decidir se km_odometro deve ser obrigatorio (importante para calcular consumo)
- [ ] Testar RLS policies com roles dono, admin e motorista
- [ ] Verificar performance das views com volume estimado de dados
