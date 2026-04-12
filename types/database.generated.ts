export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      alerta_dispensado: {
        Row: {
          dispensado_em: string
          dispensado_por: string
          empresa_id: string
          entidade: string
          id: string
          tipo: string
        }
        Insert: {
          dispensado_em?: string
          dispensado_por: string
          empresa_id: string
          entidade: string
          id?: string
          tipo: string
        }
        Update: {
          dispensado_em?: string
          dispensado_por?: string
          empresa_id?: string
          entidade?: string
          id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerta_dispensado_dispensado_por_fkey"
            columns: ["dispensado_por"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerta_dispensado_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      benchmarking_setor: {
        Row: {
          atualizado_em: string
          id: number
          mediana_custo_por_km_centavos: number | null
          mediana_kml: number | null
          mediana_manutencoes_por_caminhao: number | null
          mediana_margem_viagem_pct: number | null
          mediana_pct_combustivel_frete: number | null
          tipo_cegonha: Database["public"]["Enums"]["tipo_cegonha"]
          total_caminhoes: number
          total_empresas: number
        }
        Insert: {
          atualizado_em?: string
          id?: number
          mediana_custo_por_km_centavos?: number | null
          mediana_kml?: number | null
          mediana_manutencoes_por_caminhao?: number | null
          mediana_margem_viagem_pct?: number | null
          mediana_pct_combustivel_frete?: number | null
          tipo_cegonha: Database["public"]["Enums"]["tipo_cegonha"]
          total_caminhoes?: number
          total_empresas?: number
        }
        Update: {
          atualizado_em?: string
          id?: number
          mediana_custo_por_km_centavos?: number | null
          mediana_kml?: number | null
          mediana_manutencoes_por_caminhao?: number | null
          mediana_margem_viagem_pct?: number | null
          mediana_pct_combustivel_frete?: number | null
          tipo_cegonha?: Database["public"]["Enums"]["tipo_cegonha"]
          total_caminhoes?: number
          total_empresas?: number
        }
        Relationships: []
      }
      caminhao: {
        Row: {
          ano: number | null
          ativo: boolean
          capacidade_veiculos: number
          created_at: string
          empresa_id: string
          id: string
          km_atual: number
          marca: string | null
          modelo: string
          observacao: string | null
          placa: string
          renavam: string | null
          tipo_cegonha: Database["public"]["Enums"]["tipo_cegonha"]
          updated_at: string
        }
        Insert: {
          ano?: number | null
          ativo?: boolean
          capacidade_veiculos?: number
          created_at?: string
          empresa_id: string
          id?: string
          km_atual?: number
          marca?: string | null
          modelo: string
          observacao?: string | null
          placa: string
          renavam?: string | null
          tipo_cegonha?: Database["public"]["Enums"]["tipo_cegonha"]
          updated_at?: string
        }
        Update: {
          ano?: number | null
          ativo?: boolean
          capacidade_veiculos?: number
          created_at?: string
          empresa_id?: string
          id?: string
          km_atual?: number
          marca?: string | null
          modelo?: string
          observacao?: string | null
          placa?: string
          renavam?: string | null
          tipo_cegonha?: Database["public"]["Enums"]["tipo_cegonha"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "caminhao_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      categoria_gasto: {
        Row: {
          ativa: boolean
          cor: string | null
          created_at: string
          empresa_id: string | null
          icone: string | null
          id: string
          nome: string
          ordem: number
          updated_at: string
        }
        Insert: {
          ativa?: boolean
          cor?: string | null
          created_at?: string
          empresa_id?: string | null
          icone?: string | null
          id?: string
          nome: string
          ordem?: number
          updated_at?: string
        }
        Update: {
          ativa?: boolean
          cor?: string | null
          created_at?: string
          empresa_id?: string | null
          icone?: string | null
          id?: string
          nome?: string
          ordem?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categoria_gasto_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      combustivel_preco: {
        Row: {
          ativo: boolean
          created_at: string
          data_referencia: string
          empresa_id: string
          fonte: string | null
          id: string
          preco_centavos: number
          regiao: string
          tipo: Database["public"]["Enums"]["combustivel_tipo"]
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          data_referencia?: string
          empresa_id: string
          fonte?: string | null
          id?: string
          preco_centavos: number
          regiao?: string
          tipo?: Database["public"]["Enums"]["combustivel_tipo"]
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          data_referencia?: string
          empresa_id?: string
          fonte?: string | null
          id?: string
          preco_centavos?: number
          regiao?: string
          tipo?: Database["public"]["Enums"]["combustivel_tipo"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "combustivel_preco_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      empresa: {
        Row: {
          ativa: boolean
          cep: string | null
          cidade: string | null
          cnpj: string
          created_at: string
          email: string | null
          endereco: string | null
          estado: string | null
          id: string
          max_caminhoes: number
          nome_fantasia: string | null
          plano: Database["public"]["Enums"]["plano_tipo"]
          razao_social: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          ativa?: boolean
          cep?: string | null
          cidade?: string | null
          cnpj: string
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          max_caminhoes?: number
          nome_fantasia?: string | null
          plano?: Database["public"]["Enums"]["plano_tipo"]
          razao_social: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          ativa?: boolean
          cep?: string | null
          cidade?: string | null
          cnpj?: string
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          max_caminhoes?: number
          nome_fantasia?: string | null
          plano?: Database["public"]["Enums"]["plano_tipo"]
          razao_social?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      fechamento: {
        Row: {
          created_at: string
          created_by: string | null
          empresa_id: string
          fechado_em: string | null
          fechado_por: string | null
          id: string
          motorista_id: string
          observacao: string | null
          pago_em: string | null
          pago_por: string | null
          periodo_fim: string
          periodo_inicio: string
          saldo_motorista: number
          status: Database["public"]["Enums"]["fechamento_status"]
          tipo: Database["public"]["Enums"]["fechamento_tipo"]
          total_gastos: number
          total_viagens: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          empresa_id: string
          fechado_em?: string | null
          fechado_por?: string | null
          id?: string
          motorista_id: string
          observacao?: string | null
          pago_em?: string | null
          pago_por?: string | null
          periodo_fim: string
          periodo_inicio: string
          saldo_motorista?: number
          status?: Database["public"]["Enums"]["fechamento_status"]
          tipo: Database["public"]["Enums"]["fechamento_tipo"]
          total_gastos?: number
          total_viagens?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          empresa_id?: string
          fechado_em?: string | null
          fechado_por?: string | null
          id?: string
          motorista_id?: string
          observacao?: string | null
          pago_em?: string | null
          pago_por?: string | null
          periodo_fim?: string
          periodo_inicio?: string
          saldo_motorista?: number
          status?: Database["public"]["Enums"]["fechamento_status"]
          tipo?: Database["public"]["Enums"]["fechamento_tipo"]
          total_gastos?: number
          total_viagens?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fechamento_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fechamento_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fechamento_fechado_por_fkey"
            columns: ["fechado_por"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fechamento_motorista_id_fkey"
            columns: ["motorista_id"]
            isOneToOne: false
            referencedRelation: "motorista"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fechamento_pago_por_fkey"
            columns: ["pago_por"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
        ]
      }
      fechamento_item: {
        Row: {
          created_at: string
          data: string
          descricao: string
          fechamento_id: string
          id: string
          referencia_id: string
          tipo: string
          valor: number
        }
        Insert: {
          created_at?: string
          data: string
          descricao: string
          fechamento_id: string
          id?: string
          referencia_id: string
          tipo: string
          valor: number
        }
        Update: {
          created_at?: string
          data?: string
          descricao?: string
          fechamento_id?: string
          id?: string
          referencia_id?: string
          tipo?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "fechamento_item_fechamento_id_fkey"
            columns: ["fechamento_id"]
            isOneToOne: false
            referencedRelation: "fechamento"
            referencedColumns: ["id"]
          },
        ]
      }
      foto_comprovante: {
        Row: {
          content_type: string | null
          created_at: string
          empresa_id: string
          gasto_id: string
          id: string
          size_bytes: number | null
          storage_path: string
          thumbnail_path: string | null
          uploaded_at: string
        }
        Insert: {
          content_type?: string | null
          created_at?: string
          empresa_id: string
          gasto_id: string
          id?: string
          size_bytes?: number | null
          storage_path: string
          thumbnail_path?: string | null
          uploaded_at?: string
        }
        Update: {
          content_type?: string | null
          created_at?: string
          empresa_id?: string
          gasto_id?: string
          id?: string
          size_bytes?: number | null
          storage_path?: string
          thumbnail_path?: string | null
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "foto_comprovante_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "foto_comprovante_gasto_id_fkey"
            columns: ["gasto_id"]
            isOneToOne: false
            referencedRelation: "gasto"
            referencedColumns: ["id"]
          },
        ]
      }
      gasto: {
        Row: {
          caminhao_id: string | null
          categoria_id: string
          created_at: string
          created_by: string | null
          data: string
          descricao: string | null
          empresa_id: string
          foto_url: string | null
          id: string
          km_registro: number | null
          litros: number | null
          motorista_id: string
          posto_local: string | null
          tipo_combustivel:
            | Database["public"]["Enums"]["combustivel_tipo"]
            | null
          uf_abastecimento: string | null
          updated_at: string
          valor: number
          viagem_id: string | null
        }
        Insert: {
          caminhao_id?: string | null
          categoria_id: string
          created_at?: string
          created_by?: string | null
          data?: string
          descricao?: string | null
          empresa_id: string
          foto_url?: string | null
          id?: string
          km_registro?: number | null
          litros?: number | null
          motorista_id: string
          posto_local?: string | null
          tipo_combustivel?:
            | Database["public"]["Enums"]["combustivel_tipo"]
            | null
          uf_abastecimento?: string | null
          updated_at?: string
          valor: number
          viagem_id?: string | null
        }
        Update: {
          caminhao_id?: string | null
          categoria_id?: string
          created_at?: string
          created_by?: string | null
          data?: string
          descricao?: string | null
          empresa_id?: string
          foto_url?: string | null
          id?: string
          km_registro?: number | null
          litros?: number | null
          motorista_id?: string
          posto_local?: string | null
          tipo_combustivel?:
            | Database["public"]["Enums"]["combustivel_tipo"]
            | null
          uf_abastecimento?: string | null
          updated_at?: string
          valor?: number
          viagem_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_gasto_viagem"
            columns: ["viagem_id"]
            isOneToOne: false
            referencedRelation: "viagem"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_gasto_viagem"
            columns: ["viagem_id"]
            isOneToOne: false
            referencedRelation: "view_viagens_ativas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gasto_caminhao_id_fkey"
            columns: ["caminhao_id"]
            isOneToOne: false
            referencedRelation: "caminhao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gasto_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categoria_gasto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gasto_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gasto_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gasto_motorista_id_fkey"
            columns: ["motorista_id"]
            isOneToOne: false
            referencedRelation: "motorista"
            referencedColumns: ["id"]
          },
        ]
      }
      motorista: {
        Row: {
          cnh_categoria: Database["public"]["Enums"]["cnh_categoria"]
          cnh_numero: string
          cnh_validade: string
          cpf: string
          created_at: string
          empresa_id: string
          id: string
          nome: string
          observacao: string | null
          percentual_pagamento: number | null
          status: Database["public"]["Enums"]["motorista_status"]
          telefone: string | null
          updated_at: string
          usuario_id: string | null
        }
        Insert: {
          cnh_categoria?: Database["public"]["Enums"]["cnh_categoria"]
          cnh_numero: string
          cnh_validade: string
          cpf: string
          created_at?: string
          empresa_id: string
          id?: string
          nome: string
          observacao?: string | null
          percentual_pagamento?: number | null
          status?: Database["public"]["Enums"]["motorista_status"]
          telefone?: string | null
          updated_at?: string
          usuario_id?: string | null
        }
        Update: {
          cnh_categoria?: Database["public"]["Enums"]["cnh_categoria"]
          cnh_numero?: string
          cnh_validade?: string
          cpf?: string
          created_at?: string
          empresa_id?: string
          id?: string
          nome?: string
          observacao?: string | null
          percentual_pagamento?: number | null
          status?: Database["public"]["Enums"]["motorista_status"]
          telefone?: string | null
          updated_at?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "motorista_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "motorista_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
        ]
      }
      motorista_caminhao: {
        Row: {
          ativo: boolean
          caminhao_id: string
          created_at: string
          data_fim: string | null
          data_inicio: string
          empresa_id: string
          id: string
          motorista_id: string
          observacao: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          caminhao_id: string
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          empresa_id: string
          id?: string
          motorista_id: string
          observacao?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          caminhao_id?: string
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          empresa_id?: string
          id?: string
          motorista_id?: string
          observacao?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "motorista_caminhao_caminhao_id_fkey"
            columns: ["caminhao_id"]
            isOneToOne: false
            referencedRelation: "caminhao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "motorista_caminhao_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "motorista_caminhao_motorista_id_fkey"
            columns: ["motorista_id"]
            isOneToOne: false
            referencedRelation: "motorista"
            referencedColumns: ["id"]
          },
        ]
      }
      usuario: {
        Row: {
          ativo: boolean
          auth_id: string
          created_at: string
          email: string
          empresa_id: string | null
          id: string
          motorista_id: string | null
          nome: string
          role: Database["public"]["Enums"]["usuario_role"]
          selected_empresas: string[] | null
          telefone: string | null
          ultima_empresa_id: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          auth_id: string
          created_at?: string
          email: string
          empresa_id?: string | null
          id?: string
          motorista_id?: string | null
          nome: string
          role?: Database["public"]["Enums"]["usuario_role"]
          selected_empresas?: string[] | null
          telefone?: string | null
          ultima_empresa_id?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          auth_id?: string
          created_at?: string
          email?: string
          empresa_id?: string | null
          id?: string
          motorista_id?: string | null
          nome?: string
          role?: Database["public"]["Enums"]["usuario_role"]
          selected_empresas?: string[] | null
          telefone?: string | null
          ultima_empresa_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_usuario_motorista"
            columns: ["motorista_id"]
            isOneToOne: false
            referencedRelation: "motorista"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuario_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuario_ultima_empresa_id_fkey"
            columns: ["ultima_empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      usuario_empresa: {
        Row: {
          ativo: boolean
          created_at: string
          empresa_id: string
          id: string
          role: Database["public"]["Enums"]["usuario_role"]
          updated_at: string
          usuario_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          empresa_id: string
          id?: string
          role?: Database["public"]["Enums"]["usuario_role"]
          updated_at?: string
          usuario_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          empresa_id?: string
          id?: string
          role?: Database["public"]["Enums"]["usuario_role"]
          updated_at?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuario_empresa_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuario_empresa_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
        ]
      }
      viagem: {
        Row: {
          caminhao_id: string
          created_at: string
          created_by: string | null
          data_chegada_prevista: string | null
          data_chegada_real: string | null
          data_saida: string
          destino: string
          editavel_motorista: boolean
          empresa_id: string
          id: string
          km_chegada: number | null
          km_estimado: number | null
          km_saida: number | null
          motorista_id: string
          observacao: string | null
          origem: string
          percentual_pagamento: number
          status: Database["public"]["Enums"]["viagem_status"]
          updated_at: string
          valor_total: number
        }
        Insert: {
          caminhao_id: string
          created_at?: string
          created_by?: string | null
          data_chegada_prevista?: string | null
          data_chegada_real?: string | null
          data_saida: string
          destino: string
          editavel_motorista?: boolean
          empresa_id: string
          id?: string
          km_chegada?: number | null
          km_estimado?: number | null
          km_saida?: number | null
          motorista_id: string
          observacao?: string | null
          origem: string
          percentual_pagamento?: number
          status?: Database["public"]["Enums"]["viagem_status"]
          updated_at?: string
          valor_total?: number
        }
        Update: {
          caminhao_id?: string
          created_at?: string
          created_by?: string | null
          data_chegada_prevista?: string | null
          data_chegada_real?: string | null
          data_saida?: string
          destino?: string
          editavel_motorista?: boolean
          empresa_id?: string
          id?: string
          km_chegada?: number | null
          km_estimado?: number | null
          km_saida?: number | null
          motorista_id?: string
          observacao?: string | null
          origem?: string
          percentual_pagamento?: number
          status?: Database["public"]["Enums"]["viagem_status"]
          updated_at?: string
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "viagem_caminhao_id_fkey"
            columns: ["caminhao_id"]
            isOneToOne: false
            referencedRelation: "caminhao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viagem_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viagem_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viagem_motorista_id_fkey"
            columns: ["motorista_id"]
            isOneToOne: false
            referencedRelation: "motorista"
            referencedColumns: ["id"]
          },
        ]
      }
      viagem_veiculo: {
        Row: {
          chassi: string | null
          cor: string | null
          created_at: string
          empresa_id: string
          id: string
          marca: string | null
          modelo: string
          observacao: string | null
          placa: string | null
          posicao: number | null
          updated_at: string
          viagem_id: string
        }
        Insert: {
          chassi?: string | null
          cor?: string | null
          created_at?: string
          empresa_id: string
          id?: string
          marca?: string | null
          modelo: string
          observacao?: string | null
          placa?: string | null
          posicao?: number | null
          updated_at?: string
          viagem_id: string
        }
        Update: {
          chassi?: string | null
          cor?: string | null
          created_at?: string
          empresa_id?: string
          id?: string
          marca?: string | null
          modelo?: string
          observacao?: string | null
          placa?: string | null
          posicao?: number | null
          updated_at?: string
          viagem_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "viagem_veiculo_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viagem_veiculo_viagem_id_fkey"
            columns: ["viagem_id"]
            isOneToOne: false
            referencedRelation: "viagem"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viagem_veiculo_viagem_id_fkey"
            columns: ["viagem_id"]
            isOneToOne: false
            referencedRelation: "view_viagens_ativas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      view_viagens_ativas: {
        Row: {
          caminhao_id: string | null
          caminhao_placa: string | null
          data_saida: string | null
          destino: string | null
          empresa_id: string | null
          id: string | null
          motorista_id: string | null
          motorista_nome: string | null
          origem: string | null
          percentual_pagamento: number | null
          valor_total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "viagem_caminhao_id_fkey"
            columns: ["caminhao_id"]
            isOneToOne: false
            referencedRelation: "caminhao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viagem_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viagem_motorista_id_fkey"
            columns: ["motorista_id"]
            isOneToOne: false
            referencedRelation: "motorista"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_custo_por_caminhao: {
        Row: {
          caminhao_id: string | null
          empresa_id: string | null
          km_por_litro_estimado: number | null
          modelo: string | null
          placa: string | null
          preco_medio_litro_derivado: number | null
          primeiro_abastecimento: string | null
          total_abastecimentos: number | null
          total_litros: number | null
          total_valor_centavos: number | null
          ultimo_abastecimento: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gasto_caminhao_id_fkey"
            columns: ["caminhao_id"]
            isOneToOne: false
            referencedRelation: "caminhao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gasto_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_custo_por_motorista: {
        Row: {
          empresa_id: string | null
          motorista_id: string | null
          motorista_nome: string | null
          preco_medio_litro_derivado: number | null
          primeiro_abastecimento: string | null
          total_abastecimentos: number | null
          total_litros: number | null
          total_valor_centavos: number | null
          ultimo_abastecimento: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gasto_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gasto_motorista_id_fkey"
            columns: ["motorista_id"]
            isOneToOne: false
            referencedRelation: "motorista"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_gastos_bi: {
        Row: {
          caminhao_id: string | null
          categoria_nome: string | null
          data: string | null
          empresa_id: string | null
          mes_ano: string | null
          motorista_id: string | null
          valor: number | null
          viagem_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_gasto_viagem"
            columns: ["viagem_id"]
            isOneToOne: false
            referencedRelation: "viagem"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_gasto_viagem"
            columns: ["viagem_id"]
            isOneToOne: false
            referencedRelation: "view_viagens_ativas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gasto_caminhao_id_fkey"
            columns: ["caminhao_id"]
            isOneToOne: false
            referencedRelation: "caminhao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gasto_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gasto_motorista_id_fkey"
            columns: ["motorista_id"]
            isOneToOne: false
            referencedRelation: "motorista"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_media_combustivel_regiao: {
        Row: {
          empresa_id: string | null
          preco_max_litro: number | null
          preco_medio_litro: number | null
          preco_min_litro: number | null
          primeira_data: string | null
          tipo_combustivel:
            | Database["public"]["Enums"]["combustivel_tipo"]
            | null
          total_abastecimentos: number | null
          total_litros: number | null
          total_valor_centavos: number | null
          uf_abastecimento: string | null
          ultima_data: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gasto_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      fn_calcular_fechamento: {
        Args: {
          p_motorista_id: string
          p_periodo_fim: string
          p_periodo_inicio: string
        }
        Returns: {
          qtd_gastos: number
          qtd_viagens: number
          saldo_motorista: number
          total_gastos: number
          total_viagens: number
        }[]
      }
      fn_get_empresa_id: { Args: never; Returns: string }
      fn_get_motorista_id: { Args: never; Returns: string }
      fn_get_user_empresas: {
        Args: never
        Returns: {
          cnpj: string
          empresa_id: string
          is_active: boolean
          nome_fantasia: string
          razao_social: string
          role: Database["public"]["Enums"]["usuario_role"]
        }[]
      }
      fn_get_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["usuario_role"]
      }
      fn_refresh_benchmarking: { Args: never; Returns: undefined }
      fn_switch_empresa: { Args: { p_empresa_id: string }; Returns: boolean }
    }
    Enums: {
      cnh_categoria: "A" | "B" | "C" | "D" | "E" | "AB" | "AC" | "AD" | "AE"
      combustivel_tipo: "diesel_s10" | "diesel_comum"
      fechamento_item_tipo: "gasto" | "viagem" | "avulso" | "ajuste"
      fechamento_status: "aberto" | "fechado" | "pago"
      fechamento_tipo: "semanal" | "mensal"
      motorista_status: "ativo" | "inativo"
      plano_tipo: "free" | "essencial" | "profissional" | "enterprise"
      tipo_cegonha: "aberta" | "fechada"
      usuario_role: "dono" | "motorista" | "admin"
      viagem_status: "planejada" | "em_andamento" | "concluida" | "cancelada"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      cnh_categoria: ["A", "B", "C", "D", "E", "AB", "AC", "AD", "AE"],
      combustivel_tipo: ["diesel_s10", "diesel_comum"],
      fechamento_item_tipo: ["gasto", "viagem", "avulso", "ajuste"],
      fechamento_status: ["aberto", "fechado", "pago"],
      fechamento_tipo: ["semanal", "mensal"],
      motorista_status: ["ativo", "inativo"],
      plano_tipo: ["free", "essencial", "profissional", "enterprise"],
      tipo_cegonha: ["aberta", "fechada"],
      usuario_role: ["dono", "motorista", "admin"],
      viagem_status: ["planejada", "em_andamento", "concluida", "cancelada"],
    },
  },
} as const
