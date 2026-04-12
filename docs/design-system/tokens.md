# Design Tokens - FrotaViva

Todos os tokens vivem em `app/globals.css` dentro de `@theme`. Tailwind v4 gera utilities automaticamente (ex: `--color-primary-700` vira `text-primary-700`, `bg-primary-700`).

## Primary (texto, headings, links)

| Token | Light | Dark | Uso |
|-------|-------|------|-----|
| `primary-50` | #F0F7FA | inverted | backgrounds sutis |
| `primary-100` | #E3F2FD | inverted | backgrounds leves |
| `primary-200` | #B3D9EF | inverted | borders leves |
| `primary-300` | #7ABFDF | inverted | icones secundarios |
| `primary-400` | #4DA6CE | inverted | links hover |
| `primary-500` | #3D8EB9 | #64B5F6 | labels, texto secundario |
| `primary-700` | #2C5F7C | #90CAF9 | headings, links |
| `primary-900` | #1B3A4B | #E3F2FD | body text principal |

## Semanticas (acoes, feedback)

| Token | Light | Dark | Uso |
|-------|-------|------|-----|
| `success` | #1B7A3D | #4ADE80 | texto/icone positivo |
| `warning` | #B45309 | #FBBF24 | texto/icone atencao |
| `danger` | #B91C1C | #F87171 | texto/icone erro, botoes destrutivos |
| `info` | #1E5A8A | #60A5FA | texto/icone informativo |

## Badges (status indicators)

| Token | Light | Dark | Uso |
|-------|-------|------|-----|
| `badge-success-bg` | #DCFCE7 | #052E16 | fundo badge pago/ativo/concluido |
| `badge-success-fg` | #166534 | #4ADE80 | texto badge pago/ativo/concluido |
| `badge-warning-bg` | #FEF3C7 | #451A03 | fundo badge pendente/em andamento |
| `badge-warning-fg` | #92400E | #FBBF24 | texto badge pendente/em andamento |
| `badge-danger-bg` | #FEE2E2 | #450A0A | fundo badge cancelado/erro |
| `badge-danger-fg` | #991B1B | #F87171 | texto badge cancelado/erro |
| `badge-info-bg` | #DBEAFE | #172554 | fundo badge informativo |
| `badge-info-fg` | #1E40AF | #60A5FA | texto badge informativo |
| `badge-neutral-bg` | #E2E8F0 | #334155 | fundo badge generico |
| `badge-neutral-fg` | #334155 | #CBD5E1 | texto badge generico |

## Surface (backgrounds, cards, inputs)

| Token | Uso |
|-------|-----|
| `surface-background` | fundo da pagina |
| `surface-card` | fundo de cards |
| `surface-muted` | fundo desabilitado, skeletons |
| `surface-border` | bordas default |
| `surface-hover` | hover em linhas/cards |
| `surface-input` | fundo de inputs |
| `surface-row-alt` | linhas alternadas em tabelas |
| `surface-row-hover` | hover em linhas de tabela |

## Alerts (banners de feedback)

| Token | Uso |
|-------|-----|
| `alert-success-bg` | fundo banner sucesso |
| `alert-danger-bg` | fundo banner erro |
| `alert-warning-bg` | fundo banner atencao |
| `alert-info-bg` | fundo banner informativo |

## Botoes

| Token | Uso |
|-------|-----|
| `btn-primary` | fundo CTA principal |
| `btn-primary-hover` | hover CTA principal |

## Texto

| Token | Uso |
|-------|-----|
| `text-muted` | texto secundario (labels) |
| `text-subtle` | texto terciario (hints) |
| `text-label` | labels de form |
| `text-secondary` | descricoes, empty states |

## Regra de uso

NUNCA usar classes Tailwind nativas com numero (amber-500, slate-200, red-700). Sempre usar tokens do design system. Story 11.2 vai adicionar lint rule pra bloquear.
