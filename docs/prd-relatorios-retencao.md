# PRD: Relatorios Mensais e Politica de Retencao de Comprovantes

**Produto:** FrotaViva (Siga Bem)
**Versao:** 1.0
**Data:** 2026-03-29
**Autor:** @pm (Bob/Morgan)
**Status:** Draft

---

## 1. Contexto e Problema

O dono da frota de cegonheiros precisa, ao final de cada mes, gerar relatorios consolidados sobre motoristas, caminhoes ou a empresa inteira. Atualmente os dados existem no sistema (viagens, gastos, abastecimentos, comprovantes), mas nao ha uma funcionalidade dedicada de relatorio mensal que cruze todas essas informacoes em um unico documento.

Paralelamente, os comprovantes fotograficos de gastos (armazenados no Supabase Storage) crescem indefinidamente, gerando custo de armazenamento progressivo. E necessaria uma politica de retencao que equilibre disponibilidade e custo.

### Stakeholder Quote

> "O patrao precisa no final do mes gerar um relatorio a respeito do motorista, do caminhao ou do CNPJ inteiro. Deve conter informacoes das viagens, comprovantes de abastecimento entre outras informacoes."

> "Pensar em uma maneira desses comprovantes ficarem armazenados de forma que nao pese na base, fiquem disponiveis por apenas um tempo (ex: 3 meses) e depois sejam sobrescritos por outro."

---

## 2. Inventario do Sistema Existente

Antes de definir requisitos, e fundamental mapear o que ja existe e pode ser reutilizado.

### 2.1 Dados Disponiveis

| Entidade | Tipo/Arquivo | Campos Relevantes para Relatorio |
|----------|-------------|----------------------------------|
| **Viagem** | `types/viagem.ts` | origem, destino, data_saida, data_chegada_real, valor_total (centavos), percentual_pagamento, km_saida, km_chegada, km_estimado, status |
| **Gasto** | `types/gasto.ts` | valor (centavos), data, descricao, foto_url, litros, tipo_combustivel, posto_local, uf_abastecimento, categoria_id, motorista_id, caminhao_id, viagem_id |
| **Fechamento** | `types/fechamento.ts` | periodo_inicio, periodo_fim, total_viagens, total_gastos, saldo_motorista, tipo (semanal/mensal), status |
| **FotoComprovante** | `types/foto-comprovante.ts` | storage_path, content_type, size_bytes, uploaded_at, gasto_id |
| **BI** | `types/bi.ts` | BIKpis, BICategoriaItem, BIRankingCaminhaoItem, BIRankingMotoristaItem, BITendenciaMensalItem |
| **Categorias** | via queries | nome, icone, cor |

### 2.2 Componentes Reutilizaveis

| Componente | Arquivo | O que faz | Reutilizavel? |
|------------|---------|-----------|---------------|
| **FechamentoPDFDocument** | `components/fechamentos/FechamentoPDF.tsx` | Gera PDF A4 com @react-pdf/renderer, tabelas de viagens/gastos, resumo financeiro, assinaturas, watermark PAGO | SIM - serve como template base para relatorios |
| **ComprovantesUpload** | `components/gastos/ComprovantesUpload.tsx` | Upload com compressao, lightbox, delete com confirmacao | SIM - ja possui fluxo de compressao |
| **compressImage** | `lib/utils/compress-image.ts` | Compressao client-side: max 1200px, target 200KB, JPEG output | SIM - ja ativo em todos os uploads |
| **BI Actions** | `app/(dashboard)/bi/actions.ts` | KPIs, breakdown por categoria, ranking caminhoes/motoristas, tendencia mensal, estimativa custo, historico rotas | SIM - queries base para relatorios |
| **Gastos Queries** | `lib/queries/gastos.ts` | Filtros por motorista/caminhao/categoria/periodo, subtotais por categoria | SIM - reuso direto |
| **formatBRL, formatarData** | `lib/utils/currency.ts`, `lib/utils/format-date.ts` | Formatacao de valores e datas | SIM - reuso direto |
| **mascararCpf** | `lib/utils/lgpd.ts` | Mascaramento LGPD de CPF | SIM - reuso direto |

### 2.3 Infraestrutura de Storage

- **Bucket:** `comprovantes` (Supabase Storage)
- **Path pattern:** `{empresa_id}/{gasto_id}/{timestamp}.{ext}`
- **Signed URLs:** 1h de expiracao (`SIGNED_URL_EXPIRY = 3600`)
- **Compressao:** Ativa no upload, max 200KB por imagem, max 10MB input
- **Formatos aceitos:** JPEG, PNG, WebP, PDF

---

## 3. Requisitos Funcionais

### FR-1: Relatorio por Motorista

**Descricao:** Gerar relatorio completo de um motorista em um periodo selecionavel.

**Conteudo do relatorio:**

| Secao | Dados | Fonte |
|-------|-------|-------|
| Cabecalho | Empresa (razao social, CNPJ), motorista (nome, CPF mascarado), periodo | `Fechamento.empresa`, `Fechamento.motorista`, `mascararCpf` |
| Viagens | Origem, destino, data saida/chegada, km (estimado e real), valor frete, status | `viagem` table via query |
| Gastos por categoria | Categoria, data, descricao, valor | `gasto` table + `categoria_gasto` join |
| Abastecimentos (detalhe) | Data, litros, tipo combustivel, preco/litro (calculado), posto, UF | `gasto` where `litros IS NOT NULL` |
| Comprovantes | Thumbnails das fotos vinculadas aos gastos do periodo | `foto_comprovante` + signed URLs |
| Resumo financeiro | Total receita (fretes), total gastos, margem (receita - gastos) | Calculado |
| Percentual motorista | % pagamento, valor total do motorista | `viagem.percentual_pagamento` |

**Regras:**
- Periodo selecionavel via date range picker (default: mes anterior completo)
- Valores em centavos, formatados com `formatBRL` (CON-003)
- CPF mascarado (LGPD) via `mascararCpf`
- Comprovantes: incluir thumbnails no PDF; se comprovante expirado, exibir "[Comprovante expirado]"

**Acceptance Criteria:**
- AC1: Selecionar motorista + periodo e visualizar preview antes de gerar
- AC2: PDF contem todas as secoes listadas acima
- AC3: Valores somam corretamente (centavos, sem arredondamento float)
- AC4: Comprovantes aparecem como thumbnails no PDF

### FR-2: Relatorio por Caminhao

**Descricao:** Gerar relatorio filtrado por caminhao (placa) em um periodo.

**Conteudo adicional alem do FR-1:**

| Secao | Dados | Fonte |
|-------|-------|-------|
| Identificacao caminhao | Placa, modelo, capacidade veiculos | `caminhao` table |
| Consumo medio | km/l calculado no periodo | `viagem.km_saida/km_chegada` + `gasto.litros` |
| Custos de manutencao | Gastos da categoria "Manutencao" (se existir) | `gasto` where `categoria_gasto.nome ILIKE '%manutenc%'` |
| Custo por km | Total gastos / total km rodados | Calculado |
| Motoristas que usaram | Lista de motoristas no periodo | `viagem.motorista_id` distinct |

**Acceptance Criteria:**
- AC1: Selecionar caminhao + periodo
- AC2: Consumo medio calculado corretamente (total litros / total km)
- AC3: Custos de manutencao separados dos demais
- AC4: Se nao houver dados de km, exibir "Dados insuficientes para calculo"

### FR-3: Relatorio por Empresa (CNPJ)

**Descricao:** Relatorio consolidado de todos os motoristas e caminhoes da empresa.

**Conteudo:**

| Secao | Dados |
|-------|-------|
| Resumo executivo | Total viagens, total fretes, total gastos, margem geral |
| Ranking motoristas por gasto | Nome, total gasto, % do total (reusar `getBIRankingMotoristas`) |
| Ranking caminhoes por gasto | Placa, modelo, total gasto, % (reusar `getBIRankingCaminhoes`) |
| Breakdown por categoria | Categoria, total, % (reusar `getBICategoriasBreakdown`) |
| Tendencia mensal | Ultimos 6 meses com dados (reusar `getBITendenciaMensal`) |
| Totais por motorista | Tabela: motorista, fretes, gastos, saldo |

**Acceptance Criteria:**
- AC1: Relatorio consolida dados de TODOS os motoristas e caminhoes ativos
- AC2: Rankings ordenados por valor descendente
- AC3: Totais gerais batem com a soma dos individuais

### FR-4: Formato de Saida

**Descricao:** PDF para download e compartilhamento.

| Formato | Tecnologia | Notas |
|---------|-----------|-------|
| PDF download | `@react-pdf/renderer` (ja instalado) | Reusar pattern de `FechamentoPDF.tsx` |
| Compartilhar WhatsApp | `navigator.share()` API ou link `https://wa.me/?text=` | Compartilhar arquivo PDF ou link para download |

**Regras:**
- PDF gerado client-side com dynamic import (mesmo pattern do FechamentoPDF)
- Nome do arquivo: `relatorio-{tipo}-{nome/placa}-{periodo}.pdf`
- Botao "Compartilhar" usa Web Share API quando disponivel, fallback para link WhatsApp

**Acceptance Criteria:**
- AC1: PDF baixa corretamente em mobile e desktop
- AC2: Compartilhamento funciona no Android (Web Share API) e fallback para iOS/desktop
- AC3: Nome do arquivo e descritivo e unico

### FR-5: Controle de Acesso

**Descricao:** Somente usuarios com role `dono` ou `admin` podem gerar relatorios.

**Regras:**
- Server action valida `role === 'dono'` (pattern igual a `requireDono()` do BI)
- Motorista NAO ve a pagina de relatorios
- RLS do Supabase ja restringe dados por `empresa_id`

**Acceptance Criteria:**
- AC1: Motorista nao consegue acessar `/relatorios`
- AC2: Dono/admin ve todos os motoristas e caminhoes da empresa
- AC3: Dados de outra empresa nunca aparecem (RLS)

---

### FR-6: Politica de Retencao de Comprovantes (3 meses)

**Descricao:** Fotos de comprovantes sao deletadas automaticamente apos 3 meses. O registro do gasto permanece.

**Regras:**

| Aspecto | Especificacao |
|---------|---------------|
| Periodo de retencao | 3 meses (configuravel via env `COMPROVANTE_RETENTION_DAYS=90`) |
| O que e deletado | Arquivo no Storage (bucket `comprovantes`) |
| O que permanece | Registro na tabela `gasto` (valor, data, descricao, etc.) e `foto_comprovante` (marcado como expirado) |
| Backup implicito | Relatorio PDF gerado no mes contem as fotos como thumbnails |
| Frequencia | 1x por dia |

**Fluxo:**

```
1. Edge Function (cron) roda diariamente
2. SELECT foto_comprovante WHERE uploaded_at < NOW() - INTERVAL '90 days'
   AND comprovante_expirado = false
3. Para cada registro:
   a. DELETE arquivo do Storage (bucket 'comprovantes', storage_path)
   b. UPDATE foto_comprovante SET comprovante_expirado = true
   c. UPDATE gasto SET foto_url = NULL WHERE id = gasto_id
      (somente se nao houver outro comprovante ativo para o gasto)
4. Log: quantidade processada, erros
```

**Acceptance Criteria:**
- AC1: Fotos com mais de 90 dias sao removidas do Storage
- AC2: Registro do gasto permanece intacto (valor, descricao, categoria)
- AC3: Campo `comprovante_expirado` = true no registro da foto
- AC4: `foto_url` do gasto e atualizado (null ou proximo comprovante ativo)
- AC5: Parametro de retencao e configuravel (env var)

### FR-7: Aviso ao Usuario sobre Expiracao

**Descricao:** Informar o usuario quando um comprovante esta proximo de expirar.

**Regras:**

| Aviso | Condicao | Exibicao |
|-------|----------|----------|
| Data de expiracao | Sempre visivel | "Disponivel ate DD/MM/YYYY" abaixo do thumbnail |
| Alerta proximo | uploaded_at + 90 dias - 15 dias = dentro de 15 dias | Badge amarelo "Expira em breve" |
| Sugestao de acao | Quando proximo de expirar | "Gere o relatorio mensal para preservar este comprovante" |
| Expirado | comprovante_expirado = true | Badge vermelho "Comprovante expirado" (sem thumbnail) |

**Acceptance Criteria:**
- AC1: Todo comprovante exibe data de expiracao calculada
- AC2: Comprovantes com < 15 dias para expirar mostram alerta visual
- AC3: Comprovante expirado mostra placeholder, nao imagem quebrada
- AC4: Link para gerar relatorio aparece no alerta

### FR-8: Processo de Limpeza Automatizada

**Descricao:** Supabase Edge Function com cron schedule para executar a politica de retencao.

[AUTO-DECISION] "Edge Function ou GitHub Action?" -> Supabase Edge Function com pg_cron (reason: a limpeza acessa diretamente o Storage e o banco via service_role_key; manter dentro do Supabase simplifica a infraestrutura e elimina dependencia de CI externo. Alem disso, pg_cron e nativo do Supabase e ja esta disponivel.)

**Especificacao tecnica:**

| Aspecto | Detalhe |
|---------|---------|
| Tecnologia | Supabase Edge Function (Deno) |
| Schedule | pg_cron: `0 3 * * *` (diariamente as 3h UTC) |
| Auth | `service_role_key` (server-only, nunca exposta ao client) |
| Batch size | 100 registros por execucao (evitar timeout) |
| Timeout | 30 segundos |
| Idempotencia | Verificar `comprovante_expirado = false` antes de processar |
| Retry | Se falhar, tenta novamente na proxima execucao diaria |

**Schema change necessaria:**

```sql
ALTER TABLE foto_comprovante
  ADD COLUMN comprovante_expirado BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX idx_foto_comprovante_retencao
  ON foto_comprovante (uploaded_at)
  WHERE comprovante_expirado = false;
```

**Acceptance Criteria:**
- AC1: Edge Function executa diariamente sem intervencao manual
- AC2: Processa em batch (max 100 por execucao)
- AC3: Idempotente (nao reprocessa registros ja expirados)
- AC4: Logs de execucao acessiveis no Supabase Dashboard
- AC5: Nao afeta registros com menos de 90 dias

---

## 4. Requisitos Nao-Funcionais

### NFR-1: Performance de Geracao de PDF

| Metrica | Target |
|---------|--------|
| Tempo de geracao (relatorio motorista, ~50 gastos) | < 5 segundos |
| Tempo de geracao (relatorio empresa, ~500 gastos) | < 15 segundos |
| Tamanho do PDF (sem fotos) | < 2 MB |
| Tamanho do PDF (com thumbnails) | < 10 MB |

### NFR-2: Storage

| Metrica | Estimativa |
|---------|-----------|
| Tamanho medio por foto (pos-compressao) | ~100-200 KB |
| Fotos/mes (estimativa: 100 motoristas x 20 fotos) | 2.000 fotos/mes |
| Storage/mes | ~200-400 MB/mes |
| Com retencao 3 meses | ~600 MB - 1.2 GB maximo no steady state |
| Sem retencao (1 ano) | ~2.4 - 4.8 GB |
| Economia anual com retencao | ~75% de reducao |

**Nota:** A compressao ja esta ativa (`compress-image.ts`, max 200KB, JPEG output). O impacto e significativo: sem compressao, fotos de celular tem 3-5MB; comprimidas ficam em ~100-200KB.

### NFR-3: Compatibilidade

- PDF deve abrir corretamente em visualizadores mobile (Android/iOS)
- Compartilhamento WhatsApp deve funcionar em Android (Web Share API) e iOS (fallback URL)

### NFR-4: LGPD

- CPF mascarado em todos os relatorios (ja implementado em `mascararCpf`)
- Relatorios nao devem conter dados de empresas/motoristas de outros tenants (RLS)

---

## 5. Avaliacao Tecnica

### 5.1 Compressao de Imagens

**Status:** JA IMPLEMENTADO em `lib/utils/compress-image.ts`.

| Parametro | Valor Atual |
|-----------|-------------|
| Max dimensao | 1200px |
| Qualidade inicial JPEG | 0.7 |
| Target max | 200 KB |
| Max input | 10 MB |
| Formatos | JPEG, PNG, WebP (comprimidos), PDF (passthrough) |

Nao e necessaria nenhuma alteracao. A compressao ja ocorre no client-side antes do upload.

### 5.2 Tamanho Maximo por Foto

**Atual:** 10 MB no input, ~200 KB apos compressao.
**Recomendacao:** Manter como esta. O gargalo de storage sao os PDFs (nao comprimidos), mas representam minoria dos uploads.

### 5.3 Thumbnails no PDF

Para incluir fotos nos relatorios PDF:
- `@react-pdf/renderer` suporta `<Image src={url} />` com URLs ou base64
- Necessario: buscar signed URLs das fotos e converter para base64 antes de gerar o PDF
- Limite sugerido: max 1 thumbnail por gasto (a mais recente), resolucao reduzida (max 300px)
- Para comprovantes expirados: placeholder texto "[Comprovante expirado em DD/MM/YYYY]"

### 5.4 Estimativa de Custos Supabase

| Recurso | Free Tier | Pro ($25/mes) | Impacto com Retencao |
|---------|-----------|---------------|---------------------|
| Storage | 1 GB | 100 GB | Steady state ~1 GB (cabe no Pro) |
| Edge Functions | 500K invocacoes | 2M invocacoes | ~30 invocacoes/mes (irrelevante) |
| Database | 500 MB | 8 GB | Adicionamos 1 coluna boolean + 1 indice (irrelevante) |

---

## 6. Stories Estimadas

### Epic: Relatorios Mensais e Retencao de Comprovantes

| Story | Titulo | Pontos | Dependencia |
|-------|--------|--------|-------------|
| **S1** | Relatorio PDF por Motorista | 8 | - |
| **S2** | Relatorio PDF por Caminhao | 5 | S1 (reusa componente base) |
| **S3** | Relatorio PDF por Empresa (CNPJ) | 5 | S1 |
| **S4** | Compartilhamento WhatsApp | 3 | S1 |
| **S5** | Schema + Edge Function de retencao | 5 | - |
| **S6** | Avisos de expiracao na UI | 3 | S5 |
| **S7** | Thumbnails de comprovantes no PDF | 5 | S1, S5 |
| **Total** | | **34** | |

### Detalhamento por Story

**S1 - Relatorio PDF por Motorista (8 pts)**
- Nova rota `/relatorios` com guard de acesso (dono/admin)
- Seletor de motorista + date range picker
- Server action para buscar dados agregados (viagens + gastos + abastecimentos)
- Componente `RelatorioPDFMotorista` usando `@react-pdf/renderer`
- Botao "Gerar PDF" com dynamic import (pattern do FechamentoPDF)
- Preview antes de gerar (opcional, pode ser V2)

**S2 - Relatorio PDF por Caminhao (5 pts)**
- Tab "Por Caminhao" na pagina de relatorios
- Seletor de caminhao + date range
- Componente `RelatorioPDFCaminhao` (herda layout do S1)
- Calculo de consumo medio e custo/km
- Secao de manutencao

**S3 - Relatorio PDF por Empresa (5 pts)**
- Tab "Consolidado" na pagina de relatorios
- Reutiliza queries do BI (rankings, categorias, tendencia)
- Componente `RelatorioPDFEmpresa`
- Resumo executivo + tabelas por motorista

**S4 - Compartilhamento WhatsApp (3 pts)**
- Botao "Compartilhar" apos gerar PDF
- Web Share API (`navigator.share({ files: [pdfBlob] })`)
- Fallback: link `https://wa.me/?text=Relatorio%20...`
- Deteccao de suporte `navigator.canShare`

**S5 - Schema + Edge Function de Retencao (5 pts)**
- Migration: `comprovante_expirado` boolean + indice parcial
- Edge Function: `cleanup-comprovantes` (Deno)
- pg_cron schedule
- Testes manuais com dados de teste

**S6 - Avisos de Expiracao na UI (3 pts)**
- Calculo de data de expiracao (`uploaded_at + 90 dias`)
- Badge "Disponivel ate DD/MM/YYYY" no `ComprovantesUpload`
- Badge amarelo "Expira em breve" (< 15 dias)
- Placeholder para comprovante expirado

**S7 - Thumbnails de Comprovantes no PDF (5 pts)**
- Buscar fotos do periodo via `foto_comprovante`
- Converter signed URLs para base64 (server-side)
- `<Image>` do @react-pdf/renderer com base64
- Placeholder para expirados
- Limite: 1 thumbnail por gasto, max 300px

---

## 7. Priorizacao MoSCoW

| Prioridade | Requisito | Story | Justificativa |
|------------|-----------|-------|---------------|
| **MUST** | FR-1: Relatorio por motorista | S1 | Necessidade primaria do stakeholder; base para demais relatorios |
| **MUST** | FR-6: Politica de retencao 3 meses | S5 | Controle de custos de storage; quanto antes ativar, menos acumula |
| **MUST** | FR-8: Edge Function de limpeza | S5 | Sem automacao, retencao nao funciona |
| **MUST** | FR-5: Controle de acesso | S1 | Seguranca basica (incluso em S1) |
| **SHOULD** | FR-2: Relatorio por caminhao | S2 | Importante para analise de frota, mas pode vir apos motorista |
| **SHOULD** | FR-3: Relatorio por empresa | S3 | Visao gerencial consolidada |
| **SHOULD** | FR-7: Avisos de expiracao | S6 | Boa UX; previne surpresas com comprovantes sumindo |
| **COULD** | FR-4: Compartilhamento WhatsApp | S4 | Conveniencia; PDF ja pode ser compartilhado manualmente |
| **COULD** | FR-1/AC4 + FR-7: Thumbnails no PDF | S7 | Enriquece o relatorio mas aumenta complexidade e tamanho do PDF |
| **WON'T (this release)** | Relatorio agendado automatico | - | Pode ser considerado no futuro; por ora, geracao sob demanda e suficiente |
| **WON'T (this release)** | Export CSV/Excel | - | PDF atende a necessidade primaria |

### Ordem de Implementacao Recomendada

```
Sprint 1: S1 (Relatorio Motorista) + S5 (Retencao)  [13 pts]
Sprint 2: S2 (Caminhao) + S3 (Empresa) + S6 (Avisos) [13 pts]
Sprint 3: S4 (WhatsApp) + S7 (Thumbnails)            [8 pts]
```

---

## 8. Riscos

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|--------------|---------|-----------|
| PDF com muitos thumbnails fica muito grande (>10MB) | Media | Medio | Limitar a 1 foto/gasto, resolucao 300px, compressao max 50KB por thumbnail |
| Edge Function de retencao falha silenciosamente | Baixa | Alto | Logging detalhado, alerta se 0 registros processados por 7+ dias |
| Signed URLs expiram antes do usuario abrir o PDF | Media | Baixo | Converter para base64 no momento da geracao (nao depende de signed URL) |
| Storage excede free tier antes de retencao estar ativa | Alta | Medio | Priorizar S5 no Sprint 1; ativar retencao o mais cedo possivel |
| Performance degradada com muitos gastos (>1000) no relatorio | Baixa | Medio | Paginacao server-side nas queries, geracao de PDF em chunks |

---

## 9. Decisoes Tecnicas

| Decisao | Escolha | Alternativas Descartadas | Razao |
|---------|---------|--------------------------|-------|
| Geracao de PDF | Client-side com `@react-pdf/renderer` | Server-side (Puppeteer), third-party API | Ja utilizado no FechamentoPDF; zero custo adicional; funciona offline |
| Mecanismo de retencao | Supabase Edge Function + pg_cron | GitHub Action, Lambda, cron job manual | Acesso direto ao Storage e DB; sem dependencia externa; pg_cron nativo |
| Fotos no PDF | Base64 embutido | Signed URLs, links externos | Signed URLs expiram; base64 garante que o PDF e autocontido |
| Compressao de upload | Manter `compress-image.ts` existente (200KB) | Compressao server-side, sem compressao | Ja funciona bem; client-side reduz transferencia de rede |
| Compartilhamento | Web Share API + fallback WhatsApp URL | Envio por email, link compartilhavel | WhatsApp e o canal principal do publico-alvo (transportadores) |

---

## 10. Metricas de Sucesso

| Metrica | Target | Como medir |
|---------|--------|------------|
| Adocao | >50% dos donos geram pelo menos 1 relatorio/mes | Contagem de PDFs gerados (log no server action) |
| Storage steady state | <1.5 GB com retencao ativa | Supabase Dashboard > Storage |
| Tempo de geracao | <5s para relatorio motorista | Client-side timing no browser |
| Satisfacao | Feedback positivo sobre completude do relatorio | Entrevista com stakeholder |

---

## Apendice A: Wireframe Conceitual

```
/relatorios
+--------------------------------------------------+
| Relatorios                           [Dono only]  |
|                                                    |
| [Por Motorista] [Por Caminhao] [Consolidado]      |
|                                                    |
| Motorista: [Select motorista    v]                 |
| Periodo:   [01/03/2026] ate [31/03/2026]          |
|                                                    |
| [Gerar Relatorio]  [Compartilhar WhatsApp]        |
|                                                    |
| Preview:                                           |
| +----------------------------------------------+  |
| | EMPRESA XYZ TRANSPORTES                      |  |
| | CNPJ: 12.345.678/0001-00                     |  |
| |                                              |  |
| | Motorista: Joao Silva                        |  |
| | CPF: ***.***.456-**                          |  |
| | Periodo: 01/03/2026 a 31/03/2026            |  |
| |                                              |  |
| | VIAGENS (12)                                 |  |
| | Data | Rota        | Frete    | % | Motor.  |  |
| | ...  | SP > RJ     | R$ 5.000 |25%| R$1.250 |  |
| |                                              |  |
| | GASTOS POR CATEGORIA                         |  |
| | Combustivel:  R$ 8.500 (65%)                 |  |
| | Pedagio:      R$ 2.100 (16%)                 |  |
| | Alimentacao:  R$ 1.400 (11%)                 |  |
| | Outros:       R$ 1.000 (8%)                  |  |
| |                                              |  |
| | ABASTECIMENTOS                               |  |
| | Data | Litros | Tipo  | Posto    | UF       |  |
| | ...  | 350    | S10   | Shell SP | SP       |  |
| |                                              |  |
| | RESUMO                                       |  |
| | Receita (fretes):  R$ 15.000                 |  |
| | Gastos totais:     R$ 13.000                 |  |
| | Margem:            R$  2.000                 |  |
| +----------------------------------------------+  |
+--------------------------------------------------+
```

---

## Apendice B: Schema Changes

```sql
-- FR-6/FR-8: Retencao de comprovantes
ALTER TABLE foto_comprovante
  ADD COLUMN comprovante_expirado BOOLEAN NOT NULL DEFAULT false;

-- Indice parcial para busca eficiente na Edge Function
CREATE INDEX idx_foto_comprovante_retencao
  ON foto_comprovante (uploaded_at)
  WHERE comprovante_expirado = false;

-- Indice para busca de comprovantes por gasto (ja pode existir)
-- Verificar se existe antes de criar
CREATE INDEX IF NOT EXISTS idx_foto_comprovante_gasto_id
  ON foto_comprovante (gasto_id);
```
