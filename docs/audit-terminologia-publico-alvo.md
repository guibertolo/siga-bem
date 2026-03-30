# Auditoria de Terminologia - Adequacao ao Publico-Alvo

**Projeto:** FrotaViva (Siga Bem)
**Data:** 2026-03-29
**Autor:** Atlas (AIOX Analyst)
**Publico-alvo:** Motoristas de cegonheiro (40-60 anos) e donos de caminhao (55+), com baixa familiaridade digital.

---

## Sumario Executivo

Esta auditoria identificou **78 ocorrencias** de termos problematicos em **42 arquivos** do FrotaViva. Os problemas se concentram em 5 categorias:

1. **Termos em ingles** usados como se fossem universais (Dashboard, Breakdown, Status, Toggle, Export)
2. **Jargao corporativo/tecnico** incompativel com o perfil do usuario (BI Financeiro, KPI, Filtros, Lancamentos)
3. **Labels abstratos** que nao comunicam o que o usuario vai encontrar (Financeiro, Admin)
4. **Placeholders vagos** que nao orientam o preenchimento
5. **Mensagens de erro/empty state** que nao explicam o que fazer

**Nivel de confianca:** ALTO - todos os termos foram verificados diretamente no codigo-fonte.

---

## Principios da Adequacao

Para motoristas 55+ com baixa familiaridade digital, a linguagem deve:

- Usar **palavras do dia-a-dia** do cegonheiro (viagem, frete, acerto, borracharia)
- **Evitar ingles** completamente na interface
- **Descrever a acao**, nao o conceito (em vez de "Filtros", usar "Buscar por")
- Usar **exemplos concretos** nos placeholders
- Nas mensagens de erro, dizer **o que fazer**, nao o que deu errado

---

## Tabela Completa de Alteracoes

### PRIORIDADE ALTA - Navegacao Principal e Termos Incompreensiveis

Estes termos afetam TODOS os usuarios em TODAS as sessoes.

| # | Arquivo | Linha | Texto Atual | Texto Sugerido | Motivo |
|---|---------|-------|-------------|----------------|--------|
| 1 | `app/(dashboard)/layout.tsx` | 10 | `label: 'Dashboard'` | `label: 'Inicio'` | "Dashboard" e incompreensivel para 55+. "Inicio" e universal. |
| 2 | `app/(dashboard)/layout.tsx` | 82 | `BI Financeiro` | `Resumo dos Gastos` | "BI" e jargao corporativo. O usuario quer ver "quanto gastei". |
| 3 | `app/(dashboard)/layout.tsx` | 15 | `label: 'Financeiro'` | `label: 'Acertos'` | "Financeiro" e vago. "Acerto" e o termo do cegonheiro para fechamento de contas. |
| 4 | `app/(dashboard)/layout.tsx` | 14 | `label: 'Fechamentos'` | `label: 'Acerto de Contas'` | "Fechamento" e contabil. O motorista conhece como "acerto". |
| 5 | `app/(dashboard)/layout.tsx` | 89 | `Admin` | `Gerenciar` | "Admin" e jargao de TI. |
| 6 | `app/(dashboard)/dashboard/page.tsx` | 5 | `title: 'Dashboard'` | `title: 'Inicio'` | Metadado da pagina. |
| 7 | `app/(dashboard)/dashboard/page.tsx` | 22 | `Dashboard` (h2) | `Inicio` | Titulo visivel na tela principal. |
| 8 | `app/(dashboard)/bi/page.tsx` | 7 | `title: 'BI Financeiro'` | `title: 'Resumo dos Gastos'` | Metadado. |
| 9 | `app/(dashboard)/bi/page.tsx` | 91 | `BI Financeiro` (h2) | `Resumo dos Gastos` | Titulo visivel. |
| 10 | `components/bi/BiBreakdownCategorias.tsx` | 17, 29 | `Breakdown por Categoria` | `Gastos por Tipo` | "Breakdown" e incompreensivel. "Tipo" e o que o cegonheiro entende (diesel, pedagio, borracharia). |
| 11 | `components/bi/BiKpiCards.tsx` | 18 | `label: 'Lancamentos'` | `label: 'Registros'` | "Lancamento" e contabil. "Registro" e mais simples. Alternativa: "Quantos gastos". |
| 12 | `app/(dashboard)/configuracoes/combustivel/page.tsx` | 38 | `Voltar ao Dashboard` | `Voltar ao Inicio` | Consistencia. |
| 13 | `components/ui/MobileSidebar.tsx` | 146 | `BI Financeiro` | `Resumo dos Gastos` | Consistencia no menu mobile. |
| 14 | `components/ui/MobileSidebar.tsx` | 152 | `Admin` | `Gerenciar` | Consistencia no menu mobile. |

### PRIORIDADE ALTA - Labels de Colunas e Filtros (aparecem em listas)

| # | Arquivo | Linha | Texto Atual | Texto Sugerido | Motivo |
|---|---------|-------|-------------|----------------|--------|
| 15 | `components/caminhoes/caminhao-list.tsx` | 60 | `Status` (coluna) | `Situacao` | "Status" e ingles. "Situacao" e portugues correto. |
| 16 | `components/vinculos/VinculoList.tsx` | 108 | `Status` | `Situacao` | Idem. |
| 17 | `components/motoristas/MotoristaList.tsx` | 146 | `Status` (coluna) | `Situacao` | Idem. |
| 18 | `components/usuarios/usuario-list.tsx` | 80 | `Status` | `Situacao` | Idem. |
| 19 | `components/viagens/ViagemList.tsx` | 198 | `Status` (coluna) | `Situacao` | Idem. |
| 20 | `components/fechamentos/FechamentoList.tsx` | 72 | `Status` (coluna) | `Situacao` | Idem. |
| 21 | `components/financeiro/HistoricoFechamentos.tsx` | 168 | `Status` (coluna) | `Situacao` | Idem. |
| 22 | `components/viagens/ViagemFilters.tsx` | 66 | `Status` (label) | `Situacao` | Label do filtro de viagens. |
| 23 | `components/financeiro/HistoricoFiltros.tsx` | 170 | `Status` (label) | `Situacao` | Label do filtro de historico. |
| 24 | `components/fechamentos/FechamentoFilters.tsx` | 55 | `Todos os status` | `Todas as situacoes` | Opcao do dropdown. |
| 25 | `components/bi/BiFiltros.tsx` | 55 | `Filtros` (titulo) | `Buscar por` | "Filtros" e tecnico. O usuario quer "buscar/encontrar". |
| 26 | `components/gastos/GastoFilters.tsx` | 76 | `Filtros` (titulo) | `Buscar por` | Idem. |
| 27 | `components/financeiro/HistoricoFiltros.tsx` | 92 | `Filtros` (titulo) | `Buscar por` | Idem. |
| 28 | `components/bi/BiFiltros.tsx` | 63 | `Limpar filtros` | `Limpar busca` | Consistencia. |
| 29 | `components/gastos/GastoFilters.tsx` | 84 | `Limpar filtros` | `Limpar busca` | Idem. |
| 30 | `components/financeiro/HistoricoFiltros.tsx` | 100 | `Limpar filtros` | `Limpar busca` | Idem. |
| 31 | `components/viagens/ViagemFilters.tsx` | 155 | `Limpar filtros` | `Limpar busca` | Idem. |

### PRIORIDADE ALTA - Termos do BI / Resumo Financeiro

| # | Arquivo | Linha | Texto Atual | Texto Sugerido | Motivo |
|---|---------|-------|-------------|----------------|--------|
| 32 | `app/(dashboard)/bi/page.tsx` | 94 | `Visao completa dos gastos operacionais da frota` | `Veja quanto a frota gastou e onde foi o dinheiro` | "Gastos operacionais" e corporativo. Linguagem direta e melhor. |
| 33 | `components/bi/BiKpiCards.tsx` | 13 | `label: 'Gasto Total'` | `label: 'Total Gasto'` | OK semanticamente, mas "Total Gasto" e mais natural na fala. |
| 34 | `components/bi/BiKpiCards.tsx` | 22 | `label: 'Media por Viagem'` | `label: 'Gasto Medio por Viagem'` | Mais claro: "media de que?". |
| 35 | `components/bi/BiKpiCards.tsx` | 26 | `label: 'Custo por Km'` | `label: 'Custo por Quilometro'` | Abreviar "km" pode confundir. Explicitar. |
| 36 | `components/bi/BiTendenciaMensal.tsx` | 15, 29 | `Tendencia Mensal` | `Gastos Mes a Mes` | "Tendencia" e tecnico/estatistico. "Mes a mes" e do dia-a-dia. |
| 37 | `components/bi/BiTendenciaMensal.tsx` | 18 | `Nenhum dado de tendencia disponivel para o periodo.` | `Nao tem gastos registrados nesse periodo.` | Linguagem direta. |
| 38 | `components/bi/BiRankingCaminhoes.tsx` | 15, 28 | `Ranking por Caminhao` | `Caminhoes que Mais Gastaram` | "Ranking" e ingles. Descrever o que o usuario vai ver. |
| 39 | `components/bi/BiRankingMotoristas.tsx` | 15, 28 | `Ranking por Motorista` | `Motoristas que Mais Gastaram` | Idem. |
| 40 | `components/bi/BiRankingCaminhoes.tsx` | 40 | `Lanc.` (coluna) | `Qtd.` ou `Gastos` | "Lanc." (lancamentos) e contabil. |
| 41 | `components/bi/BiRankingMotoristas.tsx` | 39 | `Lanc.` (coluna) | `Qtd.` ou `Gastos` | Idem. |
| 42 | `components/bi/BiRankingCaminhoes.tsx` | 85 | `lancamentos` | `gastos registrados` | Texto completo nos cards mobile. |
| 43 | `components/bi/BiRankingMotoristas.tsx` | 81 | `lancamentos` | `gastos registrados` | Idem. |
| 44 | `components/bi/BiBreakdownCategorias.tsx` | 45 | `lanc.` | `gastos` | Abreviacao de "lancamentos" no breakdown. |
| 45 | `app/(dashboard)/bi/page.tsx` | 109 | `{/* KPI Cards */}` | `{/* Resumo em Numeros */}` | Comentario de codigo, mas melhora manutenibilidade. |

### PRIORIDADE ALTA - Simulador e Previsao

| # | Arquivo | Linha | Texto Atual | Texto Sugerido | Motivo |
|---|---------|-------|-------------|----------------|--------|
| 46 | `app/(dashboard)/bi/page.tsx` | 137 | `Previsao e Margens` | `Calcular Custo de Viagem` | "Previsao e margens" e MBA. O cegonheiro quer "saber quanto vai gastar". |
| 47 | `app/(dashboard)/bi/page.tsx` | 139 | `Simule custos de viagem e compare margens de lucro em rotas similares` | `Calcule quanto vai gastar numa viagem e veja se o frete compensa` | Linguagem do motorista. |
| 48 | `components/bi/SimuladorViagem.tsx` | 74 | `Simulador de Viagem` | `Calcular Custo da Viagem` | "Simulador" e tecnico. |
| 49 | `components/bi/SimuladorViagem.tsx` | 207 | `Estimativa para X km` | `Custo estimado para X km` | "Estimativa" e aceitavel mas "custo estimado" e mais claro. |
| 50 | `components/bi/SimuladorViagem.tsx` | 213 | `Litros estimados` | `Vai gastar em diesel` | Mais direto. |
| 51 | `components/bi/SimuladorViagem.tsx` | 219 | `Custo combustivel` | `Valor do diesel` | Simplificar. |
| 52 | `components/bi/SimuladorViagem.tsx` | 225 | `Consumo usado` | `Consumo do caminhao` | "Usado" e ambiguo. |
| 53 | `components/bi/SimuladorViagem.tsx` | 231 | `Preco por litro` | `Preco do litro` | Preposicao mais natural. |
| 54 | `components/bi/SimuladorViagem.tsx` | 259 | `Margem de Lucro Estimada` | `Quanto Vai Sobrar` | Direto ao ponto. |
| 55 | `components/bi/SimuladorViagem.tsx` | 289 | `Custo estimado` | `Vai gastar` | Simplificar. |
| 56 | `components/bi/SimuladorViagem.tsx` | 295 | `Margem estimada` | `Vai sobrar` | Simplificar. |
| 57 | `components/bi/HistoricoRotas.tsx` | 30 | `Historico de Rotas Similares` | `Viagens Parecidas que Voce Ja Fez` | "Rotas similares" e tecnico. |
| 58 | `components/bi/HistoricoRotas.tsx` | 63 | `Viagens na rota` | `Viagens nessa rota` | Mais natural. |
| 59 | `components/bi/HistoricoRotas.tsx` | 68 | `Custo minimo` | `Mais barata` | Simplificar. |
| 60 | `components/bi/HistoricoRotas.tsx` | 74 | `Custo maximo` | `Mais cara` | Simplificar. |
| 61 | `components/bi/HistoricoRotas.tsx` | 80 | `Custo medio` | `Custo normal` | "Medio" e estatistico. "Normal" comunica a mesma ideia. |

### PRIORIDADE MEDIA - Botoes, Acoes e Empty States

| # | Arquivo | Linha | Texto Atual | Texto Sugerido | Motivo |
|---|---------|-------|-------------|----------------|--------|
| 62 | `components/gastos/GastoExportButton.tsx` | 39 | `Exportar CSV` | `Baixar Planilha` | "CSV" e formato tecnico. O usuario entende "planilha". |
| 63 | `components/gastos/GastoExportButton.tsx` | 39 | `Exportando...` | `Preparando planilha...` | Consistencia. |
| 64 | `components/gastos/GastoSummary.tsx` | 41 | `Ver por categoria` | `Ver por tipo de gasto` | "Categoria" e menos natural que "tipo". |
| 65 | `components/gastos/GastoSummary.tsx` | 41 | `Ocultar detalhes` | `Esconder detalhes` | "Ocultar" e mais formal; "esconder" e mais coloquial. |
| 66 | `components/gastos/GastoSummary.tsx` | 25 | `Total filtrado` | `Total encontrado` | "Filtrado" e tecnico. |
| 67 | `components/viagens/ViagemList.tsx` | 121 | `Cadastre uma viagem para acompanhar suas rotas.` | `Registre sua primeira viagem para comecar a usar o sistema.` | Mais acolhedor para usuario iniciante. |
| 68 | `components/viagens/ViagemList.tsx` | 127 | `Cadastrar Primeira Viagem` | `Registrar Primeira Viagem` | "Registrar" e mais simples que "cadastrar". |
| 69 | `app/(dashboard)/fechamentos/page.tsx` | 89 | `Nenhum fechamento encontrado.` | `Nenhum acerto de contas encontrado.` | Usar o termo adequado. |
| 70 | `app/(dashboard)/fechamentos/page.tsx` | 99 | `Criar Primeiro Fechamento` | `Fazer Primeiro Acerto` | Consistencia. |
| 71 | `components/gastos/GastoFilters.tsx` | 182 | `Filtrando...` | `Buscando...` | Consistencia. |
| 72 | `components/bi/BiFiltros.tsx` | 161 | `Atualizando...` | `Carregando...` | "Carregando" e mais intuitivo. |
| 73 | `components/fechamentos/FechamentoStatusActions.tsx` | 76 | `Acoes:` | `O que deseja fazer:` | "Acoes" e generico. Perguntar diretamente. |
| 74 | `components/gastos/GastoFilters.tsx` | 247 | `Nenhuma opcao` | `Nada encontrado` | Mais simples. |

### PRIORIDADE MEDIA - Tema Claro/Escuro

| # | Arquivo | Linha | Texto Atual | Texto Sugerido | Motivo |
|---|---------|-------|-------------|----------------|--------|
| 75 | `components/ui/ThemeToggle.tsx` | 61 | `Claro` | OK | Ja esta em portugues. |
| 76 | `components/ui/ThemeToggle.tsx` | 78 | `Escuro` | OK | Ja esta em portugues. |

### PRIORIDADE BAIXA - Textos que Funcionam Mas Podem Melhorar

| # | Arquivo | Linha | Texto Atual | Texto Sugerido | Motivo |
|---|---------|-------|-------------|----------------|--------|
| 77 | `components/bi/BiFiltros.tsx` | 75 | `Periodo` | `Periodo` | OK, e compreensivel. |
| 78 | `components/bi/BiFiltros.tsx` | 83 | `Ultimos 30 dias` | OK | Claro. |
| 79 | `components/financeiro/ResumoFinanceiro.tsx` | 14 | `Pago no Mes` | OK | Claro. |
| 80 | `components/financeiro/ResumoFinanceiro.tsx` | 24 | `Em Aberto` | OK | Claro. |
| 81 | `components/financeiro/ResumoFinanceiro.tsx` | 35 | `Fechamentos Pendentes` | `Acertos Pendentes` | Consistencia com a mudanca de "Fechamento" para "Acerto". |
| 82 | `app/(dashboard)/financeiro/historico/page.tsx` | 67 | `Historico de Fechamentos` | `Historico de Acertos` | Consistencia. |
| 83 | `app/(dashboard)/financeiro/historico/page.tsx` | 71 | `Consulte seus fechamentos financeiros` | `Veja seus acertos de contas` | Consistencia. |
| 84 | `app/(dashboard)/financeiro/historico/page.tsx` | 72 | `Consulte e gerencie todos os fechamentos da empresa` | `Veja e gerencie todos os acertos da empresa` | Consistencia. |

---

## Alteracoes em Arquivos de Tipos (Centralizados)

Estas alteracoes propagam automaticamente para todos os componentes que usam os mapas de labels.

| # | Arquivo | Objeto | Chave | Texto Atual | Texto Sugerido |
|---|---------|--------|-------|-------------|----------------|
| T1 | `types/viagem.ts` | `VIAGEM_STATUS_LABELS` | `planejada` | `Planejada` | OK |
| T2 | `types/viagem.ts` | `VIAGEM_STATUS_LABELS` | `em_andamento` | `Em Andamento` | OK |
| T3 | `types/viagem.ts` | `VIAGEM_STATUS_LABELS` | `concluida` | `Concluida` | OK |
| T4 | `types/viagem.ts` | `VIAGEM_STATUS_LABELS` | `cancelada` | `Cancelada` | OK |
| T5 | `types/fechamento.ts` | `FECHAMENTO_STATUS_LABELS` | `aberto` | `Aberto` | `Em aberto` (mais natural) |
| T6 | `types/fechamento.ts` | `FECHAMENTO_STATUS_LABELS` | `fechado` | `Fechado` | `Conferido` (o motorista entende "fechado" como "encerrado/morto") |
| T7 | `types/fechamento.ts` | `FECHAMENTO_STATUS_LABELS` | `pago` | `Pago` | OK |

**Nota:** As labels de status de viagem (`Planejada`, `Em Andamento`, `Concluida`, `Cancelada`) ja estao em portugues simples e nao precisam de alteracao. Os botoes de acao (`Iniciar Viagem`, `Concluir Viagem`, `Cancelar Viagem`) tambem estao adequados.

---

## Termos que NAO Precisam Mudar

Estes termos ja estao adequados ao publico-alvo:

| Termo | Onde Aparece | Por que Esta OK |
|-------|-------------|-----------------|
| Viagens | Menu, titulos | Termo do dia-a-dia do cegonheiro |
| Gastos | Menu, titulos | Universal e direto |
| Motoristas | Menu admin | Termo do setor |
| Caminhoes | Menu admin | Termo do setor |
| Vinculos | Menu admin | Pode ser "Quem dirige qual caminhao" mas nao e urgente (tela admin) |
| Empresa | Menu, formularios | Claro |
| Combustivel | Menu config | Claro |
| Usuarios | Menu admin | Tela admin, nao precisa simplificar |
| Sair | Botao logout | Perfeito |
| Nova Viagem / Novo Gasto | Botoes | Claro |
| Anterior / Proxima | Paginacao | Claro |
| Origem / Destino | Formularios | Linguagem do motorista |
| Placa / Modelo | Formularios | Linguagem do setor |
| Salvar / Cancelar | Botoes | Universal |
| Editar / Excluir / Ver | Botoes de acao | Claro |

---

## Recomendacoes Adicionais

### 1. Tamanho dos Textos
O sistema ja usa `text-base` (16px) para a maioria dos textos e `min-h-[48px]` para botoes, o que e adequado para 55+. Manter.

### 2. Mensagens de Erro
As mensagens de erro atuais sao boas ("Erro ao atualizar status", "Data de chegada real e obrigatoria"). Sugiro adicionar sugestoes de acao nas mensagens mais criticas:
- "Erro ao salvar. Verifique sua conexao e tente de novo."
- "Nao foi possivel carregar os dados. Tente recarregar a pagina."

### 3. Labels de Formulario do Abastecimento
O formulario de abastecimento (`AbastecimentoForm.tsx`) esta bem adequado com labels claros, campos grandes e exemplos nos placeholders. E um bom modelo para os demais formularios.

### 4. Consistencia "Fechamento" vs "Acerto"
A mudanca de "Fechamento" para "Acerto de Contas" e a mais impactante e deve ser feita de forma consistente em TODOS os locais. Recomendo criar uma constante `TERMO_FECHAMENTO = 'Acerto de Contas'` para facilitar futuras mudancas.

### 5. Tooltip/Ajuda Contextual
Para termos que nao podem ser simplificados demais (ex: "Odometro"), considere adicionar um icone de interrogacao com tooltip explicativo: "Numero que aparece no painel do caminhao".

---

## Plano de Implementacao Sugerido

**Fase 1 (Critico - 1 dia):**
- Items 1-14: Navegacao principal (afeta 100% dos usuarios)
- Items 15-24: Coluna "Status" -> "Situacao" (aparece em todas as listas)
- Items T5-T6: Labels centralizados de fechamento

**Fase 2 (Alto impacto - 1 dia):**
- Items 25-31: "Filtros" -> "Buscar por"
- Items 32-45: Termos do BI/Resumo
- Items 46-61: Simulador e Previsao

**Fase 3 (Media - meio dia):**
- Items 62-74: Botoes, acoes e empty states
- Items 81-84: Consistencia "Acerto" no historico financeiro

**Total estimado:** 2.5 dias de desenvolvimento.

---

## Arquivos Impactados (Resumo)

| Arquivo | Qtd Alteracoes | Prioridade |
|---------|---------------|------------|
| `app/(dashboard)/layout.tsx` | 5 | ALTA |
| `app/(dashboard)/bi/page.tsx` | 6 | ALTA |
| `app/(dashboard)/dashboard/page.tsx` | 2 | ALTA |
| `components/bi/BiBreakdownCategorias.tsx` | 3 | ALTA |
| `components/bi/BiKpiCards.tsx` | 4 | ALTA |
| `components/bi/BiTendenciaMensal.tsx` | 3 | ALTA |
| `components/bi/BiRankingCaminhoes.tsx` | 4 | ALTA |
| `components/bi/BiRankingMotoristas.tsx` | 4 | ALTA |
| `components/bi/BiFiltros.tsx` | 3 | ALTA |
| `components/bi/SimuladorViagem.tsx` | 10 | ALTA |
| `components/bi/HistoricoRotas.tsx` | 6 | ALTA |
| `components/viagens/ViagemFilters.tsx` | 2 | ALTA |
| `components/viagens/ViagemList.tsx` | 3 | ALTA |
| `components/fechamentos/FechamentoFilters.tsx` | 1 | ALTA |
| `components/fechamentos/FechamentoList.tsx` | 1 | ALTA |
| `components/fechamentos/FechamentoStatusActions.tsx` | 1 | MEDIA |
| `components/financeiro/HistoricoFiltros.tsx` | 3 | ALTA |
| `components/financeiro/HistoricoFechamentos.tsx` | 1 | ALTA |
| `components/financeiro/ResumoFinanceiro.tsx` | 1 | BAIXA |
| `components/gastos/GastoFilters.tsx` | 3 | ALTA |
| `components/gastos/GastoSummary.tsx` | 3 | MEDIA |
| `components/gastos/GastoExportButton.tsx` | 2 | MEDIA |
| `components/ui/MobileSidebar.tsx` | 2 | ALTA |
| `components/caminhoes/caminhao-list.tsx` | 1 | ALTA |
| `components/vinculos/VinculoList.tsx` | 1 | ALTA |
| `components/motoristas/MotoristaList.tsx` | 1 | ALTA |
| `components/usuarios/usuario-list.tsx` | 1 | ALTA |
| `components/dashboard/FechamentoSummaryCard.tsx` | 0 | - |
| `app/(dashboard)/configuracoes/combustivel/page.tsx` | 1 | ALTA |
| `app/(dashboard)/fechamentos/page.tsx` | 2 | MEDIA |
| `app/(dashboard)/financeiro/historico/page.tsx` | 3 | BAIXA |
| `types/fechamento.ts` | 2 | ALTA |

---

*Auditoria realizada por Atlas (AIOX Analyst) em 2026-03-29.*
*Metodologia: grep exaustivo + leitura de 42 arquivos .tsx + analise de tipos centralizados.*
