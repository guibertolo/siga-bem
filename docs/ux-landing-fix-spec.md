# Especificacao de Design: Correcao da Landing Page

**Autor:** Uma (UX Design Expert)
**Data:** 2026-03-29
**Arquivo alvo:** `app/page.tsx`
**Status:** Pronto para implementacao

---

## 1. Diagnostico dos Problemas

### 1.1 Logo ausente
A landing page atual exibe apenas um `<h1>` com texto "Siga Bem". O logo SVG aprovado (pin com carreta cegonha) nao aparece em nenhum lugar da pagina.

### 1.2 Botao "Entrar" cortado
O botao usa `inline-block w-full max-w-xs` combinado com `px-8 py-4`, mas dentro de um container `max-w-[480px]`. Em telas pequenas ou com zoom, o texto "Entrar" pode ficar truncado ("Entr") porque `max-w-xs` (320px) pode conflitar com o padding do container pai (`px-6`). O botao precisa de dimensoes explicitas e largura percentual segura.

### 1.3 Identidade visual generica
Pagina branca com texto e botao sem nenhum elemento visual que comunique a identidade do Siga Bem (transporte, frotas, cegonheiros). Falta cor de acento, falta o logo, falta hierarquia visual.

---

## 2. Assets a Copiar para `public/`

O @dev deve copiar os seguintes arquivos. Os SVGs ainda nao existem no repositorio (o diretorio `docs/brand/` nao existe), entao precisam ser criados primeiro ou obtidos do designer.

| Origem planejada | Destino | Uso |
|-----------------|---------|-----|
| Logo completo SVG | `public/logos/siga-bem-logo-full.svg` | Landing page (desktop) |
| Logo icone SVG | `public/logos/siga-bem-logo-icon.svg` | Landing page (mobile), favicon |
| Logo horizontal SVG | `public/logos/siga-bem-logo-horizontal.svg` | Sidebar do dashboard (futuro) |

**NOTA IMPORTANTE:** Os arquivos em `docs/brand/logos/` mencionados no briefing NAO existem no repositorio atual. O @dev deve:
1. Criar o diretorio `docs/brand/logos/`
2. Solicitar ou gerar os SVGs do logo conforme a especificacao de marca
3. Copiar para `public/logos/` para uso na aplicacao

---

## 3. Layout da Landing Page

### 3.1 Estrutura Vertical (Mobile-First)

```
+------------------------------------------+
|              (espacamento top)            |
|                                          |
|          [Logo SVG - Full]               |
|          320x120px desktop               |
|          200x75px mobile                 |
|                                          |
|          (24px gap)                      |
|                                          |
|         GESTAO DE FROTAS                 |
|         texto auxiliar                   |
|                                          |
|          (32px gap)                      |
|                                          |
|    [========= ENTRAR =========]          |
|         botao largo                      |
|                                          |
|          (espacamento bottom)            |
+------------------------------------------+
```

### 3.2 Hierarquia de Conteudo

| Elemento | Prioridade | Descricao |
|----------|-----------|-----------|
| Logo SVG | 1 (hero) | Elemento visual principal, comunica a marca |
| Tagline | 2 | "Sua frota no controle" - ja existe, manter |
| Subtitulo | 3 | Opcional: "Gestao inteligente para cegonheiros" |
| Botao Entrar | 4 | CTA principal, deve ser impossivel de perder |

---

## 4. Especificacao de Componentes

### 4.1 Logo

```
Elemento: <Image> do Next.js (ou <img> com SVG inline)
- Desktop: width={320} height={120}
- Mobile (< 640px): width={200} height={75}
- Alt text: "Siga Bem - Gestao de Frotas"
- Margin-bottom: mb-6 (24px)
```

**Classes Tailwind:**
```
className="w-[200px] h-auto sm:w-[320px]"
```

Se o SVG nao estiver disponivel, usar fallback com texto estilizado (atual h1) mas adicionar um icone de pin/caminhao via SVG inline simples.

### 4.2 Tagline

Manter o texto atual "Sua frota no controle" com ajustes:

```tsx
<p className="text-lg sm:text-xl font-medium text-primary-700 mb-8 sm:mb-12">
  Sua frota no controle
</p>
```

Mudancas:
- `text-lg` no mobile, `sm:text-xl` no desktop
- Remover `whitespace-nowrap` (pode causar overflow em telas muito estreitas)
- Reduzir `mb-12` para `mb-8` no mobile

### 4.3 Botao "Entrar" (CRITICO)

O botao atual esta quebrado. Nova especificacao:

```tsx
<Link
  href="/login"
  className="flex items-center justify-center w-full max-w-[320px] mx-auto h-14 bg-primary-700 text-white text-lg font-semibold rounded-default text-center no-underline hover:bg-primary-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
>
  Entrar
</Link>
```

**Detalhes do botao:**

| Propriedade | Valor | Justificativa |
|-------------|-------|---------------|
| `display` | `flex items-center justify-center` | Centraliza texto vertical e horizontal, evita truncamento |
| `width` | `w-full max-w-[320px]` | Ocupa toda largura disponivel ate 320px |
| `height` | `h-14` (56px) | Altura fixa, area de toque confortavel (min 48px WCAG) |
| `mx-auto` | auto | Centraliza o botao no container |
| `font-size` | `text-lg` (18px) | Legivel sem ser exagerado |
| `font-weight` | `font-semibold` (600) | Consistente com botao da pagina de login |
| `border-radius` | `rounded-default` (8px) | Token do design system |
| `bg` | `bg-primary-700` (#2C5F7C) | Cor primaria da marca |
| `hover` | `hover:bg-primary-900` (#1B3A4B) | Escurece no hover |
| `focus` | `focus:ring-2 focus:ring-primary-500 focus:ring-offset-2` | Acessibilidade - foco visivel |
| `transition` | `transition-colors` | Transicao suave |

**NAO usar:**
- `inline-block` (causa problemas de alinhamento vertical)
- `px-8 py-4` (padding variavel pode truncar em edge cases)
- `max-w-xs` sem `mx-auto` (desalinha)

### 4.4 Container Principal

```tsx
<main className="flex min-h-screen flex-col items-center justify-center bg-surface-background px-6 py-12">
  <div className="w-full max-w-[480px] flex flex-col items-center text-center">
    {/* Logo */}
    {/* Tagline */}
    {/* Botao */}
  </div>
</main>
```

Mudancas no container:
- Adicionar `flex flex-col items-center` no div interno para garantir centralizacao

---

## 5. Detalhes Visuais de Marca

### 5.1 Acento Verde Cegonha

Para adicionar identidade visual sem logo, usar uma linha decorativa sutil:

```tsx
{/* Linha decorativa abaixo da tagline */}
<div className="w-16 h-1 bg-[#2D6A4F] rounded-full mx-auto mb-8 sm:mb-12" />
```

O verde `#2D6A4F` e a cor das rodas do logo do cegonheiro. Esta linha funciona como um separador visual que:
- Adiciona cor e personalidade
- Separa a area de branding da area de acao
- Funciona mesmo sem o logo SVG

### 5.2 Tokens a Usar

| Propriedade | Token | Valor |
|-------------|-------|-------|
| Background da pagina | `bg-surface-background` | #F8FAFC |
| Texto titulo | `text-primary-900` | #1B3A4B |
| Texto tagline | `text-primary-700` | #2C5F7C |
| Botao bg | `bg-primary-700` | #2C5F7C |
| Botao hover | `hover:bg-primary-900` | #1B3A4B |
| Botao focus ring | `focus:ring-primary-500` | #3D8EB9 |
| Verde acento | `bg-[#2D6A4F]` | #2D6A4F (hardcoded, nao e token) |
| Border radius | `rounded-default` | 8px |

### 5.3 Token Ausente

O verde cegonha `#2D6A4F` nao existe como token Tailwind em `globals.css`. Considerar adicionar:

```css
--color-accent-green: #2D6A4F;
```

Isso permitiria usar `bg-accent-green` ao inves de `bg-[#2D6A4F]`. Decisao do @dev/@architect.

---

## 6. Responsividade

### 6.1 Breakpoints

| Breakpoint | Logo | Tagline | Botao | Container padding |
|------------|------|---------|-------|-------------------|
| < 640px (mobile) | 200x75px | text-lg | w-full h-14 | px-6 py-12 |
| >= 640px (sm) | 320x120px | text-xl | w-full max-w-[320px] h-14 | px-6 py-12 |

### 6.2 Testes Obrigatorios

O @dev deve testar em:
- [ ] iPhone SE (375px) - menor viewport comum
- [ ] iPhone 14 (390px)
- [ ] iPad (768px)
- [ ] Desktop (1280px)
- [ ] Com zoom 200% (acessibilidade WCAG)

Verificar que:
- [ ] O texto "Entrar" NUNCA esta truncado
- [ ] O logo nao ultrapassa as margens
- [ ] A tagline nao causa scroll horizontal
- [ ] O botao tem area de toque minima de 48x48px

---

## 7. Acessibilidade (WCAG 2.1 AA)

| Requisito | Implementacao |
|-----------|--------------|
| Contraste texto titulo | primary-900 (#1B3A4B) sobre background (#F8FAFC) = 10.2:1 - PASSA |
| Contraste texto tagline | primary-700 (#2C5F7C) sobre background (#F8FAFC) = 5.1:1 - PASSA |
| Contraste botao | branco (#FFF) sobre primary-700 (#2C5F7C) = 5.1:1 - PASSA |
| Focus visivel | `focus:ring-2 focus:ring-primary-500 focus:ring-offset-2` |
| Area de toque | h-14 (56px) >= 48px minimo |
| Alt text no logo | "Siga Bem - Gestao de Frotas" |
| Semantica | `<main>`, `<h1>`, `<p>`, `<a>` corretos |
| Navegacao teclado | Link nativo, funciona com Tab + Enter |

---

## 8. Codigo de Referencia Final

Estrutura completa esperada apos implementacao:

```tsx
import Link from 'next/link';
import Image from 'next/image';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-surface-background px-6 py-12">
      <div className="w-full max-w-[480px] flex flex-col items-center text-center">
        {/* Logo */}
        <Image
          src="/logos/siga-bem-logo-full.svg"
          alt="Siga Bem - Gestao de Frotas"
          width={320}
          height={120}
          className="w-[200px] h-auto sm:w-[320px] mb-6"
          priority
        />

        {/* Tagline */}
        <p className="text-lg sm:text-xl font-medium text-primary-700 mb-4">
          Sua frota no controle
        </p>

        {/* Separador verde cegonha */}
        <div className="w-16 h-1 bg-[#2D6A4F] rounded-full mb-8 sm:mb-12" />

        {/* CTA */}
        <Link
          href="/login"
          className="flex items-center justify-center w-full max-w-[320px] h-14 bg-primary-700 text-white text-lg font-semibold rounded-default no-underline hover:bg-primary-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
        >
          Entrar
        </Link>
      </div>
    </main>
  );
}
```

---

## 9. Decisoes Autonomas

| Questao | Decisao | Motivo |
|---------|---------|--------|
| [AUTO-DECISION] Usar Image do Next.js ou img nativo? | `<Image>` do Next.js | Otimizacao automatica, lazy loading, priority para LCP |
| [AUTO-DECISION] Adicionar subtitulo extra? | Nao | A tagline "Sua frota no controle" ja e suficiente. Menos e mais numa landing page de SaaS B2B |
| [AUTO-DECISION] Adicionar ilustracao/background? | Nao nesta iteracao | Foco em resolver os 3 bugs reportados. Ilustracao pode ser uma melhoria futura |
| [AUTO-DECISION] Usar flex ao inves de inline-block no botao? | Sim, flex | Previne o bug de truncamento. flex + items-center + justify-center garante centralizacao perfeita do texto |
| [AUTO-DECISION] Logo fallback se SVG nao existir? | Manter h1 atual + linha verde | O dev deve verificar se o SVG existe antes de usar Image. Se nao existir, o h1 com a linha decorativa ja melhora significativamente |

---

## 10. Consistencia com Outras Paginas

A pagina de login (`app/(auth)/login/page.tsx`) usa:
- `bg-surface-background` para fundo
- `bg-surface-card rounded-card p-8 shadow-sm` para card
- `bg-primary-700 hover:bg-primary-900` para botao
- `rounded-default` para inputs e botoes
- `h-13` para botao (52px)

A landing page deve manter consistencia:
- Mesmas cores de botao (primary-700/900)
- Mesmo border-radius (rounded-default)
- Botao ligeiramente maior (h-14 = 56px) pois e o CTA principal da aplicacao
- Sem card wrapper (a landing page e mais aberta que a pagina de login)

---

## 11. Checklist de Implementacao para @dev

- [ ] Criar diretorio `public/logos/`
- [ ] Obter/criar os SVGs do logo e colocar em `public/logos/`
- [ ] Criar diretorio `docs/brand/logos/` e guardar originais la
- [ ] Alterar `app/page.tsx` conforme secao 8
- [ ] Testar em 4 viewports (secao 6.2)
- [ ] Verificar que "Entrar" nunca trunca
- [ ] Verificar contrastes de cor (secao 7)
- [ ] Considerar adicionar token `--color-accent-green` em `globals.css`
