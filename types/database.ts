/**
 * Database types for the Cegonheiros platform.
 *
 * These are placeholder types. In production, generate with:
 *   npx supabase gen types typescript --project-id <ref> > types/database.ts
 */

export type PlanoTipo = 'free' | 'essencial' | 'profissional' | 'enterprise';
export type UsuarioRole = 'dono' | 'motorista' | 'admin';
export type MotoristaStatus = 'ativo' | 'inativo';
export type TipoCegonha = 'aberta' | 'fechada';
export type ViagemStatus = 'planejada' | 'em_andamento' | 'concluida' | 'cancelada';
export type FechamentoTipo = 'semanal' | 'mensal';
export type FechamentoStatus = 'aberto' | 'fechado' | 'pago';
export type CombustivelTipo = 'diesel_s10' | 'diesel_comum';

export interface Empresa {
  id: string;
  cnpj: string;
  razao_social: string;
  nome_fantasia: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  telefone: string | null;
  email: string | null;
  plano: PlanoTipo;
  max_caminhoes: number;
  ativa: boolean;
  created_at: string;
  updated_at: string;
}

export interface Usuario {
  id: string;
  auth_id: string;
  empresa_id: string | null;
  motorista_id: string | null;
  nome: string;
  email: string;
  telefone: string | null;
  role: UsuarioRole;
  ativo: boolean;
  ultima_empresa_id: string | null;
  selected_empresas: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface UsuarioEmpresa {
  id: string;
  usuario_id: string;
  empresa_id: string;
  role: UsuarioRole;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export type CnhCategoria = 'A' | 'B' | 'C' | 'D' | 'E' | 'AB' | 'AC' | 'AD' | 'AE';

export interface Motorista {
  id: string;
  empresa_id: string;
  usuario_id: string | null;
  nome: string;
  cpf: string;
  cnh_numero: string;
  cnh_categoria: CnhCategoria;
  cnh_validade: string;
  telefone: string | null;
  status: MotoristaStatus;
  observacao: string | null;
  created_at: string;
  updated_at: string;
}

export interface Caminhao {
  id: string;
  empresa_id: string;
  placa: string;
  modelo: string;
  marca: string | null;
  ano: number | null;
  renavam: string | null;
  tipo_cegonha: TipoCegonha;
  capacidade_veiculos: number;
  km_atual: number;
  ativo: boolean;
  observacao: string | null;
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
  categoria_id: string;
  motorista_id: string;
  caminhao_id: string | null;
  viagem_id: string | null;
  valor: number;           // centavos: R$ 150,00 = 15000
  data: string;
  descricao: string | null;
  foto_url: string | null;
  km_registro: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Story 5.1: Fuel detail columns (nullable for backward compatibility)
  litros: number | null;
  tipo_combustivel: CombustivelTipo | null;
  posto_local: string | null;
  uf_abastecimento: string | null;
}

export interface CategoriaGasto {
  id: string;
  empresa_id: string | null;
  nome: string;
  icone: string | null;
  cor: string | null;
  ativa: boolean;
  ordem: number;
  created_at: string;
  updated_at: string;
}
