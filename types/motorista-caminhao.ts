import type { Motorista } from '@/types/motorista';
import type { Caminhao } from '@/types/caminhao';

/**
 * Motorista-Caminhao junction entity as stored in the database.
 * Matches the `motorista_caminhao` table schema exactly.
 */
export interface MotoristaCaminhao {
  id: string;
  empresa_id: string;
  motorista_id: string;
  caminhao_id: string;
  data_inicio: string;
  data_fim: string | null;
  ativo: boolean;
  observacao: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * MotoristaCaminhao with joined relations for display purposes.
 */
export interface MotoristaCaminhaoWithRelations extends MotoristaCaminhao {
  motorista: Pick<Motorista, 'id' | 'nome' | 'cpf'>;
  caminhao: Pick<Caminhao, 'id' | 'placa' | 'modelo'>;
}

/**
 * Form data for creating a new vinculo.
 * Excludes server-managed fields (id, empresa_id, ativo, timestamps).
 */
export interface MotoristaCaminhaoFormData {
  motorista_id: string;
  caminhao_id: string;
  data_inicio: string;
  observacao: string;
}

/**
 * Server action response for vinculo operations.
 */
export interface VinculoActionResult {
  success: boolean;
  error?: string;
  fieldErrors?: Partial<Record<keyof MotoristaCaminhaoFormData, string>>;
  vinculo?: MotoristaCaminhao;
}

/**
 * List item for vinculo display in tables.
 */
export interface VinculoListItem {
  id: string;
  motorista_nome: string;
  motorista_cpf: string;
  caminhao_placa: string;
  caminhao_modelo: string;
  data_inicio: string;
  data_fim: string | null;
  ativo: boolean;
  observacao: string | null;
}

/**
 * Dropdown option for motorista select.
 */
export interface MotoristaOption {
  id: string;
  nome: string;
  cpf: string;
}

/**
 * Dropdown option for caminhao select.
 */
export interface CaminhaoOption {
  id: string;
  placa: string;
  modelo: string;
}

/**
 * Caminhao with its active motorista vinculos — used by the vinculos dashboard.
 */
export interface CaminhaoComMotorista {
  caminhao_id: string;
  caminhao_placa: string;
  caminhao_modelo: string;
  motoristas: {
    vinculo_id: string;
    motorista_id: string;
    motorista_nome: string;
    motorista_cpf: string;
    data_inicio: string;
    observacao: string | null;
  }[];
}

/**
 * Caminhao without any active vinculo — needs attention.
 */
export interface CaminhaoSemMotorista {
  caminhao_id: string;
  caminhao_placa: string;
  caminhao_modelo: string;
}

/**
 * Dashboard data for the vinculos page.
 */
export interface VinculosDashboardData {
  caminhoesCom: CaminhaoComMotorista[];
  caminhoesSem: CaminhaoSemMotorista[];
  historico: VinculoListItem[];
  contadores: {
    totalVinculados: number;
    totalSemMotorista: number;
    totalEncerrados: number;
  };
  error: string | null;
}
