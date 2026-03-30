# Metodologia de Calculo de Consumo de Combustivel (km/L) para FrotaViva

**Autor:** Atlas (Analyst Agent)
**Data:** 2026-03-30
**Status:** Pesquisa concluida
**Nivel de Confianca:** Alto (baseado em dados de mercado e analise do modelo de dados existente)

---

## TL;DR — Recomendacao

**Opcao D (Hibrida) e a melhor abordagem para o FrotaViva**, combinando calculo por viagem (quando km_saida e km_chegada existem) com media movel por caminhao/periodo como fallback. A formula por viagem e a mais precisa para cegonheiros porque captura o trecho real rodado, mas a media movel compensa dados faltantes e oferece visao de tendencia.

---

## 1. Contexto: Dados Disponiveis no FrotaViva

### 1.1 Modelo de Dados Atual

| Tabela | Campo | Tipo | Disponibilidade |
|--------|-------|------|-----------------|
| `viagem` | `km_saida` | INTEGER (nullable) | Preenchido pelo dono/admin ao iniciar viagem |
| `viagem` | `km_chegada` | INTEGER (nullable) | Preenchido ao concluir viagem |
| `viagem` | `km_estimado` | INTEGER (nullable) | Input manual, sem API de mapas |
| `caminhao` | `km_atual` | INTEGER (NOT NULL, default 0) | Atualizado automaticamente ao concluir viagem |
| `gasto` | `litros` | NUMERIC(10,3) (nullable) | Preenchido quando categoria = Combustivel |
| `gasto` | `viagem_id` | UUID (nullable) | Vinculo com viagem (pode ser NULL) |
| `gasto` | `km_registro` | INTEGER (nullable) | Odometro no momento do gasto |
| `gasto` | `tipo_combustivel` | ENUM (nullable) | diesel_s10 ou diesel_comum |
| `gasto` | `data` | DATE | Data do abastecimento |

### 1.2 Benchmarks de Mercado — Cegonheiros

| Tipo de Caminhao | Consumo Medio (km/L) | Faixa |
|------------------|----------------------|-------|
| Pesados (truck/extrapesado) | 2.2 - 3.2 | Longa distancia |
| Carretas e articulados | 1.8 - 2.5 | Maior resistencia ao rolamento |
| **Cegonheiro tipico** | **2.0 - 3.0** | Carregado com 9-11 veiculos |
| Cegonheiro vazio (retorno) | 3.0 - 4.0 | Peso reduzido, consumo melhor |

**Fontes:** Infleet, Sem Parar Empresas, Hivecloud, Frete com Lucro.

### 1.3 Desafios Especificos do Cegonheiro

1. **Km nao rastreados:** Deslocamento do patio ao ponto de carga, manobras em CDs, idas ao mecânico
2. **Abastecimentos parciais:** Motorista abastece o que pode em postos baratos, nao enche o tanque
3. **Abastecimentos fora de viagem:** Diesel entre viagens, manutenção, deslocamentos operacionais
4. **Variacao de carga:** Ida carregado (11 veiculos, ~2.2 km/L) vs. volta vazio (~3.5 km/L)
5. **Dados incompletos:** Nem toda viagem tera km_saida/km_chegada preenchidos no inicio

---

## 2. Analise dos 4 Metodos

### 2.1 Opcao A — Por Viagem

**Formula:**
```
km_l_viagem = (km_chegada - km_saida) / SUM(litros WHERE viagem_id = X)
```

**Vantagens:**
- Alta precisao quando ambos os km estao registrados
- Permite comparar rotas especificas (SP->PR vs SP->MG)
- Permite comparar motoristas na mesma rota
- Alinhado com o modelo mental do dono ("essa viagem rendeu X km/L")
- Dados ja existem no modelo FrotaViva

**Desvantagens:**
- Falha quando km_saida ou km_chegada estao nulos
- Abastecimentos durante a viagem podem estar incompletos (motorista esquece de registrar)
- Nao captura km fora de viagem (patio, oficina, etc.)
- Um unico abastecimento registrado errado distorce muito o resultado

**Precisao estimada:** 85-95% quando dados completos; inutilizavel quando incompletos.

**Referencia de mercado:** TruckPad usa calculo por viagem como metrica primaria, mostrando "consumo de combustivel por quilometro rodado" por viagem.

### 2.2 Opcao B — Por Abastecimento (Tanque Cheio a Tanque Cheio)

**Formula:**
```
km_l = (km_abastecimento_atual - km_abastecimento_anterior) / litros_abastecidos
```

**Vantagens:**
- Metodo mais preciso da industria quando executado corretamente
- Independe de viagem (funciona mesmo sem registro de viagem)
- Padrao do Fleetio, Simply Fleet e outros SaaS de frota internacionais

**Desvantagens:**
- **Exige tanque cheio em ambos os pontos** — se motorista abastece parcial, calculo fica impreciso
- Exige km_registro em cada abastecimento (campo opcional no FrotaViva)
- Motoristas de cegonheiro raramente enchem o tanque — escolhem postos baratos e abastecem parcial
- Requer disciplina de registro que publico 55+ pode nao manter

**Precisao estimada:** 95%+ com tanque cheio; 60-70% com abastecimentos parciais.

**Referencia de mercado:** Fleetio calcula eficiencia entre dois registros consecutivos de combustivel. Cada registro precisa de odometro e litros. O primeiro registro serve apenas como baseline.

### 2.3 Opcao C — Media Movel (Rolling Average)

**Formula:**
```
km_l_periodo = total_km_rodados_no_periodo / total_litros_no_periodo
```

Onde:
- `total_km_rodados` = SUM(km_chegada - km_saida) de viagens concluidas no periodo, OU delta de km_atual do caminhao
- `total_litros` = SUM(litros) de todos os abastecimentos no periodo

**Vantagens:**
- Suaviza anomalias (um abastecimento errado nao domina o resultado)
- Facil de entender para publico 55+: "esse mes, seu caminhao fez X km/L"
- Funciona mesmo com dados parciais
- Permite detectar tendencias (consumo piorando ao longo dos meses = manutencao necessaria)
- Captura TODOS os km, inclusive fora de viagem (se usar delta de km_atual)

**Desvantagens:**
- Menos granular — nao identifica qual viagem ou motorista especifico causou o desvio
- Pode mascarar problemas pontuais (um motorista pessimo na media de 5 bons)
- Se usar km_atual do caminhao, inclui km sem viagem associada (pode ser positivo ou negativo)

**Precisao estimada:** 80-90% (boa para tendencia, ruim para diagnostico pontual).

**Referencia de mercado:** Sofit e Prolog App recomendam "monitoramento contínuo do consumo médio" com janelas mensais para identificar desvios. Pulpo recomenda que "quanto maior a faixa de tempo e os abastecimentos tomados como base, mais preciso o resultado".

### 2.4 Opcao D — Hibrida (RECOMENDADA)

**Abordagem em camadas:**

```
Camada 1 (mais precisa): POR VIAGEM
  Se viagem tem km_saida E km_chegada E litros registrados:
    km_l = (km_chegada - km_saida) / SUM(litros da viagem)

Camada 2 (fallback): MEDIA MOVEL POR CAMINHAO
  Se viagem nao tem km completo:
    km_l = media ponderada dos ultimos N abastecimentos do caminhao
    (usando km_registro quando disponivel, ou delta de km_atual)

Camada 3 (fallback final): PADRAO DO SISTEMA
  Se nao ha dados suficientes:
    km_l = 3.0 (fallback ja existente no consumo-calc.ts)
```

**Vantagens:**
- Maximiza uso dos dados disponiveis sem descartar nenhum cenario
- Camada 1 atende o cenario ideal (viagem completa com notas)
- Camada 2 atende o cenario real (dados parciais, viagens sem km)
- Camada 3 garante que o sistema sempre tem um valor
- Cada calculo pode indicar sua "fonte" (historico_viagem, media_movel, padrao)
- Permite evolucao gradual: conforme mais dados sao registrados, mais calculos migram para Camada 1

**Desvantagens:**
- Mais complexo de implementar (3 caminhos de calculo)
- Precisa exibir ao usuario qual metodo foi usado (transparencia)

**Precisao estimada:** 85-95% na maioria dos cenarios reais.

---

## 3. Recomendacao Detalhada: Metodo Hibrido

### 3.1 Algoritmo Proposto

```
FUNCAO calcular_km_por_litro(viagem_id, caminhao_id):

  // CAMADA 1: Por viagem (mais precisa)
  SE viagem.km_saida IS NOT NULL
     E viagem.km_chegada IS NOT NULL
     E viagem.km_chegada > viagem.km_saida:

    litros_viagem = SUM(gasto.litros)
      WHERE gasto.viagem_id = viagem_id
        AND gasto.litros IS NOT NULL

    SE litros_viagem > 0:
      km_viagem = viagem.km_chegada - viagem.km_saida
      resultado = km_viagem / litros_viagem
      fonte = 'historico_viagem'

      // Sanity check: cegonheiro entre 1.0 e 5.0 km/L
      SE resultado >= 1.0 E resultado <= 5.0:
        RETORNAR { valor: resultado, fonte: fonte, confianca: 'alta' }
      SENAO:
        // Dado anomalo, cair para camada 2
        LOGAR warning "km/L fora da faixa esperada"

  // CAMADA 2: Media movel do caminhao (ultimos 90 dias)
  abastecimentos = SELECT litros, km_registro
    FROM gasto
    WHERE caminhao_id = caminhao_id
      AND litros IS NOT NULL
      AND data >= NOW() - INTERVAL '90 days'
    ORDER BY data ASC

  SE COUNT(abastecimentos) >= 2
     E pelo menos 2 tem km_registro:

    // Calcular km entre abastecimentos consecutivos com km_registro
    total_km = 0
    total_litros = 0
    PARA CADA par consecutivo (a1, a2) com km_registro:
      delta_km = a2.km_registro - a1.km_registro
      SE delta_km > 0:
        total_km += delta_km
        total_litros += a2.litros

    SE total_litros > 0 E total_km > 0:
      resultado = total_km / total_litros
      SE resultado >= 1.0 E resultado <= 5.0:
        RETORNAR { valor: resultado, fonte: 'media_movel_90d', confianca: 'media' }

  // CAMADA 2b: Usar delta de km_atual do caminhao
  // (km_atual e atualizado automaticamente ao concluir viagem)
  SE caminhao.km_atual > 0:
    total_litros_periodo = SUM(gasto.litros)
      WHERE caminhao_id = caminhao_id
        AND litros IS NOT NULL
        AND data >= NOW() - INTERVAL '90 days'

    // Estimar km do periodo pela diferenca de viagens concluidas
    km_periodo = SUM(km_chegada - km_saida)
      FROM viagem
      WHERE caminhao_id = caminhao_id
        AND status = 'concluida'
        AND data_chegada_real >= NOW() - INTERVAL '90 days'
        AND km_saida IS NOT NULL
        AND km_chegada IS NOT NULL

    SE km_periodo > 0 E total_litros_periodo > 0:
      resultado = km_periodo / total_litros_periodo
      SE resultado >= 1.0 E resultado <= 5.0:
        RETORNAR { valor: resultado, fonte: 'media_periodo', confianca: 'media' }

  // CAMADA 3: Fallback padrao
  RETORNAR { valor: 3.0, fonte: 'padrao_sistema', confianca: 'baixa' }
```

### 3.2 Sanity Checks (Validacao de Anomalias)

| Regra | Acao |
|-------|------|
| km/L < 1.0 | Anomalia: possivel erro de odometro ou litros. Descartar, usar fallback |
| km/L > 5.0 | Anomalia: cegonheiro carregado nao faz mais que ~4.0 km/L. Descartar |
| litros > 600 em um abastecimento | Anomalia: tanque de cegonheiro = 300-500L. Possivel erro de digitacao |
| km_chegada - km_saida > 5000 | Verificar: viagem muito longa ou erro de odometro |
| km_chegada < km_saida | BLOQUEAR: constraint ck_viagem_km ja impede isso no banco |

### 3.3 Exibicao para o Dono (UX para 55+)

**Card de consumo na viagem concluida:**
```
Consumo: 2.4 km/L
Baseado nos abastecimentos desta viagem
```

**Card de consumo no dashboard do caminhao:**
```
Media: 2.6 km/L (ultimos 90 dias)
Baseado em 12 abastecimentos
```

**Card quando dados insuficientes:**
```
Media estimada: 3.0 km/L
Poucos abastecimentos registrados — registre mais para ter dados reais
```

Regras de apresentacao:
- Nunca mostrar "N/A" — sempre ter um numero (mesmo que estimado)
- Sempre indicar a fonte em linguagem simples (sem termos tecnicos)
- Usar cores: verde (acima da media), amarelo (na media), vermelho (abaixo)
- Zero ingles: "km por litro", nunca "fuel efficiency"

---

## 4. Como os Concorrentes Fazem

### 4.1 Softwares Brasileiros

| Software | Metodo Principal | Observacoes |
|----------|-----------------|-------------|
| **Sofit** | Por abastecimento + media por veiculo/condutor | Integra com cartoes de combustivel. Foco em preco/litro e custo/km |
| **TruckPad** | Por viagem | Foco em "combustivel gasto por viagem" e "consumo por km rodado" |
| **Infleet** | Por periodo + tabela de referencia | Publica benchmarks por categoria de caminhao. Recomenda telemetria |
| **Prolog App** | Media movel | Foco em historico para detectar desvios. Recomenda analise mensal |
| **FrotaControl** | Por abastecimento | Registro de odometro a cada abastecimento |
| **Edenred Mobilidade** | Automatizado via cartao | Integra com rede de postos, dados automaticos de litros e valor |

### 4.2 Softwares Internacionais

| Software | Metodo Principal | Observacoes |
|----------|-----------------|-------------|
| **Fleetio** | Por abastecimento consecutivo | Calcula entre registros consecutivos. Exige odometro em cada registro. Primeiro registro = baseline |
| **Simply Fleet** | Por abastecimento + comparativo | Calcula MPG/km-L por veiculo. Gera relatorios filtrados por motorista, local, periodo |
| **Samsara** | Telemetria + por viagem | Usa dados de CAN bus. Consumo por viagem em tempo real |
| **Webfleet** | Telemetria | Integra com FMS do veiculo para dados precisos |
| **Pulpo** | Media movel por periodo | "Quanto maior a faixa de tempo, mais preciso o resultado" |

### 4.3 Padrao da Industria

O consenso da industria e:

1. **Metodo ideal:** Tanque cheio a tanque cheio com odometro (maior precisao)
2. **Metodo pratico para frotas:** Media movel por periodo (mais resiliente a dados faltantes)
3. **Tendencia moderna:** Telemetria automatica (elimina erro humano, mas requer hardware)
4. **Para SaaS sem telemetria:** Combinar dados de viagem + abastecimento manual com fallbacks inteligentes

O FrotaViva se encaixa no cenario 4: SaaS sem telemetria, dependente de input manual do motorista/dono.

---

## 5. Metricas Derivadas (Alem do km/L)

Alem do km/L puro, o FrotaViva deve calcular estas metricas para o BI (ja parcialmente cobertas pelas views existentes):

| Metrica | Formula | Utilidade | View Existente? |
|---------|---------|-----------|-----------------|
| **km/L por viagem** | (km_chegada - km_saida) / litros | Identificar viagens anomalas | Nao (propor) |
| **km/L por caminhao** | km_total / litros_total (periodo) | Ranking de eficiencia da frota | Sim: `vw_custo_por_caminhao` (parcial) |
| **km/L por motorista** | idem, agrupado por motorista | Identificar motoristas eficientes | Nao (propor) |
| **R$/km** | total_combustivel / total_km | Custo por km rodado | Nao (propor) |
| **Custo por viagem** | SUM(gastos WHERE viagem_id) | Rentabilidade da viagem | Proposto em FR-BI-1 |
| **Preco medio/litro por UF** | AVG(valor/litros) por uf | Onde combustivel e mais barato | Sim: `vw_media_combustivel_regiao` |
| **Tendencia de consumo** | km/L mensal ao longo do tempo | Detectar degradacao mecanica | Nao (propor) |

### 5.1 View SQL Proposta: km/L por Viagem

```sql
-- REFERENCIA: nao implementar, apenas documentacao
CREATE OR REPLACE VIEW vw_km_por_litro_viagem AS
SELECT
  v.id AS viagem_id,
  v.empresa_id,
  v.motorista_id,
  v.caminhao_id,
  v.origem,
  v.destino,
  v.km_saida,
  v.km_chegada,
  (v.km_chegada - v.km_saida) AS km_percorridos,
  ROUND(SUM(g.litros)::numeric, 1) AS total_litros,
  CASE
    WHEN SUM(g.litros) > 0 AND v.km_chegada > v.km_saida
    THEN ROUND(
      (v.km_chegada - v.km_saida)::numeric / SUM(g.litros)::numeric,
      2
    )
    ELSE NULL
  END AS km_por_litro,
  CASE
    WHEN SUM(g.litros) > 0 AND v.km_chegada > v.km_saida
    THEN 'historico_viagem'
    ELSE 'dados_insuficientes'
  END AS fonte,
  COUNT(g.id) AS qtd_abastecimentos,
  v.data_saida,
  v.data_chegada_real
FROM viagem v
LEFT JOIN gasto g ON g.viagem_id = v.id
  AND g.litros IS NOT NULL
  AND g.litros > 0
WHERE v.status = 'concluida'
  AND v.km_saida IS NOT NULL
  AND v.km_chegada IS NOT NULL
  AND v.km_chegada > v.km_saida
GROUP BY v.id, v.empresa_id, v.motorista_id, v.caminhao_id,
         v.origem, v.destino, v.km_saida, v.km_chegada,
         v.data_saida, v.data_chegada_real;
```

---

## 6. Riscos e Mitigacoes

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|--------------|---------|-----------|
| Motorista nao registra litros | Alta (inicio) | km/L incalculavel por viagem | Camada 2/3 do hibrido + UX educativa |
| Motorista erra odometro | Media | Calculo distorcido | Sanity check 1.0-5.0 km/L + alerta |
| Abastecimento fora de viagem | Alta | Litros nao vinculados a viagem | Permitir vincular gasto a viagem retroativamente |
| km_saida/km_chegada nao preenchidos | Media (inicio) | Cai para camada 2 | Tornar km mais visivel no form de viagem |
| Variacao carregado vs vazio | Inerente | Mesma rota, consumo diferente | Futuro: flag "carregado/vazio" na viagem |

---

## 7. Plano de Evolucao

### Fase 1 (Atual — MVP)
- Implementar calculo hibrido (3 camadas) no `consumo-calc.ts`
- View `vw_km_por_litro_viagem` para viagens concluidas
- Exibir km/L no card da viagem concluida
- Fallback 3.0 km/L (ja existe)

### Fase 2 (Com Dados)
- Ranking de km/L por caminhao no dashboard BI
- Ranking de km/L por motorista
- Deteccao de anomalias (consumo 20%+ acima da media da frota)
- Tendencia mensal de consumo

### Fase 3 (Futuro)
- Flag carregado/vazio na viagem para ajustar expectativa
- Integracao com telemetria (CAN bus) para dados automaticos
- Benchmark contra media do setor de cegonheiros (2.0-3.0 km/L)
- Alerta automatico quando consumo degrada (possivel problema mecanico)

---

## 8. Decisao Final

| Aspecto | Decisao |
|---------|---------|
| **Metodo principal** | Hibrido (Opcao D) |
| **Camada 1** | Por viagem (km_chegada - km_saida) / litros |
| **Camada 2** | Media movel 90 dias por caminhao |
| **Camada 3** | Fallback 3.0 km/L (existente) |
| **Sanity check** | Resultado deve estar entre 1.0 e 5.0 km/L |
| **Transparencia** | Sempre indicar fonte do calculo ao usuario |
| **Exibicao** | Numero + frase simples em PT-BR, sem jargao |
| **View principal** | `vw_km_por_litro_viagem` (nova) |
| **Arquivo de implementacao** | `consumo-calc.ts` (atualizar, ja previsto no PRD) |

---

## Fontes

### Softwares de Gestao de Frotas
- [Sofit — Consumo de Combustivel](https://www.sofit4.com.br/blog/consumo-combustivel/)
- [TruckPad — Como Diminuir Consumo](https://www.truckpad.com.br/blog/como-diminuir-o-consumo-de-combustivel-da-sua-frota/)
- [Fleetio — Fuel Calculations Overview](https://fleetio.helpjuice.com/fuel-calculations-overview)
- [Simply Fleet — Fuel Management](https://www.simplyfleet.app/features/fuel-management-software)
- [Pulpo — Calculating Fleet Fuel Economy](https://blog.getpulpo.com/en-us/blog/calculating-fleet-fuel-economy-to-achieve-better-results)
- [Prolog App — Consumo de Combustivel de Caminhoes](https://prologapp.com/blog/consumo-de-combustivel-de-caminhoes/)

### Benchmarks de Consumo
- [Infleet — Tabela de Consumo por Categoria](https://infleet.com.br/blog/tabela-consumo-combustivel-caminhoes/)
- [Hivecloud — Quantos km com 1 litro de diesel](https://www.hivecloud.com.br/post/quantos-km-faz-um-caminhao-com-1-litro-de-diesel/)
- [Sem Parar — Consumo de Combustivel de Caminhao](https://blog.sempararempresas.com.br/veiculos/calcular-consumo-de-combustivel-de-caminhao)
- [Frete com Lucro — Consumo de Combustivel](https://fretecomlucro.com.br/consumo-de-combustivel/)

### Metodologias de Calculo
- [Contele Rastreador — Calculo do Consumo Medio](https://blog.contelerastreador.com.br/calculo-consumo-medio-combustivel/)
- [Texaco — Calculo de Combustivel Passo a Passo](https://blog.texaco.com.br/ursa/calculo-de-combustivel/)
- [Samsara — Fuel Management System Guide](https://www.samsara.com/guides/fuel-management-system)
- [Webfleet — Fleet Fuel Consumption](https://www.webfleet.com/en_ae/webfleet/fleet-management/fuel-management/fleet-fuel-consumption/)

### Ferramentas Internacionais
- [Fleetio — Fuel Management Software](https://www.fleetio.com/solutions/fuel-management-software)
- [Simply Fleet — Fleet Fuel Efficiency Guide](https://www.simplyfleet.app/blog/a-comprehensive-guide-on-understanding-fleet-fuel-efficiency)
- [Lytx — Fleet Fuel Management](https://www.lytx.com/guide/fleet-fuel-management-system)
- [IntelliShift — Fuel Management Software](https://intellishift.com/products/fleet-analytics/fuel-management-software/)
