/**
 * Cria a conta do Onessimo (piloto real, semana de testes).
 *
 * Run:
 *   SUPABASE_SERVICE_ROLE_KEY=$(grep SUPABASE_SERVICE_ROLE_KEY .env.local | cut -d= -f2) \
 *   node scripts/seed-onessimo-piloto.js
 *
 * Conta criada:
 *   Email: onessimo@frotaviva.com.br
 *   Senha: 24585458
 *   Papel: dono
 *   Empresa: placeholder (CNPJ + razao social atualizados depois junto com o tio)
 *
 * Observacao: o dominio @frotaviva.com.br pula o force_password_change,
 * entao o tio entra direto com a senha definida sem ser obrigado a trocar.
 */
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bsjuntynmnlhbvxemxqp.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_ROLE_KEY) {
  throw new Error(
    'SUPABASE_SERVICE_ROLE_KEY env var e obrigatoria. Defina em .env.local antes de rodar.',
  );
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const EMAIL = 'onessimo@frotaviva.com.br';
const PASSWORD = '24585458';
const NOME = 'Onessimo';

// Placeholders — sera editado pelo tio na onboarding ou junto com o sobrinho
const EMPRESA_PLACEHOLDER = {
  cnpj: '00.000.000/0001-00',
  razao_social: 'Frota do Onessimo (preencher CNPJ real)',
  nome_fantasia: 'Frota do Onessimo',
  plano: 'profissional', // libera Copilot pro piloto
  max_caminhoes: 20,
};

async function main() {
  console.log('\n=== Criando conta do Onessimo (piloto) ===\n');

  // 1. Auth user
  let authUser;
  const existing = await supabase.auth.admin.listUsers();
  const existingUser = existing.data.users.find((u) => u.email === EMAIL);

  if (existingUser) {
    console.log(`  Auth user ja existe: ${EMAIL} (${existingUser.id})`);
    // Atualiza senha caso ja exista
    await supabase.auth.admin.updateUserById(existingUser.id, {
      password: PASSWORD,
    });
    console.log(`  Senha atualizada.`);
    authUser = existingUser;
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { nome: NOME },
    });
    if (error) throw new Error(`Auth: ${error.message}`);
    authUser = data.user;
    console.log(`  Auth user criado: ${EMAIL} (${authUser.id})`);
  }

  // 2. Empresa
  let empresaId;
  const { data: existingEmpresa } = await supabase
    .from('empresa')
    .select('id, razao_social')
    .eq('cnpj', EMPRESA_PLACEHOLDER.cnpj)
    .maybeSingle();

  if (existingEmpresa) {
    empresaId = existingEmpresa.id;
    console.log(`  Empresa ja existe: ${existingEmpresa.razao_social} (${empresaId})`);
  } else {
    const { data, error } = await supabase
      .from('empresa')
      .insert({
        ...EMPRESA_PLACEHOLDER,
        ativa: true,
      })
      .select('id')
      .single();
    if (error) throw new Error(`Empresa: ${error.message}`);
    empresaId = data.id;
    console.log(`  Empresa criada: ${EMPRESA_PLACEHOLDER.nome_fantasia} (${empresaId})`);
  }

  // 3. Usuario
  let usuarioId;
  const { data: existingUsuario } = await supabase
    .from('usuario')
    .select('id')
    .eq('auth_id', authUser.id)
    .maybeSingle();

  if (existingUsuario) {
    usuarioId = existingUsuario.id;
    console.log(`  Usuario ja existe: ${usuarioId}`);
  } else {
    const { data, error } = await supabase
      .from('usuario')
      .insert({
        auth_id: authUser.id,
        empresa_id: empresaId,
        nome: NOME,
        email: EMAIL,
        role: 'dono',
        ativo: true,
      })
      .select('id')
      .single();
    if (error) throw new Error(`Usuario: ${error.message}`);
    usuarioId = data.id;
    console.log(`  Usuario criado: ${NOME} (${usuarioId})`);
  }

  // 4. Usuario-Empresa binding
  const { data: existingBinding } = await supabase
    .from('usuario_empresa')
    .select('usuario_id')
    .eq('usuario_id', usuarioId)
    .eq('empresa_id', empresaId)
    .maybeSingle();

  if (existingBinding) {
    console.log(`  Vinculo usuario-empresa ja existe.`);
  } else {
    const { error } = await supabase
      .from('usuario_empresa')
      .insert({
        usuario_id: usuarioId,
        empresa_id: empresaId,
        role: 'dono',
      });
    if (error) throw new Error(`Vinculo: ${error.message}`);
    console.log(`  Vinculo criado: ${usuarioId} <-> ${empresaId} (dono)`);
  }

  console.log('\n=== Pronto ===');
  console.log(`\n  Login:  ${EMAIL}`);
  console.log(`  Senha:  ${PASSWORD}`);
  console.log(`  Papel:  Dono`);
  console.log(`  Plano:  ${EMPRESA_PLACEHOLDER.plano} (Copilot liberado)`);
  console.log(`\n  PROXIMO PASSO: editar empresa pra preencher CNPJ + razao social reais.`);
  console.log(`  Acesso: app.frotaviva > Empresa > editar.\n`);
}

main().catch((e) => {
  console.error('\nFalhou:', e.message);
  process.exit(1);
});
