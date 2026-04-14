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
