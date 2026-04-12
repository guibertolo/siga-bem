/**
 * Types for the Fechamento (financial closing) domain.
 * Story 4.1 — Fechamento Financeiro por Motorista
 * Story 4.3 — Historico e Consulta de Fechamentos
 *
 * CRITICAL (CON-003): All monetary values are INTEGER centavos.
 * R$ 150,00 = 15000 centavos. NEVER use float/NUMERIC.
 */

import type { FechamentoTipo, FechamentoStatus } from '@/types/database';

/**
 * Fechamento entity as stored in the database.
 * Matches the `fechamento` table schema exactly.
 */
export interface Fechamento {
  id: string;
  empresa_id: string;
  motorista_id: string;
  tipo: FechamentoTipo;
  status: FechamentoStatus;
  periodo_inicio: string;    // ISO date (YYYY-MM-DD)
  periodo_fim: string;       // ISO date (YYYY-MM-DD)
  total_viagens: number;     // centavos
  total_gastos: number;      // centavos
  saldo_motorista: number;   // centavos (viagens - gastos), can be negative
  observacao: string | null;
  fechado_em: string | null;
  fechado_por: string | null;
  pago_em: string | null;
  pago_por: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // joins
  motorista?: { nome: string; cpf?: string };
}

/**
 * Fechamento item (viagem or gasto included in the fechamento).
 */
export interface FechamentoItem {
  id: string;
  fechamento_id: string;
  tipo: 'viagem' | 'gasto' | 'avulso' | 'ajuste';
  referencia_id: string | null;
  descricao: string;
  valor: number;  // centavos
  data: string;   // ISO date
  created_at: string;
}

/**
 * Fechamento list item for table display.
 */
export interface FechamentoListItem {
  id: string;
  motorista_nome: string;
  motorista_cpf?: string;
  tipo: FechamentoTipo;
  status: FechamentoStatus;
  periodo_inicio: string;
  periodo_fim: string;
  total_viagens: number;     // centavos
  total_gastos: number;      // centavos
  saldo_motorista: number;   // centavos
  created_at: string;
}

/**
 * Form data for creating a new fechamento.
 */
export interface FechamentoFormData {
  motorista_id: string;
  tipo: FechamentoTipo;
  periodo_inicio: string;  // YYYY-MM-DD
  periodo_fim: string;     // YYYY-MM-DD
  observacao: string;
}

/**
 * Server action response for fechamento operations.
 */
export interface FechamentoActionResult {
  success: boolean;
  error?: string;
  fieldErrors?: Partial<Record<keyof FechamentoFormData, string>>;
  fechamento?: Fechamento;
}

/**
 * Result from fn_calcular_fechamento database function.
 */
export interface FechamentoCalculo {
  total_viagens: number;   // centavos
  total_gastos: number;    // centavos
  saldo_motorista: number; // centavos
  qtd_viagens: number;
  qtd_gastos: number;
}

/**
 * Fechamento with items (detail view).
 */
export interface FechamentoDetalhado extends Fechamento {
  itens: FechamentoItem[];
}

/**
 * Preview data for creating a new fechamento (AC2, AC3).
 * Contains totals plus line-by-line viagens and gastos for the period.
 */
export interface PreviewFechamento {
  totais: FechamentoCalculo;
  viagens: PreviewViagemItem[];
  gastos: PreviewGastoItem[];
}

export interface PreviewViagemItem {
  id: string;
  origem: string;
  destino: string;
  data_saida: string;
  valor_total: number;           // centavos
  percentual_pagamento: number;
  valor_motorista: number;       // centavos: valor_total * percentual / 100
}

export interface PreviewGastoItem {
  id: string;
  data: string;
  categoria: string;
  descricao: string | null;
  valor: number;                 // centavos
}

/**
 * Filters for the fechamento historico page.
 * All filter values come from URL searchParams.
 */
export interface FechamentoHistoricoFiltros {
  motorista_ids?: string[];
  tipo?: FechamentoTipo | 'todos';
  status?: FechamentoStatus | 'todos';
  periodo_inicio?: string;
  periodo_fim?: string;
  busca?: string;
  pagina: number;
  pageSize: number;
}

/**
 * Financial summary indicators for the historico page header.
 * Only visible to dono/admin roles.
 */
export interface ResumoFinanceiro {
  totalPagoMesCentavos: number;
  totalEmAbertoCentavos: number;
  qtdPendentes: number;
}

/**
 * Result of filtered fechamentos query with pagination metadata.
 */
export interface FechamentoListResult {
  fechamentos: FechamentoListItem[];
  totalCount: number;
}

/**
 * Status label mapping for display.
 */
export const FECHAMENTO_STATUS_LABELS: Record<FechamentoStatus, string> = {
  aberto: 'Aberto',
  fechado: 'Fechado',
  pago: 'Pago',
};

/**
 * Status color mapping for badges (Tailwind classes).
 */
export const FECHAMENTO_STATUS_COLORS: Record<FechamentoStatus, string> = {
  aberto: 'bg-yellow-100 text-yellow-800',
  fechado: 'bg-blue-100 text-blue-800',
  pago: 'bg-green-100 text-green-800',
};

/**
 * Tipo label mapping for display.
 */
export const FECHAMENTO_TIPO_LABELS: Record<FechamentoTipo, string> = {
  semanal: 'Semanal',
  mensal: 'Mensal',
};

/**
 * Valid status transitions.
 * aberto -> fechado (fechar)
 * fechado -> pago (marcar como pago)
 * fechado -> aberto (reabrir)
 * pago -> (none, terminal)
 */
export const FECHAMENTO_STATUS_TRANSITIONS: Record<FechamentoStatus, FechamentoStatus[]> = {
  aberto: ['fechado'],
  fechado: ['pago', 'aberto'],
  pago: [],
};

/**
 * Filter options for motorista select.
 */
export interface FechamentoFilterOptions {
  motoristas: Array<{ id: string; nome: string }>;
}

// ---------------------------------------------------------------------------
// Story 4.2 — PDF Report Types
// ---------------------------------------------------------------------------

/**
 * Viagem item detail for the PDF report.
 */
export interface FechamentoViagemItem {
  id: string;
  valor: number;              // centavos (valor do item no fechamento)
  descricao: string | null;
  viagem: {
    origem: string;
    destino: string;
    data_saida: string;
    valor_total: number;      // centavos (valor total da viagem)
    percentual_pagamento: number;
  } | null;
}

/**
 * Gasto item detail for the PDF report.
 */
export interface FechamentoGastoItem {
  id: string;
  valor: number;              // centavos
  descricao: string | null;
  gasto: {
    data: string;
    descricao: string | null;
    categoria_gasto: {
      nome: string;
    } | null;
  } | null;
}

/**
 * Complete fechamento data for PDF generation.
 * Aggregates all related entities needed for the report.
 */
export interface FechamentoCompleto {
  id: string;
  periodo_inicio: string;
  periodo_fim: string;
  tipo: FechamentoTipo;
  status: FechamentoStatus;
  observacao: string | null;
  fechado_em: string | null;
  motorista: {
    nome: string;
    cpf: string;
  };
  empresa: {
    razao_social: string;
    nome_fantasia: string | null;
    cnpj: string;
  };
  viagens: FechamentoViagemItem[];
  gastos: FechamentoGastoItem[];
  totais: {
    total_viagens: number;    // centavos
    total_gastos: number;     // centavos
    saldo: number;            // centavos
  };
}

/**
 * Server action response for fetching complete fechamento data.
 */
export interface FechamentoCompletoResult {
  success: boolean;
  error?: string;
  data?: FechamentoCompleto;
}
