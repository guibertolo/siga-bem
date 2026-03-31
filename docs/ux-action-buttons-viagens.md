# Layout de Botoes de Acao - Tabela de Viagens

## Diagnostico do Problema Atual

A coluna "Acoes" usa `flex-col` com dois rows desalinhados, criando:
- Altura de linha inconsistente entre viagens com diferentes combinacoes de status
- "Invalidar" isolado em linha propria, parecendo desconectado
- Largura minima de 140px insuficiente para 4 botoes com texto
- Botoes "Ver" e "Editar" com mesmo peso visual, sem hierarquia clara

## Recomendacao: Primary Action + Overflow Menu

### Estrutura Desktop (tabela)

```
[ Ver ]  [ Acertar ]  [ ... ]
```

**Layout:** Uma unica linha horizontal (`flex-row`), alinhada a direita.

| Posicao | Elemento | Visibilidade | Estilo |
|---------|----------|-------------|--------|
| 1 | "Ver" | Sempre visivel | Botao ghost com texto, `text-primary-700` |
| 2 | "Editar" | planejada, em_andamento | Botao ghost com texto, `text-primary-700` |
| 2 | "Acertar" | concluida (substitui Editar) | Botao solid `bg-success`, texto branco |
| 3 | Menu "..." | Sempre visivel (quando ha acoes extras) | Botao icone, circulo com 3 pontos |

**Conteudo do menu overflow (dropdown alinhado a direita):**
- "Excluir" (apenas planejada) - texto vermelho, com icone lixeira
- "Invalidar" (todas exceto cancelada) - texto vermelho, com icone de alerta

### Regras por Status

| Status | Botoes visiveis | Menu overflow |
|--------|----------------|---------------|
| planejada | Ver, Editar | Excluir, Invalidar |
| em_andamento | Ver, Editar | Invalidar |
| concluida | Ver, Acertar | Invalidar |
| cancelada | Ver | (sem menu) |

### Por que esta abordagem

1. **Uma unica linha** - Elimina o problema de altura variavel entre rows da tabela. Todas as linhas ficam com a mesma altura.

2. **"Ver" sempre primeiro** - E a acao mais frequente. O dono quer ver os detalhes da viagem 80% das vezes. Mante-lo como primeiro botao (posicao de leitura natural, esquerda para direita) reduz tempo de busca visual.

3. **"Acertar" visivel, nao escondido** - Para viagens concluidas, acertar e a segunda acao mais importante. Esconder dentro de um dropdown seria um erro -- o dono precisa ver de relance quais viagens precisam de acerto. O verde solid cria um indicador visual forte na tabela.

4. **Acoes destrutivas no overflow** - "Invalidar" e "Excluir" sao acoes raras e irreversiveis. Esconde-las atras de um clique extra (o menu "...") e um padrao de seguranca que evita acionamento acidental. A confirmacao inline atual (com campo de motivo para Invalidar) permanece inalterada -- ela apenas e acionada a partir do dropdown em vez de um botao solto.

5. **Largura previsivel** - Com no maximo 3 elementos visiveis (Ver + Editar/Acertar + "..."), a coluna precisa de ~180px no maximo. Hoje, com 4 botoes em duas linhas, ela varia entre 140px e 240px+ dependendo do status.

### Estrutura Mobile (cards)

Manter o layout atual de cards com `flex-wrap`, mas aplicar a mesma hierarquia:

```
[ Ver Viagem ]  [ Editar ]
[ Invalidar ]
```

Mudanca: "Invalidar" e "Excluir" devem ter `min-h-[48px]` (ja tem) e ficar com estilo `ghost` sem fundo, apenas texto vermelho. Nao usar menu overflow no mobile -- toque em "..." e frustrante em telas touch.

### Especificacao do Menu Overflow

- Trigger: botao circular ou pill com icone de 3 pontos verticais (SVG inline, `viewBox="0 0 24 24"`, tres circulos em `cy=5, cy=12, cy=19`)
- Tamanho do trigger: `32x32px` no desktop
- Dropdown: `min-w-[160px]`, alinhado a direita (`right-0`), `bg-surface-card`, `border border-surface-border`, `rounded-lg`, `shadow-lg`
- Cada item: `px-3 py-2.5`, `text-sm`, hover `bg-surface-hover`
- Items destrutivos: `text-danger` com icone a esquerda
- Fechar ao clicar fora (overlay transparente ou `onBlur`)
- Z-index adequado para nao ser cortado pelo `overflow-x-auto` da tabela

### Confirmacao de Acoes Destrutivas

A confirmacao inline para "Invalidar" (com campo de motivo) permanece como esta. Porem, ao inves de expandir dentro da celula da tabela (que distorce o layout), abrir como um **popover posicionado** ou um **dialog modal simples**. Isso evita que a linha da tabela mude de altura quando o usuario clica em Invalidar.

Para "Excluir", manter a confirmacao inline no card mobile. No desktop, usar o mesmo pattern de popover/dialog.
