# Dark Mode -- Estrategia de Menor Impacto

**Projeto:** Siga Bem
**Stack:** Next.js 16 + Tailwind CSS v4.2.2 + React 19
**Data:** 2026-03-29
**Autor:** Aria (Architect)

---

## Diagnostico do Estado Atual

### Resumo de Uso de Cores (77 arquivos .tsx)

| Categoria | Ocorrencias | Arquivos | Impacto |
|-----------|-------------|----------|---------|
| `bg-surface-*` / `text-primary-*` / `border-surface-*` (tokens) | 755 | 72 | ZERO -- ja sao CSS variables |
| `bg-white` (hardcoded) | 58 | 19 | ALTO -- precisa migrar para token |
| `bg-gray-50/100/200` (hardcoded) | 67 | 31 | ALTO -- precisa migrar para token |
| `bg-red-50`, `bg-green-50`, `bg-amber-50` (alert backgrounds) | 74 | 38 | MEDIO -- precisa tokens semanticos |
| `text-slate-*` (hardcoded) | 44 | 18 | ALTO -- precisa migrar para token |
| `border-slate-*` (hardcoded) | 9 | 6 | BAIXO -- poucos arquivos |
| `shadow-sm` | ~16 | ~10 | BAIXO -- shadows sao OK |

### Conclusao do Diagnostico

O projeto esta em **boa posicao** para dark mode. A maioria dos componentes (72 arquivos) ja usa tokens semanticos (`bg-surface-card`, `text-primary-900`, `border-surface-border`). O trabalho principal e:

1. Definir variantes dark das CSS variables em `globals.css` (1 arquivo)
2. Migrar ~58 usos de `bg-white` para `bg-surface-card` (19 arquivos)
3. Migrar ~67 usos de `bg-gray-*` para tokens de surface (31 arquivos)
4. Adicionar tokens semanticos para alert backgrounds (38 arquivos)
5. Migrar ~44 usos de `text-slate-*` para tokens semanticos (18 arquivos)
6. Criar componente ThemeToggle (1 arquivo novo)
7. Adicionar script anti-FOUC no layout (1 arquivo)

---

## A. Mapeamento Completo de Cores Light -> Dark

### Cores Primarias

| Token | Light | Dark | Logica |
|-------|-------|------|--------|
| `--color-primary-900` | `#1B3A4B` | `#E3F2FD` | Texto principal inverte para claro |
| `--color-primary-700` | `#2C5F7C` | `#90CAF9` | Texto secundario fica azul claro |
| `--color-primary-500` | `#3D8EB9` | `#64B5F6` | Accent/focus levemente mais claro |
| `--color-primary-100` | `#E3F2FD` | `#1B3A4B` | Background claro inverte para escuro |

### Cores de Surface

| Token | Light | Dark | Logica |
|-------|-------|------|--------|
| `--color-surface-background` | `#F8FAFC` | `#0F172A` | Background principal: slate-900 |
| `--color-surface-card` | `#FFFFFF` | `#1E293B` | Cards: slate-800 |
| `--color-surface-muted` | `#F1F5F9` | `#334155` | Muted areas: slate-700 |
| `--color-surface-border` | `#CBD5E1` | `#475569` | Borders: slate-600 |
| `--color-surface-hover` | `#E2E8F0` | `#475569` | Hover states: slate-600 |

### Tokens Novos (necessarios para migrar hardcoded colors)

| Token Novo | Light | Dark | Substitui |
|------------|-------|------|-----------|
| `--color-surface-input` | `#FFFFFF` | `#1E293B` | `bg-white` em inputs |
| `--color-surface-row-alt` | `#F9FAFB` | `#1E293B` | `bg-gray-50` em tabelas |
| `--color-surface-row-hover` | `#F3F4F6` | `#334155` | `bg-gray-100` em hovers |
| `--color-text-muted` | `#64748B` | `#94A3B8` | `text-slate-500` |
| `--color-text-subtle` | `#94A3B8` | `#64748B` | `text-slate-400` |
| `--color-text-label` | `#334155` | `#CBD5E1` | `text-slate-700` |
| `--color-alert-success-bg` | `#F0FDF4` | `#052E16` | `bg-green-50` |
| `--color-alert-danger-bg` | `#FEF2F2` | `#450A0A` | `bg-red-50` |
| `--color-alert-warning-bg` | `#FFFBEB` | `#451A03` | `bg-amber-50` |
| `--color-alert-info-bg` | `#EFF6FF` | `#172554` | `bg-blue-50` |

---

## B. Cores que NAO Mudam

As seguintes cores devem permanecer iguais em ambos os modos:

| Token | Valor | Motivo |
|-------|-------|--------|
| `--color-accent-green` | `#2D6A4F` | Ja e semantico, bom contraste em ambos |
| `--color-success` | `#1B7A3D` | Status semantico (ajustar para `#4ADE80` no dark para contraste) |
| `--color-warning` | `#B45309` | Status semantico (ajustar para `#FBBF24` no dark) |
| `--color-danger` | `#B91C1C` | Status semantico (ajustar para `#F87171` no dark) |
| `--color-info` | `#1E5A8A` | Status semantico (ajustar para `#60A5FA` no dark) |
| `--color-status-planejada` | `#3B82F6` | Cor de badge, funciona em ambos |
| `--color-status-em-andamento` | `#F59E0B` | Cor de badge, funciona em ambos |
| `--color-status-concluida` | `#10B981` | Cor de badge, funciona em ambos |
| `--color-status-cancelada` | `#EF4444` | Cor de badge, funciona em ambos |

**Nota sobre cores semanticas:** `success`, `warning`, `danger` e `info` precisam de versoes mais claras no dark mode para manter contraste WCAG AA sobre fundos escuros. Os valores de status (badges) funcionam como estao porque sao usados como background de badges com texto branco/escuro.

---

## C. Estrategia do Sidebar

**Recomendacao: MANTER O SIDEBAR ESCURO em ambos os modos.**

Justificativa:
1. O sidebar ja usa `bg-primary-900` (#1B3A4B) com texto `text-slate-300` / `text-white`
2. Sidebars escuros em dashboards sao padrao da industria (GitHub, Linear, Notion, Vercel)
3. Inverter o sidebar para claro no dark mode seria visualmente estranho e quebraria a identidade
4. Zero alteracoes no sidebar = zero risco

**Elementos do sidebar que NAO mudam:**
- `bg-primary-900` (fundo)
- `text-white` (logo, titulos)
- `text-slate-300` (links)
- `hover:bg-white/10` (hover state)
- `border-white/10` (divisorias)

**Unico ajuste no header** (area de conteudo):
- `bg-surface-card` ja e token, muda automaticamente
- `border-surface-border` ja e token, muda automaticamente
- `text-primary-700` (email) ja e token, muda automaticamente

---

## D. Toggle UI -- Especificacao

### Posicao
No header do dashboard (`app/(dashboard)/layout.tsx`), canto direito, ao lado do email do usuario.

```
[email@user.com]  [toggle]
```

### Componente: `ThemeToggle`

**Arquivo:** `components/ui/ThemeToggle.tsx`

**Comportamento:**
- Ciclo de 3 estados: Light -> Dark -> System -> Light
- Icone muda conforme estado ativo:
  - Light: icone de sol (SVG inline)
  - Dark: icone de lua (SVG inline)
  - System: icone de monitor (SVG inline)
- Tooltip acessivel com estado atual

**Especificacoes de UI:**
- Tamanho do botao: `w-10 h-10` (40px) -- minimo 44px touch target com padding
- `p-2` para area de toque adequada
- Border radius: `rounded-lg`
- Transicao: `transition-colors duration-200`
- Cor do icone: `text-primary-700` (light) / `text-primary-500` (dark)
- Hover: `bg-surface-hover`
- Focus: `focus:outline-none focus:ring-2 focus:ring-primary-500`

**Icones SVG (inline, sem dependencia externa):**

Sol (20x20):
```html
<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <circle cx="12" cy="12" r="5"/>
  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
</svg>
```

Lua (20x20):
```html
<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
</svg>
```

Monitor (20x20):
```html
<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
  <line x1="8" y1="21" x2="16" y2="21"/>
  <line x1="12" y1="17" x2="12" y2="21"/>
</svg>
```

---

## E. Persistencia e Anti-FOUC

### localStorage

| Chave | Valores | Default |
|-------|---------|---------|
| `siga-bem-theme` | `"light"` \| `"dark"` \| `"system"` | `"system"` |

### Script Anti-FOUC

Adicionar script **inline** no `<head>` do `app/layout.tsx`, ANTES de qualquer CSS:

```tsx
<head>
  <script
    dangerouslySetInnerHTML={{
      __html: `
        (function() {
          var theme = localStorage.getItem('siga-bem-theme') || 'system';
          var isDark = theme === 'dark' ||
            (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
          if (isDark) document.documentElement.classList.add('dark');
        })();
      `,
    }}
  />
</head>
```

**Por que inline?** Este script executa ANTES do primeiro paint, impedindo o flash branco -> escuro (FOUC). Ele e sincrono e bloqueia a renderizacao por ~0.1ms -- aceitavel.

### Listener para mudanca de preferencia do OS

O componente `ThemeToggle` deve escutar mudancas no `prefers-color-scheme` quando o tema e `system`:

```typescript
useEffect(() => {
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = () => {
    if (localStorage.getItem('siga-bem-theme') === 'system') {
      document.documentElement.classList.toggle('dark', media.matches);
    }
  };
  media.addEventListener('change', handler);
  return () => media.removeEventListener('change', handler);
}, []);
```

---

## F. Arquivos que NAO Precisam Mudar

Se a estrategia de CSS variables for implementada corretamente (migrando hardcoded colors para tokens), os seguintes arquivos nao precisam de NENHUMA alteracao adicional para dark mode:

### Arquivos que ja usam APENAS tokens (zero hardcoded colors):

Todos os 72 arquivos que ja usam exclusivamente `bg-surface-*`, `text-primary-*`, `border-surface-*` funcionarao automaticamente apos a definicao das variantes dark em `globals.css`.

### Arquivos que NUNCA precisam mudar:

1. **Sidebar inteiro** -- `app/(dashboard)/layout.tsx` (secao aside) -- ja e escuro
2. **Logica de negocio** -- todos os `actions.ts`, `lib/`, `hooks/`
3. **Supabase/Auth** -- `lib/supabase/`, `lib/auth/`
4. **Paginas server-side** -- apenas passam dados, nao tem estilos
5. **postcss.config.mjs** -- nenhuma alteracao necessaria
6. **Fontes** -- Inter funciona em qualquer modo
7. **SVGs/icones** -- usam `currentColor`, herdam automaticamente

---

## G. Implementacao -- Plano de Minimo Impacto

### Fase 1: Infraestrutura (3 arquivos)

| Arquivo | Alteracao | Complexidade |
|---------|-----------|-------------|
| `app/globals.css` | Adicionar bloco `.dark { }` com todas as variantes + novos tokens | MEDIA |
| `app/layout.tsx` | Script anti-FOUC no `<head>` + classe condicional no `<html>` | BAIXA |
| `components/ui/ThemeToggle.tsx` | NOVO componente client-side | BAIXA |

### Fase 2: Integracao do Toggle (1 arquivo)

| Arquivo | Alteracao | Complexidade |
|---------|-----------|-------------|
| `app/(dashboard)/layout.tsx` | Import ThemeToggle + render no header | TRIVIAL |

### Fase 3: Migracao de Cores Hardcoded (migrar progressivamente)

| Prioridade | De | Para | Arquivos Afetados |
|------------|-----|------|-------------------|
| P1 | `bg-white` | `bg-surface-card` ou `bg-surface-input` | 19 |
| P2 | `bg-gray-50` | `bg-surface-row-alt` | ~20 |
| P3 | `bg-gray-100` | `bg-surface-row-hover` ou `bg-surface-muted` | ~15 |
| P4 | `text-slate-500` | `text-text-muted` | ~10 |
| P5 | `text-slate-300/400` | `text-text-subtle` | ~8 |
| P6 | `bg-red-50`, `bg-green-50`, etc. | `bg-alert-*-bg` | 38 |
| P7 | `border-slate-200` | `border-surface-border` | 6 |

**Nota critica:** A Fase 3 e PROGRESSIVA. O dark mode funciona com a Fase 1+2 para todos os componentes que ja usam tokens (72 arquivos). Os ~31 arquivos com cores hardcoded terao inconsistencias visuais ate serem migrados, mas NAO quebram funcionalidade.

---

## H. globals.css -- Bloco Dark Mode Proposto

```css
@theme {
  /* === Tokens existentes (mantidos) === */
  /* ... */

  /* === Novos tokens semanticos === */
  --color-surface-input: #FFFFFF;
  --color-surface-row-alt: #F9FAFB;
  --color-surface-row-hover: #F3F4F6;
  --color-text-muted: #64748B;
  --color-text-subtle: #94A3B8;
  --color-text-label: #334155;
  --color-alert-success-bg: #F0FDF4;
  --color-alert-danger-bg: #FEF2F2;
  --color-alert-warning-bg: #FFFBEB;
  --color-alert-info-bg: #EFF6FF;
}

.dark {
  --color-primary-900: #E3F2FD;
  --color-primary-700: #90CAF9;
  --color-primary-500: #64B5F6;
  --color-primary-100: #1B3A4B;

  --color-success: #4ADE80;
  --color-warning: #FBBF24;
  --color-danger: #F87171;
  --color-info: #60A5FA;

  --color-surface-background: #0F172A;
  --color-surface-card: #1E293B;
  --color-surface-muted: #334155;
  --color-surface-border: #475569;
  --color-surface-hover: #475569;
  --color-surface-input: #1E293B;
  --color-surface-row-alt: #1E293B;
  --color-surface-row-hover: #334155;

  --color-text-muted: #94A3B8;
  --color-text-subtle: #64748B;
  --color-text-label: #CBD5E1;

  --color-alert-success-bg: #052E16;
  --color-alert-danger-bg: #450A0A;
  --color-alert-warning-bg: #451A03;
  --color-alert-info-bg: #172554;
}
```

**Importante sobre Tailwind v4:** Em Tailwind v4, `@theme` gera CSS custom properties automaticamente. O bloco `.dark` sobrescreve essas custom properties diretamente. Isso significa que qualquer classe como `bg-surface-card` que resolve para `var(--color-surface-card)` mudara automaticamente quando `.dark` estiver presente no `<html>`.

---

## I. Riscos e Mitigacoes

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|---------------|---------|-----------|
| FOUC (flash of unstyled content) | Media | Visual | Script inline no `<head>` |
| Contraste insuficiente no dark | Media | Acessibilidade | Testar com WCAG contrast checker |
| Cores hardcoded nao migradas | Certa | Visual (parcial) | Migrar progressivamente, priorizar P1/P2 |
| Shadows invisiveis no dark | Baixa | Visual | Shadows com `shadow-sm` ja sao sutis |
| Imagens/logos com fundo branco | Baixa | Visual | Logos SVG com `currentColor` ja se adaptam |
| `themeColor` no viewport meta | Nenhuma | SEO | Ajustar para dark: `#0F172A` |

---

## J. Decisoes Arquiteturais

| Decisao | Opcoes Consideradas | Escolha | Justificativa |
|---------|---------------------|---------|---------------|
| Mecanismo de ativacao | `class` vs `media` vs `variant` | `class` + `media` fallback | Permite toggle manual + respeita OS |
| Sidebar no dark | Inverter vs manter escuro | Manter escuro | Padrao da industria, zero mudancas |
| Persistencia | Cookie vs localStorage | localStorage | SSR nao e critico aqui, FOUC resolvido com script |
| Novos tokens | Criar vs usar `dark:` prefix | Criar tokens semanticos | Menor impacto a longo prazo, single source of truth |
| Migracao hardcoded | Big bang vs progressiva | Progressiva | Menor risco, funciona parcialmente desde Fase 1 |
| Biblioteca de tema | next-themes vs custom | Custom (3 funcoes) | Zero dependencias, ~30 linhas de codigo |

---

## K. Estimativa de Esforco

| Fase | Stories Afetadas | Tempo Estimado | Risco |
|------|------------------|----------------|-------|
| Fase 1 (infraestrutura) | 1 story | 1-2 horas | Baixo |
| Fase 2 (integracao toggle) | Mesma story | 15 min | Trivial |
| Fase 3 (migracao P1-P3) | 1 story | 2-3 horas | Baixo |
| Fase 3 (migracao P4-P7) | 1 story | 1-2 horas | Baixo |
| **Total** | **2-3 stories** | **4-7 horas** | **Baixo** |

---

*Documento gerado por Aria (Architect) -- 2026-03-29*
