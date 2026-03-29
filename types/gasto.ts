/**
 * Types for the Gasto (expense) domain.
 * Story 2.1 — CRUD de Gastos com Categorias
 *
 * CRITICAL (CON-003): All monetary values are INTEGER centavos.
 * R$ 150,00 = 15000 centavos. NEVER use float/NUMERIC.
 */

/**
 * Gasto entity as stored in the database.
 * Matches the `gasto` table schema exactly.
 */
export interface Gasto {
  id: string;
  empresa_id: string;
  categoria_id: string;
  motorista_id: string;
  caminhao_id: string | null;
  viagem_id: string | null;
  valor: number;       // centavos: R$ 150,00 = 15000
  data: string;        // ISO date string (YYYY-MM-DD)
  descricao: string | null;
  foto_url: string | null;
  km_registro: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Story 5.1: Fuel detail columns (nullable for backward compatibility)
  litros: number | null;
  tipo_combustivel: 'diesel_s10' | 'diesel_comum' | null;
  posto_local: string | null;
  uf_abastecimento: string | null;
}

/**
 * Gasto with joined names for list display.
 */
export interface GastoListItem {
  id: string;
  data: string;
  valor: number;            // centavos
  descricao: string | null;
  categoria_nome: string;
  motorista_nome: string;
  caminhao_placa: string | null;
}

/**
 * Form data for creating/editing a gasto.
 * Note: `valor` is a string representing BRL (e.g., "150.00" or "150,50").
 * Conversion to centavos happens in the server action.
 */
export interface GastoFormData {
  categoria_id: string;
  motorista_id: string;
  caminhao_id: string;
  valor: string;             // BRL string from UI, converted to centavos on server
  data: string;              // YYYY-MM-DD
  descricao: string;
}

/**
 * Server action response for gasto operations.
 */
export interface GastoActionResult {
  success: boolean;
  error?: string;
  fieldErrors?: Partial<Record<keyof GastoFormData, string>>;
  gasto?: Gasto;
}

/**
 * Filters for the gastos listing page.
 * All filter values come from URL searchParams.
 */
export interface GastoFilters {
  motoristaIds: string[];
  caminhaoIds: string[];
  categoriaIds: string[];
  startDate: string | undefined;  // YYYY-MM-DD
  endDate: string | undefined;    // YYYY-MM-DD
  page: number;
  pageSize: number;
}

/**
 * Extended GastoListItem with foto_url for comprovante icon.
 */
export interface GastoListItemWithFoto extends GastoListItem {
  foto_url: string | null;
  categoria_icone: string | null;
  categoria_cor: string | null;
}

/**
 * Subtotal per category for the summary card.
 */
export interface GastoSubtotalCategoria {
  categoria_nome: string;
  categoria_icone: string | null;
  categoria_cor: string | null;
  total_centavos: number;
  qtd_gastos: number;
}

/**
 * Result of filtered gastos query with totals.
 */
export interface GastoListResult {
  gastos: GastoListItemWithFoto[];
  totalCount: number;
  totalValueCentavos: number;
  subtotaisByCategoria: GastoSubtotalCategoria[];
}

/**
 * Options for filter selects (motorista, caminhao, categoria).
 */
export interface GastoFilterOptions {
  motoristas: Array<{ id: string; nome: string }>;
  caminhoes: Array<{ id: string; placa: string; modelo: string }>;
  categorias: Array<{ id: string; nome: string; icone: string | null; cor: string | null }>;
}
