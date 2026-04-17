# Product Brief: FrotaViva Copilot

**Versao:** 0.2
**Data:** 2026-04-10
**Autor:** @pm (Morgan)
**Status:** Draft — aguardando GATE-1 (revisao final pos-decisoes de custo)
**Nome visivel para o usuario:** Assistente FrotaViva
**Nome tecnico interno:** Copilot
**Projeto:** FrotaViva (`apps/siga-bem/`)
**Pipeline:** Idea-to-Done — Fase 1 (fast-track, Fase 0 skipped por decisao do stakeholder)
**Complexidade estimada:** SIMPLE (a validar em Fase 2 por @architect)

---

## 1. Contexto

FrotaViva e um SaaS em producao para gestao de frotas de cegonheiros, construido em Next.js App Router + Supabase (RLS ativa) e rodando em Vercel. O app ja concentra dados operacionais ricos: caminhoes, motoristas, viagens, gastos, documentos com vencimento e manutencoes. O dono da frota hoje consulta esses dados via dashboards e listagens — processo que exige que ele saiba onde clicar e construa mentalmente o recorte que quer.

O stakeholder quer adicionar uma camada conversacional: perguntar em linguagem natural e receber respostas formatadas com dados reais do banco do seu proprio tenant.

## 2. Problema

O dono da frota perde tempo navegando por telas para responder perguntas operacionais recorrentes ("quem esta com CNH vencendo?", "quanto gastei de combustivel em marco?", "qual viagem teve maior margem?"). Ele precisa de respostas diretas, rapidas e confiaveis — sem abrir multiplas telas e sem planilhas paralelas.

## 3. Visao do Produto

Um **Copilot conversacional dentro do dashboard existente** do FrotaViva em que o dono pergunta em linguagem natural sobre os dados da sua frota e recebe resposta formatada (texto + tabelas markdown) construida a partir de consultas reais ao Supabase, com RLS respeitada para isolar o tenant atual. A resposta chega via streaming para percepcao de velocidade.

## 4. Usuario Primario

**Dono da frota** autenticado no FrotaViva.

**Caracteristicas relevantes (ja mapeadas no projeto):**
- Publico 55+ (ver memoria "UX 55+"): zero ingles, zero jargao, alvos 48px, texto minimo `text-base`
- Opera via dashboard web (responsivo)
- Ja possui contexto de multi-empresa e isolamento por tenant via RLS existente

**Fora do escopo do MVP:** motoristas, admins operacionais, auditoria externa.

## 5. Objetivo Estrategico (dual)

### Para o usuario
Reduzir friccao em consultas operacionais recorrentes e transformar o app em "pergunte e receba" para decisoes do dia a dia do dono.

### Para o criador (Guilherme)
Servir como **peca de portfolio do reposicionamento como AI Engineer**, demonstrando:
- **Tool use real:** LLM consultando banco de producao via ferramentas
- **Structured output:** respostas com schema validado
- **Streaming:** UX de resposta em tempo real
- **Integracao com produto em producao:** nao e demo descartavel
- **Engenharia de restricao:** escolha consciente de modelo free-tier (Gemini 2.0 Flash) sobre modelos pagos, mostrando capacidade de arquitetar AI com constraint de custo-zero

Ambos objetivos sao de primeira classe e nenhuma decisao deve privilegiar um em detrimento do outro sem ser registrada.

## 6. Use Cases do MVP

Os cinco exemplos explicitados pelo stakeholder como escopo-farol:

1. **Prejuizo por caminhao no mes:** "Qual caminhao deu mais prejuizo esse mes?"
2. **CNH vencendo:** "Quais motoristas estao com CNH vencendo nos proximos 30 dias?"
3. **Resumo semanal:** "Me faz um resumo do desempenho da ultima semana"
4. **Gasto de combustivel no mes:** "Quanto gastei de combustivel em marco?"
5. **Viagem com maior margem:** "Qual viagem teve maior margem?"

Cada use case exige ao menos uma ferramenta que consulte Supabase respeitando RLS do dono autenticado.

## 7. Escopo do MVP (IN)

- **Nova rota `/assistente`** dentro da area autenticada do dashboard existente (rota em pt-BR, coerente com publico 55+; rota `/copilot` descartada por ser jargao visivel na URL)
- **Label visivel:** "Assistente FrotaViva" em todos os pontos de UI (menu, cabecalho, botao de envio)
- **Interface de chat** (thread unica e efemera, sem persistencia entre sessoes)
- **Vercel AI SDK v6** integrado ao app Next.js
- **Modelo:** **Google Gemini 2.0 Flash** via `@ai-sdk/google` (decisao de GATE-1 por restricao de custo-zero)
- **Tool use:** 5 a 8 ferramentas que consultam o Supabase (contagem exata a definir em Fase 2 por @architect)
- **Streaming** de resposta no UI
- **Formatacao markdown** na resposta, com tabelas quando relevante
- **Rate limiting persistente** com storage em **Upstash Redis (ou Vercel KV equivalente — definido pelo @architect em Fase 2)**, ambos com free tier. Protege cota gratuita do Gemini e sobrevive a cold starts / reinicios de funcao
- **RLS-awareness:** toda tool chama o Supabase usando o contexto do usuario autenticado (isolamento por tenant)
- **Deploy em producao** na Vercel

## 8. Fora de Escopo do MVP (OUT)

- Historico de conversas persistente entre sessoes
- Embeddings / RAG (dados estruturados resolvem; nao entra no MVP)
- Multiplos modelos de LLM
- Voice input
- Billing / planos por uso
- Feedback thumbs up/down persistido (pode entrar em release futura)
- Copilot para outros papeis (motorista, admin) — MVP atende apenas dono da frota

## 9. Metricas de Sucesso (proposta — a validar em GATE-1)

### Funcional
- **FR-M1:** 100% dos 5 use cases-farol retornam resposta correta em ambiente de producao com dados reais do tenant de teste
- **FR-M2:** RLS respeitada em 100% das chamadas de ferramenta (zero vazamento cross-tenant validado por teste)
- **FR-M3:** Streaming entrega primeiro token em < 2s para perguntas curtas

### Nao-funcional
- **NFR-M1:** **Custo financeiro zero** — uso permanece dentro do free tier do Gemini (limites oficiais vigentes em Fase 2; hoje: ~15 req/min, 1M tokens/dia) e do free tier do Upstash/KV
- **NFR-M2:** Rate limit impede estouro de cota gratuita sem bloquear uso legitimo. Defaults propostos (a validar em Fase 2): **10 perguntas/usuario/minuto** e **200 perguntas/usuario/dia**. Cap de tokens por resposta definido pelo @architect
- **NFR-M3:** Acessibilidade mantem padrao FrotaViva (publico 55+, targets 48px, `text-base` min)
- **NFR-M4:** Degradacao graciosa — se cota estourar, UI mostra mensagem pt-BR amigavel ("Tente novamente em X minutos"), nunca erro tecnico cru

### Portfolio
- **PRT-M1:** README do projeto ou case page descreve tool use, streaming e integracao com producao de forma replicavel
- **PRT-M2:** Link publico funcional do Copilot em producao

## 10. Restricoes (Constraints)

- **CON-1:** Stack congelada — Next.js 16, React 19, Tailwind v4, Supabase SSR (ja em producao)
- **CON-2:** **Custo financeiro adicional = ZERO.** Todo servico usado no MVP (LLM, rate-limit storage, Vercel) deve operar em free tier. Se qualquer componente ameacar virar pago, a feature degrada graciosamente (NFR-M4) antes de virar cobranca
- **CON-3:** RLS nao pode ser burlada; toda query por ferramenta usa cliente Supabase do usuario autenticado
- **CON-4:** Nada de mudanca de schema no MVP (reuso das tabelas existentes)
- **CON-5:** Publico 55+ — copy pt-BR, zero jargao tecnico, nada de "prompts", "tokens", "LLM" visivel ao usuario final
- **CON-6:** Performance atual (Lighthouse 98) nao pode regredir
- **CON-7:** Ambiente de desenvolvimento ocorre em paralelo com outro projeto (LexRAG) no mesmo workspace — este terminal toca **apenas** `apps/siga-bem/`
- **CON-8:** Apenas @devops pode fazer git push / abrir PR (Article II)

## 11. Riscos e Mitigacoes Preliminares

| Risco | Impacto | Mitigacao preliminar (a detalhar em Fase 2) |
|-------|---------|---------------------------------------------|
| LLM inventa dados em vez de usar tool | Alto — confianca do produto | Structured output + instrucao rigida "use sempre a ferramenta, nunca invente" |
| Cota gratuita do Gemini esgotar | Medio | Rate limit persistente em Upstash/KV + cap de tokens por resposta + degradacao graciosa (NFR-M4) |
| Tool expoe dados cross-tenant | Critico | Cliente Supabase SSR com cookies do usuario (RLS automatica), teste automatizado de isolamento |
| Latencia alta frustra UX | Medio | Streaming + escolha de ferramentas rapidas (queries indexadas) |
| Feature entra no caminho critico da frota | Alto | Assistente e **complementar**, nao substitui telas. Pode ficar offline sem afetar operacao. |
| Gemini muda free tier ou fica pago | Medio | Camada de provider no AI SDK facilita trocar de modelo (Groq, Cerebras, outro) em poucas linhas |

## 12. Dependencias

**Ja existentes no projeto:**
- Tabelas de dominio: `caminhao`, `motorista`, `viagem`, `gasto`, `documento`, `manutencao` (nomes exatos a confirmar em Fase 2 via `lib/queries/`)
- Supabase Auth configurado (`lib/supabase/`)
- `@supabase/ssr` ja em `package.json`

**A instalar (todos com free tier):**
- `ai` — Vercel AI SDK v6
- `@ai-sdk/google` — provider Gemini
- Cliente de rate-limit persistente: `@upstash/ratelimit` + `@upstash/redis` **ou** `@vercel/kv` (escolha final pelo @architect em Fase 2 com base em disponibilidade de free tier no momento da implementacao)

**Servicos externos (todos em free tier):**
- Google AI Studio (chave `GOOGLE_GENERATIVE_AI_API_KEY`)
- Upstash Redis **ou** Vercel KV para rate limit

**Dados de teste:**
- Stakeholder ja possui **varias contas demo com dados fake** em producao, suficientes para validar os 5 use cases-farol no QA/E2E sem poluir dados reais

## 13. Proximo Passo

**GATE-1** — aprovacao do stakeholder para seguir para Fase 2 (Spec + Implementation Plan por @pm + @architect).

---

## Checklist GATE-1 (5 categorias)

- [ ] **Intent:** problema, usuario e objetivo estrategico estao claros e alinhados?
- [ ] **Discovery:** contexto do projeto existente foi respeitado (stack, RLS, publico 55+)?
- [ ] **Elicitation:** use cases do MVP refletem o que o stakeholder quer?
- [ ] **Draft:** escopo IN/OUT esta nitido e nao invade fora do MVP?
- [ ] **Review:** metricas de sucesso e riscos sao aceitaveis?
