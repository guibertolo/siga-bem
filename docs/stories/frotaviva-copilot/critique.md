# Spec Critique — Assistente FrotaViva

**Agente:** @qa (Quinn)
**Data:** 2026-04-10
**Spec avaliada:** [spec.md v0.1](./spec.md)
**Metodo:** Pipeline step-13, 5 dimensoes scored 1-5 (pontos altos = melhor)

---

## Scores

| Dimensao | Score | Justificativa |
|----------|-------|---------------|
| **Clareza** — FRs sao testaveis e sem ambiguidade | 4.5 | Todas as 10 FRs tem criterio de aceite explicito. FR-5 define 6 tools com nome, input/output shape (Zod), tabelas e rastreio. Unica pequena ambiguidade: "perguntas curtas" em NFR-3 nao define tamanho em tokens (nao bloqueia, mas poderia ser explicito). |
| **Completude** — cobre brief e achados de exploracao | 4.5 | Cobre as 10 FRs derivadas do brief + correcoes de schema (documento/manutencao). Faltaria apenas explicitar tratamento de concorrencia (duas abas do mesmo user) mas isso e marginal no MVP. |
| **Rastreabilidade** — Article IV compliance | 5.0 | Cada FR/NFR/CON tem coluna "Rastreio" apontando pra brief/arquivo/memoria. Secao 1 da spec corrige desvios do brief transparentemente. Zero invencao detectada. |
| **Testabilidade** — cada FR pode virar teste | 4.0 | FRs 1-9 tem criterio verificavel. FR-4 ("LLM usa tool") e dificil de provar absolutamente — mitigado com "teste das 5 perguntas farol comparando output com queries diretas" (R1). Recomendacao: adicionar que os testes devem **falhar ruidosamente** se o modelo responder sem chamar tool. |
| **Riscos** — identificacao e mitigacao | 4.5 | Tabela de riscos cobre 7 cenarios com mitigacoes concretas. R7 (streaming/timeout em Vercel Hobby) e analise correta. Recomendacao: adicionar R8 sobre **tool que retorna volume grande de linhas** (ex: usuario pede "liste todas as viagens dos ultimos 2 anos") — precisa cap de resultados. |

**Media:** 4.5 / 5.0

---

## Veredicto

**APPROVED** (>= 4.0)

Spec esta em conformidade com Article IV (No Invention), cobre todos os use cases do brief, corrige transparentemente os desvios de schema descobertos, e tem criterios de aceite testaveis.

---

## Recomendacoes para o Implementation Plan (nao bloqueantes)

1. **NFR-3 calibrado:** definir "pergunta curta" como input <= 100 tokens — serve de baseline pro measurement de "primeiro token em < 2s"
2. **FR-4 testing strategy:** teste de aceitacao deve injetar um spy/log no AI SDK e falhar se nenhuma tool for chamada numa das 5 perguntas farol
3. **Novo risco R8 (adicionar ao plan):** cap obrigatorio de **maximo 50 linhas por tool** por default (overridable so em casos especificos). Previne payload gigante alimentando o modelo e explodindo tokens
4. **FR-9 menu:** confirmar com UX design se o label e "Assistente" ou "Assistente FrotaViva" no menu (no corpo da pagina fica "Assistente FrotaViva")
5. **NFR-8 logs:** definir se vai para Sentry (`@sentry/nextjs` ja esta no projeto) ou apenas console — decidir no plan

---

## Nada a bloquear

Nenhuma das recomendacoes acima bloqueia o avanco para Implementation Plan. Todas podem ser endereçadas no proximo artefato ou nas stories da Fase 3.
