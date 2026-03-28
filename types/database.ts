/**
 * Database types for the Cegonheiros platform.
 *
 * These are placeholder types. In production, generate with:
 *   npx supabase gen types typescript --project-id <ref> > types/database.ts
 */

export type PlanoTipo = 'free' | 'essencial' | 'profissional' | 'enterprise';
export type UsuarioRole = 'dono' | 'motorista' | 'admin';
export type MotoristaStatus = 'ativo' | 'inativo';
export type ViagemStatus = 'planejada' | 'em_andamento' | 'concluida' | 'cancelada';
export type FechamentoTipo = 'semanal' | 'mensal';
export type FechamentoStatus = 'aberto' | 'fechado' | 'pago';

export interface Empresa {
  id: string;
  nome_fantasia: string;
  razao_social: string;
  cnpj: string;
  telefone: string | null;
  email: string | null;
  plano: PlanoTipo;
  created_at: string;
  updated_at: string;
}

export interface Usuario {
  id: string;
  user_id: string;
  empresa_id: string;
  role: UsuarioRole;
  nome: string;
  created_at: string;
  updated_at: string;
}

export interface Motorista {
  id: string;
  empresa_id: string;
  nome: string;
  cpf: string;
  cnh: string;
  telefone: string | null;
  status: MotoristaStatus;
  foto_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Caminhao {
  id: string;
  empresa_id: string;
  placa: string;
  modelo: string;
  ano: number;
  km_atual: number;
  capacidade: number;
  tipo: string;
  created_at: string;
  updated_at: string;
}

export interface Viagem {
  id: string;
  empresa_id: string;
  motorista_id: string;
  caminhao_id: string;
  origem: string;
  destino: string;
  data_saida: string;
  data_chegada: string | null;
  valor_frete_centavos: number;
  perc_motorista: number;
  status: ViagemStatus;
  veiculos_qtd: number;
  notas: string | null;
  created_at: string;
  updated_at: string;
}

export interface Gasto {
  id: string;
  empresa_id: string;
  viagem_id: string | null;
  motorista_id: string;
  caminhao_id: string | null;
  categoria_id: string;
  descricao: string;
  valor_centavos: number;
  data: string;
  foto_url: string | null;
  created_at: string;
  updated_at: string;
}
