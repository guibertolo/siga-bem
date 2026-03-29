# Auditoria de Usabilidade -- Siga Bem

**Data:** 2026-03-29
**Auditora:** Uma (UX Design Expert)
**Publico-alvo primario:** Motoristas de cegonha, 35-50 anos, baixa familiaridade digital
**Publico-alvo secundario:** Donos de transportadora, 50-65 anos, familiaridade digital variavel
**Dispositivo primario:** Celular (telas 360-414px) e desktop (donos usam mais desktop)

---

## Sumario Executivo

Analisei **15 componentes** e **9 paginas** do sistema Siga Bem. O sistema esta funcional e bem estruturado tecnicamente, mas apresenta problemas sistematicos de usabilidade para o publico-alvo:

| Categoria | Severidade | Ocorrencias |
|-----------|-----------|-------------|
| Inputs subdimensionados (< 48px touch target) | CRITICA | 47 campos |
| Labels com texto pequeno demais | ALTA | 42 labels |
| Botoes sem icones visuais | ALTA | 28 botoes |
| Botoes subdimensionados | ALTA | 22 botoes |
| Status badges com texto ilegivel | MEDIA | 8 badges |
| Empty states pouco informativos | MEDIA | 6 telas |
| Textos de acao sem icone (Editar/Excluir) | ALTA | 16 links/botoes |
| Paginacao com targets pequenos | MEDIA | 3 componentes |
| Tabelas com texto `text-sm` no mobile | ALTA | 8 tabelas |

**Impacto estimado:** Um motorista com dificuldade digital vai errar o toque em 30-40% das interacoes com a interface atual.

---

## PADRAO GLOBAL DE CLASSES TAILWIND

Todas as correcoes seguem este padrao consistente. O @dev deve aplicar em TODOS os componentes listados.

### Inputs (text, number, date, datetime-local, select, textarea)

```
ANTES:  px-3 py-2 text-sm
DEPOIS: px-4 py-3 text-base
```

Classe completa de input (substituir em todos os componentes):
```
ANTES:  w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors
DEPOIS: w-full rounded-lg border px-4 py-3 text-base outline-none transition-colors
```

Altura resultante: ~48px (atende WCAG 2.5.5 Target Size)

### Labels

```
ANTES:  mb-1 block text-sm font-medium
DEPOIS: mb-2 block text-base font-medium
```

### Mensagens de erro

```
ANTES:  mt-1 text-sm text-red-500  (ou text-xs text-red-600)
DEPOIS: mt-1.5 text-sm text-red-600 font-medium
```

### Botoes primarios (submit/CTA)

```
ANTES:  rounded-lg bg-primary-700 px-6 py-2 text-sm font-medium text-white
DEPOIS: rounded-lg bg-primary-700 px-6 py-3 text-base font-semibold text-white min-h-[48px]
```

### Botoes secundarios (cancelar/voltar)

```
ANTES:  rounded-lg border border-surface-border px-6 py-2 text-sm font-medium text-primary-700
DEPOIS: rounded-lg border border-surface-border px-6 py-3 text-base font-semibold text-primary-700 min-h-[48px]
```

### Botoes de acao em tabela (Editar, Excluir, Ver, etc.)

```
ANTES:  text-xs text-primary-500 (ou text-primary-600)
DEPOIS: inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium min-h-[40px]
```

### Status badges

```
ANTES:  rounded-full px-2 py-0.5 text-xs font-medium
DEPOIS: rounded-full px-3 py-1 text-sm font-semibold
```

### Cabecos de tabela (th)

```
ANTES:  px-4 py-3 font-medium text-primary-700  (com text-sm na table)
DEPOIS: px-4 py-3 text-sm font-semibold text-primary-700
```
(Manter text-sm nos headers, aumentar o body)

### Celulas de tabela (td)

```
ANTES:  px-4 py-3 text-primary-700  (herdando text-sm da table)
DEPOIS: px-4 py-3.5 text-base text-primary-700
```

### Filter tabs/pills

```
ANTES:  rounded-full border px-3 py-1 text-xs font-medium
DEPOIS: rounded-full border px-4 py-2 text-sm font-medium min-h-[40px]
```

---

## ICONES SVG -- CATALOGO COMPLETO

Todos os icones abaixo devem ser usados inline como componentes JSX. Tamanho padrao: `h-5 w-5` (20x20px). Usar `aria-hidden="true"` em cada um.

### Icone: Plus (para botoes "Novo/Cadastrar")

```jsx
<svg className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
</svg>
```

### Icone: Pencil (para botoes "Editar")

```jsx
<svg className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
</svg>
```

### Icone: Trash (para botoes "Excluir")

```jsx
<svg className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
</svg>
```

### Icone: Check (para botoes "Salvar/Confirmar")

```jsx
<svg className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
</svg>
```

### Icone: ArrowLeft (para botoes "Voltar/Cancelar")

```jsx
<svg className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
</svg>
```

### Icone: Eye (para botoes "Ver/Detalhes")

```jsx
<svg className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
</svg>
```

### Icone: Download (para botoes "Exportar CSV")

```jsx
<svg className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
</svg>
```

### Icone: Link (para "Novo Vinculo")

```jsx
<svg className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
</svg>
```

### Icone: XCircle (para "Inativar/Desativar/Encerrar")

```jsx
<svg className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
</svg>
```

### Icone: CheckCircle (para "Reativar")

```jsx
<svg className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
</svg>
```

### Icone: Clock (para "Historico")

```jsx
<svg className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
</svg>
```

### Icone: Calculator (para "Calcular Preview")

```jsx
<svg className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
</svg>
```

### Icone: DocumentText (para "Gerar PDF")

```jsx
<svg className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
</svg>
```

### Icone: UserPlus (para "Convidar Usuario")

```jsx
<svg className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
</svg>
```

### Icone: Filter (para secao de filtros)

```jsx
<svg className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
</svg>
```

### Icone: Truck (para empty states de caminhoes)

```jsx
<svg className="h-12 w-12 text-primary-300" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
</svg>
```

### Icone: User (para empty states de motoristas)

```jsx
<svg className="h-12 w-12 text-primary-300" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
</svg>
```

### Icone: Map (para empty states de viagens)

```jsx
<svg className="h-12 w-12 text-primary-300" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
</svg>
```

### Icone: CurrencyDollar (para empty states de gastos/fechamentos)

```jsx
<svg className="h-12 w-12 text-primary-300" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
</svg>
```

---

## MUDANCAS POR ARQUIVO -- ESPECIFICACAO DETALHADA

### 1. `components/motoristas/MotoristaForm.tsx`

**1.1 Labels (6 labels)**
Substituir TODAS as ocorrencias de:
```
className="mb-1 block text-sm font-medium text-primary-900"
```
Por:
```
className="mb-2 block text-base font-medium text-primary-900"
```
Linhas afetadas: 109, 130, 156, 176, 200, 236

**1.2 Inputs (5 inputs + 1 select + 1 textarea)**
Substituir TODAS as ocorrencias de:
```
'w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors',
```
Por:
```
'w-full rounded-lg border px-4 py-3 text-base outline-none transition-colors',
```
Linhas afetadas: 118, 142, 164, 183, 207, 244

O input standalone do telefone (linha 230):
```
ANTES:  className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm outline-none transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
DEPOIS: className="w-full rounded-lg border border-surface-border px-4 py-3 text-base outline-none transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
```

**1.3 Botao Submit (linha 258-267)**
```
ANTES:
'rounded-lg bg-primary-700 px-6 py-2 text-sm font-medium text-white transition-colors',

DEPOIS:
'rounded-lg bg-primary-700 px-6 py-3 text-base font-semibold text-white transition-colors min-h-[48px]',
```

Adicionar icone Check antes do texto:
```jsx
// Dentro do <button>, antes do texto
<span className="inline-flex items-center gap-2">
  {/* Icone Check SVG */}
  {isPending ? 'Salvando...' : isEditing ? 'Salvar Alteracoes' : 'Cadastrar Motorista'}
</span>
```

**1.4 Mensagens de erro**
Substituir TODAS as ocorrencias de:
```
className="mt-1 text-sm text-red-500"
```
Por:
```
className="mt-1.5 text-sm text-red-600 font-medium"
```

---

### 2. `components/motoristas/MotoristaList.tsx`

**2.1 Tabela -- remover text-sm da tag table (linha 84)**
```
ANTES:  <table className="w-full text-sm">
DEPOIS: <table className="w-full">
```

**2.2 Cabecos de tabela (th, linhas 87-94)**
Manter como esta (texto dos headers pode ficar text-sm).

**2.3 Celulas de tabela (td)**
Cada `td` deve usar `text-base` em vez de herdar `text-sm` da table.
Linhas 100, 101, 102, 103, 104-116, 117:
```
ANTES:  className="px-4 py-3 font-medium text-primary-900"
DEPOIS: className="px-4 py-3.5 text-base font-medium text-primary-900"
```
(Aplicar `text-base` a cada td)

**2.4 Status badges (linhas 107, 121-128)**
```
ANTES:  'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
DEPOIS: 'inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold',
```

**2.5 Botao de acao Inativar/Reativar (linhas 132-145)**
```
ANTES:  'rounded px-2 py-1 text-xs font-medium transition-colors',
DEPOIS: 'inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors min-h-[40px]',
```
Adicionar icone XCircle (inativar) ou CheckCircle (reativar) antes do texto.

**2.6 Botoes de filtro (linhas 61-73)**
```
ANTES:  'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
DEPOIS: 'rounded-lg px-4 py-2.5 text-base font-medium transition-colors min-h-[44px]',
```

**2.7 Empty state (linhas 78-81)**
```
ANTES:
<p className="text-sm text-primary-500">Nenhum motorista encontrado.</p>

DEPOIS:
<div className="flex flex-col items-center gap-3">
  {/* Icone User (h-12 w-12) */}
  <p className="text-base text-primary-500 font-medium">Nenhum motorista encontrado.</p>
  <p className="text-sm text-primary-400">Cadastre seu primeiro motorista para comecar.</p>
</div>
```

**2.8 Alerta de CNH (linhas 39-56)**
```
ANTES:  className="text-sm font-medium text-amber-800"
DEPOIS: className="text-base font-semibold text-amber-800"

ANTES (itens):  className="text-sm text-amber-700"
DEPOIS: className="text-base text-amber-700"
```

---

### 3. `components/caminhoes/CaminhaoForm.tsx`

**3.1 inputClass (linha 123)**
```
ANTES:  const inputClass = 'w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500';
DEPOIS: const inputClass = 'w-full rounded-lg border px-4 py-3 text-base outline-none transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500';
```

**3.2 Labels** -- Mesma substituicao global:
```
ANTES:  "mb-1 block text-sm font-medium text-primary-900"
DEPOIS: "mb-2 block text-base font-medium text-primary-900"
```
Linhas: 136, 155, 176, 192, 208, 226, 246, 263, 281

**3.3 Botao submit (linhas 298-304)**
```
ANTES:  'rounded-lg bg-primary-700 px-6 py-2 text-sm font-medium text-white transition-colors',
DEPOIS: 'rounded-lg bg-primary-700 px-6 py-3 text-base font-semibold text-white transition-colors min-h-[48px]',
```
Adicionar icone Check + texto.

---

### 4. `components/caminhoes/caminhao-list.tsx`

**4.1 Tabela (linha 41)**
```
ANTES:  <table className="w-full text-left text-sm">
DEPOIS: <table className="w-full text-left">
```

**4.2 Cabecos th (linhas 44-51)**
Adicionar `text-sm` a cada th individualmente (manter headers menores):
```
className="px-4 py-3 text-sm font-medium text-primary-700"
```

**4.3 Celulas td** -- Adicionar `text-base` a cada td (linhas 80-88).

**4.4 Status badge (linhas 91-98)**
```
ANTES:  'inline-block rounded-full px-2 py-0.5 text-xs font-medium',
DEPOIS: 'inline-block rounded-full px-3 py-1 text-sm font-semibold',
```

**4.5 Botoes Editar e Desativar/Reativar (linhas 103-121)**

Link "Editar":
```
ANTES:  className="text-xs text-primary-700 underline transition-colors hover:text-primary-900"
DEPOIS: className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-primary-700 transition-colors hover:bg-primary-50 min-h-[40px]"
```
Adicionar icone Pencil antes do texto "Editar".

Botao "Desativar/Reativar":
```
ANTES:  'text-xs underline transition-colors',
DEPOIS: 'inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors min-h-[40px]',
```
Adicionar icone XCircle (desativar) ou CheckCircle (reativar).

**4.6 Empty state (linhas 26-37)**
```
ANTES:  <p className="text-sm text-primary-500">Nenhum caminhao cadastrado.</p>
DEPOIS:
<div className="flex flex-col items-center gap-3">
  {/* Icone Truck (h-12 w-12) */}
  <p className="text-base text-primary-500 font-medium">Nenhum caminhao cadastrado.</p>
  <p className="text-sm text-primary-400">Cadastre seu primeiro caminhao cegonha para comecar.</p>
</div>
```

Botao "Cadastrar Primeiro Caminhao":
```
ANTES:  className="mt-4 inline-block rounded-lg bg-primary-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-800"
DEPOIS: className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary-700 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-primary-800 min-h-[48px]"
```
Adicionar icone Plus antes do texto.

---

### 5. `components/viagens/ViagemForm.tsx`

**5.1 inputClasses function (linhas 179-186)**
```
ANTES:
'block w-full rounded-lg border px-3 py-2 text-sm transition-colors',

DEPOIS:
'block w-full rounded-lg border px-4 py-3 text-base transition-colors',
```

**5.2 Labels**
```
ANTES:  "mb-1 block text-sm font-medium text-primary-700"
DEPOIS: "mb-2 block text-base font-medium text-primary-700"
```
Linhas: 199, 219, 242, 259, 278, 294, 310, 328, 349, 367, 393

**5.3 Mensagens de erro**
```
ANTES:  className="mt-1 text-xs text-red-600"
DEPOIS: className="mt-1.5 text-sm text-red-600 font-medium"
```
Todas as ocorrencias.

**5.4 Indicador de valor motorista (linha 342-344)**
```
ANTES:  className="mt-1 text-xs text-green-700"
DEPOIS: className="mt-1.5 text-sm text-green-700 font-semibold"
```

**5.5 Botoes de acao (linhas 410-425)**

Botao "Cadastrar Viagem":
```
ANTES:  className="rounded-lg bg-primary-700 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-50"
DEPOIS: className="inline-flex items-center gap-2 rounded-lg bg-primary-700 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-50 min-h-[48px]"
```
Adicionar icone Check.

Botao "Cancelar":
```
ANTES:  className="rounded-lg border border-surface-border px-6 py-2 text-sm font-medium text-primary-700 transition-colors hover:bg-gray-50"
DEPOIS: className="inline-flex items-center gap-2 rounded-lg border border-surface-border px-6 py-3 text-base font-semibold text-primary-700 transition-colors hover:bg-gray-50 min-h-[48px]"
```
Adicionar icone ArrowLeft.

---

### 6. `components/viagens/ViagemList.tsx`

**6.1 Tabela (linha 131)**
```
ANTES:  <table className="w-full text-sm">
DEPOIS: <table className="w-full">
```

**6.2 Celulas td** -- Adicionar `text-base` a cada td.

**6.3 Botoes de acao "Ver", "Editar", "Excluir" (linhas 169-213)**

Link "Ver":
```
ANTES:  className="text-xs text-primary-500 transition-colors hover:text-primary-700"
DEPOIS: className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-primary-600 transition-colors hover:bg-primary-50 min-h-[36px]"
```
Adicionar icone Eye.

Link "Editar":
```
ANTES:  className="text-xs text-primary-500 transition-colors hover:text-primary-700"
DEPOIS: className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-primary-600 transition-colors hover:bg-primary-50 min-h-[36px]"
```
Adicionar icone Pencil.

Botao "Excluir":
```
ANTES:  className="text-xs text-red-500 transition-colors hover:text-red-700"
DEPOIS: className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 min-h-[36px]"
```
Adicionar icone Trash.

Botoes de confirmacao "Confirmar"/"Nao":
```
ANTES:  className="text-xs font-medium text-red-600 hover:text-red-800"
DEPOIS: className="rounded-md px-3 py-1.5 text-sm font-semibold text-red-700 bg-red-50 hover:bg-red-100 min-h-[36px]"
```

**6.4 Paginacao (linhas 224-250)**

Botoes "Anterior" e "Proxima":
```
ANTES:  className="rounded-lg border border-surface-border px-3 py-1 text-sm text-primary-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
DEPOIS: className="rounded-lg border border-surface-border px-4 py-2.5 text-base font-medium text-primary-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px]"
```

Texto "Pagina X de Y":
```
ANTES:  className="text-sm text-primary-500"
DEPOIS: className="text-base text-primary-700 font-medium"
```

**6.5 Empty state (linhas 118-127)**
Mesmo padrao: icone Map (h-12 w-12) + texto `text-base` + subtexto.
Botao com icone Plus + `text-base font-semibold min-h-[48px]`.

---

### 7. `components/viagens/ViagemFilters.tsx`

**7.1 Labels de filtro**
```
ANTES:  "mb-2 block text-xs font-medium uppercase tracking-wide text-primary-500"
DEPOIS: "mb-2 block text-sm font-semibold uppercase tracking-wide text-primary-600"
```

**7.2 Inputs/Selects de filtro (linhas 96, 111, 129, 140)**
```
ANTES:  "block w-full rounded-lg border border-surface-border bg-white px-3 py-2 text-sm"
DEPOIS: "block w-full rounded-lg border border-surface-border bg-white px-4 py-3 text-base"
```

**7.3 Status filter pills (linhas 70-82)**
```
ANTES:  `rounded-full border px-3 py-1 text-xs font-medium transition-colors`
DEPOIS: `rounded-full border px-4 py-2.5 text-sm font-medium transition-colors min-h-[40px]`
```

**7.4 Botao "Limpar filtros" (linhas 150-155)**
```
ANTES:  className="text-xs text-primary-500 transition-colors hover:text-primary-700"
DEPOIS: className="text-sm font-medium text-primary-600 transition-colors hover:text-primary-800 underline"
```

---

### 8. `components/gastos/GastoForm.tsx`

**8.1 inputClass (linha 102)**
```
ANTES:  const inputClass = 'w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500';
DEPOIS: const inputClass = 'w-full rounded-lg border px-4 py-3 text-base outline-none transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500';
```

**8.2 Labels** -- Mesma substituicao: `text-sm` para `text-base`, `mb-1` para `mb-2`.

**8.3 Prefixo R$ no input de valor (linha 155)**
```
ANTES:  className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-primary-500"
DEPOIS: className="absolute left-4 top-1/2 -translate-y-1/2 text-base font-medium text-primary-500"
```
E ajustar padding-left do input:
```
ANTES:  'pl-10'
DEPOIS: 'pl-12'
```

**8.4 Botoes submit e cancelar** -- Mesmo padrao global com icones Check e ArrowLeft.

---

### 9. `components/gastos/GastoList.tsx`

Mesmo padrao da ViagemList:
- Tabela: remover `text-sm`
- Celulas: adicionar `text-base`
- Botoes Editar/Excluir: icones Pencil/Trash + tamanho aumentado
- Empty state: icone CurrencyDollar + textos maiores + botao com Plus

---

### 10. `components/gastos/GastoTable.tsx`

Mesmo padrao:
- Tabela (linha 57): remover `text-sm`
- Celulas: `text-base`
- Icone de comprovante (linhas 120-131): ja tem SVG, aumentar de `h-4 w-4` para `h-5 w-5`
- Botoes Editar/Excluir: icones + tamanho aumentado

---

### 11. `components/gastos/GastoFilters.tsx`

**11.1 Inputs de data (linhas 98-103, 114-119)**
```
ANTES:  "w-full rounded-md border border-surface-border bg-white px-3 py-2 text-sm text-primary-900"
DEPOIS: "w-full rounded-md border border-surface-border bg-white px-4 py-3 text-base text-primary-900"
```

**11.2 Labels**
```
ANTES:  "mb-1 block text-xs font-medium text-primary-700"
DEPOIS: "mb-2 block text-sm font-semibold text-primary-700"
```

**11.3 MultiSelectDropdown button (linha 217)**
```
ANTES:  "... px-3 py-2 text-left text-sm text-primary-900 ..."
DEPOIS: "... px-4 py-3 text-left text-base text-primary-900 ..."
```

**11.4 Titulo "Filtros" (linha 76)**
```
ANTES:  className="text-sm font-semibold text-primary-900"
DEPOIS: className="text-base font-semibold text-primary-900"
```
Adicionar icone Filter inline antes do texto "Filtros".

---

### 12. `components/gastos/GastoExportButton.tsx`

**12.1 Botao Exportar CSV (linhas 33-39)**
```
ANTES:  className="rounded-lg border border-surface-border bg-white px-4 py-2 text-sm font-medium text-primary-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
DEPOIS: className="inline-flex items-center gap-2 rounded-lg border border-surface-border bg-white px-5 py-3 text-base font-semibold text-primary-700 transition-colors hover:bg-gray-50 disabled:opacity-50 min-h-[48px]"
```
Adicionar icone Download antes do texto.

---

### 13. `components/gastos/GastoPagination.tsx`

**13.1 Botoes Anterior/Proximo (linhas 53-56, 81-86)**
```
ANTES:  "rounded-md border border-surface-border px-3 py-1 text-sm text-primary-700"
DEPOIS: "rounded-md border border-surface-border px-4 py-2.5 text-base font-medium text-primary-700 min-h-[44px]"
```

**13.2 Numeros de pagina (linhas 66-72)**
```
ANTES:  `rounded-md px-3 py-1 text-sm`
DEPOIS: `rounded-md px-3.5 py-2 text-base font-medium min-h-[40px] min-w-[40px]`
```

**13.3 Texto informativo (linhas 41-47)**
```
ANTES:  className="text-sm text-primary-500"
DEPOIS: className="text-base text-primary-600"
```

---

### 14. `components/gastos/GastoSummary.tsx`

**14.1 Valor total**
Ja usa `text-2xl font-bold` -- OK para o publico.

**14.2 Label "Total filtrado" (linha 25)**
```
ANTES:  className="text-sm text-primary-500"
DEPOIS: className="text-base text-primary-500"
```

**14.3 Contador de registros (linha 29)**
```
ANTES:  className="text-xs text-primary-400"
DEPOIS: className="text-sm text-primary-500"
```

**14.4 Botao "Ver por categoria" (linhas 36-39)**
```
ANTES:  className="text-sm text-primary-600 transition-colors hover:text-primary-800"
DEPOIS: className="text-base font-medium text-primary-600 transition-colors hover:text-primary-800 underline"
```

---

### 15. `components/fechamentos/FechamentoForm.tsx`

**15.1 Inputs/Selects** -- Todos os `px-3 py-2 text-sm` devem virar `px-4 py-3 text-base`.
Linhas: 156, 210, 228, 250

**15.2 Labels** -- `text-sm` para `text-base`, `mb-1` para `mb-2`.

**15.3 Radio buttons (linhas 176-198)** -- Aumentar area de toque:
```
ANTES:  className="flex items-center gap-2 text-sm text-primary-900"
DEPOIS: className="flex items-center gap-3 text-base text-primary-900 cursor-pointer py-1"
```
E os radios devem ter `className="h-5 w-5 text-primary-700"` (aumentar de default para 20px).

**15.4 Botao "Calcular Preview" (linhas 256-261)**
```
ANTES:  className="w-full rounded-lg bg-primary-700 px-4 py-2 text-sm font-medium text-white"
DEPOIS: className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary-700 px-4 py-3 text-base font-semibold text-white min-h-[48px]"
```
Adicionar icone Calculator.

**15.5 Summary cards (linhas 270-293)** -- Valores ja sao `text-xl font-bold`, OK.
Labels:
```
ANTES:  className="text-sm text-primary-500"
DEPOIS: className="text-base text-primary-500"
```

**15.6 Botoes Voltar/Confirmar (linhas 407-422)**
```
ANTES:  "flex-1 rounded-lg border border-surface-border bg-white px-4 py-2 text-sm font-medium text-primary-700"
DEPOIS: "flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-surface-border bg-white px-4 py-3 text-base font-semibold text-primary-700 min-h-[48px]"
```
Icone ArrowLeft no Voltar, icone Check no Confirmar.

---

### 16. `components/fechamentos/FechamentoList.tsx`

Mesmo padrao de todas as listas:
- Tabela: `text-sm` removido da table
- Celulas: `text-base` adicionado
- Status badges: `px-3 py-1 text-sm font-semibold`
- Link "Detalhes" (linha 69-73): icone Eye + tamanho aumentado

---

### 17. `components/fechamentos/FechamentoFilters.tsx`

**17.1 Selects de filtro (linhas 37-68)**
```
ANTES:  "rounded-lg border border-surface-border bg-white px-3 py-2 text-sm text-primary-900"
DEPOIS: "rounded-lg border border-surface-border bg-white px-4 py-3 text-base text-primary-900 min-h-[48px]"
```

---

### 18. `components/vinculos/VinculoForm.tsx`

**18.1 Inputs/Selects** -- `px-3 py-2 text-sm` para `px-4 py-3 text-base`.
Linhas afetadas: 92-95, 119-121, 147-149, 168-170

**18.2 Labels** -- `text-sm` para `text-base`, `mb-1` para `mb-2`.

**18.3 Botoes (linhas 183-197)**
Botao "Criar Vinculo":
```
ANTES:  "rounded-lg bg-primary-700 px-6 py-2 text-sm font-medium text-white"
DEPOIS: "inline-flex items-center gap-2 rounded-lg bg-primary-700 px-6 py-3 text-base font-semibold text-white min-h-[48px]"
```
Icone Link + texto.

Botao "Cancelar":
```
ANTES:  "rounded-lg border border-surface-border px-6 py-2 text-sm font-medium text-primary-700"
DEPOIS: "inline-flex items-center gap-2 rounded-lg border border-surface-border px-6 py-3 text-base font-semibold text-primary-700 min-h-[48px]"
```
Icone ArrowLeft + texto.

---

### 19. `components/vinculos/VinculoList.tsx`

**19.1 Cabecos th (linhas 58-72)**
```
ANTES:  "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-500"
DEPOIS: "px-4 py-3 text-left text-sm font-semibold uppercase tracking-wider text-primary-600"
```

**19.2 Celulas td** -- `text-sm` para `text-base` (linhas 79-88)

**19.3 Status badge (linhas 92-99)** -- `px-3 py-1 text-sm font-semibold`

**19.4 Botao "Encerrar" (linhas 104-109)**
```
ANTES:  "text-red-600 transition-colors hover:text-red-800"
DEPOIS: "inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 min-h-[40px]"
```
Adicionar icone XCircle.

**19.5 Empty state (linhas 39-43)**
Icone Link (h-12 w-12) + textos maiores.

---

### 20. `components/empresa/EmpresaForm.tsx`

**20.1 Inputs/Selects** -- Todos: `px-3 py-2 text-sm` para `px-4 py-3 text-base`.
Linhas afetadas: 119-122, 141-143, 159-161, 183, 197, 209, 233, 248, 264

**20.2 Labels** -- `text-sm` para `text-base`, `mb-1` para `mb-2`.

**20.3 Botao submit** -- Mesmo padrao + icone Check.

---

### 21. `components/usuarios/usuario-list.tsx`

**21.1 Tabela (linha 73)**
```
ANTES:  <table className="w-full text-left text-sm">
DEPOIS: <table className="w-full text-left">
```

**21.2 Celulas td** -- `text-base` (linhas 98, 106, etc.)

**21.3 Select de role (linhas 111-122)**
```
ANTES:  "rounded-md border border-surface-border bg-surface-card px-2 py-1 text-sm"
DEPOIS: "rounded-md border border-surface-border bg-surface-card px-3 py-2 text-base min-h-[40px]"
```

**21.4 Botao Desativar/Reativar (linhas 149-161)**
```
ANTES:  `rounded-md px-3 py-1 text-xs font-medium`
DEPOIS: `inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium min-h-[40px]`
```
Icone XCircle ou CheckCircle.

**21.5 Role badges e Status badges** -- `px-3 py-1 text-sm font-semibold`.

---

### 22. PAGINAS -- Botoes de header (CTA principal)

Todas as paginas de listagem possuem um botao CTA no header. Padrao uniforme:

**Paginas afetadas e texto do botao:**

| Pagina | Texto atual | Arquivo |
|--------|------------|---------|
| motoristas/page.tsx | "Novo Motorista" | linha 27 |
| caminhoes/page.tsx | "Novo Caminhao" | linha 28 |
| viagens/page.tsx | "Nova Viagem" | linha 30 |
| gastos/page.tsx | "Novo Gasto" | linha 80 |
| fechamentos/page.tsx | "Novo Fechamento" | linha 60 |
| vinculos/page.tsx | "Novo Vinculo" | linha 40 |
| empresa/page.tsx | "Editar" | linha 22 |
| usuarios/client-page.tsx | "Convidar Usuario" | linha 28 |

**Classe atual (todas iguais):**
```
"rounded-lg bg-primary-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-800"
```

**Classe corrigida:**
```
"inline-flex items-center gap-2 rounded-lg bg-primary-700 px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-primary-800 min-h-[48px]"
```

**Icones por botao:**
- "Novo Motorista" -> Plus
- "Novo Caminhao" -> Plus
- "Nova Viagem" -> Plus
- "Novo Gasto" -> Plus
- "Novo Fechamento" -> Plus
- "Novo Vinculo" -> Plus + Link
- "Editar" -> Pencil
- "Convidar Usuario" -> UserPlus

**Botoes secundarios no header (vinculos/page.tsx, "Historico"):**
```
ANTES:  "rounded-lg border border-surface-border px-4 py-2 text-sm font-medium text-primary-700 transition-colors hover:bg-surface-hover"
DEPOIS: "inline-flex items-center gap-2 rounded-lg border border-surface-border px-5 py-3 text-base font-semibold text-primary-700 transition-colors hover:bg-surface-hover min-h-[48px]"
```
Adicionar icone Clock.

### 23. PAGINA empresa/page.tsx -- DataRow

```
ANTES:
<dt className="text-sm font-medium text-primary-500">{label}</dt>
<dd className="text-sm text-primary-900">{value || '---'}</dd>

DEPOIS:
<dt className="text-base font-medium text-primary-500">{label}</dt>
<dd className="text-base font-semibold text-primary-900">{value || '---'}</dd>
```

### 24. Textos descritivos nas paginas

```
ANTES:
<p className="mt-1 text-sm text-primary-500">Gerencie os motoristas da sua empresa.</p>

DEPOIS:
<p className="mt-1 text-base text-primary-500">Gerencie os motoristas da sua empresa.</p>
```
Afeta: motoristas/page.tsx, viagens/page.tsx, vinculos/page.tsx, empresa/cadastro/page.tsx.

---

## RESUMO DE IMPACTO

### Metricas de melhoria esperada

| Metrica | Antes | Depois |
|---------|-------|--------|
| Touch target minimo | ~32px | 48px (WCAG 2.5.5) |
| Tamanho de fonte inputs | 14px (text-sm) | 16px (text-base) |
| Tamanho de fonte labels | 14px (text-sm) | 16px (text-base) |
| Tamanho de fonte botoes | 14px (text-sm) | 16px (text-base) |
| Botoes com icone visual | 0/28 (0%) | 28/28 (100%) |
| Empty states com ilustracao | 0/6 (0%) | 6/6 (100%) |
| Padding de inputs (vertical) | 8px (py-2) | 12px (py-3) |
| Altura minima de botoes | ~36px | 48px |

### Arquivos modificados

| # | Arquivo | Mudancas |
|---|---------|----------|
| 1 | `components/motoristas/MotoristaForm.tsx` | Labels, inputs, botao, erros |
| 2 | `components/motoristas/MotoristaList.tsx` | Tabela, badges, botoes, empty state, filtros, alertas |
| 3 | `components/caminhoes/CaminhaoForm.tsx` | Labels, inputClass, botao |
| 4 | `components/caminhoes/caminhao-list.tsx` | Tabela, badges, botoes, empty state |
| 5 | `components/viagens/ViagemForm.tsx` | Labels, inputClasses, botoes, erros |
| 6 | `components/viagens/ViagemList.tsx` | Tabela, botoes, paginacao, empty state |
| 7 | `components/viagens/ViagemFilters.tsx` | Labels, inputs, pills, limpar filtros |
| 8 | `components/gastos/GastoForm.tsx` | Labels, inputClass, prefixo R$, botoes |
| 9 | `components/gastos/GastoList.tsx` | Tabela, botoes, empty state |
| 10 | `components/gastos/GastoTable.tsx` | Tabela, icone comprovante, botoes |
| 11 | `components/gastos/GastoFilters.tsx` | Labels, inputs, multi-select, titulo |
| 12 | `components/gastos/GastoExportButton.tsx` | Botao com icone Download |
| 13 | `components/gastos/GastoPagination.tsx` | Botoes paginacao, numeros, texto |
| 14 | `components/gastos/GastoSummary.tsx` | Labels, contador, botao expandir |
| 15 | `components/fechamentos/FechamentoForm.tsx` | Inputs, labels, radios, botoes, cards |
| 16 | `components/fechamentos/FechamentoList.tsx` | Tabela, badges, link detalhes |
| 17 | `components/fechamentos/FechamentoFilters.tsx` | Selects de filtro |
| 18 | `components/vinculos/VinculoForm.tsx` | Inputs, labels, botoes |
| 19 | `components/vinculos/VinculoList.tsx` | Tabela, th, badges, botao encerrar, empty state |
| 20 | `components/empresa/EmpresaForm.tsx` | Inputs, labels, botao |
| 21 | `components/usuarios/usuario-list.tsx` | Tabela, select, botoes, badges |
| 22 | `app/(dashboard)/motoristas/page.tsx` | Botao CTA header, texto descritivo |
| 23 | `app/(dashboard)/caminhoes/page.tsx` | Botao CTA header |
| 24 | `app/(dashboard)/viagens/page.tsx` | Botao CTA header, texto descritivo |
| 25 | `app/(dashboard)/gastos/page.tsx` | Botao CTA header, empty state |
| 26 | `app/(dashboard)/fechamentos/page.tsx` | Botao CTA header, empty state, paginacao |
| 27 | `app/(dashboard)/vinculos/page.tsx` | Botao CTA header, botao Historico, texto descritivo |
| 28 | `app/(dashboard)/empresa/page.tsx` | Botao Editar, DataRow |
| 29 | `app/(dashboard)/empresa/cadastro/page.tsx` | Texto descritivo |
| 30 | `app/(dashboard)/usuarios/client-page.tsx` | Botao Convidar Usuario |

---

## NOTAS PARA O @dev

1. **Ordem de implementacao recomendada:** Comece pelo padrao global (inputClass, labels, botoes) em cada Form, depois as Lists/Tables, depois as paginas.

2. **Considere extrair constantes de classe:** As classes `text-base px-4 py-3` se repetem em todos os forms. Considere um helper `inputClasses()` centralizado em `lib/utils/form-styles.ts`.

3. **Icones SVG inline:** Cada icone esta documentado nesta spec. Nao crie um componente Icon separado (a menos que decida centralizar) -- basta colar o SVG inline em cada botao.

4. **`min-h-[48px]`:** Esse valor garante WCAG 2.5.5 Target Size. NAO remova.

5. **Teste em celular:** Apos implementar, abra no Chrome DevTools com viewport 375x667 (iPhone SE) e verifique que todos os targets de toque sao facilmente clicaveis com o polegar.

6. **Acessibilidade dos icones:** Todo icone decorativo (ao lado de texto) deve ter `aria-hidden="true"`. Icones que sao o UNICO conteudo de um botao devem ter `aria-label` no botao.

---

*Auditoria realizada por Uma (UX Design Expert) -- 2026-03-29*
*Publico-alvo: Motoristas de cegonha, 35-50 anos, baixa familiaridade digital*
