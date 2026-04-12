import { SupabaseClient } from '@supabase/supabase-js';
import {
  createAuthClient,
  getMyEmpresaIds,
  TEST_PASSWORD,
  TEST_USERS,
} from './setup';

// All tests are READ-ONLY — never insert or delete data.
// Timeout generoso para chamadas de rede ao Supabase remoto.
jest.setTimeout(30_000);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Asserts every row.empresa_id belongs to the given set of allowed ids. */
function assertAllBelongTo(
  rows: Array<{ empresa_id: string }>,
  allowedIds: string[],
  _table: string,
) {
  for (const row of rows) {
    expect(allowedIds).toContain(row.empresa_id);
  }
  // Extra: none should have an empresa_id outside the allowed set
  const foreign = rows.filter((r) => !allowedIds.includes(r.empresa_id));
  expect(foreign).toHaveLength(0);
}

/** Asserts that NO row from `rows` has empresa_id in the forbidden set. */
function assertNoneBelongTo(
  rows: Array<{ empresa_id: string }>,
  forbiddenIds: string[],
  table: string,
) {
  const leaked = rows.filter((r) => forbiddenIds.includes(r.empresa_id));
  if (leaked.length > 0) {
    throw new Error(
      `RLS LEAK em "${table}": encontrou ${leaked.length} row(s) com empresa_id de outro tenant: ${JSON.stringify(leaked.map((r) => r.empresa_id))}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('RLS Cross-Tenant Isolation', () => {
  let clientDono1: SupabaseClient;
  let clientDono2: SupabaseClient;
  let clientMot1: SupabaseClient;

  let empresaIdsDono1: string[];
  let empresaIdsDono2: string[];

  beforeAll(async () => {
    // Authenticate all test users in parallel
    [clientDono1, clientDono2, clientMot1] = await Promise.all([
      createAuthClient(TEST_USERS.dono1, TEST_PASSWORD),
      createAuthClient(TEST_USERS.dono2, TEST_PASSWORD),
      createAuthClient(TEST_USERS.mot1emp1, TEST_PASSWORD),
    ]);

    // Fetch empresa_ids for each owner
    [empresaIdsDono1, empresaIdsDono2] = await Promise.all([
      getMyEmpresaIds(clientDono1),
      getMyEmpresaIds(clientDono2),
    ]);

    // Sanity: each owner should have empresas and they should NOT overlap
    expect(empresaIdsDono1.length).toBeGreaterThan(0);
    expect(empresaIdsDono2.length).toBeGreaterThan(0);

    const overlap = empresaIdsDono1.filter((id) =>
      empresaIdsDono2.includes(id),
    );
    expect(overlap).toHaveLength(0);
  });

  afterAll(async () => {
    await Promise.all([
      clientDono1.auth.signOut(),
      clientDono2.auth.signOut(),
      clientMot1.auth.signOut(),
    ]);
  });

  // -----------------------------------------------------------------------
  // viagem
  // -----------------------------------------------------------------------
  describe('viagem', () => {
    it('dono1 não vê viagens de empresa do dono2', async () => {
      const { data, error } = await clientDono1
        .from('viagem')
        .select('id, empresa_id');

      expect(error).toBeNull();
      assertNoneBelongTo(data ?? [], empresaIdsDono2, 'viagem');
    });

    it('dono1 vê apenas viagens de suas próprias empresas', async () => {
      const { data, error } = await clientDono1
        .from('viagem')
        .select('id, empresa_id');

      expect(error).toBeNull();
      expect(data).not.toBeNull();
      expect(data!.length).toBeGreaterThan(0);
      assertAllBelongTo(data!, empresaIdsDono1, 'viagem');
    });
  });

  // -----------------------------------------------------------------------
  // gasto
  // -----------------------------------------------------------------------
  describe('gasto', () => {
    it('dono1 não vê gastos de empresa do dono2', async () => {
      const { data, error } = await clientDono1
        .from('gasto')
        .select('id, empresa_id');

      expect(error).toBeNull();
      assertNoneBelongTo(data ?? [], empresaIdsDono2, 'gasto');
    });

    it('dono1 vê gastos de suas próprias empresas', async () => {
      const { data, error } = await clientDono1
        .from('gasto')
        .select('id, empresa_id');

      expect(error).toBeNull();
      expect(data).not.toBeNull();
      expect(data!.length).toBeGreaterThan(0);
      assertAllBelongTo(data!, empresaIdsDono1, 'gasto');
    });
  });

  // -----------------------------------------------------------------------
  // motorista
  // -----------------------------------------------------------------------
  describe('motorista', () => {
    it('dono1 não vê motoristas de empresa do dono2', async () => {
      const { data, error } = await clientDono1
        .from('motorista')
        .select('id, empresa_id');

      expect(error).toBeNull();
      assertNoneBelongTo(data ?? [], empresaIdsDono2, 'motorista');
    });

    it('motorista não vê motoristas de outra empresa', async () => {
      const { data, error } = await clientMot1
        .from('motorista')
        .select('id, empresa_id');

      expect(error).toBeNull();
      // motorista should only see motoristas from their own empresa(s)
      assertNoneBelongTo(data ?? [], empresaIdsDono2, 'motorista');
    });
  });

  // -----------------------------------------------------------------------
  // caminhao
  // -----------------------------------------------------------------------
  describe('caminhao', () => {
    it('dono1 não vê caminhões de empresa do dono2', async () => {
      const { data, error } = await clientDono1
        .from('caminhao')
        .select('id, empresa_id');

      expect(error).toBeNull();
      assertNoneBelongTo(data ?? [], empresaIdsDono2, 'caminhao');
    });
  });

  // -----------------------------------------------------------------------
  // fechamento
  // -----------------------------------------------------------------------
  describe('fechamento', () => {
    it('dono1 não vê fechamentos de empresa do dono2', async () => {
      const { data, error } = await clientDono1
        .from('fechamento')
        .select('id, empresa_id');

      expect(error).toBeNull();
      assertNoneBelongTo(data ?? [], empresaIdsDono2, 'fechamento');
    });
  });

  // -----------------------------------------------------------------------
  // usuario_empresa
  // -----------------------------------------------------------------------
  describe('usuario_empresa', () => {
    it('dono1 não vê vínculos usuario_empresa do dono2', async () => {
      const { data, error } = await clientDono1
        .from('usuario_empresa')
        .select('id, empresa_id');

      expect(error).toBeNull();
      assertNoneBelongTo(data ?? [], empresaIdsDono2, 'usuario_empresa');
    });
  });
});
