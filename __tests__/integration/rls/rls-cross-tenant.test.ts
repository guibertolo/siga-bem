import { SupabaseClient } from '@supabase/supabase-js';
import {
  createAuthClient,
  getMyEmpresaIds,
  TEST_PASSWORD,
  TEST_USERS,
} from './setup';

// Write-isolation tests attempt invalid mutations and assert they are blocked.
// They never persist data: INSERTs expect RLS violation, UPDATEs expect 0 rows.
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
      if (data!.length > 0) {
        assertAllBelongTo(data!, empresaIdsDono1, 'viagem');
      }
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
      if (data!.length > 0) {
        assertAllBelongTo(data!, empresaIdsDono1, 'gasto');
      }
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

  // -----------------------------------------------------------------------
  // combustivel_preco
  // -----------------------------------------------------------------------
  describe('combustivel_preco', () => {
    it('dono1 não vê preços de combustível do dono2', async () => {
      const { data, error } = await clientDono1
        .from('combustivel_preco')
        .select('id, empresa_id');

      expect(error).toBeNull();
      assertNoneBelongTo(data ?? [], empresaIdsDono2, 'combustivel_preco');
    });

    it('motorista não consegue inserir preço de combustível', async () => {
      const { error } = await clientMot1
        .from('combustivel_preco')
        .insert({ preco_litro: 6.5, empresa_id: empresaIdsDono2[0] });

      expect(error).not.toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // viagem_veiculo
  // -----------------------------------------------------------------------
  describe('viagem_veiculo', () => {
    it('dono1 não vê vínculos viagem_veiculo do dono2', async () => {
      const { data, error } = await clientDono1
        .from('viagem_veiculo')
        .select('id, empresa_id');

      expect(error).toBeNull();
      assertNoneBelongTo(data ?? [], empresaIdsDono2, 'viagem_veiculo');
    });
  });

  // -----------------------------------------------------------------------
  // alerta_dispensado
  // -----------------------------------------------------------------------
  describe('alerta_dispensado', () => {
    it('dono1 não vê alertas dispensados do dono2', async () => {
      const { data, error } = await clientDono1
        .from('alerta_dispensado')
        .select('id, empresa_id');

      expect(error).toBeNull();
      assertNoneBelongTo(data ?? [], empresaIdsDono2, 'alerta_dispensado');
    });
  });

  // -----------------------------------------------------------------------
  // foto_chamada
  // -----------------------------------------------------------------------
  describe('foto_chamada', () => {
    it('dono1 não vê fotos de chamada do dono2', async () => {
      const { data, error } = await clientDono1
        .from('foto_chamada')
        .select('id, empresa_id');

      expect(error).toBeNull();
      assertNoneBelongTo(data ?? [], empresaIdsDono2, 'foto_chamada');
    });
  });

  // -----------------------------------------------------------------------
  // view_viagens_ativas
  // -----------------------------------------------------------------------
  describe('view_viagens_ativas', () => {
    it('dono1 não vê viagens ativas do dono2 via view', async () => {
      const { data, error } = await clientDono1
        .from('view_viagens_ativas')
        .select('id, empresa_id');

      expect(error).toBeNull();
      assertNoneBelongTo(data ?? [], empresaIdsDono2, 'view_viagens_ativas');
    });

    it('motorista não vê viagens ativas de outra empresa via view', async () => {
      const { data, error } = await clientMot1
        .from('view_viagens_ativas')
        .select('id, empresa_id');

      expect(error).toBeNull();
      assertNoneBelongTo(data ?? [], empresaIdsDono2, 'view_viagens_ativas');
    });
  });

  // -----------------------------------------------------------------------
  // Write isolation — INSERT bloqueado cross-tenant
  // -----------------------------------------------------------------------
  describe('write isolation — INSERT', () => {
    it('dono1 não consegue inserir viagem com empresa_id do dono2', async () => {
      const { error } = await clientDono1.from('viagem').insert({
        empresa_id: empresaIdsDono2[0],
        origem: 'Teste',
        destino: 'Teste',
        valor_total: 100,
      });

      expect(error).not.toBeNull();
    });

    it('dono1 não consegue inserir gasto com empresa_id do dono2', async () => {
      const { error } = await clientDono1.from('gasto').insert({
        empresa_id: empresaIdsDono2[0],
        descricao: 'Teste',
        valor: 50,
        categoria: 'combustivel',
      });

      expect(error).not.toBeNull();
    });

    it('dono1 não consegue inserir motorista em empresa do dono2', async () => {
      const { error } = await clientDono1.from('motorista').insert({
        empresa_id: empresaIdsDono2[0],
        nome: 'Invasor',
        cpf: '00000000000',
      });

      expect(error).not.toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // Write isolation — UPDATE sem efeito cross-tenant
  // -----------------------------------------------------------------------
  describe('write isolation — UPDATE', () => {
    it('dono1 não modifica viagens do dono2 (0 rows afetadas)', async () => {
      // Busca um id de viagem do dono2 via client do dono2
      const { data: rows } = await clientDono2
        .from('viagem')
        .select('id')
        .limit(1);

      if (!rows || rows.length === 0) return; // sem dados de teste, skip

      const { data } = await clientDono1
        .from('viagem')
        .update({ observacao: 'invasao-rls-test' })
        .eq('id', rows[0].id)
        .select('id');

      expect(data ?? []).toHaveLength(0);
    });

    it('dono1 não modifica caminhões do dono2 (0 rows afetadas)', async () => {
      const { data: rows } = await clientDono2
        .from('caminhao')
        .select('id')
        .limit(1);

      if (!rows || rows.length === 0) return;

      const { data } = await clientDono1
        .from('caminhao')
        .update({ apelido: 'invasao-rls-test' })
        .eq('id', rows[0].id)
        .select('id');

      expect(data ?? []).toHaveLength(0);
    });
  });

  // -----------------------------------------------------------------------
  // Motorista — isolamento de escrita
  // -----------------------------------------------------------------------
  describe('motorista role — write isolation', () => {
    it('motorista não consegue inserir empresa', async () => {
      const { error } = await clientMot1.from('empresa').insert({
        razao_social: 'Empresa Invasora LTDA',
        cnpj: '00000000000000',
      });

      expect(error).not.toBeNull();
    });

    it('motorista não consegue inserir caminhao', async () => {
      const { error } = await clientMot1.from('caminhao').insert({
        empresa_id: empresaIdsDono1[0],
        placa: 'XXX0000',
        modelo: 'Teste',
      });

      expect(error).not.toBeNull();
    });

    it('motorista não vê dados de outra empresa via fechamento', async () => {
      const { data, error } = await clientMot1
        .from('fechamento')
        .select('id, empresa_id');

      expect(error).toBeNull();
      assertNoneBelongTo(data ?? [], empresaIdsDono2, 'fechamento');
    });
  });
});
