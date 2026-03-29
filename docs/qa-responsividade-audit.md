# Auditoria de Responsividade Mobile - Siga Bem

**Data:** 2026-03-29
**Auditor:** Quinn (QA Agent)
**Veredicto Geral:** NEEDS_WORK

---

## Resumo Executivo

| # | Item | Veredicto | Prioridade |
|---|------|-----------|------------|
| 1 | Sidebar | **FAIL** | CRITICA |
| 2 | Tabelas | PASS (parcial) | MEDIA |
| 3 | Grids | PASS | BAIXA |
| 4 | Textos truncados | PASS | BAIXA |
| 5 | Touch targets | PASS (parcial) | MEDIA |
| 6 | Imagens/Logo | PASS | BAIXA |
| 7 | Forms | PASS | BAIXA |
| 8 | Header | **FAIL** | ALTA |

**Itens criticos:** 1 FAIL critico, 1 FAIL alta prioridade, 2 itens parciais

---

## 1. Sidebar - FAIL (CRITICA)

**Arquivo:** `app/(dashboard)/layout.tsx`

**Problema encontrado:** O sidebar usa `w-60` (240px) fixo, sem NENHUM breakpoint responsivo. Nao existe `hidden`, `md:flex`, hamburger menu, ou qualquer mecanismo de colapso mobile.

```
<aside className="w-60 bg-[#1B3A4B] text-white flex flex-col shrink-0">
```

**Impacto:** Em uma tela de 360px, o sidebar ocupa 240/360 = **67% da largura**. O conteudo principal fica comprimido em apenas 120px, tornando o app completamente inutilizavel em mobile.

**Correcao necessaria:**
- Adicionar `hidden md:flex` no aside
- Criar hamburger menu button no header (visivel apenas em mobile)
- Implementar overlay sidebar para mobile com backdrop
- Adicionar estado client-side para toggle do menu

---

## 2. Tabelas - PASS (parcial)

**16 componentes com `<table>` analisados.**

| Componente | overflow-x-auto | Versao mobile (cards) |
|------------|----------------|-----------------------|
| caminhao-list.tsx | SIM | NAO |
| CombustivelPrecoList.tsx | SIM | NAO |
| FechamentoList.tsx | SIM | NAO |
| FechamentoDetail.tsx | SIM | NAO |
| FechamentoForm.tsx | NAO (wrapper missing) | NAO |
| HistoricoFechamentos.tsx | SIM | NAO |
| GastoList.tsx | SIM | NAO |
| GastoTable.tsx | SIM | NAO |
| ViagemList.tsx | SIM | NAO |
| VeiculosSection.tsx | SIM | NAO |
| usuario-list.tsx | SIM | NAO |
| MotoristaList.tsx | SIM | NAO |
| BiRankingMotoristas.tsx | SIM + cards mobile | SIM |
| BiRankingCaminhoes.tsx | SIM + cards mobile | SIM |
| **VinculoList.tsx** | **NAO** (`overflow-hidden`) | **NAO** |
| fechamentos/[id]/page.tsx | SIM | NAO |

**Problemas:**
- `VinculoList.tsx` usa `overflow-hidden` em vez de `overflow-x-auto` -- conteudo sera cortado em mobile
- `FechamentoForm.tsx` tabelas internas sem wrapper de overflow verificavel
- Apenas BiRankingMotoristas e BiRankingCaminhoes tem versao mobile com cards (`hidden sm:block` para table + cards para mobile)

**Correcoes sugeridas:**
- VinculoList: trocar `overflow-hidden` por `overflow-x-auto`
- Considerar versao cards para tabelas mais usadas (ViagemList, GastoList, FechamentoList)

---

## 3. Grids - PASS

**45 ocorrencias de `grid-cols-` analisadas.**

A grande maioria usa prefixos responsivos corretamente:
- `grid-cols-1 sm:grid-cols-2` -- padrao para forms
- `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` -- padrao para filtros
- `grid-cols-1 lg:grid-cols-2` -- padrao para BI

**Excecoes (grids fixos):**
- `fechamentos/[id]/page.tsx` linha 83: `grid-cols-2` sem prefixo (info card) -- aceitavel, 2 colunas funciona em 360px
- `fechamentos/[id]/page.tsx` linha 138: `grid-cols-3` sem prefixo -- **potencial problema** em 360px (resumo financeiro com 3 cards comprimidos)
- `empresa/page.tsx`: `grid-cols-[140px_1fr]` -- aceitavel, label+value layout
- `MediaCombustivelRegiao.tsx`: `grid-cols-2` interno em card -- aceitavel
- `HistoricoFiltros.tsx` linha 186: `grid-cols-2` para date range -- aceitavel
- `dashboard/page.tsx`: `grid-cols-[repeat(auto-fill,minmax(300px,1fr))]` -- responsivo via auto-fill

**Unico item preocupante:** `grid-cols-3` no resumo financeiro do fechamento detail. Em 360px (descontando sidebar se corrigido), cada card teria ~100px -- apertado mas funcional.

---

## 4. Textos truncados - PASS

**`whitespace-nowrap`:** Encontrado em celulas de tabela (`<td>`), o que e esperado e correto para dados tabulares. As tabelas ja tem `overflow-x-auto` nos wrappers, entao o scroll horizontal cuida disso.

**`truncate`:** Nao encontrado em nenhum componente.

Nenhum texto de conteudo fora de tabelas usa `whitespace-nowrap`, portanto nao ha risco de corte inesperado.

---

## 5. Touch targets - PASS (parcial)

**Botoes principais:** A maioria dos botoes usa `min-h-[48px]` explicitamente, o que atende a recomendacao WCAG de 44px minimo. Exemplos:
- Botoes de acao em pages: `px-5 py-3 min-h-[48px]`
- Botoes de form: `px-6 py-3 min-h-[48px]`
- Login: `h-14` (56px)

**Problemas encontrados:**
- `VinculoList.tsx` botao "Encerrar": `min-h-[40px]` -- abaixo do minimo de 44px
- Links de navegacao no sidebar: `py-3.5` (~14px padding) em texto base -- provavelmente atinge 44px+ com line-height, aceitavel
- Toggle show/hide senha no login: `p-1` -- area de toque muito pequena (estimativa ~28px)

**Correcoes sugeridas:**
- VinculoList botao Encerrar: aumentar para `min-h-[44px]`
- Login toggle senha: aumentar para `p-2` ou adicionar `min-h-[44px] min-w-[44px]`

---

## 6. Imagens/Logo - PASS

**Login page:** Logo usa `w-[160px] h-auto` com `Image` do Next.js (width=200, height=75). Tamanho fixo mas razoavel para mobile (160px em 360px = 44% da tela).

Nao existe landing page separada no projeto -- o app e um SaaS dashboard, nao um site institucional. A unica tela publica e o login.

---

## 7. Forms - PASS

**Inputs:** Todos os forms verificados usam `w-full` nos inputs. Verificado em 10 componentes Form com 43 ocorrencias totais de `w-full`.

**Grids de form:** Todos usam prefixos responsivos:
- `grid gap-4 sm:grid-cols-2` -- padrao para 2 colunas
- `grid gap-4 sm:grid-cols-3` -- padrao para 3 colunas
- Forms colapsam para 1 coluna em mobile automaticamente

---

## 8. Header - FAIL (ALTA)

**Arquivo:** `app/(dashboard)/layout.tsx` linha 105

```
<header className="bg-surface-card border-b border-surface-border px-8 py-4 flex items-center justify-between">
  <span className="text-sm text-primary-700">{currentUsuario.email}</span>
  <ThemeToggle />
</header>
```

**Problemas:**
1. **`px-8` (32px) de padding** e excessivo para mobile. Em 360px com sidebar (se corrigido), sobram ~360px para o header. Com 64px de padding, restam 296px para conteudo. Se o email for longo (ex: `usuario.empresa@dominio.com.br` = ~35 chars), pode ultrapassar o espaco.
2. **Sem tratamento de overflow** -- email longo pode empurrar o ThemeToggle para fora da tela ou sobrepor.
3. **Nao tem hamburger menu** -- sem sidebar mobile, nao ha como navegar.

**Correcoes necessarias:**
- Reduzir padding: `px-4 sm:px-8`
- Adicionar `truncate` ou `min-w-0` no span do email para evitar overflow
- Adicionar hamburger button visivel em mobile (`md:hidden`)

---

## Plano de Correcao Priorizado

| Prioridade | Item | Esforco | Impacto |
|------------|------|---------|---------|
| P0 - CRITICA | Sidebar responsivo com hamburger menu | Alto | App inutilizavel sem isso |
| P1 - ALTA | Header mobile (padding + hamburger + email truncate) | Medio | Navegacao e layout |
| P2 - MEDIA | VinculoList overflow-x-auto | Baixo | Tabela cortada |
| P2 - MEDIA | Touch target botao Encerrar (40px -> 44px) | Baixo | Acessibilidade |
| P2 - MEDIA | Touch target toggle senha login | Baixo | Acessibilidade |
| P3 - BAIXA | grid-cols-3 fechamento detail sem prefixo | Baixo | Layout apertado |
| P3 - BAIXA | Versao cards mobile para tabelas principais | Alto | UX mobile |

---

## Veredicto Final

**NEEDS_WORK**

O item critico (sidebar fixo sem responsividade) torna o dashboard completamente inutilizavel em dispositivos mobile. Este e um bloqueador que deve ser resolvido antes de qualquer release mobile. O header tambem precisa de ajustes para acomodar a navegacao mobile.

Os demais itens sao melhorias incrementais que podem ser endereadas em stories separadas.
