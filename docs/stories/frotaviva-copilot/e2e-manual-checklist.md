# E2E Manual Checklist — Assistente FrotaViva

Story 9.7 AC-7. Executar com o app rodando local ou em preview.

## Pre-requisitos
- [ ] `.env.local` com `GOOGLE_GENERATIVE_AI_API_KEY` configurada
- [ ] `.env.local` com `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN` configuradas
- [ ] `npm run dev` rodando sem erros
- [ ] Logado como conta dono (ex: dono1@frotaviva.com.br / Teste2026!)

## Menu e navegacao
- [ ] Item "Assistente" aparece no menu lateral (desktop)
- [ ] Item "Assistente" aparece no menu mobile (hamburguer)
- [ ] Clicar leva a `/assistente`
- [ ] Motorista NAO ve o item no menu
- [ ] Motorista acessando `/assistente` direto e redirecionado

## Empty state
- [ ] Titulo "Assistente FrotaViva" aparece
- [ ] Subtitulo explicativo em PT-BR aparece
- [ ] 5 botoes de perguntas-farol visiveis e clicaveis
- [ ] Clicar num botao envia a pergunta

## Perguntas-farol (executar cada uma)

### 1. "Qual caminhao deu mais prejuizo esse mes?"
- [ ] Resposta usa tool `ranking_caminhoes_por_lucro`
- [ ] Mostra tabela com caminhoes
- [ ] Valores em R$ formatados corretamente
- [ ] Sem jargao tecnico

### 2. "Quais motoristas estao com CNH vencendo nos proximos 30 dias?"
- [ ] Resposta usa tool `motoristas_cnh_vencendo`
- [ ] Lista motoristas com nome, CNH, dias ate vencer
- [ ] Sem jargao tecnico

### 3. "Me faz um resumo do desempenho da ultima semana"
- [ ] Resposta usa tool `resumo_desempenho_periodo`
- [ ] Mostra viagens, receita, gastos, lucro
- [ ] Top 3 categorias de gasto
- [ ] Valores em R$ formatados

### 4. "Quanto gastei de combustivel em marco?"
- [ ] Resposta usa tool `buscar_gastos_por_periodo`
- [ ] Mostra total e detalhes
- [ ] Valores em R$ formatados

### 5. "Qual viagem teve maior margem?"
- [ ] Resposta usa tool `ranking_viagens_por_margem`
- [ ] Mostra origem, destino, margem %
- [ ] Sem jargao tecnico

## Streaming e UX
- [ ] Resposta aparece token por token (streaming visivel)
- [ ] Primeiro token em < 3 segundos
- [ ] Markdown renderiza (negrito, tabelas, listas)
- [ ] Tabelas tem cabecalho e bordas
- [ ] Animacao de loading (3 dots) aparece enquanto espera

## Tratamento de erros
- [ ] Enviar 11+ perguntas rapidas: banner "Limite de perguntas atingido" aparece
- [ ] Banner em PT-BR, sem jargao

## Acessibilidade (UX 55+)
- [ ] Botao enviar tem altura >= 48px
- [ ] Input tem altura >= 48px
- [ ] Texto base >= 16px
- [ ] Contraste texto/fundo >= 4.5:1
- [ ] Zero termos em ingles na UI
- [ ] Zero termos tecnicos (LLM, prompt, token, tool, API, AI)

## Lighthouse (nao regredir)
- [ ] `/` — Performance >= 95, A11y >= 95, BP >= 95, SEO >= 95
- [ ] `/dashboard` — Performance >= 90, A11y >= 95
- [ ] `/assistente` — Performance >= 85 (nova rota, bundle maior)

## Resultado
- Data:
- Executor:
- Veredicto: PASS / FAIL
- Observacoes:
