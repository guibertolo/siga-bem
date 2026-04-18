# Round Table: Perguntas do Dono de Frota para o Copilot IA

**Data:** 2026-04-12
**Facilitador:** Atlas (Analyst)
**Metodo:** Brainstorm autonomo com grounding no schema real do FrotaViva
**Publico-alvo:** Dono de frota de cegonha, 55+, ABC Paulista
**Schema base:** migrations `20260328*` ate `20260412*` (validado)

---

## Convencoes deste documento

- **Pergunta natural**: como o dono falaria, em PT-BR coloquial (sem jargao)
- **Metrica**: nome tecnico do indicador
- **Calculo**: SQL/logica usando APENAS tabelas reais do schema
- **Decisao**: qual acao concreta o dono toma com essa informacao
- **NECESSITA CAMPO NOVO**: indica dados que o schema atual nao suporta

### Tabelas disponiveis no schema

| Tabela | Campos-chave para metricas |
|--------|---------------------------|
| `viagem` | origem, destino, data_saida, data_chegada_real, valor_total (centavos), km_saida, km_chegada, motorista_id, caminhao_id, status, percentual_pagamento |
| `gasto` | valor (centavos), categoria_id, motorista_id, caminhao_id, viagem_id, data, litros, tipo_combustivel, km_registro, uf_abastecimento, posto_local |
| `categoria_gasto` | nome (Pedagio, Combustivel, Pneu, Manutencao, Lavagem, Estacionamento, Alimentacao, Hospedagem, Seguro, Multa, Outros) |
| `motorista` | nome, status, cnh_validade, cnh_categoria, percentual_pagamento |
| `caminhao` | placa, modelo, marca, ano, tipo_cegonha, capacidade_veiculos, km_atual, ativo |
| `fechamento` | motorista_id, periodo_inicio, periodo_fim, total_viagens, total_gastos, saldo_motorista, status (aberto/fechado/pago) |
| `fechamento_item` | tipo (viagem/gasto), referencia_id, valor, data |
| `motorista_caminhao` | motorista_id, caminhao_id, data_inicio, data_fim, ativo |
| `empresa` | plano, max_caminhoes, cnpj, cidade, estado |

---

## 1. EFICIENCIA DE COMBUSTIVEL

### 1.1 Consumo medio por caminhao (km/L)

| Campo | Valor |
|-------|-------|
| **Pergunta** | "Quantos km por litro ta fazendo a cegonha ABC1D23?" |
| **Metrica** | km/L por caminhao |
| **Calculo** | `SUM(viagem.km_chegada - viagem.km_saida) / SUM(gasto.litros)` WHERE `gasto.tipo_combustivel IS NOT NULL` AND `gasto.caminhao_id = X` no periodo. Metodo hibrido: Layer 1 (por viagem), Layer 2 (rolling 90d), Layer 3 (default 3.0). Range valido: 1.0-5.0 km/L |
| **Decisao** | Se km/L caiu >15% vs media historica: sinal de problema mecanico, filtro sujo, pneu murcho ou motorista acelerando demais. Agendar manutencao ou trocar motorista. |

### 1.2 Consumo comparativo entre motoristas

| Campo | Valor |
|-------|-------|
| **Pergunta** | "Qual motorista ta gastando mais diesel?" |
| **Metrica** | km/L por motorista (mesmo caminhao, periodo comparavel) |
| **Calculo** | Para cada motorista: `SUM(viagem.km_chegada - viagem.km_saida) / SUM(gasto.litros)` WHERE `gasto.tipo_combustivel IS NOT NULL` AND `gasto.motorista_id = X`. Agrupar por motorista, ordenar ascendente (pior primeiro). |
| **Decisao** | Motorista com km/L consistentemente 20%+ abaixo da media: conversar, treinar ou trocar. Diferenca entre motoristas no mesmo caminhao isola o fator humano do mecanico. |

### 1.3 Custo de combustivel por km

| Campo | Valor |
|-------|-------|
| **Pergunta** | "Quanto to gastando de diesel por km rodado?" |
| **Metrica** | R$/km de combustivel |
| **Calculo** | `SUM(gasto.valor WHERE categoria='Combustivel') / SUM(viagem.km_chegada - viagem.km_saida)` por caminhao ou frota inteira no periodo. Valor em centavos, dividir por 100 pra exibir em R$. |
| **Decisao** | Comparar com benchmark do setor (R$ 2,00-3,50/km para cegonha). Se acima: investigar preco do posto, rota ineficiente ou consumo alto. |

### 1.4 Preco medio do litro por UF

| Campo | Valor |
|-------|-------|
| **Pergunta** | "Onde meus motoristas tao abastecendo mais barato?" |
| **Metrica** | R$/litro medio por UF |
| **Calculo** | `AVG(gasto.valor / gasto.litros)` WHERE `gasto.uf_abastecimento IS NOT NULL` GROUP BY `uf_abastecimento`. Ja existe view `vw_media_combustivel_regiao`. |
| **Decisao** | Orientar motoristas a priorizar postos em UFs com preco menor (ex: abastecer cheio em SP antes de entrar em MG se mais caro). |

### 1.5 Evolucao mensal do custo de combustivel

| Campo | Valor |
|-------|-------|
| **Pergunta** | "O gasto de diesel subiu esse mes comparado com o mes passado?" |
| **Metrica** | Variacao % mensal do custo total de combustivel |
| **Calculo** | `SUM(gasto.valor WHERE categoria='Combustivel' AND mes=atual)` vs `SUM(gasto.valor WHERE mes=anterior)`. Calcular variacao percentual. |
| **Decisao** | Alta >10% sem aumento de viagens: investigar preco do diesel, consumo do caminhao ou comportamento do motorista. |

### 1.6 Litros por viagem

| Campo | Valor |
|-------|-------|
| **Pergunta** | "Quantos litros gasta uma viagem SP-RJ?" |
| **Metrica** | Litros medios por rota (origem-destino) |
| **Calculo** | `SUM(gasto.litros WHERE gasto.viagem_id = X)` agrupado por par origem-destino. Media historica das viagens concluidas naquela rota. |
| **Decisao** | Criar baseline por rota. Se uma viagem especifica gastou muito mais: verificar se houve desvio, carga extra, ou problema mecanico. |

---

## 2. CUSTOS E MANUTENCAO

### 2.1 Custo total por categoria

| Campo | Valor |
|-------|-------|
| **Pergunta** | "Quanto gastei de pneu esse mes?" / "Qual meu maior gasto?" |
| **Metrica** | Total de gastos por categoria no periodo |
| **Calculo** | `SUM(gasto.valor)` GROUP BY `categoria_gasto.nome` WHERE periodo. Ordenar descendente. |
| **Decisao** | Identificar onde o dinheiro esta indo. Se Manutencao subiu muito: caminhao velho, considerar troca. Se Multa alto: motorista problema. |

### 2.2 Custo de manutencao por caminhao

| Campo | Valor |
|-------|-------|
| **Pergunta** | "Qual caminhao ta dando mais manutencao?" |
| **Metrica** | Total R$ em manutencao por caminhao |
| **Calculo** | `SUM(gasto.valor)` WHERE `categoria_gasto.nome = 'Manutencao'` GROUP BY `caminhao_id` ORDER DESC. |
| **Decisao** | Caminhao com manutencao >30% acima da media da frota: avaliar se compensa manter ou vender. Caminhao velho queima caixa. |

### 2.3 Frequencia de manutencao por caminhao

| Campo | Valor |
|-------|-------|
| **Pergunta** | "Quantas vezes a ABC1D23 quebrou esse ano?" |
| **Metrica** | Quantidade de registros de manutencao por caminhao |
| **Calculo** | `COUNT(gasto.id)` WHERE `categoria_gasto.nome = 'Manutencao'` AND `caminhao_id = X` no periodo. |
| **Decisao** | Mais de 3 manutencoes/mes = sinal de descarte ou overhaul. Cruzar com idade do caminhao (campo `ano`). |

### 2.4 Custo de pneu por caminhao

| Campo | Valor |
|-------|-------|
| **Pergunta** | "Quanto gastei de pneu na cegonha da placa tal?" |
| **Metrica** | Total R$ em pneu por caminhao |
| **Calculo** | `SUM(gasto.valor)` WHERE `categoria_gasto.nome = 'Pneu'` AND `caminhao_id = X`. |
| **Decisao** | Pneu de cegonha custa R$ 2.200-3.000+ cada. Benchmark: vida util 80-120mil km. Se trocando com menos: motorista dirigindo mal, estrada ruim, ou pneu de baixa qualidade. |

### 2.5 Custo de pedagio por rota

| Campo | Valor |
|-------|-------|
| **Pergunta** | "Quanto de pedagio gasta numa viagem pra Curitiba?" |
| **Metrica** | Total de pedagio por par origem-destino |
| **Calculo** | `SUM(gasto.valor)` WHERE `categoria_gasto.nome = 'Pedagio'` AND `gasto.viagem_id` em viagens com destino X. Agrupar por par origem-destino. |
| **Decisao** | Usar pra negociar frete: "essa rota tem R$ X de pedagio, preciso cobrar mais". Comparar rotas alternativas. |

### 2.6 Custo total por km rodado (CPK)

| Campo | Valor |
|-------|-------|
| **Pergunta** | "Quanto me custa cada km que rodo?" |
| **Metrica** | Custo por Quilometro (CPK) |
| **Calculo** | `SUM(gasto.valor) / SUM(viagem.km_chegada - viagem.km_saida)` para toda frota ou por caminhao. Inclui TODAS as categorias de gasto. |
| **Decisao** | KPI mais completo de eficiencia operacional. Benchmark cegonha: R$ 4-7/km (depende da regiao e carga). CPK subindo = margem caindo. |

### 2.7 Multas por motorista

| Campo | Valor |
|-------|-------|
| **Pergunta** | "Quem ta tomando mais multa?" |
| **Metrica** | Quantidade e valor de multas por motorista |
| **Calculo** | `COUNT(gasto.id)` e `SUM(gasto.valor)` WHERE `categoria_gasto.nome = 'Multa'` GROUP BY `motorista_id`. |
| **Decisao** | Motorista com multas recorrentes: advertencia, desconto no acerto, ou desligamento. Multa sai do lucro do dono. |

### 2.8 Manutencao por km rodado

| Campo | Valor |
|-------|-------|
| **Pergunta** | "Quanto gasto de manutencao por km?" |
| **Metrica** | R$ manutencao / km rodado por caminhao |
| **Calculo** | `SUM(gasto.valor WHERE categoria='Manutencao' AND caminhao_id=X) / (caminhao.km_atual - km_inicial_periodo)`. Alternativa: usar SUM(km viagens concluidas). |
| **Decisao** | Se R$/km de manutencao > R$ 1,00-1,50: caminhao esta "comendo" dinheiro. Hora de vender. |

---

## 3. RENTABILIDADE

### 3.1 Lucro por caminhao

| Campo | Valor |
|-------|-------|
| **Pergunta** | "Qual caminhao ta me dando mais lucro?" / "Qual ta dando prejuizo?" |
| **Metrica** | Lucro liquido por caminhao = receita - custos |
| **Calculo** | `SUM(viagem.valor_total WHERE caminhao_id=X AND status='concluida') - SUM(gasto.valor WHERE caminhao_id=X)` no periodo. Ja existe tool T2 (`ranking_caminhoes_por_lucro`). |
| **Decisao** | Caminhao com prejuizo por 2+ meses: avaliar venda. Caminhao mais lucrativo: investir em manutencao preventiva. |

### 3.2 Lucro por motorista

| Campo | Valor |
|-------|-------|
| **Pergunta** | "Qual motorista me da mais retorno?" |
| **Metrica** | Lucro liquido por motorista |
| **Calculo** | `SUM(viagem.valor_total WHERE motorista_id=X AND status='concluida') - SUM(gasto.valor WHERE motorista_id=X)` no periodo. |
| **Decisao** | Motorista que gera mais lucro: premiar, renegociar percentual pra manter. Motorista deficitario: investigar se e gasto alto ou poucas viagens. |

### 3.3 Margem por viagem

| Campo | Valor |
|-------|-------|
| **Pergunta** | "Qual viagem deu mais margem?" / "Essa viagem pra Bahia valeu a pena?" |
| **Metrica** | Margem % por viagem |
| **Calculo** | `(viagem.valor_total - SUM(gasto.valor WHERE viagem_id=X)) / viagem.valor_total * 100`. Ja existe tool T3 (`ranking_viagens_por_margem`). |
| **Decisao** | Rotas com margem <20%: recusar ou renegociar frete. Rotas com margem >40%: priorizar. |

### 3.4 Receita total no periodo

| Campo | Valor |
|-------|-------|
| **Pergunta** | "Quanto entrou esse mes?" |
| **Metrica** | Receita bruta |
| **Calculo** | `SUM(viagem.valor_total)` WHERE `status = 'concluida'` no periodo. |
| **Decisao** | Comparar mes a mes. Se caiu: menos viagens ou frete mais barato? Decidir se busca mais clientes (transportadoras). |

### 3.5 Custo total no periodo

| Campo | Valor |
|-------|-------|
| **Pergunta** | "Quanto saiu de gasto esse mes?" |
| **Metrica** | Custo operacional total |
| **Calculo** | `SUM(gasto.valor)` no periodo, opcionalmente por empresa. |
| **Decisao** | Custo subindo mais rapido que receita = margem espremida. Hora de cortar gastos ou renegociar frete. |

### 3.6 Margem operacional da frota

| Campo | Valor |
|-------|-------|
| **Pergunta** | "Qual minha margem geral?" / "To ganhando dinheiro?" |
| **Metrica** | Margem operacional % = (receita - custos) / receita * 100 |
| **Calculo** | `(SUM(viagem.valor_total concluidas) - SUM(gasto.valor)) / SUM(viagem.valor_total concluidas) * 100` no periodo. |
| **Decisao** | Margem saudavel pra cegonheiro: 25-40%. Abaixo de 20%: operacao em risco. Acima de 40%: expandir frota. |

### 3.7 Rentabilidade por rota

| Campo | Valor |
|-------|-------|
| **Pergunta** | "Qual rota me da mais dinheiro?" / "Compensa ir pra Bahia?" |
| **Metrica** | Lucro medio por par origem-destino |
| **Calculo** | `AVG(viagem.valor_total - SUM(gastos da viagem))` GROUP BY par (origem, destino). |
| **Decisao** | Priorizar rotas mais rentaveis ao negociar com transportadoras. Recusar rotas que consistentemente dao prejuizo. |

### 3.8 Valor do frete por km

| Campo | Valor |
|-------|-------|
| **Pergunta** | "Quanto to recebendo por km nessa rota?" |
| **Metrica** | R$/km de frete |
| **Calculo** | `viagem.valor_total / (viagem.km_chegada - viagem.km_saida)` por viagem ou media por rota. |
| **Decisao** | Se R$/km do frete < CPK: a viagem da prejuizo. Negociar frete maior ou recusar. |

### 3.9 Percentual efetivo pago ao motorista

| Campo | Valor |
|-------|-------|
| **Pergunta** | "Quanto to pagando pro motorista na real?" |
| **Metrica** | % efetivo = valor pago ao motorista / receita bruta |
| **Calculo** | `SUM(viagem.valor_total * viagem.percentual_pagamento / 100) / SUM(viagem.valor_total) * 100` WHERE motorista_id = X e status = 'concluida'. Pode cruzar com `fechamento.total_viagens` / receita. |
| **Decisao** | Se percentual efetivo > 30%: margem do dono esta apertada. Renegociar com motorista ou buscar motoristas com percentual menor. |

---

## 4. PRODUTIVIDADE

### 4.1 Viagens por mes (por motorista)

| Campo | Valor |
|-------|-------|
| **Pergunta** | "Quantas viagens o Joao fez esse mes?" |
| **Metrica** | Quantidade de viagens concluidas por motorista/mes |
| **Calculo** | `COUNT(viagem.id)` WHERE `motorista_id = X` AND `status = 'concluida'` AND mes = Y. |
| **Decisao** | Motorista com poucas viagens: esta parado? Doente? Caminhao quebrado? Ou recusando viagens? |

### 4.2 Viagens por mes (por caminhao)

| Campo | Valor |
|-------|-------|
| **Pergunta** | "Quantas viagens a ABC1D23 fez no mes?" |
| **Metrica** | Utilizacao do ativo (viagens/mes/caminhao) |
| **Calculo** | `COUNT(viagem.id)` WHERE `caminhao_id = X` AND `status = 'concluida'` AND mes = Y. |
| **Decisao** | Caminhao com <3 viagens/mes: esta subutilizado. Se parado >15 dias: custo fixo sem receita. Considerar alugar ou vender. |

### 4.3 Km rodados por mes

| Campo | Valor |
|-------|-------|
| **Pergunta** | "Quantos km rodou minha frota esse mes?" |
| **Metrica** | Km total rodado no periodo |
| **Calculo** | `SUM(viagem.km_chegada - viagem.km_saida)` WHERE `status = 'concluida'` no periodo. Por caminhao ou total. |
| **Decisao** | Media cegonha: 10-15mil km/mes. Se muito abaixo: frota ociosa. Se muito acima: atencao redobrada com manutencao. |

### 4.4 Tempo medio de viagem

| Campo | Valor |
|-------|-------|
| **Pergunta** | "Quanto tempo leva uma viagem SP-RJ?" |
| **Metrica** | Duracao media por rota (dias) |
| **Calculo** | `AVG(viagem.data_chegada_real - viagem.data_saida)` WHERE par (origem, destino) AND `status = 'concluida'`. |
| **Decisao** | Motorista demorando mais que a media: parado em posto? Problema mecanico? Desvio? |

### 4.5 Ociosidade do caminhao

| Campo | Valor |
|-------|-------|
| **Pergunta** | "Tem caminhao parado?" / "Quanto tempo a ABC1D23 ficou sem viagem?" |
| **Metrica** | Dias sem viagem por caminhao |
| **Calculo** | Diferenca entre `data_chegada_real` da ultima viagem concluida e `data_saida` da proxima viagem (ou hoje se nao ha proxima). `CURRENT_DATE - MAX(viagem.data_chegada_real WHERE caminhao_id = X AND status = 'concluida')`. |
| **Decisao** | Caminhao parado >5 dias: custo fixo correndo sem receita. Buscar viagem urgente ou emprestar pra outra operacao. |

### 4.6 Viagens canceladas

| Campo | Valor |
|-------|-------|
| **Pergunta** | "Quantas viagens foram canceladas esse mes?" |
| **Metrica** | Taxa de cancelamento |
| **Calculo** | `COUNT(viagem.id WHERE status = 'cancelada') / COUNT(viagem.id) * 100` no periodo. |
| **Decisao** | Cancelamento alto: problema com transportadora? Motorista desistindo? Caminhao quebrando antes de sair? |

### 4.7 Receita por km rodado

| Campo | Valor |
|-------|-------|
| **Pergunta** | "Quanto entra pra cada km que rodo?" |
| **Metrica** | R$ receita / km |
| **Calculo** | `SUM(viagem.valor_total) / SUM(viagem.km_chegada - viagem.km_saida)` para viagens concluidas no periodo. |
| **Decisao** | Se receita/km < custo/km: operacao deficitaria. Precisa de fretes melhores. |

---

## 5. DOCUMENTACAO E COMPLIANCE

### 5.1 CNH vencendo

| Campo | Valor |
|-------|-------|
| **Pergunta** | "Tem motorista com CNH vencendo?" |
| **Metrica** | Lista de motoristas com CNH vencendo em N dias |
| **Calculo** | `SELECT nome, cnh_validade FROM motorista WHERE status = 'ativo' AND cnh_validade <= CURRENT_DATE + interval 'N days'`. Ja existe tool T4 (`motoristas_cnh_vencendo`). |
| **Decisao** | CNH vencida = caminhao parado + multa gravissima. Avisar motorista com 60, 30 e 15 dias de antecedencia. |

### 5.2 CNH vencida (alerta critico)

| Campo | Valor |
|-------|-------|
| **Pergunta** | "Alguem ta rodando com CNH vencida?" |
| **Metrica** | Motoristas ativos com CNH ja vencida |
| **Calculo** | `SELECT nome, cnh_validade FROM motorista WHERE status = 'ativo' AND cnh_validade < CURRENT_DATE`. |
| **Decisao** | PARAR o motorista imediatamente. Risco legal e seguro nao cobre sinistro com CNH vencida. |

### 5.3 CRLV/IPVA do caminhao

| Campo | Valor |
|-------|-------|
| **Pergunta** | "A documentacao dos caminhoes ta em dia?" |
| **Metrica** | Status de CRLV e IPVA por caminhao |
| **Calculo** | **NECESSITA CAMPO NOVO:** `caminhao.crlv_validade DATE`, `caminhao.ipva_pago_ate INTEGER (ano)`. Sem esses campos, nao e possivel calcular. |
| **Decisao** | Caminhao com CRLV vencido: apreensao pela PRF. IPVA atrasado: nao emite CRLV. |

### 5.4 Seguro da frota

| Campo | Valor |
|-------|-------|
| **Pergunta** | "O seguro de algum caminhao ta vencendo?" |
| **Metrica** | Data de vencimento do seguro por caminhao |
| **Calculo** | **NECESSITA CAMPO NOVO:** `caminhao.seguro_validade DATE`, `caminhao.seguro_apolice TEXT`. Sem esses campos, nao e possivel calcular. |
| **Decisao** | Cegonha sem seguro = risco catastrofico. Carga de 11 veiculos pode valer R$ 500mil-2M. |

### 5.5 Idade do caminhao

| Campo | Valor |
|-------|-------|
| **Pergunta** | "Quantos anos tem cada caminhao meu?" |
| **Metrica** | Idade em anos |
| **Calculo** | `EXTRACT(YEAR FROM CURRENT_DATE) - caminhao.ano`. Campo `ano` ja existe. |
| **Decisao** | Caminhao com >15 anos: custo de manutencao dispara, valor de revenda cai. Planejar renovacao. |

---

## 6. FINANCEIRO / FECHAMENTO

### 6.1 Saldo do motorista (acerto)

| Campo | Valor |
|-------|-------|
| **Pergunta** | "Quanto devo pro Joao?" / "Quanto o motorista tem pra receber?" |
| **Metrica** | Saldo do fechamento |
| **Calculo** | `fechamento.saldo_motorista` (= total_viagens - total_gastos). Ou calcular: `SUM(viagem.valor_total * percentual_pagamento / 100) - SUM(gasto.valor WHERE motorista_id = X)` no periodo. Ja existe `fn_calcular_fechamento()`. |
| **Decisao** | Saldo positivo: pagar motorista. Saldo negativo: motorista esta devendo (gastou mais do que produziu). |

### 6.2 Fechamentos pendentes

| Campo | Valor |
|-------|-------|
| **Pergunta** | "Tem acerto pendente?" / "Quem eu ainda nao paguei?" |
| **Metrica** | Lista de fechamentos com status != 'pago' |
| **Calculo** | `SELECT motorista.nome, fechamento.* FROM fechamento JOIN motorista ON ... WHERE fechamento.status IN ('aberto', 'fechado')` ORDER BY periodo_fim. |
| **Decisao** | Fechamento aberto ha muito tempo: risco de conflito com motorista. Pagar ou contestar rapido. |

### 6.3 Historico de pagamentos

| Campo | Valor |
|-------|-------|
| **Pergunta** | "Quanto paguei pro Joao nos ultimos 3 meses?" |
| **Metrica** | Total pago por motorista no periodo |
| **Calculo** | `SUM(fechamento.saldo_motorista)` WHERE `motorista_id = X` AND `status = 'pago'` AND periodo no range. |
| **Decisao** | Avaliar se o motorista esta caro demais vs produtividade. Renegociar percentual se necessario. |

### 6.4 Fluxo de caixa simplificado

| Campo | Valor |
|-------|-------|
| **Pergunta** | "To no positivo ou no negativo esse mes?" |
| **Metrica** | Receita - Despesas total no periodo |
| **Calculo** | `SUM(viagem.valor_total WHERE concluida) - SUM(gasto.valor)` no periodo. Nao inclui custos fixos fora do sistema (aluguel, salario CLT etc). |
| **Decisao** | Negativo = queimando caixa. Positivo com tendencia de queda = ajustar antes de virar negativo. |

---

## 7. ALERTAS E ANOMALIAS

### 7.1 Motorista gastando fora do padrao

| Campo | Valor |
|-------|-------|
| **Pergunta** | "Tem motorista gastando muito?" / "Alguma coisa estranha nos gastos?" |
| **Metrica** | Gasto do motorista vs media da frota (desvio padrao) |
| **Calculo** | Para cada motorista: `total_gastos_periodo / km_rodados_periodo`. Comparar com media e desvio padrao dos demais. Flag se > media + 1.5 * stddev. BI ja usa alertas dinamicos com N>=5 (feedback `feedback_no_hardcoded_thresholds`). |
| **Decisao** | Investigar. Pode ser rota mais cara, caminhao mais velho, ou motorista abusando (combustivel desviado, nota inflada). |

### 7.2 Caminhao parado

| Campo | Valor |
|-------|-------|
| **Pergunta** | "Tem caminhao parado?" |
| **Metrica** | Dias desde ultima viagem concluida |
| **Calculo** | `CURRENT_DATE - MAX(viagem.data_chegada_real)` WHERE `caminhao_id = X` AND `status = 'concluida'`. Se nulo (nunca viajou): dias desde created_at. |
| **Decisao** | Parado >5 dias uteis: custo fixo sem receita. Diagnosticar: em manutencao? Sem motorista? Sem frete? |

### 7.3 Margem caindo

| Campo | Valor |
|-------|-------|
| **Pergunta** | "Minha margem ta caindo?" |
| **Metrica** | Tendencia da margem operacional (mes a mes) |
| **Calculo** | Calcular margem operacional por mes (receita - custos / receita) nos ultimos 3-6 meses. Se 3+ meses consecutivos de queda: alerta. |
| **Decisao** | Margem caindo = custos subindo ou frete estagnado. Revisar contratos com transportadoras, cortar gastos desnecessarios. |

### 7.4 Abastecimento fora do padrao

| Campo | Valor |
|-------|-------|
| **Pergunta** | "Algum abastecimento parece estranho?" |
| **Metrica** | Litros/valor por abastecimento vs media |
| **Calculo** | Para cada gasto de combustivel: `litros` e `valor / litros` (preco/L). Flag se: litros > capacidade do tanque (~500L cegonha), ou preco/L >20% acima da media da UF, ou 2+ abastecimentos no mesmo dia. |
| **Decisao** | Abastecimento anomalo pode indicar: nota fria, desvio de combustivel, posto cobrando a mais. Investigar com comprovante (campo `foto_url`). |

### 7.5 Gasto de pneu acima do esperado

| Campo | Valor |
|-------|-------|
| **Pergunta** | "To trocando pneu demais?" |
| **Metrica** | Frequencia de gastos com pneu vs km rodado |
| **Calculo** | `COUNT(gasto WHERE categoria='Pneu' AND caminhao_id=X)` / `km_rodados_periodo`. Benchmark: troca a cada 80-120mil km. **NECESSITA CAMPO NOVO para precisao:** `gasto.posicao_pneu TEXT` (qual pneu do eixo). Sem esse campo, calculo e aproximado pela frequencia e valor total. |
| **Decisao** | Trocando pneu com menos de 60mil km: verificar calibragem, alinhamento, motorista freando bruscamente. Pneu e 10-20% do custo operacional. |

### 7.6 Viagem com margem negativa

| Campo | Valor |
|-------|-------|
| **Pergunta** | "Alguma viagem deu prejuizo?" |
| **Metrica** | Viagens onde gasto > frete |
| **Calculo** | `viagem.valor_total < SUM(gasto.valor WHERE viagem_id = viagem.id)` para viagens concluidas. |
| **Decisao** | Viagem com margem negativa: rota ruim, imprevisto (quebra), ou frete subvalorizado. Se recorrente na mesma rota: parar de aceitar. |

### 7.7 Motorista com muitas viagens canceladas

| Campo | Valor |
|-------|-------|
| **Pergunta** | "O Joao ta cancelando muita viagem?" |
| **Metrica** | Taxa de cancelamento por motorista |
| **Calculo** | `COUNT(viagem WHERE status='cancelada' AND motorista_id=X) / COUNT(viagem WHERE motorista_id=X) * 100`. |
| **Decisao** | Cancelamento alto de um motorista especifico: problema de compromisso, saude, ou conflito. Conversar antes de desligar. |

---

## 8. COMPARATIVOS E BENCHMARKING

### 8.1 Comparativo entre caminhoes

| Campo | Valor |
|-------|-------|
| **Pergunta** | "Qual meu melhor caminhao?" / "Comparar os caminhoes" |
| **Metrica** | Ranking multi-criterio (lucro, km/L, manutencao, viagens) |
| **Calculo** | Para cada caminhao: lucro (3.1), km/L (1.1), custo manutencao (2.2), viagens/mes (4.2). Score composto ou tabela comparativa. |
| **Decisao** | Identificar qual ativo esta performando melhor. Caminhao pior em todos os criterios: candidato a venda. |

### 8.2 Comparativo entre motoristas

| Campo | Valor |
|-------|-------|
| **Pergunta** | "Qual meu melhor motorista?" |
| **Metrica** | Ranking multi-criterio (lucro, km/L, gastos, viagens, multas) |
| **Calculo** | Para cada motorista: lucro gerado (3.2), km/L (1.2), gastos totais, viagens/mes (4.1), multas (2.7). |
| **Decisao** | Premiar os melhores, conversar com os piores. Base objetiva pra decisoes de pessoal. |

### 8.3 Benchmark anonimo do setor

| Campo | Valor |
|-------|-------|
| **Pergunta** | "To melhor ou pior que os outros donos?" |
| **Metrica** | Metricas do dono vs mediana anonima do setor |
| **Calculo** | Ja existe view `benchmarking_sector_view` (migration `20260331100000`). Usa k=5 anonimizacao, mediana. Compara km/L, margem, CPK com outros tenants. |
| **Decisao** | Abaixo da mediana: algo na operacao precisa melhorar. Acima: vantagem competitiva, manter. |

### 8.4 Evolucao mensal (tendencia)

| Campo | Valor |
|-------|-------|
| **Pergunta** | "Como foi meu resultado mes a mes?" |
| **Metrica** | Receita, custo, lucro, margem, km/L meses no periodo |
| **Calculo** | Agrupar por `TO_CHAR(data, 'YYYY-MM')` as metricas de receita (viagens), custo (gastos), lucro e margem. View `vw_gastos_bi` ja tem campo `mes_ano`. |
| **Decisao** | Identificar sazonalidade (dezembro = menos viagem por ferias das montadoras), tendencias de melhoria ou piora. |

---

## 9. GESTAO DE FROTA (ATIVO)

### 9.1 Km acumulado por caminhao

| Campo | Valor |
|-------|-------|
| **Pergunta** | "Quantos km ja rodou a ABC1D23?" |
| **Metrica** | Km acumulado |
| **Calculo** | `caminhao.km_atual`. Atualizado automaticamente ao concluir viagem com `km_chegada`. |
| **Decisao** | Caminhao com >500mil km: fase critica de manutencao, planejar substituicao. |

### 9.2 Vinculo motorista-caminhao atual

| Campo | Valor |
|-------|-------|
| **Pergunta** | "Quem ta com qual caminhao?" |
| **Metrica** | Vinculos ativos |
| **Calculo** | `SELECT m.nome, c.placa FROM motorista_caminhao mc JOIN motorista m ... JOIN caminhao c ... WHERE mc.ativo = true`. |
| **Decisao** | Ver se a alocacao faz sentido. Motorista bom no caminhao mais lucrativo. |

### 9.3 Historico de motoristas por caminhao

| Campo | Valor |
|-------|-------|
| **Pergunta** | "Quem ja dirigiu a ABC1D23?" |
| **Metrica** | Historico de vinculos |
| **Calculo** | `SELECT m.nome, mc.data_inicio, mc.data_fim FROM motorista_caminhao mc JOIN motorista m ... WHERE mc.caminhao_id = X ORDER BY data_inicio DESC`. |
| **Decisao** | Caminhao que "come" motorista (alta rotatividade): problema no veiculo? Caminhao desconfortavel ou com problema cronico? |

### 9.4 Capacidade da frota

| Campo | Valor |
|-------|-------|
| **Pergunta** | "Quantos carros consigo levar de uma vez?" |
| **Metrica** | Capacidade total da frota |
| **Calculo** | `SUM(caminhao.capacidade_veiculos)` WHERE `ativo = true`. Media: 11 veiculos por cegonha. |
| **Decisao** | Saber a capacidade total ajuda a negociar com transportadoras. Se demanda > capacidade: hora de comprar mais caminhao. |

### 9.5 Frota por tipo de cegonha

| Campo | Valor |
|-------|-------|
| **Pergunta** | "Quantas abertas e quantas fechadas eu tenho?" |
| **Metrica** | Distribuicao por tipo |
| **Calculo** | `COUNT(caminhao.id)` GROUP BY `tipo_cegonha` WHERE `ativo = true`. |
| **Decisao** | Cegonha fechada: carros premium, frete mais caro. Aberta: volume. Decidir mix ideal. |

---

## 10. PLANEJAMENTO E SIMULACAO

### 10.1 Simulacao de novo caminhao

| Campo | Valor |
|-------|-------|
| **Pergunta** | "Se eu comprar mais um caminhao, em quanto tempo paga?" |
| **Metrica** | Payback estimado |
| **Calculo** | Media de lucro/caminhao/mes da frota atual. Payback = preco do caminhao / lucro medio mensal. Depende de premissas do dono (preco, financiamento). **NECESSITA CAMPO NOVO para precisao:** `caminhao.valor_aquisicao INTEGER` (centavos). Sem esse campo, simulacao usa input do usuario. |
| **Decisao** | Payback < 24 meses: bom investimento. > 36 meses: risco alto. |

### 10.2 Simulacao de troca de motorista

| Campo | Valor |
|-------|-------|
| **Pergunta** | "Se eu trocar o Joao por outro com 20% de percentual, melhora?" |
| **Metrica** | Simulacao de impacto na margem |
| **Calculo** | Pegar historico de receita e custos do caminhao atual do motorista. Recalcular saldo com novo percentual hipotetico. `lucro_simulado = receita - (receita * novo_percentual / 100) - gastos_fixos`. |
| **Decisao** | Ver se a troca compensa financeiramente antes de fazer. Evitar decisao por impulso. |

### 10.3 Projecao de custos

| Campo | Valor |
|-------|-------|
| **Pergunta** | "Quanto vou gastar de diesel no proximo mes?" |
| **Metrica** | Projecao baseada em media movel |
| **Calculo** | Media dos ultimos 3 meses de gasto em combustivel * fator de sazonalidade (se disponivel). `AVG(SUM(gasto.valor WHERE categoria='Combustivel') por mes nos ultimos 3 meses)`. |
| **Decisao** | Planejar caixa. Se projecao de custo > receita esperada: reduzir viagens ou buscar fretes melhores. |

### 10.4 Valor de frete minimo por rota

| Campo | Valor |
|-------|-------|
| **Pergunta** | "Qual o minimo que posso aceitar pra ir pra Curitiba?" |
| **Metrica** | Break-even do frete por rota |
| **Calculo** | `AVG(gastos totais das viagens para destino X)` = custo medio da rota. Frete minimo = custo medio / (1 - margem desejada). Ex: custo R$ 3.000 com margem desejada 25% = frete minimo R$ 4.000. |
| **Decisao** | Negociar frete com dados, nao com achismo. Transportadora oferecendo abaixo do minimo: recusar ou negociar. |

---

## CAMPOS NOVOS NECESSARIOS (resumo)

Metricas que o schema atual **nao suporta** e precisam de novos campos para funcionar:

| Campo sugerido | Tabela | Tipo | Metricas que habilita | Prioridade |
|----------------|--------|------|----------------------|------------|
| `crlv_validade` | `caminhao` | `DATE` | 5.3 Documentacao do caminhao | ALTA (compliance) |
| `ipva_pago_ate` | `caminhao` | `INTEGER` (ano) | 5.3 Documentacao do caminhao | ALTA (compliance) |
| `seguro_validade` | `caminhao` | `DATE` | 5.4 Seguro da frota | ALTA (risco) |
| `seguro_apolice` | `caminhao` | `TEXT` | 5.4 Seguro da frota | MEDIA |
| `valor_aquisicao` | `caminhao` | `INTEGER` (centavos) | 10.1 Simulacao payback | BAIXA |
| `posicao_pneu` | `gasto` | `TEXT` | 7.5 Analise detalhada de pneu | BAIXA |

**Nota:** Todas as metricas de categorias 1-4 e 6-8 funcionam 100% com o schema atual. Apenas compliance (5.3, 5.4) e simulacoes avancadas (10.1) precisam de campos novos.

---

## MAPEAMENTO PARA TOOLS DO COPILOT

### Tools existentes (spec v0.1) e perguntas cobertas

| Tool | Perguntas cobertas |
|------|-------------------|
| T1 `buscar_gastos_por_periodo` | 1.5, 2.1, 2.5, 3.5, 7.1 (parcial) |
| T2 `ranking_caminhoes_por_lucro` | 3.1 |
| T3 `ranking_viagens_por_margem` | 3.3, 7.6 |
| T4 `motoristas_cnh_vencendo` | 5.1, 5.2 |
| T5 `resumo_desempenho_periodo` | 3.4, 3.5, 3.6 |
| T6 `listar_caminhoes` | 9.2, 9.4, 9.5 |

### Tools novas sugeridas

| Tool sugerida | Perguntas que cobre | Complexidade |
|---------------|---------------------|-------------|
| T7 `consumo_combustivel` | 1.1, 1.2, 1.3, 1.4, 1.6 | MEDIA (km/L hibrido, comparativo motoristas) |
| T8 `custo_por_km` | 2.6, 2.8, 3.8, 4.7, 10.4 | MEDIA (CPK geral e por categoria) |
| T9 `produtividade_frota` | 4.1, 4.2, 4.3, 4.4, 4.5, 4.6 | MEDIA (viagens, km, ociosidade) |
| T10 `comparativo_motoristas` | 1.2, 2.7, 3.2, 8.2 | MEDIA (ranking multi-criterio) |
| T11 `comparativo_caminhoes` | 2.2, 2.3, 8.1, 9.1, 9.5 | MEDIA (ranking multi-criterio) |
| T12 `fechamentos_pendentes` | 6.1, 6.2, 6.3 | BAIXA (query direta) |
| T13 `alertas_anomalias` | 7.1, 7.2, 7.3, 7.4, 7.5, 7.7 | ALTA (desvio padrao, deteccao anomalia) |
| T14 `tendencia_mensal` | 1.5, 3.6, 7.3, 8.4 | MEDIA (agrupamento mes a mes) |
| T15 `simulacao_financeira` | 10.1, 10.2, 10.3, 10.4 | ALTA (projecoes, cenarios what-if) |

### Priorizacao recomendada

**MVP (stories 9.4-9.7):** T7 (consumo) + T9 (produtividade) + T12 (fechamentos)
- Cobrem as perguntas mais frequentes do dono
- Complexidade moderada
- Dados 100% disponiveis no schema atual

**Fase 2:** T8 (CPK) + T10 (comparativo motoristas) + T13 (alertas)
- KPIs mais sofisticados
- Alertas proativos sao game-changer pro publico 55+

**Fase 3:** T11 (comparativo caminhoes) + T14 (tendencia) + T15 (simulacao)
- Valor estrategico alto, complexidade alta
- Depende de volume de dados historicos

---

## PERGUNTAS-FAROL CONSOLIDADAS (top 20)

As perguntas que o dono mais faria no dia-a-dia, ordenadas por frequencia estimada:

| # | Pergunta | Metrica principal | Tool |
|---|----------|-------------------|------|
| 1 | "Quanto gastei esse mes?" | Custo total | T1 (existe) |
| 2 | "Qual caminhao ta me dando prejuizo?" | Lucro/caminhao | T2 (existe) |
| 3 | "Quantos km por litro ta fazendo?" | km/L | T7 (nova) |
| 4 | "Quanto devo pro motorista?" | Saldo fechamento | T12 (nova) |
| 5 | "Tem CNH vencendo?" | CNH alert | T4 (existe) |
| 6 | "Qual minha margem esse mes?" | Margem % | T5 (existe) |
| 7 | "Tem caminhao parado?" | Dias sem viagem | T9 (nova) |
| 8 | "Qual motorista gasta mais diesel?" | km/L por motorista | T7 (nova) |
| 9 | "Quanto de pedagio gastei na rota tal?" | Pedagio por rota | T1 (existe) |
| 10 | "Quantas viagens o Joao fez?" | Viagens/motorista | T9 (nova) |
| 11 | "Qual viagem deu mais margem?" | Margem/viagem | T3 (existe) |
| 12 | "Quanto to pagando pro motorista?" | % efetivo | T10 (nova) |
| 13 | "Qual caminhao ta dando mais manutencao?" | R$ manut/caminhao | T11 (nova) |
| 14 | "Quanto me custa cada km?" | CPK | T8 (nova) |
| 15 | "To melhor que os outros donos?" | Benchmark setor | Benchmark view (existe) |
| 16 | "Algum motorista ta gastando estranho?" | Anomalia gasto | T13 (nova) |
| 17 | "Minha margem ta caindo?" | Tendencia mensal | T14 (nova) |
| 18 | "Qual rota me da mais dinheiro?" | Rentab/rota | T3/T8 combinado |
| 19 | "Se comprar mais um caminhao, paga em quanto tempo?" | Payback | T15 (nova) |
| 20 | "Resumo da semana" | Dashboard textual | T5 (existe) |

---

*Documento gerado por Atlas (Analyst) para o Epic 9 - Copilot FrotaViva*
*Fontes de mercado: [Edenred Mobilidade](https://blog.edenredmobilidade.com.br/gestao-de-frotas/indicadores-para-gestao-de-frota-melhore-sua-eficiencia/), [Geotab KPIs](https://www.geotab.com/pt-br/blog/indicadores-mais-utilizados-para-gerenciar-frotas/), [Prolog Pneus](https://prologapp.com/blog/pneus-e-diesel/), [Infleet Consumo](https://infleet.com.br/blog/tabela-consumo-combustivel-caminhoes/), [CheckSynq KPIs](https://checksynq.com.br/blog/kpis-gestao-frotas-indicadores)*
