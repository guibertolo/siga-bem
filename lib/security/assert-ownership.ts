import type { SupabaseClient } from '@supabase/supabase-js';

export class SecurityError extends Error {
  constructor(message = 'Acesso negado') {
    super(message);
    this.name = 'SecurityError';
  }
}

/**
 * Verifica se um recurso pertence a empresa informada.
 * Lanca SecurityError se o recurso nao existir ou nao pertencer a empresa.
 *
 * Uso: chamar ANTES de qualquer UPDATE/DELETE em server actions.
 * Defesa-em-profundidade: mesmo com RLS ativo, valida no app layer.
 */
export async function assertOwnership(
  supabase: SupabaseClient,
  table: string,
  id: string,
  empresaId: string,
): Promise<void> {
  const { data, error } = await supabase
    .from(table)
    .select('id')
    .eq('id', id)
    .eq('empresa_id', empresaId)
    .single();

  if (error || !data) {
    throw new SecurityError();
  }
}
