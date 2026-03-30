/**
 * Types for the BI Dashboard domain.
 * Story 5.5 — Dashboard BI Completo de Gastos (somente dono)
 *
 * CRITICAL (CON-003): All monetary values are INTEGER centavos.
 */

/**
 * Filters for BI dashboard queries.
 */
export interface BIFiltros {
  periodoInicio: string;  // YYYY-MM-DD
  periodoFim: string;     // YYYY-MM-DD
  caminhaoId?: string;
  motoristaId?: string;
  categoriaId?: string;
}

/**
 * KPI summary cards data — profit-first metrics.
 * Redesigned: hero cards show lucro/margem/receita/custos (not just gastos).
 */
export interface BIKpis {
  receitaFrete: number;           // centavos — sum of concluded viagens valor_total
  custoTotal: number;             // centavos — sum of all gastos
  lucroBruto: number;             // centavos — receita - custo
  margemPercentual: number;       // 0-100
  viagensConcluidas: number;      // count
  margemMediaViagem: number;      // centavos — average margin per trip
  margemMediaPercentual: number;  // 0-100
}

/**
 * Margin per driver item for the "Margem por Motorista" section.
 * All monetary values in centavos (CON-003).
 */
export interface BIMargemMotoristaItem {
  motoristaId: string;
  nome: string;
  viagensConcluidas: number;
  receitaCentavos: number;
  custoCentavos: number;
  margemCentavos: number;
  margemPercentual: number; // 0-100
}

/**
 * Category breakdown item.
 */
export interface BICategoriaItem {
  categoriaId: string;
  categoriaNome: string;
  categoriaIcone: string | null;
  categoriaCor: string | null;
  total: number;        // centavos
  porcentagem: number;  // 0-100
  qtdLancamentos: number;
}

/**
 * Truck ranking item.
 */
export interface BIRankingCaminhaoItem {
  caminhaoId: string;
  placa: string;
  modelo: string;
  totalGasto: number;       // centavos
  porcentagem: number;      // 0-100
  qtdLancamentos: number;
}

/**
 * Driver ranking item.
 */
export interface BIRankingMotoristaItem {
  motoristaId: string;
  nome: string;
  totalGasto: number;       // centavos
  porcentagem: number;      // 0-100
  qtdLancamentos: number;
}

/**
 * Monthly trend item.
 */
export interface BITendenciaMensalItem {
  mesAno: string;          // "2026-03" format
  mesAnoLabel: string;     // "Mar/2026" display
  total: number;           // centavos
}

/**
 * Filter options for BI selects.
 */
export interface BIFilterOptions {
  caminhoes: Array<{ id: string; placa: string; modelo: string }>;
  motoristas: Array<{ id: string; nome: string }>;
  categorias: Array<{ id: string; nome: string; icone: string | null; cor: string | null }>;
}

// ---------------------------------------------------------------------------
// Story 5.6 — Previsao e Estimativa de Lucro por Viagem
// ---------------------------------------------------------------------------

/**
 * Input parameters for the trip cost estimation simulator.
 */
export interface BIEstimativaParams {
  kmEstimado: number;
  caminhaoId?: string;
  tipoCombustivel: 'diesel_s10' | 'diesel_comum';
}

/**
 * Result of the trip cost estimation.
 * All monetary values in centavos (CON-003).
 */
export interface BIEstimativaResult {
  litrosEstimados: number;
  custoEstimadoCentavos: number;
  consumoKmL: number;
  fonteConsumo: 'historico_real' | 'padrao_cegonheiro';
  precoMedioLitroCentavos: number;
  fontePreco: 'historico' | 'tabela' | 'padrao';
}

/**
 * Parameters for historical route search.
 */
export interface BIHistoricoRotasParams {
  origem: string;
  destino: string;
}

/**
 * A single historical trip in a similar route.
 * All monetary values in centavos (CON-003).
 */
export interface BIHistoricoRotaItem {
  viagemId: string;
  dataSaida: string;
  caminhaoPlaca: string;
  motoristaNome: string;
  kmRealizado: number | null;
  custoTotalCentavos: number;
  custoCombustivelCentavos: number;
  freteCentavos: number | null;        // null if valor_total = 0
  lucroCentavos: number | null;        // frete - custoTotal, null if no frete
}

/**
 * Comparative stats for similar routes.
 * All monetary values in centavos (CON-003).
 */
export interface BIComparativoRota {
  totalViagens: number;
  custoMinCentavos: number;
  custoMaxCentavos: number;
  custoMedioCentavos: number;
}

/**
 * Full result for the historical routes query.
 */
export interface BIHistoricoRotasResult {
  viagens: BIHistoricoRotaItem[];
  comparativo: BIComparativoRota | null;
}

// ---------------------------------------------------------------------------
// BI Eficiencia de Combustivel
// ---------------------------------------------------------------------------

/**
 * Fuel efficiency item per truck or driver.
 * All monetary values in centavos (CON-003).
 */
export interface BIEficienciaItem {
  caminhaoId: string;
  placa: string;
  modelo: string;
  kmPorLitro: number | null;
  kmTotal: number;
  totalLitros: number;
  totalGastoCentavos: number;
  totalAbastecimentos: number;
  /** 'bom' (> 2.5), 'medio' (2.0-2.5), 'ruim' (< 2.0), null if no data */
  classificacao: 'bom' | 'medio' | 'ruim' | null;
  /** Calculation method: 'viagem' (from trip km data), 'estimativa' (fallback), null if no data */
  metodo: 'viagem' | 'estimativa' | null;
}

/**
 * Fuel efficiency item per driver.
 * All monetary values in centavos (CON-003).
 */
export interface BIEficienciaMotoristaItem {
  motoristaId: string;
  nome: string;
  kmPorLitro: number | null;
  kmTotal: number;
  totalLitros: number;
  totalGastoCentavos: number;
  totalAbastecimentos: number;
  classificacao: 'bom' | 'medio' | 'ruim' | null;
  metodo: 'viagem' | 'estimativa' | null;
}

// ---------------------------------------------------------------------------
// BI Manutencoes
// ---------------------------------------------------------------------------

/**
 * Maintenance summary per truck.
 * All monetary values in centavos (CON-003).
 */
export interface BIManutencaoTruckItem {
  caminhaoId: string;
  placa: string;
  modelo: string;
  totalCustoCentavos: number;
  totalEventos: number;
  ultimaManutencao: string | null; // YYYY-MM-DD
  tipos: BIManutencaoTipoItem[];
}

/**
 * Maintenance breakdown by type (category).
 * All monetary values in centavos (CON-003).
 */
export interface BIManutencaoTipoItem {
  categoriaNome: string;
  categoriaIcone: string | null;
  categoriaCor: string | null;
  totalCentavos: number;
  qtdEventos: number;
}
