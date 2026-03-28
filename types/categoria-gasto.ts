/**
 * Types for the CategoriaGasto domain.
 * Story 2.1 — CRUD de Gastos com Categorias
 */

/**
 * CategoriaGasto entity as stored in the database.
 * Matches the `categoria_gasto` table schema exactly.
 */
export interface CategoriaGasto {
  id: string;
  empresa_id: string | null; // NULL = global/default category
  nome: string;
  icone: string | null;
  cor: string | null;
  ativa: boolean;
  ordem: number;
  created_at: string;
  updated_at: string;
}

/**
 * Lightweight option for select inputs.
 */
export interface CategoriaGastoOption {
  id: string;
  nome: string;
  icone: string | null;
  cor: string | null;
}
