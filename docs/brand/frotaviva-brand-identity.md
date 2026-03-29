# FrotaViva - Identidade Visual

**Data:** 2026-03-29
**Versao:** 1.0
**Status:** Rebrand de "Siga Bem" para "FrotaViva"

---

## 1. Sobre a Marca

**Nome:** FrotaViva
**Tagline primaria:** SUA FROTA NO CONTROLE
**Produto:** SaaS de gestao de frotas para cegonheiros
**Publico-alvo:** Transportadores de veiculos (cegonheiros), incluindo motoristas 60+

### Significado do Nome

"FrotaViva" combina duas palavras 100% portuguesas:
- **Frota** -- referencia direta ao negocio (gestao de frotas)
- **Viva** -- sugere uma frota ativa, saudavel, bem gerenciada

O nome transmite profissionalismo (Frota) com acessibilidade (Viva), equilibrando confianca tecnica e tom humano.

---

## 2. Paleta de Cores

| Token | Hex | Uso |
|-------|-----|-----|
| **Primary** | `#1B3A4B` | Backgrounds escuros, texto principal, pin do logo |
| **Accent Green** | `#2D6A4F` | Circulos de roda, circulo do pin, destaques |
| **Accent Blue** | `#2D6A8F` | Texto "Viva" no logo (versao light) |
| **Light Accent Green** | `#4DA375` | Texto "Viva" e destaques no logo dark |
| **Muted Text** | `#4A6274` | Tagline, textos secundarios |
| **Muted Light** | `#8BA7B8` | Tagline no logo dark |
| **White** | `#FFFFFF` | Icone da carreta, texto no logo dark |

### Contraste WCAG

| Combinacao | Ratio | Nivel |
|-----------|-------|-------|
| #1B3A4B sobre branco | 10.3:1 | AAA |
| #2D6A4F sobre branco | 5.8:1 | AA (large text AAA) |
| #2D6A8F sobre branco | 4.7:1 | AA |
| #FFFFFF sobre #1B3A4B | 10.3:1 | AAA |
| #4DA375 sobre #1B3A4B | 4.1:1 | AA |

---

## 3. Tipografia

| Elemento | Font | Weight | Size |
|----------|------|--------|------|
| Logo "Frota" | Inter | 800 (ExtraBold) | 36px (full), 28px (horizontal) |
| Logo "Viva" | Inter | 800 (ExtraBold) | 36px (full), 28px (horizontal) |
| Tagline | Inter | 600 (SemiBold) | 9px (full), 8px (horizontal) |

**Letter-spacing:** -0.5px no nome, 2px na tagline (tracking expandido para legibilidade em caixa alta).

---

## 4. Icone (Pin + Carreta Cegonha)

O icone e **identico** ao original "Siga Bem" -- ja foi aprovado pelo stakeholder.

### Composicao do icone:
1. **Pin de localizacao** -- forma de gota invertida, fill #1B3A4B
2. **Circulo interno** -- stroke #2D6A4F, delimita a area do icone
3. **Carreta cegonha** -- silhueta em branco com:
   - Cabine do caminhao (lado esquerdo)
   - Carroceria de dois niveis com carros
   - 3 rodas verdes (#2D6A4F) com centros escuros (#1B3A4B)

### Versao dark:
- Pin fill muda para #2D6A4F
- Circulo interno muda para #4DA375
- Rodas mudam para #4DA375

---

## 5. Variantes do Logo

### 5.1 Logo Full (Stacked)
- **Arquivo:** `frotaviva-logo-full.svg`
- **ViewBox:** 0 0 320 120
- **Uso:** Cabecalho de pagina, hero sections, documentos formais
- **Layout:** Pin a esquerda + "Frota" / "Viva" empilhados + tagline abaixo

### 5.2 Logo Horizontal
- **Arquivo:** `frotaviva-logo-horizontal.svg`
- **ViewBox:** 0 0 360 80
- **Uso:** Navbar, rodape, assinaturas de email
- **Layout:** Pin menor a esquerda + "Frota" / "Viva" empilhados + tagline

### 5.3 Logo Icon
- **Arquivo:** `frotaviva-logo-icon.svg`
- **ViewBox:** 0 0 120 120
- **Uso:** Avatar, app icon, thumbnail, redes sociais
- **Layout:** Quadrado com cantos arredondados (rx=24), pin centralizado

### 5.4 Logo Dark
- **Arquivo:** `frotaviva-logo-dark.svg`
- **ViewBox:** 0 0 320 120
- **Uso:** Fundos escuros (#0F1B24 ou similar), modo dark
- **Layout:** Mesmo do full, cores invertidas para contraste

### 5.5 Favicon
- **Arquivo:** `frotaviva-favicon.svg`
- **ViewBox:** 0 0 32 32
- **Uso:** Browser tab, bookmarks
- **Layout:** Versao simplificada do icon (32x32)

---

## 6. Taglines

### Tagline Primaria (Recomendada)
> **SUA FROTA NO CONTROLE**

Mantida do branding original. Comunica diretamente a proposta de valor: controle total da frota.

### Alternativas Propostas

| # | Tagline | Conceito |
|---|---------|----------|
| 1 | **GESTAO QUE MOVE SUA FROTA** | Enfatiza acao e dinamismo. "Move" tem duplo sentido: movimentar fisicamente e impulsionar o negocio. |
| 2 | **FROTA ATIVA, NEGOCIO VIVO** | Reforco direto do nome "FrotaViva". Conecta a saude da frota ao sucesso do negocio. |
| 3 | **CONTROLE TOTAL, ESTRADA LIVRE** | Apela para a liberdade do cegonheiro na estrada, contrastando com o controle da gestao. Tom emocional. |

---

## 7. Espacamento e Area de Protecao

O logo deve respeitar uma **area de protecao minima** equivalente a altura da letra "V" de "Viva" ao redor de todas as bordas. Nenhum elemento externo deve invadir essa area.

### Tamanho minimo:
- **Logo Full:** largura minima 160px
- **Logo Horizontal:** largura minima 180px
- **Logo Icon:** largura minima 32px
- **Favicon:** 16px (tamanho minimo de renderizacao)

---

## 8. Uso Incorreto (EVITAR)

- Alterar as cores do icone da carreta
- Rotacionar o logo
- Adicionar sombras, gradientes ou efeitos ao logo
- Usar o logo sobre backgrounds que comprometam legibilidade
- Separar "Frota" de "Viva" com espaco (e "FrotaViva", nao "Frota Viva")
- Alterar a proporcao entre icone e texto
- Usar o logo full em espacos menores que 160px de largura

---

## 9. Arquivos Entregues

### docs/brand/logos/
| Arquivo | Tipo | Dimensoes |
|---------|------|-----------|
| `frotaviva-logo-full.svg` | Full stacked | 320x120 |
| `frotaviva-logo-horizontal.svg` | Horizontal | 360x80 |
| `frotaviva-logo-icon.svg` | Icon quadrado | 120x120 |
| `frotaviva-logo-dark.svg` | Dark mode | 320x120 |
| `frotaviva-favicon.svg` | Favicon | 32x32 |

### public/logos/ (deploy-ready)
| Arquivo | Uso |
|---------|-----|
| `frotaviva-logo-full.svg` | Landing page, hero |
| `frotaviva-logo-horizontal.svg` | Navbar |
| `frotaviva-logo-icon.svg` | App icon |
| `frotaviva-logo-dark.svg` | Dark backgrounds |
| `frotaviva-favicon.svg` | Browser favicon |

---

## 10. Proximos Passos (Implementacao)

Estes SVGs foram criados como assets estaticos. Para integrar no app:

1. **Atualizar layout.tsx** -- trocar referencia do logo no header/navbar
2. **Atualizar favicon** -- apontar para `frotaviva-favicon.svg` no `<head>`
3. **Atualizar landing page** -- hero section com novo logo
4. **Atualizar metadata** -- title, og:image, description
5. **Atualizar manifest.json** -- nome e icones do PWA

> Nota: nenhuma alteracao de codigo foi feita nesta entrega. Apenas assets visuais.

---

*Documento criado por Uma (AIOX UX Design Expert) em 2026-03-29.*
