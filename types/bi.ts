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
 * KPI summary cards data.
 */
export interface BIKpis {
  totalGastos: number;        // centavos
  totalLancamentos: number;
  gastoMedioPorViagem: number; // centavos
  custoPorKm: number | null;  // centavos per km, null if no km data
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
