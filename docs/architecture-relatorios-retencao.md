# Arquitetura: Relatorios PDF Mensais e Politica de Retencao de Comprovantes

**Autor:** Aria (Architect)
**Data:** 2026-03-29
**Status:** Proposta para validacao

---

## 1. Visao Geral

Este documento cobre duas funcionalidades complementares:

1. **Relatorio PDF Mensal** -- relatorio consolidado por motorista/caminhao/empresa com viagens, gastos por categoria, abastecimentos, thumbnails de comprovantes e totais.
2. **Politica de Retencao de Storage** -- limpeza automatica de comprovantes apos 3 meses para controlar custos do Supabase Storage.

---

## 2. Estado Atual (Baseline)

### 2.1 PDF (FechamentoPDF.tsx)

- Usa `@react-pdf/renderer` v4.3.2, ja instalado.
- Carregado via `dynamic import()` em `use-fechamento-pdf.ts` (client-side, SSR: false).
- Gera PDF de um unico fechamento: cabecalho, dados do motorista, resumo financeiro, tabela de viagens, tabela de gastos, assinaturas.
- **Nao inclui:** fotos de comprovantes, abastecimentos como secao separada, filtros multi-motorista/caminhao/periodo.
- Tamanho do bundle isolado: ~1.49 MB lazy loaded.

### 2.2 Comprovantes (Storage)

- Bucket: `comprovantes` (privado, signed URLs com 1h de validade).
- Path: `{empresa_id}/{gasto_id}/{timestamp}.{ext}`.
- Compressao client-side: max 1200px, JPEG quality iterativa ate <= 200KB.
- Tipo `FotoComprovante`: id, empresa_id, gasto_id, storage_path, thumbnail_path (null hoje), content_type, size_bytes, uploaded_at.
- **Nao existe:** campo `expirado`, thumbnail_path nunca populado, nenhuma politica de retencao.

### 2.3 RLS

- `foto_comprovante`: dono/admin full access, motorista only own gastos.
- `storage.objects`: duas camadas de policies (migration 20260328 com empresa_id filter + migration 20260330 com policies mais abertas). **ALERTA DE SEGURANCA** -- a migration 20260330300000 cria policies permissivas (`bucket_id = 'comprovantes'` sem filtro de empresa_id) que SOBREPOE as restritivas da 20260328. Isso precisa ser corrigido independentemente.

---

## 3. Relatorio PDF Mensal

### 3.1 Decisao: Client-side vs Server-side

| Criterio | Client-side (atual) | Server-side (API Route) |
|----------|-------------------|------------------------|
| Infraestrutura | Zero (browser gera) | Precisa Node runtime, puppeteer ou @react-pdf/renderer no server |
| Fotos no PDF | Precisa fetch signed URLs + embed como base64 | Acesso direto ao storage, mas mesmo problema de tamanho |
| Tamanho do PDF | Limitado pela RAM do browser | Limitado pela RAM do serverless (Vercel 1024MB max) |
| Latencia | Depende do device do usuario | Mais previsivel, mas precisa servir o blob |
| Complexidade | Baixa (padrao ja existe) | Media (nova API route, streaming) |
| Custo | Zero | Vercel function invocations |

**[AUTO-DECISION] Client-side vs Server-side -> Client-side (razao: padrao ja existe, zero custo, complexidade baixa. Server-side so se justifica quando fotos no PDF forem requisito mandatorio, o que descartamos abaixo).**

### 3.2 Decisao: Fotos inline no PDF vs ZIP separado

| Abordagem | Pros | Contras |
|-----------|------|---------|
| **A: Fotos inline no PDF** | Documento unico, autossuficiente | PDF pesado (30 fotos x 200KB = 6MB+), browser pode travar, @react-pdf/renderer Image com base64 e lento |
| **B: PDF sem fotos + ZIP com fotos** | PDF leve (~100KB), fotos em resolucao original | Dois downloads, UX extra |
| **C: PDF com thumbnails + link para originais** | Compromisso: PDF referencia visual, fotos acessiveis via link | Precisa gerar thumbnails reais, links expiram |

**[AUTO-DECISION] Fotos no PDF -> Opcao C com fallback para B. O PDF inclui thumbnails (~30KB cada, max 10 por pagina) como evidencia visual. Cada thumbnail tem um numero de referencia. Se o usuario precisar das fotos em resolucao original, oferecemos botao "Baixar Comprovantes (ZIP)". Razao: equilibra peso do PDF (~400KB max com thumbs) com praticidade.**

### 3.3 Arquitetura do Componente

```
RelatorioPDF (novo componente)
├── RelatorioPDFCabecalho     -- empresa, periodo, filtros aplicados
├── RelatorioPDFViagens        -- tabela de viagens com subtotal
├── RelatorioPDFGastos         -- tabela de gastos agrupados por categoria
├── RelatorioPDFAbastecimentos -- secao dedicada: posto, litros, tipo combustivel, UF
├── RelatorioPDFComprovantes   -- grid de thumbnails numerados (ref ao gasto)
├── RelatorioPDFTotais         -- resumo financeiro consolidado
└── RelatorioPDFAssinaturas    -- bloco de assinaturas
```

### 3.4 Tipo de Dados (novo)

```typescript
interface RelatorioMensalData {
  empresa: {
    razao_social: string;
    nome_fantasia: string | null;
    cnpj: string;
  };
  periodo: {
    inicio: string;  // YYYY-MM-DD
    fim: string;     // YYYY-MM-DD
  };
  filtros: {
    motorista_ids?: string[];
    caminhao_ids?: string[];
  };
  motoristas: RelatorioMotoristaBloco[];
  totaisGerais: {
    total_viagens: number;    // centavos
    total_gastos: number;     // centavos
    saldo: number;            // centavos
    total_litros: number;
  };
}

interface RelatorioMotoristaBloco {
  motorista: { id: string; nome: string; cpf: string };
  viagens: RelatorioViagemItem[];
  gastosPorCategoria: Record<string, RelatorioGastoItem[]>;
  abastecimentos: RelatorioAbastecimentoItem[];
  comprovanteThumbnails: RelatorioThumbnail[];
  subtotais: {
    total_viagens: number;
    total_gastos: number;
    saldo: number;
    litros: number;
  };
}

interface RelatorioThumbnail {
  ref: string;         // e.g. "C-001" (C de comprovante)
  gasto_id: string;
  gasto_descricao: string;
  thumbnail_base64: string;  // data:image/jpeg;base64,...
  expirado: boolean;
}
```

### 3.5 Hook: use-relatorio-pdf.ts

```
useRelatorioPDF()
├── buscarDadosRelatorio(filtros)   -- server action que monta RelatorioMensalData
│   ├── query fechamentos do periodo
│   ├── query gastos com joins (categoria, viagem)
│   ├── query foto_comprovante com signed URLs
│   └── fetch thumbnails e converter para base64 (limite: 50 por relatorio)
├── gerarPDF(dados)                 -- dynamic import de RelatorioPDF
│   └── pdf().toBlob() -> download
└── gerarZIPComprovantes(dados)     -- (opcional) JSZip com fotos originais
```

### 3.6 Limite de Thumbnails no PDF

Para evitar PDF gigante:
- Maximo 50 thumbnails por relatorio.
- Thumbnails redimensionados para 200x200px, JPEG quality 0.5 (~15-30KB cada).
- Se > 50 comprovantes no periodo, PDF mostra "50 de N comprovantes. Baixe o ZIP para ver todos."
- Estimativa: 50 thumbs x 25KB = ~1.25MB de imagens + ~100KB de texto = **~1.4MB max por PDF**.

### 3.7 Reutilizacao do FechamentoPDF Existente

O `FechamentoPDF.tsx` atual continua como esta -- ele serve para um fechamento individual. O `RelatorioPDF` e um componente NOVO, mais amplo, que pode consolidar multiplos fechamentos. Compartilham:
- Styles (extrair para `pdf-styles.ts`)
- Helpers: `formatBRL`, `formatarData`, `mascararCpf`
- Pattern de dynamic import

---

## 4. Politica de Retencao de Storage

### 4.1 Analise das Opcoes

| Opcao | Mecanismo | Pros | Contras |
|-------|-----------|------|---------|
| **A: Supabase Edge Function + pg_cron** | Edge Function chamada diariamente | Nativo Supabase, sem infra extra | Edge Functions tem limite de execucao (50ms free, 500ms Pro), pg_cron precisa plano Pro |
| **B: Database Function + pg_cron** | Function PL/pgSQL pura + cron | Mais simples, sem Edge Function | pg_cron precisa plano Pro |
| **C: GitHub Action scheduled** | Cron no GitHub chama API Supabase | Funciona no free tier, infra ja existe | Depende do GitHub, service_role key no secrets |
| **D: Supabase Lifecycle Policies** | Nativo | Zero codigo | **NAO EXISTE** -- Supabase nao tem lifecycle policies nativas para storage |

**[AUTO-DECISION] Retencao -> Opcao C (GitHub Action) como implementacao inicial, com migracao para B quando/se migrar para Supabase Pro. Razao: funciona no free tier, GitHub Actions ja e infra do projeto, zero custo adicional, execucao confiavel.**

### 4.2 Verificacao: Supabase NAO tem Lifecycle Policies

Confirmado via pesquisa: Supabase Storage nao oferece lifecycle policies automaticas. A feature e frequentemente solicitada pela comunidade mas nao foi implementada. A unica forma e via scripts manuais (cron jobs, Edge Functions, ou scripts externos).

### 4.3 Arquitetura da Retencao

```
GitHub Action (cron: 0 3 * * *)  -- roda as 3h UTC diariamente
│
├── 1. Query foto_comprovante WHERE uploaded_at < NOW() - 90 days
│      AND expirado = false
│
├── 2. Para cada batch de 100 registros:
│   ├── DELETE storage.objects (via Supabase Storage API)
│   └── UPDATE foto_comprovante SET expirado = true, expirado_em = NOW()
│
├── 3. Log resultado: {total_processado, total_erros, storage_liberado_bytes}
│
└── 4. (Opcional) Notificar via webhook se erros > threshold
```

### 4.4 Seguranca do GitHub Action

- `SUPABASE_SERVICE_ROLE_KEY` no GitHub Secrets (NUNCA no codigo).
- Action usa service_role para bypassar RLS (necessario para cleanup cross-empresa).
- Script Node.js minimo no repositorio: `scripts/cleanup-comprovantes.mjs`.
- Rate limiting: batch de 100, sleep 500ms entre batches para nao sobrecarregar.

### 4.5 Script de Cleanup

```
scripts/cleanup-comprovantes.mjs
├── Conecta via @supabase/supabase-js com service_role
├── Query: foto_comprovante WHERE expirado = false AND uploaded_at < threshold
├── Batch delete: storage.from('comprovantes').remove([paths])
├── Batch update: foto_comprovante SET expirado = true
├── Stdout: JSON com metricas (para logs do GitHub Action)
└── Exit code: 0 (sucesso), 1 (erros parciais), 2 (falha total)
```

---

## 5. Migration: Campo `expirado`

```sql
-- Migration: Add expiration tracking to foto_comprovante
-- Architecture: Relatorios e Retencao

ALTER TABLE foto_comprovante
  ADD COLUMN expirado BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE foto_comprovante
  ADD COLUMN expirado_em TIMESTAMPTZ;

-- Index para queries de cleanup (buscar nao-expirados antigos)
CREATE INDEX idx_foto_comprovante_retencao
  ON foto_comprovante (uploaded_at)
  WHERE expirado = false;

-- Constraint: expirado_em so pode ser preenchido se expirado = true
ALTER TABLE foto_comprovante
  ADD CONSTRAINT ck_expirado_consistency
  CHECK (
    (expirado = false AND expirado_em IS NULL)
    OR (expirado = true AND expirado_em IS NOT NULL)
  );

COMMENT ON COLUMN foto_comprovante.expirado IS 'true quando arquivo foi removido do storage por politica de retencao';
COMMENT ON COLUMN foto_comprovante.expirado_em IS 'Data/hora em que o arquivo foi removido do storage';
```

### 5.1 Impacto nos Componentes Existentes

| Componente | Mudanca |
|------------|---------|
| `ComprovantesUpload.tsx` | Filtrar `comprovantes.filter(c => !c.expirado)` para lista ativa |
| `comprovante-actions.ts` | `listComprovantes` deve retornar flag expirado; UI mostra placeholder |
| `types/foto-comprovante.ts` | Adicionar `expirado: boolean; expirado_em: string \| null` |
| Novo: componente `ComprovanteExpirado` | Placeholder visual: "Comprovante expirado em DD/MM/YYYY" |

---

## 6. Estimativa de Storage

### 6.1 Premissas

| Variavel | Valor | Fonte |
|----------|-------|-------|
| Motoristas ativos | 100 | Cenario MVP escala |
| Fotos/mes por motorista | 30 | ~1 por dia (gastos) |
| Tamanho medio apos compressao | ~150KB | compress-image.ts: max 200KB, media estimada 150KB |
| Retencao | 3 meses | Requisito |

### 6.2 Calculo

```
Mensal:  100 motoristas x 30 fotos x 150KB = 450MB/mes
3 meses: 450MB x 3 = 1.35GB pico
```

### 6.3 Limites do Supabase

| Plano | Storage | Implicacao |
|-------|---------|------------|
| Free | 1GB | **INSUFICIENTE** -- estoura em ~2 meses |
| Pro ($25/mo) | 100GB | Mais que suficiente |
| Alternativa | Reduzir compressao para ~100KB | 1GB = 3.3 meses com 100 motoristas |

**[AUTO-DECISION] Storage tier -> Recomendar Supabase Pro para producao. Para MVP/beta com < 30 motoristas: free tier aguenta ~6 meses (30 x 30 x 150KB = 135MB/mes, 3 meses = 405MB). Quando escalar, migrar para Pro e obrigatoriamente acompanha com Opcao B (pg_cron).**

### 6.4 Otimizacao: Reduzir DEFAULT_MAX_KB

Consideracao para o futuro: reduzir de 200KB para 100KB em `compress-image.ts`. Impacto visual minimo (fotos de nota fiscal/comprovante nao precisam de alta resolucao). Economiza ~50% de storage. Decisao deve ser validada com UX.

---

## 7. Alerta de Seguranca: Storage Policies Conflitantes

A migration `20260330300000_create_storage_policies.sql` cria policies PERMISSIVAS:

```sql
-- PROBLEMA: qualquer authenticated user pode acessar QUALQUER comprovante
CREATE POLICY "Users can view comprovantes" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'comprovantes');  -- sem filtro de empresa_id!
```

Enquanto a migration `20260328180600` ja criava policies RESTRITIVAS com filtro `fn_get_empresa_id()`.

**Risco:** PostgreSQL RLS e OR-based para multiplas policies. Se QUALQUER policy permite, o acesso e concedido. Portanto, as policies permissivas da 20260330 anulam completamente as restritivas da 20260328.

**Recomendacao:** Criar migration para DROP das policies permissivas:

```sql
DROP POLICY IF EXISTS "Users can upload comprovantes" ON storage.objects;
DROP POLICY IF EXISTS "Users can view comprovantes" ON storage.objects;
DROP POLICY IF EXISTS "Users can update comprovantes" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete comprovantes" ON storage.objects;
```

**Severidade: ALTA** -- qualquer usuario autenticado pode ver/deletar comprovantes de QUALQUER empresa.

---

## 8. Stories Sugeridas

### Story R.1 -- Relatorio PDF Mensal Consolidado

**Escopo:** Novo componente `RelatorioPDF` com secoes de viagens, gastos por categoria, abastecimentos, thumbnails de comprovantes e totais. Hook `use-relatorio-pdf`. Server action para montar dados.

**Acceptance Criteria:**
- [ ] Filtros: motorista(s), caminhao(s), empresa, periodo
- [ ] Secoes: cabecalho, viagens, gastos por categoria, abastecimentos, comprovantes (thumbnails), totais
- [ ] PDF gerado client-side via @react-pdf/renderer (lazy loaded)
- [ ] Thumbnails limitados a 50 por relatorio, 200x200px
- [ ] CPF mascarado (LGPD)
- [ ] Arquivo < 2MB para cenario tipico

**Estimativa:** 8 pontos

### Story R.2 -- Download ZIP de Comprovantes

**Escopo:** Botao "Baixar Comprovantes" que gera ZIP com fotos originais do periodo selecionado.

**Acceptance Criteria:**
- [ ] JSZip client-side
- [ ] Nomes dos arquivos: `{categoria}-{data}-{ref}.jpg`
- [ ] Progress bar durante download
- [ ] Limite: 200 arquivos por ZIP

**Estimativa:** 3 pontos

### Story R.3 -- Politica de Retencao de Comprovantes

**Escopo:** Migration para campo `expirado`, GitHub Action para cleanup diario, componente placeholder.

**Acceptance Criteria:**
- [ ] Campo `expirado` e `expirado_em` na foto_comprovante
- [ ] GitHub Action roda diariamente (cron)
- [ ] Comprovantes > 90 dias marcados como expirados e removidos do storage
- [ ] UI mostra "Comprovante expirado em DD/MM/YYYY" para registros expirados
- [ ] Logs de execucao no GitHub Actions

**Estimativa:** 5 pontos

### Story R.4 -- Correcao de Storage Policies (URGENTE)

**Escopo:** Remover policies permissivas da migration 20260330300000.

**Acceptance Criteria:**
- [ ] Drop das 4 policies permissivas
- [ ] Verificar que policies restritivas da 20260328 continuam funcionando
- [ ] Teste: usuario A nao acessa comprovantes da empresa B

**Estimativa:** 2 pontos (PRIORIDADE: imediata, bug de seguranca)

---

## 9. Diagrama de Fluxo

```
[Usuario seleciona filtros]
        |
        v
[Server Action: buscarDadosRelatorio]
        |
        ├── Query fechamentos do periodo
        ├── Query gastos + joins (categoria, viagem, abastecimento)
        ├── Query foto_comprovante WHERE expirado = false
        ├── Fetch signed URLs dos comprovantes
        └── Para cada comprovante (max 50):
            └── Fetch thumbnail -> resize 200x200 -> base64
        |
        v
[RelatorioMensalData montado]
        |
        v
[dynamic import RelatorioPDF]
        |
        v
[pdf().toBlob() -> download]


[GitHub Action: cleanup-comprovantes] (cron diario)
        |
        v
[Query: foto_comprovante WHERE expirado=false AND uploaded_at < 90d]
        |
        v
[Batch: storage.remove(paths) + UPDATE expirado=true]
        |
        v
[Log metricas: processados, erros, bytes liberados]
```

---

## 10. Trade-offs e Riscos

| Decisao | Trade-off | Mitigacao |
|---------|-----------|-----------|
| Client-side PDF | Depende do device/browser do usuario | Limite de 50 thumbs, PDF < 2MB |
| Thumbnails base64 no PDF | Aumenta tamanho do PDF | Cap de 50, resize agressivo |
| GitHub Action para retencao | Depende do GitHub estar disponivel | Idempotente (re-rodar nao causa dano) |
| Retencao 3 meses | Motorista perde acesso apos 90 dias | Registro no DB permanece (expirado=true), pode gerar relatorio antes |
| Free tier para MVP | 1GB pode nao ser suficiente para escala | Monitorar uso, migrar para Pro quando > 30 motoristas ativos |

---

## 11. Dependencias Tecnicas

| Dependencia | Status | Acao |
|-------------|--------|------|
| `@react-pdf/renderer` v4.3.2 | Instalado | Nenhuma |
| `@react-pdf/renderer` Image component | Nao usado hoje | Testar com base64 data URIs |
| JSZip | Nao instalado | `npm install jszip` (Story R.2) |
| GitHub Actions | Configurado no repo | Adicionar workflow `.github/workflows/cleanup-comprovantes.yml` |
| `SUPABASE_SERVICE_ROLE_KEY` | Deve existir nos secrets | Verificar |
| Supabase Pro (producao) | Nao contratado | Necessario para > 30 motoristas |

---

## 12. Ordem de Implementacao Recomendada

1. **R.4** -- Corrigir Storage Policies (URGENTE, seguranca)
2. **R.3** -- Migration `expirado` + GitHub Action (infraestrutura)
3. **R.1** -- Relatorio PDF Mensal (feature principal)
4. **R.2** -- ZIP de Comprovantes (complementar)

---

*Documento gerado por Aria (Architect) -- AIOX Framework*
*Aguardando validacao do PO antes de iniciar stories.*
