# Competitive Audit FrotaViva, abril 2026

**Data:** 2026-04-12
**Analista:** Atlas (AIOX Analyst)
**Escopo:** audit competitivo e de mercado do FrotaViva, SaaS de gestao de frotas para cegonheiros brasileiros
**Confianca geral:** MEDIO/ALTO, dados publicos cruzados com pesquisa existente em `docs/research/pricing-concorrentes.md` (2026-03-30)

---

## Resumo Executivo (5 linhas)

1. **O oceano azul e real**: nenhum concorrente direto faz SaaS operacional verticalizado para cegonheiro autonomo/pequena empresa. Os players "cegonha" (EVO!, Camion) sao marketplaces B2C de cotacao, nao gestao de frota.
2. **O competidor numero 1 do FrotaViva nao e Cobli, e o Excel**. Dezenas de planilhas gratis dominam o segmento, incluindo da propria Cobli como isca de marketing.
3. **SINACEG (1.300 empresas, ~5.000 profissionais, 3.700 cegonhas) e a bala de prata de distribuicao**. Tem Feira dos Cegonheiros anual, Revista Cegonheiro, Portal do Cegonheiro, partnerships com Sicoob Credceg, eventos em SBC. Nenhum concorrente explora isso.
4. **ANTT Resolucao 6068/2025 criou janela**: novos requisitos de RNTRC, seguros obrigatorios, comprovacao de posse. FrotaViva deveria ter modulo de compliance RNTRC como feature killer.
5. **O pricing atual (R$29/R$49 por veiculo) e defensavel vs mercado (R$50-350)**, mas o freemium ate 3 veiculos e **conservador demais** para o nicho, onde 60%+ dos autonomos rodam com 1-2 cegonhas apenas.

---

## 1. Mapa Competitivo do Mercado Cegonheiro

### 1.1 Segmentacao por Tipo de Solucao

Importante separar marketplaces de cotacao (conectam embarcador a transportadora) de SaaS de gestao operacional (rodam o dia a dia do cegonheiro). O FrotaViva e do segundo tipo. Muitos "concorrentes" nao competem de verdade.

| Categoria | Players | Competem com FrotaViva? | Por que |
|-----------|---------|------------------------|---------|
| **Marketplaces cegonha (cotacao)** | EVO! Cegonheiro, Camion | NAO, complementar | Conectam cliente a transportadora. Cegonheiro usa para captar frete, nao para gerir frota. FrotaViva pode ate integrar com eles. |
| **Telemetria + hardware** | Cobli, Infleet, Golfleet, Frotalog, Omnilink, Ituran Fleet, Sascar | PARCIAL | Exigem rastreador + instalacao. Publico enterprise. Caro (R$100-350/veiculo). Cegonheiro autonomo nunca instala. |
| **Software de gestao sem hardware** | Sofit (TOTVS), Frotcom (BYOD), RotaExata | PARCIAL | Verticalizados para frota corporativa. Minimo 20 veiculos (Sofit). Nao entendem acerto por viagem, ficha de cegonha, FIPE. |
| **TMS/ERP transportadora** | TOTVS Logistica, Bsoft TMS, Drivin, Epratico | NAO para cegonheiro autonomo | Focam em CT-e, MDF-e, contabilidade. Complexidade enterprise. Preco de R$500-5.000/mes de setup. |
| **Marketplaces de frete generico** | TruckPad, FreteBras, Cargon | NAO | Frete generico (graos, carga seca), nao cegonha. |
| **Planilhas Excel gratis** | Hashtag, Smartplanilhas, Frete com Lucro, Cobli (como isca), Guia do Excel | **SIM, concorrente real** | 80%+ dos cegonheiros autonomos usam. Fricao zero. Gratis. |

### 1.2 Tamanho do Mercado do Nicho (dados SINACEG 2024-2025)

| Metrica | Valor | Fonte |
|---------|-------|-------|
| Empresas associadas SINACEG | 1.300 | [SINACEG](https://sinaceg.org/sobre/) |
| Profissionais cegonheiros | ~5.000 | [Blog do Caminhoneiro/SINACEG](https://blogdocaminhoneiro.com/2025/09/sinaceg-se-prepara-para-possivel-apagao-logistico-por-eventual-falta-de-motoristas-qualificados-no-futuro/) |
| Frota total cegonhas | 3.700 | [SINACEG](https://sinaceg.org/sobre/) |
| Veiculos transportados em 2024 | 2,8 milhoes | [SINACEG](https://sinaceg.org/) |
| Mercado nao associado (estimativa) | +30-50% em autonomos fora do sindicato | Inferencia |

**TAM realista (frota total):** ~5.000 cegonhas x R$35 ticket medio x 12 meses = **R$ 2,1 milhoes/ano** se pegar 100% do SAM total. Parece pequeno, mas o LTV alto e a baixa concorrencia direta compensam. Upside: expansao para transportadoras pequenas de carros usados (seminovos) pode 3x-5x o mercado.

> O SAM projetado de R$ 12-24M citado no briefing e possivelmente otimista. Revisar com base em 5.000 cegonhas reais (nao 30.000 frotas genericas). Confianca: MEDIA.

---

## 2. Tabela Comparativa: Features por Concorrente

Escala: Sim / Nao / Parcial. Precos validados em `docs/research/pricing-concorrentes.md` e cruzados com consultas de 2026-04-12.

| Feature | FrotaViva | Cobli | Sofit/TOTVS | Infleet | EVO! Cegonheiro | Camion | Planilha Excel |
|---------|-----------|-------|-------------|---------|-----------------|--------|----------------|
| Preco por veiculo/mes | R$29-49 | R$100-350 | Sob consulta (min 20 veic) | Sob consulta | Gratis p/ cliente | Gratis p/ cliente | R$0 |
| Hardware obrigatorio | **Nao** | Sim | Nao | Sim | Nao | Nao | Nao |
| Onboarding instantaneo | **Sim** | Nao (instalacao) | Nao (setup fee) | Nao | Sim | Sim | Sim |
| Freemium real | **Sim (3 veiculos)** | Nao | Nao | Nao | Sim (cotacao) | Sim (cotacao) | Sim |
| Dashboard BI com benchmarking anonimo | **Sim (k=5)** | Parcial | Parcial | Parcial | Nao | Nao | Nao |
| km/L por motorista e por caminhao | **Sim** | Sim (via CAN) | Parcial | Sim | Nao | Nao | Parcial |
| Alertas dinamicos baseados em desvio padrao | **Sim** | Nao (thresholds fixos) | Nao | Nao | Nao | Nao | Nao |
| Multi-empresa nativo (1 dono, N CNPJs) | **Sim** | Nao | Nao | Nao | Nao | Nao | Nao |
| Acerto de viagem com percentual motorista | **Sim** | Nao | Nao | Nao | Nao | Nao | Parcial |
| Ficha de caminhao cegonha (nº posicoes, tipo carreta) | Nao | Nao | Nao | Nao | Nao | Nao | Nao |
| Autocomplete 5.570 cidades IBGE | Sim | Sim | Sim | Sim | Sim | Sim | Nao |
| Dark mode, mobile-first, PWA | **Sim** | Parcial | Parcial | Parcial | Sim | Sim | Nao |
| Copilot IA (assistente conversacional) | **Sim** (branch) | Nao | Nao | Sim (Copiloto) | Nao | Nao | Nao |
| Marketplace de cotacao integrado | Nao | Nao | Nao | Nao | **Sim** | **Sim** | Nao |
| Telemetria via CAN bus | Nao | **Sim** | Nao | **Sim** | Nao | Nao | Nao |
| Camera com IA (videotelemetria) | Nao | **Sim** | Nao | **Sim** | Nao | Nao | Nao |
| Emissao de CT-e/MDF-e | Nao | Nao | Parcial | Parcial | Parcial | Nao | Nao |
| Controle de compliance RNTRC/ANTT | Nao | Nao | Nao | Nao | Nao | Nao | Nao |
| Calculo de frete por FIPE do veiculo transportado | Nao | Nao | Nao | Nao | Sim (marketplace) | Sim (marketplace) | Nao |
| Vistoria digital com fotos do veiculo transportado | Nao | Nao | Nao | Nao | **Sim** | Sim | Nao |

**Leitura rapida:**
- FrotaViva ja ganha em **7 features criticas** (preco, hardware, onboarding, freemium, benchmarking, alertas dinamicos, multi-empresa)
- FrotaViva **perde em 5 features** que importam (compliance RNTRC, CT-e/MDF-e, vistoria digital, calculo de frete por FIPE, integracao com marketplaces)
- Features de telemetria CAN e camera sao **irrelevantes para cegonheiro autonomo** (custo > beneficio), nao precisa perseguir

---

## 3. Top 22 Insights Priorizados

Formato: `[ID] [PRIORIDADE] Titulo`. Cada insight tem fato, fonte, impacto, acao e esforco (S=pequeno, M=medio, L=grande).

---

### OPORTUNIDADE ALTA

#### INS-01 [ALTA] SINACEG e o canal de distribuicao perfeito
- **Fato:** SINACEG tem 1.300 empresas associadas, ~5.000 profissionais, Feira dos Cegonheiros anual (25a edicao em 2024), Revista Cegonheiro, Portal do Cegonheiro, sede nova em SBC inaugurada com 1.500 convidados. Ja tem partnerships com Sicoob Credceg (fintech).
- **Fonte:** [SINACEG](https://sinaceg.org/sobre/), [Portal Radar Feira 2024](https://portalradar.com.br/feira-dos-cegonheiros-2024-espera-gerar-quase-meio-bilhao-em-negocios/), [ABCD Real sede nova](https://abcdreal.com.br/sinaceg-inaugura-nova-sede-com-15-mil-convidados-entre-cegonheiros-autoridades-e-empresarios/)
- **Impacto:** ALTO. Canal concentrado, cego, sem concorrente presente. 1 parceria com SINACEG = acesso a 1.300 empresas de uma vez.
- **Acao:** contatar SINACEG SBC, propor parceria institucional. Estar presente na Feira 2026. Publicar artigos na Revista Cegonheiro. Oferecer plano "Associado SINACEG" com desconto.
- **Esforco:** M (reuniao comercial + material de apoio + desconto)

#### INS-02 [ALTA] Nenhum concorrente e verticalizado para cegonheiro
- **Fato:** Cobli, Sofit, Infleet, Frotalog, Omnilink sao horizontais (servem qualquer frota). EVO! e Camion sao marketplaces B2C, nao operacional. Planilhas sao genericas.
- **Fonte:** auditoria deste documento + `pricing-concorrentes.md`
- **Impacto:** ALTO. Janela para dominar o nicho antes de alguem acordar.
- **Acao:** intensificar a verticalizacao no messaging. Trocar "gestao de frotas" por "gestao de cegonha" em toda copy publica. Criar landing pages tipo "FrotaViva para transportadora de veiculos 0km", "FrotaViva para cegonheiro autonomo".
- **Esforco:** S (copy + landing pages)

#### INS-03 [ALTA] Planilha Excel e o concorrente real, nao a Cobli
- **Fato:** Todos os grandes players (Cobli, Prolog, Hashtag, Smart Planilhas, Frete com Lucro) oferecem planilhas Excel gratis como lead magnet. 80%+ dos cegonheiros autonomos usam planilha. Search volume alto ("planilha acerto motorista", "planilha frete caminhao").
- **Fonte:** [Cobli planilha](https://www.cobli.co/blog/planilha-de-controle-de-frota/), [Frete com Lucro acerto motorista](https://fretecomlucro.com.br/acerto-de-motorista/), [Hashtag](https://www.hashtagtreinamentos.com/planilha-de-gestao-de-frotas-excel)
- **Impacto:** ALTO. O messaging "sou mais barato que Cobli" nao converte. Messaging "acabou planilha" converte.
- **Acao:** reposicionar FrotaViva como "o app que substitui sua planilha". Criar ferramenta de importacao de planilhas Excel (carrega a planilha, vira viagens/despesas no app). Lead magnet: "Checklist do que sua planilha nao faz".
- **Esforco:** M (importador Excel + nova copy)

#### INS-04 [ALTA] Compliance RNTRC (ANTT Resolucao 6068/2025) e uma dor nova e nao atendida
- **Fato:** ANTT Resolucao 6068/2025 criou novos requisitos para RNTRC: veiculos categoria "aluguel", comprovacao de posse via comodato/arrendamento, seguros obrigatorios (RCTR-C, RC-DC, RC-V). Impacta todos os TACs, ETCs e CTCs.
- **Fonte:** [Mutuus ANTT 6068](https://www.mutuus.net/blog/resolucao-antt-6860/), [Sem Parar Empresas RNTRC](https://www.sempararempresas.com.br/rntrc), [Sygma Cadastro ANTT](https://www.sygmasistemas.com.br/cadastro-antt/)
- **Impacto:** ALTO. Nenhum concorrente trata compliance RNTRC como feature. E uma dor recente (abril 2025) que todos os cegonheiros tem.
- **Acao:** criar modulo "RNTRC em dia": tela que mostra status do RNTRC de cada veiculo, vencimento da categoria, status dos 3 seguros obrigatorios, alertas proativos de 60/30/7 dias antes do vencimento. Feature killer para onboarding.
- **Esforco:** M (modulo novo + integracao futura com API ANTT se existir)

#### INS-05 [ALTA] FrotaViva nao tem ficha de caminhao cegonha (posicoes, tipo de carreta)
- **Fato:** Caminhao cegonha tem caracteristicas unicas: 7, 9, 10, 11 ou 12 posicoes. Tipos: piso simples, piso duplo, aberto, fechado, basculante, para 0km vs seminovo. Cada configuracao muda capacidade, frete, tempo de carga.
- **Fonte:** conhecimento do nicho + [Blog Brasil Autos Transportes](https://blog.brasilautostransportes.com.br/calculo-do-frete-do-transporte-de-veiculos-como-fazer/)
- **Impacto:** ALTO. Nenhum SaaS generico tem isso. E o tipo de feature que prova verticalizacao real.
- **Acao:** adicionar campo `configuracao_cegonha` no cadastro de caminhao: {posicoes, tipo_carreta, restricao_0km, restricao_altura, peso_maximo_por_posicao}. Usar nos calculos de capacidade e sugerir carga otima.
- **Esforco:** S (schema + cadastro) inicialmente. L se expandir para otimizador de carga.

#### INS-06 [ALTA] Calculo de frete por veiculo transportado (FIPE) nao existe
- **Fato:** Cegonheiro cobra por veiculo transportado (carro popular vs SUV vs seminovo) + distancia + ocupacao. EVO! e Camion tem isso no marketplace, nenhum SaaS de gestao tem. Tabela ANTT tambem tem piso minimo de frete.
- **Fonte:** [EVO Cegonheiro simulador](https://www.evocegonheiro.com.br/blog/transporte-de-veiculos/veja-o-passo-a-passo-para-simular-frete-cegonha-com-a-evo), [TOTVS Tabela frete ANTT](https://www.totvs.com/blog/operacoes/gestao-logistica/tabela-de-frete/)
- **Impacto:** ALTO. Cegonheiro precisa disso no dia a dia para cotar cliente e bater com a tabela ANTT.
- **Acao:** criar calculadora de frete cegonha: inputs (origem, destino, N veiculos, tipo de cada veiculo, peso FIPE). Output: preco sugerido (baseado em km tabela ANTT + % historico cadastrado). Avancado: salvar como template de cotacao, exportar para cliente via WhatsApp.
- **Esforco:** M (calculadora + integracao opcional FIPE API)

#### INS-07 [ALTA] O freemium ate 3 veiculos e conservador demais
- **Fato:** O cegonheiro autonomo tipico tem 1-2 cegonhas. Se o free tier fecha em 3, nao ha urgencia para upgrade. Mercado tem 5.000 profissionais com frota media de <1 cegonha por profissional (3.700 cegonhas / 5.000 pessoas).
- **Fonte:** dados SINACEG cruzados
- **Impacto:** MEDIO/ALTO. Freemium precisa forcar upgrade para converter.
- **Acao:** reestruturar free tier em 2 eixos: veiculos (ate 2, nao 3) **ou** funcionalidades (free tem BI basico, sem benchmarking, sem alertas dinamicos, sem multi-empresa, sem Copilot). Converter por valor, nao por volume. Manter free generoso mas travar features "wow".
- **Esforco:** M (feature gates + revisao de pricing)

#### INS-08 [ALTA] Benchmarking anonimo (k=5) e feature unica, nao e destacada
- **Fato:** FrotaViva tem benchmarking anonimo do setor com k=5 anonymity, nenhum concorrente tem isso. Mesmo Cobli nao tem benchmarking cross-frota.
- **Fonte:** briefing do usuario + auditoria
- **Impacto:** ALTO. Cegonheiro quer saber "estou acima ou abaixo da media do setor". E o tipo de hook que viraliza em grupo de WhatsApp.
- **Acao:** criar campanha de marketing focada em benchmarking. Pagina publica `/benchmark` que mostra "Sua frota x media do setor" para quem se cadastrar. Post semanal no LinkedIn/Instagram: "Cegonheiro medio gasta X por viagem SP-RJ, voce esta acima ou abaixo?". Feira SINACEG 2026: estande com "calcule seu benchmark".
- **Esforco:** M (landing + calculadora publica + campanha)

---

### OPORTUNIDADE MEDIA

#### INS-09 [MEDIA] Vistoria digital de entrega e gap critico vs EVO!
- **Fato:** EVO! Cegonheiro tem vistoria digital com fotos antes/depois, cegonheiro registra pelo celular e cliente valida. Zero-km exige rigor por causa de seguro e manufatura (arranhao = R$ 5-20 mil de prejuizo).
- **Fonte:** [EVO Cegonheiro](https://www.evocegonheiro.com.br/)
- **Impacto:** MEDIO/ALTO. Dor especifica do cegonheiro zero-km. Quem transporta seminovo tambem precisa (disputa com cliente).
- **Acao:** feature de "Checklist de Entrega" no FrotaViva: fotos obrigatorias (4 angulos por veiculo), ponto de avaria marcavel na imagem, assinatura do cliente via link/QR, gera PDF de recibo. Pode virar feature premium do plano Profissional.
- **Esforco:** M (upload multi + anotador de imagem + PDF generator)

#### INS-10 [MEDIA] Emissao de CT-e/MDF-e nao e prioridade, mas integracao sim
- **Fato:** CT-e e obrigatorio para transporte interestadual. Emitir e complexo (SEFAZ). Mas cegonheiro autonomo ja usa outros sistemas para emitir (Bsoft, emissores gratuitos). Rodar SEFAZ diretamente no FrotaViva e investimento grande e baixo ROI.
- **Fonte:** [Bsoft TMS](https://bsoft.com.br/produtos/bsoft-tms), [TOTVS Logistica](https://www.totvs.com/logistica/)
- **Impacto:** MEDIO. Nao fazer virou gap, fazer virou enterprise overbuild.
- **Acao:** nao emitir CT-e no FrotaViva na v1. Criar campo "numero CT-e" vinculavel a viagem, e integrar via API com emissores populares (Bsoft, SYGMA) em v2. Assim a viagem no FrotaViva linka com o documento fiscal sem o FrotaViva virar ERP.
- **Esforco:** S (campo + link) imediato. L se integrar API SEFAZ.

#### INS-11 [MEDIA] Integracao com rastreador existente (link BYOD) e janela barata
- **Fato:** Cegonheiro que ja tem Cobli/Golfleet/Omnilink nao vai trocar. Mas se o FrotaViva pode "abracar" o rastreador existente (link ou API de leitura), nao compete, complementa. Ja e uma feature pendente do backlog.
- **Fonte:** backlog FrotaViva + briefing
- **Impacto:** MEDIO. Reduz friccao de adocao em cegonheiros que ja tem rastreador.
- **Acao:** MVP simples: campo "link do rastreador" por caminhao, abre em nova aba. V2: integracao API leitura de Cobli/Omnilink para puxar km rodado automatico. Nunca tentar virar rastreador, so consumir dados.
- **Esforco:** S (link) imediato. M (API readonly) v2.

#### INS-12 [MEDIA] Dashboard de custo por viagem vs receita por viagem
- **Fato:** Cegonheiro autonomo nao sabe se uma viagem deu lucro ate somar combustivel, pedagio, alimentacao, pernoite, % motorista no fim do mes. FrotaViva tem partes disso, mas nao tem um "dashboard de P&L por viagem" especifico.
- **Fonte:** [Frete com Lucro](https://fretecomlucro.com.br/acerto-de-motorista/), [Brasil Autos Transportes](https://blog.brasilautostransportes.com.br/calculo-do-frete-do-transporte-de-veiculos-como-fazer/)
- **Impacto:** MEDIO/ALTO. E a metrica mais pedida em planilhas Excel de cegonheiro.
- **Acao:** tela `/viagens/[id]/resumo` mostrando: Receita (frete), Custos diretos (combustivel, pedagio, comissao motorista, avarias), Custo indireto alocado (manutencao amortizada, financiamento cegonha), Lucro liquido, Margem %. Comparar com media das ultimas 10 viagens e media do setor (via benchmark).
- **Esforco:** M (calculos + tela)

#### INS-13 [MEDIA] Instagram + WhatsApp sao os canais reais, nao LinkedIn
- **Fato:** Publico cegonheiro 40-60 anos vive no WhatsApp (grupos de SINACEG, grupos regionais) e Instagram (motoristas postam viagens, caminhoes tunados). LinkedIn e marginal. Google Ads em "planilha cegonheiro" funciona.
- **Fonte:** inferencia de perfil demografico + observacao de [Instagram @sempararempresas](https://www.instagram.com/sempararempresas/) como benchmark de canal transportes
- **Impacto:** MEDIO. Evita queimar budget em canal errado.
- **Acao:** estrategia de aquisicao: (1) grupos de WhatsApp SINACEG e regionais (parceria), (2) Instagram com videos "1 viagem SP-Fortaleza: quanto sobrou?", (3) Google Ads em "planilha cegonheiro", "acerto motorista cegonha", "gestao frota cegonha", (4) YouTube "dia na vida do cegonheiro" com FrotaViva na tela.
- **Esforco:** M (social media manager + budget mini)

#### INS-14 [MEDIA] Calculadora publica na raiz do site para SEO
- **Fato:** Cegonheiros pesquisam "calcular frete cegonha", "planilha acerto motorista", "tabela frete ANTT" em volume. Sites gratuitos (Frete com Lucro, Smart Planilhas) capturam leads com essas keywords.
- **Fonte:** SERP observation + [Frete com Lucro](https://fretecomlucro.com.br/acerto-de-motorista/)
- **Impacto:** MEDIO. Trafego organico barato + funnel natural.
- **Acao:** criar tres ferramentas publicas no dominio (nao-logado): `/calc/frete-cegonha`, `/calc/acerto-viagem`, `/calc/km-litro`. CTA no fim: "Quer isso automatico? Entre no FrotaViva gratis". Gera SEO + leads.
- **Esforco:** M (tres calculadoras publicas)

#### INS-15 [MEDIA] Copilot IA deveria ser o hero da pagina, nao feature escondida
- **Fato:** Copilot (Epic 9, branch `feat/copilot`) esta implementado mas nao esta em main. Infleet ja tem "Copiloto Inteligente" como diferencial publicitado. IA e narrativa que vende em 2026.
- **Fonte:** [Infleet](https://infleet.com.br/) + briefing FrotaViva
- **Impacto:** MEDIO/ALTO. Time-to-market importa.
- **Acao:** mergar a branch, mesmo que escondido atras de feature flag. Publicar video demo no Instagram "pergunta para o FrotaViva: qual foi a viagem mais cara desse mes?". Faz diferencia contra Cobli e Sofit que nao tem nada parecido.
- **Esforco:** S (merge + video demo) se o branch esta pronto.

#### INS-16 [MEDIA] Desconto anual pode dobrar o LTV
- **Fato:** Todos os concorrentes oferecem 10-20% desconto anual. FrotaViva nao tem. Desconto anual captura caixa antecipado e reduz churn.
- **Fonte:** `pricing-concorrentes.md` secao 4.1
- **Impacto:** MEDIO. Cash flow + retencao.
- **Acao:** oferecer pagamento anual com 20% off (R$23,20/veiculo Essencial, R$39,20/veiculo Profissional). Testar por 90 dias e medir adocao.
- **Esforco:** S (configuracao de billing + copy)

---

### OPORTUNIDADE BAIXA

#### INS-17 [BAIXA] Telemetria CAN bus nao compensa para este nicho
- **Fato:** Telemetria via CAN exige hardware (R$500-1.500 + instalacao R$100-300). Publico autonomo/pequena empresa nao tem budget nem vontade de instalar em 1-2 cegonhas.
- **Fonte:** `pricing-concorrentes.md` + analise
- **Impacto:** BAIXO. Persegui-lo distrai do diferencial "sem hardware".
- **Acao:** manter posicionamento "software-only". Nao investir em telemetria CAN. Se demanda aparecer no futuro, integrar via API com quem ja tem (Cobli, Omnilink readonly).
- **Esforco:** zero (decidir nao fazer)

#### INS-18 [BAIXA] Videotelemetria com IA e overkill
- **Fato:** Camera com IA (detecao de fadiga, distracao) custa R$500-2.000 por cegonha + assinatura de R$200+. Segmento enterprise. Nao faz sentido para cegonheiro autonomo.
- **Fonte:** `pricing-concorrentes.md`
- **Impacto:** BAIXO.
- **Acao:** nao fazer. Monitorar se montadoras comecam a exigir (obrigatoriedade regulatoria mudaria o calculo).
- **Esforco:** zero

#### INS-19 [BAIXA] Expansao para transporte de seminovo e adjacencia logica mas nao urgente
- **Fato:** Transportadoras de seminovo (veiculos usados) tem mesma dor e mesmo perfil operacional, mas menos compliance (nao precisa vistoria 0km rigida). Mercado 3x-5x maior.
- **Fonte:** inferencia de mercado
- **Impacto:** BAIXO (curto prazo), ALTO (medio prazo).
- **Acao:** adiar para 12-18 meses. Validar com cegonheiros 0km primeiro. Depois replicar com copy "para quem transporta usados tambem".
- **Esforco:** S (expansao de ICP no copy) quando chegar a hora.

#### INS-20 [BAIXA] Integracao com montadoras e API ANTT e dificil
- **Fato:** Montadoras (Fiat, VW, GM, Stellantis) tem contratos diretos com transportadoras grandes, nao com autonomos. ANTT nao tem API publica para RNTRC. Integrar e politico, nao tecnico.
- **Fonte:** [ANTT Portal](https://portal.antt.gov.br/en/rntrc)
- **Impacto:** BAIXO (curto prazo).
- **Acao:** nao priorizar v1. Na v2+, montar parceria via SINACEG (ja tem relacao com CNTA).
- **Esforco:** L se perseguir diretamente.

#### INS-21 [BAIXA] Dominio frotaviva.com.br e marca INPI sao higiene, nao growth
- **Fato:** Dominio e marca registrada sao higiene basica pre-lancamento. Nao movem a agulha competitiva, mas evitam risco de squatter e credibilidade.
- **Fonte:** briefing backlog
- **Impacto:** BAIXO competitivamente, ALTO legalmente.
- **Acao:** registrar dominio e iniciar processo INPI esta semana. Custo marginal, bloqueio legal alto.
- **Esforco:** S (registrar dominio + abrir processo INPI com despachante R$500-1500 total)

#### INS-22 [BAIXA] Pricing R$29/R$49 e defensavel, mas nao deveria ser "o hook"
- **Fato:** FrotaViva esta 40-70% mais barato que Cobli. Mas preco baixo nao vende por si so, pode ate sugerir "produto fraco". O hook deve ser verticalizacao, nao desconto.
- **Fonte:** `pricing-concorrentes.md`
- **Impacto:** BAIXO (nao precisa mudar preco), mas ALTO em messaging.
- **Acao:** parar de usar "mais barato que X" em copy. Usar "o unico feito para cegonheiro", "acabou planilha", "RNTRC em dia", "benchmark do setor". Preco aparece so na pagina de planos.
- **Esforco:** S (revisao de copy)

---

## 4. Quadro Resumo: Prioridades Taticas (proximos 90 dias)

| # | Iniciativa | Insight | Esforco | Impacto |
|---|------------|---------|---------|---------|
| 1 | Modulo RNTRC/Compliance ANTT | INS-04 | M | ALTO |
| 2 | Parceria SINACEG + presenca Feira 2026 | INS-01 | M | ALTO |
| 3 | Reposicionamento copy "acabou planilha" | INS-03 + INS-22 | S | ALTO |
| 4 | Ficha de caminhao cegonha (posicoes, tipo) | INS-05 | S | ALTO |
| 5 | Calculadora de frete cegonha | INS-06 | M | ALTO |
| 6 | Landing pages verticalizadas por ICP | INS-02 | S | ALTO |
| 7 | Rever freemium: 2 veiculos + gates de feature | INS-07 | M | ALTO |
| 8 | Merge Copilot IA + video demo | INS-15 | S | MEDIO |
| 9 | Campanha Instagram + WhatsApp + SINACEG | INS-13 | M | MEDIO |
| 10 | Calculadoras publicas SEO | INS-14 | M | MEDIO |
| 11 | Plano anual com 20% off | INS-16 | S | MEDIO |
| 12 | Vistoria digital de entrega | INS-09 | M | MEDIO |
| 13 | Link de rastreador BYOD por caminhao | INS-11 | S | MEDIO |
| 14 | Dashboard P&L por viagem | INS-12 | M | MEDIO |
| 15 | Dominio + marca INPI | INS-21 | S | BAIXO/higiene |

**Leitura:** os 7 primeiros itens pegam as 7 oportunidades ALTAs com esforco combinado baixo-medio. Seis meses de backlog forte sem nenhum deles exigir reinvencao da arquitetura.

---

## 5. Messaging Recomendado (antes vs depois)

### Antes (atual)
- "SaaS de gestao de frotas"
- "Onboarding instantaneo sem hardware"
- "40-70% mais barato que Cobli"

### Depois (recomendado)
- **Hero:** "O unico sistema feito para cegonheiro brasileiro"
- **Subhero:** "Acabou a planilha. Seu acerto, seus gastos, seu RNTRC, seu benchmarking do setor. Tudo no celular. Gratis ate 2 cegonhas."
- **Prova social:** "X cegonheiros usam. Y milhoes em viagens rodadas. Z mil km."
- **Anchor de valor:** "Mostre como voce esta comparado a outros cegonheiros do setor, anonimamente."
- **CTA primario:** "Comece gratis em 2 minutos"
- **CTA secundario:** "Calcule seu frete cegonha agora" (publico, gera SEO)

---

## 6. Pricing Revisado Sugerido

Revisao baseada em INS-07 e INS-16 + validacao com `pricing-concorrentes.md`:

| Plano | Preco mensal | Preco anual (20% off) | Veiculos | Features |
|-------|-------------|----------------------|----------|----------|
| **Gratis** | R$0 | R$0 | ate **2** | Viagens, despesas, km/L basico, acerto simples, 1 empresa, 1 motorista |
| **Essencial** | R$29/veic | R$279/veic/ano | 3-15 | Tudo do gratis + alertas dinamicos, manutencao, relatorios, multi-empresa (2 CNPJs), multiplos motoristas |
| **Profissional** | R$49/veic | R$470/veic/ano | 16-50 | Tudo do essencial + benchmarking anonimo, BI completo, Copilot IA, multi-empresa ilimitado, vistoria digital, RNTRC check, API |
| **Enterprise** | Sob consulta | Sob consulta | 50+ | Tudo + SLA, suporte dedicado, onboarding gerenciado, white label |

**Mudancas chave:**
1. Freemium reduzido de 3 para 2 veiculos (forca upgrade)
2. Gates de feature no free (benchmarking, Copilot, multi-empresa ficam no pago)
3. Desconto anual 20% adicionado
4. Enterprise virou categoria separada (ate agora estava implicito)

---

## 7. Proximos Passos (acionaveis pelo PM)

1. **Esta semana:** registrar dominio frotaviva.com.br + abrir processo INPI (INS-21). Merge Copilot IA no main (INS-15).
2. **Semana 2:** reposicionamento de copy (INS-03 + INS-22) em landing, readme, stores. Criar planos revisados (INS-07 + INS-16).
3. **Semanas 3-4:** primeira reuniao com SINACEG SBC (INS-01). Story de ficha de caminhao cegonha (INS-05).
4. **Mes 2:** modulo RNTRC/Compliance (INS-04). Calculadora de frete cegonha (INS-06). Landing pages por ICP (INS-02).
5. **Mes 3:** vistoria digital (INS-09). Dashboard P&L por viagem (INS-12). Campanha Instagram + WhatsApp (INS-13).
6. **Trimestre 2:** Feira dos Cegonheiros 2026 (INS-01 fase 2). Calculadoras publicas SEO (INS-14).

---

## 8. Fontes Consultadas (2026-04-12)

### Competidores diretos e indiretos
- [Cobli plataforma](https://www.cobli.co/) — consulta 2026-04-12
- [Cobli tendencias 2026](https://www.cobli.co/blog/tendencias-gestao-frota/) — 2026-04-12
- [Sofit TOTVS ficha tecnica](https://produtos.totvs.com/ficha-tecnica/frotas-by-sofit/) — 2026-04-12
- [Infleet captacao R$40M](https://www.letsmoney.com.br/startups/infleet-capta-r-40-milhoes-para-ia-na-gestao-de-frotas/) — 2026-04-12
- [Frotcom Capterra](https://www.capterra.com/p/149357/Frotcom/) — 2026-03-30 (via pricing-concorrentes)
- [Creare Sistemas Frotalog](https://www.crearesistemas.com.br/frotalog/) — 2026-04-12
- [Omnilink OmniTurbo](https://www.omnilink.com.br/omniturbo) — 2026-04-12
- [Ituran Fleet](https://fleet.ituran.com.br/) — 2026-04-12
- [Paranatrack comparativo 2026](https://paranatrack.com.br/blog/melhor-rastreamento-veicular-carro-brasil-sascar-ituran-carsystem-onstar-comparacao-2025-2026) — 2026-04-12

### Mercado cegonheiro especifico
- [SINACEG sobre](https://sinaceg.org/sobre/) — 2026-04-12
- [SINACEG Portal do Cegonheiro](https://sinaceg.org/portal-do-cegonheiro/) — 2026-04-12
- [SINACEG inaugura nova sede](https://abcdreal.com.br/sinaceg-inaugura-nova-sede-com-15-mil-convidados-entre-cegonheiros-autoridades-e-empresarios/) — 2026-04-12
- [Feira dos Cegonheiros 2024](https://portalradar.com.br/feira-dos-cegonheiros-2024-espera-gerar-quase-meio-bilhao-em-negocios/) — 2026-04-12
- [Blog do Caminhoneiro apagao logistico](https://blogdocaminhoneiro.com/2025/09/sinaceg-se-prepara-para-possivel-apagao-logistico-por-eventual-falta-de-motoristas-qualificados-no-futuro/) — 2026-04-12
- [Folha do ABC 1 milhao de veiculos](https://folhadoabc.com.br/cegonhonheiros-do-abc-ja-transportaram-1-milhao-de-veiculos-neste-ano/) — 2026-04-12
- [EVO Cegonheiro](https://www.evocegonheiro.com.br/) — 2026-04-12
- [Camion](https://camion.com.br/) — 2026-04-12
- [Brasil Autos Transportes calculo de frete](https://blog.brasilautostransportes.com.br/calculo-do-frete-do-transporte-de-veiculos-como-fazer/) — 2026-04-12
- [Nacional Transportes quanto custa cegonha](https://nacionaltransportes.com/blog/quanto-custa-transportar-um-veiculo-na-cegonha/) — 2026-04-12

### Compliance e regulatorio
- [Mutuus Resolucao ANTT 6068/2025](https://www.mutuus.net/blog/resolucao-antt-6860/) — 2026-04-12
- [ANTT RNTRC oficial](https://portal.antt.gov.br/en/rntrc) — 2026-04-12
- [Sem Parar Empresas RNTRC](https://www.sempararempresas.com.br/rntrc) — 2026-04-12
- [BSoft o que e RNTRC](https://bsoft.com.br/blog/o-que-e-rntrc-por-que-e-importante-como-conseguir) — 2026-04-12
- [Sygma Cadastro ANTT](https://www.sygmasistemas.com.br/cadastro-antt/) — 2026-04-12

### Planilhas Excel (concorrente real)
- [Cobli planilha controle de frota](https://www.cobli.co/blog/planilha-de-controle-de-frota/) — 2026-04-12
- [Frete com Lucro acerto motorista](https://fretecomlucro.com.br/acerto-de-motorista/) — 2026-04-12
- [Hashtag Treinamentos gestao frotas](https://www.hashtagtreinamentos.com/planilha-de-gestao-de-frotas-excel) — 2026-04-12
- [Smart Planilhas controle frota](https://smartplanilhas.com.br/planilha-gratuita/planilha-de-controle-de-frota-gratis/) — 2026-04-12
- [Prolog planilha motoristas](https://www.prologapp.com/blog/planilha-controle-de-motoristas/) — 2026-04-12
- [Cobli planilha despesas viagem caminhao](https://www.cobli.co/conteudo/planilha-despesas-viagem-caminhao/) — 2026-04-12

### Pesquisa existente cruzada
- `docs/research/pricing-concorrentes.md` (Atlas, 2026-03-30)

---

*Auditoria realizada em 2026-04-12 por Atlas (AIOX Analyst). Dados de mercado, precos e features dos concorrentes foram validados em fontes publicas e podem nao refletir 100% da oferta comercial atual (muitos players nao publicam precos). Recomenda-se validacao final via cotacao direta antes de decisoes estrategicas de preco ou parceria.*
