/**
 * Types for relatorio por motorista.
 * Story 23.5 — RPC relatorio_motorista_periodo
 */

export interface RelatorioMotoristaComprovante {
  storage_path: string
  url_signed: string | null
}

export interface RelatorioMotoristaViagem {
  id: string
  data_saida: string
  data_chegada_real: string | null
  origem: string
  destino: string
  km_calculado: number | null
  valor_total_centavos: number
  percentual_pagamento: number
  pagamento_centavos: number
  status: string
  caminhao_placa: string
  caminhao_modelo: string
  comprovantes: RelatorioMotoristaComprovante[]
}

export interface RelatorioMotoristaHeader {
  motorista_nome: string
  motorista_cpf: string
  empresa_nome: string
  periodo_inicio: string
  periodo_fim: string
  total_viagens: number
  total_km_calculado: number
  total_valor_bruto_centavos: number
  total_pagamento_centavos: number
}

export interface RelatorioMotoristaRanking {
  posicao: number
  total_motoristas: number
  metrica: string
}

export interface RelatorioMotoristaCaminhao {
  placa: string
  modelo: string
}

export interface RelatorioMotoristaResult {
  header: RelatorioMotoristaHeader
  viagens: RelatorioMotoristaViagem[]
  caminhoes_usados: RelatorioMotoristaCaminhao[]
  dias_trabalhados: number
  dias_ociosos: number
  ranking_frota: RelatorioMotoristaRanking
}

export interface RelatorioMotoristaActionResult {
  success: boolean
  error?: string
  status?: number
  data?: RelatorioMotoristaResult
}

// =============================================================================
// Types for relatorio por caminhao.
// Story 23.6 — RPC relatorio_caminhao_periodo
//
// NOTE: proximos_alertas omitido — depende de Story 18.1 (Draft).
// Campos ipva_ano_referencia, doc_vencimento, proxima_revisao_km
// NAO existem na tabela caminhao ate que 18.1 seja implementada.
// =============================================================================

export interface RelatorioCaminhaoViagem {
  id: string
  data_saida: string
  data_chegada_real: string | null
  origem: string
  destino: string
  km_calculado: number | null
  valor_total_centavos: number
  status: string
  motorista_nome: string
}

export interface RelatorioCaminhaoHeader {
  caminhao_placa: string
  caminhao_modelo: string
  empresa_nome: string
  periodo_inicio: string
  periodo_fim: string
  total_viagens: number
  km_total_calculado: number
  receita_total_centavos: number
  custo_total_centavos: number
  custo_por_km_centavos: number | null
  margem_absoluta_centavos: number
  margem_percentual: number | null
}

export interface RelatorioCaminhaoCustos {
  combustivel_centavos: number
  manutencao_centavos: number
  pedagio_centavos: number
}

export interface RelatorioCaminhaoMotorista {
  nome: string
  cpf_mascarado: string
  total_viagens: number
  km_total_calculado: number
}

export interface RelatorioCaminhaoComparativo {
  posicao_receita: number
  posicao_margem: number
  total_caminhoes: number
}

export interface RelatorioCaminhaoResult {
  header: RelatorioCaminhaoHeader
  viagens: RelatorioCaminhaoViagem[]
  motoristas_que_rodaram: RelatorioCaminhaoMotorista[]
  custos_diretos: RelatorioCaminhaoCustos
  comparativo_frota: RelatorioCaminhaoComparativo
  dias_em_rota: number
  dias_parado: number
}

export interface RelatorioCaminhaoActionResult {
  success: boolean
  error?: string
  status?: number
  data?: RelatorioCaminhaoResult
}
