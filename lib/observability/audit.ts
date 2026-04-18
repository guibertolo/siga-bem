/**
 * Audit logging para Gestor Fase 2.
 *
 * Grava mutacoes (create/update/delete) na tabela audit_log. O dono usa isso
 * pra auditar o que seu gestor (admin) fez. Gestor ve apenas proprios logs.
 *
 * Non-blocking: falha de log nao quebra a acao principal. Apenas warn no console.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export type AuditAcao = 'create' | 'update' | 'delete';

export type AuditEntidade =
  | 'viagem'
  | 'gasto'
  | 'manutencao'
  | 'caminhao'
  | 'motorista'
  | 'usuario'
  | 'empresa'
  | 'fechamento'
  | 'dispensa_alerta';

export interface AuditLogInput {
  supabase: SupabaseClient;
  usuarioId: string;
  usuarioRole: 'dono' | 'admin' | 'motorista';
  usuarioNome: string;
  empresaId: string;
  acao: AuditAcao;
  entidade: AuditEntidade;
  entidadeId?: string | null;
  entidadeDescricao?: string | null;
  valoresAntes?: Record<string, unknown> | null;
  valoresDepois?: Record<string, unknown> | null;
}

/**
 * Grava um evento no audit_log. Non-blocking: nunca lanca, so avisa no console.
 *
 * Uso tipico nas server actions:
 *
 * ```ts
 * const usuario = await getCurrentUsuario();
 * // ... executa a mutacao ...
 * await logAuditEvent({
 *   supabase, usuarioId: usuario.id, usuarioRole: usuario.role,
 *   usuarioNome: usuario.nome, empresaId: viagem.empresa_id,
 *   acao: 'create', entidade: 'viagem', entidadeId: viagem.id,
 *   entidadeDescricao: `${origem} → ${destino}`,
 *   valoresDepois: { origem, destino, valor_total },
 * });
 * ```
 */
export async function logAuditEvent(input: AuditLogInput): Promise<void> {
  try {
    const { error } = await input.supabase.from('audit_log').insert({
      empresa_id: input.empresaId,
      usuario_id: input.usuarioId,
      usuario_role: input.usuarioRole,
      usuario_nome: input.usuarioNome,
      acao: input.acao,
      entidade: input.entidade,
      entidade_id: input.entidadeId ?? null,
      entidade_descricao: input.entidadeDescricao ?? null,
      valores_antes: input.valoresAntes ?? null,
      valores_depois: input.valoresDepois ?? null,
    });

    if (error) {
      // Non-blocking: uma falha de audit nao pode quebrar a acao do usuario
      console.warn('[audit] Failed to insert audit_log:', error.message);
    }
  } catch (err) {
    console.warn(
      '[audit] Exception logging event:',
      err instanceof Error ? err.message : String(err),
    );
  }
}

/**
 * Representa uma entry do audit_log como vem do banco.
 */
export interface AuditLogEntry {
  id: string;
  empresa_id: string;
  usuario_id: string;
  usuario_role: 'dono' | 'admin' | 'motorista';
  usuario_nome: string;
  acao: AuditAcao;
  entidade: AuditEntidade;
  entidade_id: string | null;
  entidade_descricao: string | null;
  valores_antes: Record<string, unknown> | null;
  valores_depois: Record<string, unknown> | null;
  created_at: string;
}
