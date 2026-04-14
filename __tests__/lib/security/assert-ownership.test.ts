import { assertOwnership, SecurityError } from '@/lib/security/assert-ownership';

// Mock do SupabaseClient
function createMockSupabase(returnData: { data: unknown; error: unknown }) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: () => Promise.resolve(returnData),
          }),
        }),
      }),
    }),
  } as never;
}

describe('assertOwnership', () => {
  it('nao lanca erro quando recurso pertence a empresa', async () => {
    const supabase = createMockSupabase({ data: { id: 'abc-123' }, error: null });

    await expect(
      assertOwnership(supabase, 'viagem', 'abc-123', 'empresa-1'),
    ).resolves.toBeUndefined();
  });

  it('lanca SecurityError quando recurso pertence a outra empresa', async () => {
    const supabase = createMockSupabase({ data: null, error: null });

    await expect(
      assertOwnership(supabase, 'viagem', 'abc-123', 'empresa-2'),
    ).rejects.toThrow(SecurityError);
  });

  it('lanca SecurityError quando id nao existe', async () => {
    const supabase = createMockSupabase({
      data: null,
      error: { message: 'Row not found', code: 'PGRST116' },
    });

    await expect(
      assertOwnership(supabase, 'viagem', 'id-inexistente', 'empresa-1'),
    ).rejects.toThrow(SecurityError);
  });

  it('SecurityError tem mensagem generica "Acesso negado"', async () => {
    const supabase = createMockSupabase({ data: null, error: null });

    await expect(
      assertOwnership(supabase, 'motorista', 'abc', 'emp-1'),
    ).rejects.toThrow('Acesso negado');
  });

  it('SecurityError tem name correto', () => {
    const err = new SecurityError();
    expect(err.name).toBe('SecurityError');
    expect(err.message).toBe('Acesso negado');
  });
});
