/**
 * Seed completo: 3 donos, cada um com 2 CNPJs, 3 motoristas por CNPJ.
 * Cada empresa populada com caminhoes, vinculos, viagens e gastos.
 *
 * Run: node scripts/seed-test-accounts.js
 *
 * Contas criadas (senha unica: Teste2026!):
 *   Dono 1: dono1@frotaviva.com.br (Carlos Bertolo)
 *   Dono 2: dono2@frotaviva.com.br (Ricardo Mendes)
 *   Dono 3: dono3@frotaviva.com.br (Fernanda Oliveira)
 *   Motoristas: mot{N}emp{M}@frotaviva.com.br
 *   Motorista legado: motorista@frotaviva.com.br (Jose Carlos Silva)
 */
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://bsjuntynmnlhbvxemxqp.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzanVudHlubW5saGJ2eGVteHFwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDczOTc1MiwiZXhwIjoyMDkwMzE1NzUyfQ.K-4mVfrUvz1JWfoJ5RoDNVowpXO4yUDe22Re4bpYaC4';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ============================================================
// DATA DEFINITIONS
// ============================================================

const EXISTING_DONO = {
  auth_id: 'e354597a-ee5b-4226-8c4d-a4321d30f74d',
  usuario_id: '993182f0-aade-4ec3-a219-3400f6fb96c4',
  empresa_id: '69b9706d-7f86-464d-bf5c-847b4b1526d6',
};

const EXISTING_MOTORISTA_ID = '7ea0c555-7379-40d3-8421-54adb18a6e64';

const DONOS = [
  // Dono 2
  {
    email: 'dono2@frotaviva.com.br',
    password: 'Dono2026!',
    nome: 'Ricardo Mendes',
  },
  // Dono 3
  {
    email: 'dono3@frotaviva.com.br',
    password: 'Dono2026!',
    nome: 'Fernanda Oliveira',
  },
];

const EMPRESAS = [
  // Dono 1 - empresa 2 (empresa 1 ja existe)
  {
    dono_index: -1, // -1 = existing dono
    cnpj: '22.333.444/0001-55',
    razao_social: 'Cegonha Express Transportes Ltda',
    nome_fantasia: 'Cegonha Express',
    plano: 'essencial',
  },
  // Dono 2 - empresa 1
  {
    dono_index: 0,
    cnpj: '33.444.555/0001-66',
    razao_social: 'RM Cegonhas Transportes EIRELI',
    nome_fantasia: 'RM Cegonhas',
    plano: 'profissional',
  },
  // Dono 2 - empresa 2
  {
    dono_index: 0,
    cnpj: '44.555.666/0001-77',
    razao_social: 'Auto Carrier Brasil Ltda',
    nome_fantasia: 'Auto Carrier',
    plano: 'essencial',
  },
  // Dono 3 - empresa 1
  {
    dono_index: 1,
    cnpj: '55.666.777/0001-88',
    razao_social: 'Oliveira Transporte de Veiculos ME',
    nome_fantasia: 'Oliveira Cegonhas',
    plano: 'profissional',
  },
  // Dono 3 - empresa 2
  {
    dono_index: 1,
    cnpj: '66.777.888/0001-99',
    razao_social: 'Sul Cegonha Logistica Ltda',
    nome_fantasia: 'Sul Cegonha',
    plano: 'essencial',
  },
];

// 3 motoristas per empresa (including existing empresa)
const MOTORISTAS_TEMPLATE = [
  [
    // Empresa existente (dono1) - 2 novos (ja tem Jose Carlos)
    { nome: 'Antonio Pereira', cpf: '111.222.333-44', cnh: 'SP001122334', cat: 'E', percentual: 28 },
    { nome: 'Marcos Ribeiro', cpf: '222.333.444-55', cnh: 'SP002233445', cat: 'E', percentual: 25 },
  ],
  [
    // Cegonha Express (dono1 empresa2)
    { nome: 'Paulo Ferreira', cpf: '333.444.555-66', cnh: 'RJ003344556', cat: 'E', percentual: 30 },
    { nome: 'Leandro Costa', cpf: '444.555.666-77', cnh: 'RJ004455667', cat: 'E', percentual: 27 },
    { nome: 'Fabio Santos', cpf: '555.666.777-88', cnh: 'RJ005566778', cat: 'D', percentual: 25 },
  ],
  [
    // RM Cegonhas (dono2 empresa1)
    { nome: 'Carlos Eduardo Lima', cpf: '666.777.888-99', cnh: 'MG006677889', cat: 'E', percentual: 30 },
    { nome: 'Roberto Almeida', cpf: '777.888.999-00', cnh: 'MG007788990', cat: 'E', percentual: 28 },
    { nome: 'Wagner Souza', cpf: '888.999.000-11', cnh: 'MG008899001', cat: 'E', percentual: 26 },
  ],
  [
    // Auto Carrier (dono2 empresa2)
    { nome: 'Diego Martins', cpf: '999.000.111-22', cnh: 'PR009900112', cat: 'E', percentual: 32 },
    { nome: 'Rafael Goncalves', cpf: '000.111.222-33', cnh: 'PR000111223', cat: 'E', percentual: 28 },
    { nome: 'Bruno Carvalho', cpf: '112.223.334-45', cnh: 'PR011222334', cat: 'D', percentual: 25 },
  ],
  [
    // Oliveira Cegonhas (dono3 empresa1)
    { nome: 'Joao Batista Neto', cpf: '223.334.445-56', cnh: 'RS022333445', cat: 'E', percentual: 30 },
    { nome: 'Luciano Moreira', cpf: '334.445.556-67', cnh: 'RS033444556', cat: 'E', percentual: 27 },
    { nome: 'Edson Barbosa', cpf: '445.556.667-78', cnh: 'RS044555667', cat: 'E', percentual: 25 },
  ],
  [
    // Sul Cegonha (dono3 empresa2)
    { nome: 'Marcelo Teixeira', cpf: '556.667.778-89', cnh: 'SC055666778', cat: 'E', percentual: 30 },
    { nome: 'Anderson Rocha', cpf: '667.778.889-90', cnh: 'SC066777889', cat: 'E', percentual: 28 },
    { nome: 'Thiago Campos', cpf: '778.889.990-01', cnh: 'SC077888990', cat: 'D', percentual: 26 },
  ],
];

const CAMINHOES_TEMPLATE = [
  // Per empresa: 3 caminhoes
  [
    // Empresa existente - ja tem 2, add 1
    { placa: 'DEF2G34', modelo: 'Mercedes-Benz Actros 2651', marca: 'Mercedes-Benz', ano: 2021, tipo: 'aberta', cap: 11, km: 285000 },
  ],
  [
    { placa: 'GHI3J45', modelo: 'Scania R500', marca: 'Scania', ano: 2023, tipo: 'aberta', cap: 11, km: 95000 },
    { placa: 'JKL4M56', modelo: 'Volvo FH 460', marca: 'Volvo', ano: 2022, tipo: 'fechada', cap: 9, km: 210000 },
    { placa: 'MNO5P67', modelo: 'DAF XF 530', marca: 'DAF', ano: 2024, tipo: 'aberta', cap: 11, km: 42000 },
  ],
  [
    { placa: 'PQR6S78', modelo: 'Scania R450', marca: 'Scania', ano: 2022, tipo: 'aberta', cap: 11, km: 310000 },
    { placa: 'STU7V89', modelo: 'Volvo FH 540', marca: 'Volvo', ano: 2023, tipo: 'fechada', cap: 9, km: 180000 },
    { placa: 'VWX8Y90', modelo: 'Mercedes-Benz Actros 2553', marca: 'Mercedes-Benz', ano: 2021, tipo: 'aberta', cap: 11, km: 350000 },
  ],
  [
    { placa: 'YZA9B01', modelo: 'DAF XF 480', marca: 'DAF', ano: 2023, tipo: 'aberta', cap: 11, km: 88000 },
    { placa: 'BCD0E12', modelo: 'Scania R500', marca: 'Scania', ano: 2024, tipo: 'fechada', cap: 9, km: 35000 },
    { placa: 'EFG1H23', modelo: 'Volvo FH 460', marca: 'Volvo', ano: 2022, tipo: 'aberta', cap: 11, km: 260000 },
  ],
  [
    { placa: 'HIJ2K34', modelo: 'Mercedes-Benz Actros 2651', marca: 'Mercedes-Benz', ano: 2023, tipo: 'aberta', cap: 11, km: 145000 },
    { placa: 'KLM3N45', modelo: 'Scania R450', marca: 'Scania', ano: 2021, tipo: 'fechada', cap: 9, km: 390000 },
    { placa: 'NOP4Q56', modelo: 'DAF XF 530', marca: 'DAF', ano: 2024, tipo: 'aberta', cap: 11, km: 28000 },
  ],
  [
    { placa: 'QRS5T67', modelo: 'Volvo FH 540', marca: 'Volvo', ano: 2023, tipo: 'aberta', cap: 11, km: 170000 },
    { placa: 'TUV6W78', modelo: 'Scania R500', marca: 'Scania', ano: 2022, tipo: 'fechada', cap: 9, km: 280000 },
    { placa: 'WXY7Z89', modelo: 'Mercedes-Benz Actros 2553', marca: 'Mercedes-Benz', ano: 2021, tipo: 'aberta', cap: 11, km: 410000 },
  ],
];

const ROTAS = [
  { origem: 'Sao Paulo, SP', destino: 'Curitiba, PR', km: 410, valor: 850000 },
  { origem: 'Curitiba, PR', destino: 'Porto Alegre, RS', km: 710, valor: 650000 },
  { origem: 'Sao Paulo, SP', destino: 'Belo Horizonte, MG', km: 585, valor: 720000 },
  { origem: 'Rio de Janeiro, RJ', destino: 'Sao Paulo, SP', km: 430, valor: 550000 },
  { origem: 'Belo Horizonte, MG', destino: 'Brasilia, DF', km: 735, valor: 980000 },
  { origem: 'Porto Alegre, RS', destino: 'Florianopolis, SC', km: 470, valor: 480000 },
  { origem: 'Goiania, GO', destino: 'Uberlandia, MG', km: 430, valor: 520000 },
  { origem: 'Campinas, SP', destino: 'Ribeirao Preto, SP', km: 315, valor: 420000 },
  { origem: 'Curitiba, PR', destino: 'Londrina, PR', km: 380, valor: 390000 },
  { origem: 'Salvador, BA', destino: 'Aracaju, SE', km: 330, valor: 460000 },
];

const POSTOS = [
  'Posto Shell BR-116', 'Auto Posto Ipiranga', 'Posto Graal', 'Posto Petrobras',
  'Rede Sim', 'Posto Ale', 'Posto Zema', 'Rede RPR',
];

const UFS = ['SP', 'PR', 'RS', 'SC', 'MG', 'RJ', 'GO', 'BA'];

// ============================================================
// HELPERS
// ============================================================

async function createAuthUser(email, password, nome) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nome },
  });
  if (error) {
    if (error.message.includes('already been registered')) {
      // Get existing user
      const { data: { users } } = await supabase.auth.admin.listUsers();
      const existing = users.find(u => u.email === email);
      if (existing) {
        console.log(`  Auth user ja existe: ${email} (${existing.id})`);
        return existing;
      }
    }
    throw new Error(`Auth ${email}: ${error.message}`);
  }
  console.log(`  Auth user criado: ${email} (${data.user.id})`);
  return data.user;
}

async function upsertEmpresa(empresaData) {
  // Check if exists
  const { data: existing } = await supabase
    .from('empresa')
    .select('id')
    .eq('cnpj', empresaData.cnpj)
    .single();

  if (existing) {
    console.log(`  Empresa ja existe: ${empresaData.razao_social} (${existing.id})`);
    return existing.id;
  }

  const { data, error } = await supabase
    .from('empresa')
    .insert({
      cnpj: empresaData.cnpj,
      razao_social: empresaData.razao_social,
      nome_fantasia: empresaData.nome_fantasia,
      plano: empresaData.plano,
      max_caminhoes: 20,
      ativa: true,
    })
    .select('id')
    .single();

  if (error) throw new Error(`Empresa ${empresaData.cnpj}: ${error.message}`);
  console.log(`  Empresa criada: ${empresaData.razao_social} (${data.id})`);
  return data.id;
}

async function upsertUsuario(auth_id, empresa_id, nome, email, role, motorista_id) {
  const { data: existing } = await supabase
    .from('usuario')
    .select('id')
    .eq('auth_id', auth_id)
    .single();

  if (existing) {
    console.log(`  Usuario ja existe: ${nome} (${existing.id})`);
    return existing.id;
  }

  const { data, error } = await supabase
    .from('usuario')
    .insert({
      auth_id,
      empresa_id,
      nome,
      email,
      role,
      motorista_id: motorista_id || null,
      ativo: true,
    })
    .select('id')
    .single();

  if (error) throw new Error(`Usuario ${email}: ${error.message}`);
  console.log(`  Usuario criado: ${nome} (${data.id})`);
  return data.id;
}

async function upsertUsuarioEmpresa(usuario_id, empresa_id, role) {
  const { data: existing } = await supabase
    .from('usuario_empresa')
    .select('id')
    .eq('usuario_id', usuario_id)
    .eq('empresa_id', empresa_id)
    .single();

  if (existing) {
    console.log(`  Binding ja existe: ${usuario_id} -> ${empresa_id}`);
    return;
  }

  const { error } = await supabase
    .from('usuario_empresa')
    .insert({ usuario_id, empresa_id, role, ativo: true });

  if (error) throw new Error(`UE ${usuario_id}/${empresa_id}: ${error.message}`);
  console.log(`  Binding criado: ${usuario_id} -> ${empresa_id} (${role})`);
}

async function createMotoristaComConta(empresa_id, mot, emailSuffix, created_by) {
  const email = `${emailSuffix}@frotaviva.com.br`;
  const password = 'Motorista2026!';

  // Create auth user
  const authUser = await createAuthUser(email, password, mot.nome);

  // Check if motorista exists
  const { data: existingMot } = await supabase
    .from('motorista')
    .select('id')
    .eq('empresa_id', empresa_id)
    .eq('cpf', mot.cpf)
    .single();

  let motoristaId;
  if (existingMot) {
    motoristaId = existingMot.id;
    console.log(`  Motorista ja existe: ${mot.nome} (${motoristaId})`);
  } else {
    const { data, error } = await supabase
      .from('motorista')
      .insert({
        empresa_id,
        nome: mot.nome,
        cpf: mot.cpf,
        cnh_numero: mot.cnh,
        cnh_categoria: mot.cat,
        cnh_validade: '2028-12-31',
        telefone: `(11) 9${Math.floor(10000000 + Math.random() * 89999999)}`,
        status: 'ativo',
        percentual_pagamento: mot.percentual,
        usuario_id: null,
      })
      .select('id')
      .single();

    if (error) throw new Error(`Motorista ${mot.cpf}: ${error.message}`);
    motoristaId = data.id;
    console.log(`  Motorista criado: ${mot.nome} (${motoristaId}) - ${mot.percentual}%`);
  }

  // Create usuario
  const usuarioId = await upsertUsuario(authUser.id, empresa_id, mot.nome, email, 'motorista', motoristaId);

  // Update motorista.usuario_id
  await supabase.from('motorista').update({ usuario_id: usuarioId }).eq('id', motoristaId);

  // Create usuario_empresa binding
  await upsertUsuarioEmpresa(usuarioId, empresa_id, 'motorista');

  return { motoristaId, usuarioId, email };
}

async function createCaminhoes(empresa_id, camList) {
  const ids = [];
  for (const cam of camList) {
    const { data: existing } = await supabase
      .from('caminhao')
      .select('id')
      .eq('empresa_id', empresa_id)
      .eq('placa', cam.placa)
      .single();

    if (existing) {
      ids.push(existing.id);
      console.log(`  Caminhao ja existe: ${cam.placa} (${existing.id})`);
      continue;
    }

    const { data, error } = await supabase
      .from('caminhao')
      .insert({
        empresa_id,
        placa: cam.placa,
        modelo: cam.modelo,
        marca: cam.marca,
        ano: cam.ano,
        tipo_cegonha: cam.tipo,
        capacidade_veiculos: cam.cap,
        km_atual: cam.km,
        ativo: true,
      })
      .select('id')
      .single();

    if (error) throw new Error(`Caminhao ${cam.placa}: ${error.message}`);
    ids.push(data.id);
    console.log(`  Caminhao criado: ${cam.placa} - ${cam.modelo} (${data.id})`);
  }
  return ids;
}

async function createVinculo(empresa_id, motorista_id, caminhao_id) {
  const { data: existing } = await supabase
    .from('motorista_caminhao')
    .select('id')
    .eq('empresa_id', empresa_id)
    .eq('motorista_id', motorista_id)
    .eq('caminhao_id', caminhao_id)
    .eq('ativo', true)
    .single();

  if (existing) {
    console.log(`  Vinculo ja existe: ${motorista_id} -> ${caminhao_id}`);
    return;
  }

  const { error } = await supabase
    .from('motorista_caminhao')
    .insert({
      empresa_id,
      motorista_id,
      caminhao_id,
      data_inicio: '2025-01-15',
      ativo: true,
    });

  if (error) {
    // Might fail due to unique constraint (1 active per caminhao)
    console.log(`  Vinculo skip (${error.message.substring(0, 60)})`);
    return;
  }
  console.log(`  Vinculo criado: motorista -> caminhao`);
}

async function createViagensEGastos(empresa_id, motorista_id, caminhao_id, created_by, percentual, count) {
  // Get categories
  const { data: categorias } = await supabase
    .from('categoria_gasto')
    .select('id, nome')
    .or(`empresa_id.is.null,empresa_id.eq.${empresa_id}`);

  const catMap = {};
  (categorias || []).forEach(c => {
    catMap[c.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')] = c.id;
  });

  const statuses = ['concluida', 'concluida', 'em_andamento', 'planejada'];
  let viagensCreated = 0;
  let gastosCreated = 0;

  for (let i = 0; i < count; i++) {
    const rota = ROTAS[i % ROTAS.length];
    const status = statuses[i % statuses.length];
    const dayOffset = i * 5;
    const dataSaida = new Date(2025, 2, 10 + dayOffset, 6 + (i % 4));

    const viagemData = {
      empresa_id,
      motorista_id,
      caminhao_id,
      origem: rota.origem,
      destino: rota.destino,
      data_saida: dataSaida.toISOString(),
      data_chegada_prevista: new Date(dataSaida.getTime() + 36 * 3600000).toISOString(),
      valor_total: rota.valor + (i * 10000),
      percentual_pagamento: percentual,
      status,
      km_estimado: rota.km,
      km_saida: 100000 + (i * rota.km),
      observacao: `Viagem ${i + 1} - ${rota.origem} ate ${rota.destino}`,
      editavel_motorista: i % 2 === 0,
      created_by,
    };

    if (status === 'concluida') {
      viagemData.data_chegada_real = new Date(dataSaida.getTime() + 30 * 3600000).toISOString();
      viagemData.km_chegada = viagemData.km_saida + rota.km;
    }

    const { data: viagem, error: errV } = await supabase
      .from('viagem')
      .insert(viagemData)
      .select('id')
      .single();

    if (errV) {
      console.log(`  Viagem skip: ${errV.message.substring(0, 60)}`);
      continue;
    }
    viagensCreated++;

    // Create 2-3 gastos per viagem
    const gastosCount = 2 + (i % 2);
    const gastosList = [];

    if (catMap['combustivel']) {
      gastosList.push({
        empresa_id,
        categoria_id: catMap['combustivel'],
        motorista_id,
        caminhao_id,
        viagem_id: viagem.id,
        valor: 180000 + (i * 15000),
        data: dataSaida.toISOString().split('T')[0],
        descricao: `Abastecimento ${rota.origem}`,
        litros: 250 + (i * 20),
        tipo_combustivel: 'diesel_s10',
        posto_local: POSTOS[i % POSTOS.length],
        uf_abastecimento: UFS[i % UFS.length],
        created_by,
      });
    }

    if (catMap['pedagio']) {
      gastosList.push({
        empresa_id,
        categoria_id: catMap['pedagio'],
        motorista_id,
        caminhao_id,
        viagem_id: viagem.id,
        valor: 25000 + (i * 5000),
        data: dataSaida.toISOString().split('T')[0],
        descricao: `Pedagios ${rota.origem} - ${rota.destino}`,
        created_by,
      });
    }

    if (gastosCount > 2 && catMap['alimentacao']) {
      gastosList.push({
        empresa_id,
        categoria_id: catMap['alimentacao'],
        motorista_id,
        caminhao_id,
        viagem_id: viagem.id,
        valor: 12000 + (i * 2000),
        data: dataSaida.toISOString().split('T')[0],
        descricao: 'Refeicoes em rota',
        created_by,
      });
    }

    if (gastosList.length > 0) {
      const { data: gastos, error: errG } = await supabase
        .from('gasto')
        .insert(gastosList)
        .select('id');

      if (!errG) gastosCreated += gastos.length;
    }
  }

  return { viagensCreated, gastosCreated };
}

// ============================================================
// MAIN
// ============================================================

async function seed() {
  console.log('=========================================');
  console.log('  SEED FrotaViva - Contas de Teste');
  console.log('=========================================\n');

  const summary = {
    donos: 1, // existing
    empresas: 1, // existing
    motoristas: 1, // existing
    caminhoes: 2, // existing
    viagens: 0,
    gastos: 0,
  };

  // ---- Step 0: Update existing motorista percentual ----
  console.log('--- 0. Atualizando motorista existente ---');
  await supabase
    .from('motorista')
    .update({ percentual_pagamento: 25 })
    .eq('id', EXISTING_MOTORISTA_ID);
  console.log('  Jose Carlos Silva: percentual_pagamento = 25%\n');

  // ---- Step 1: Create new donos (auth users) ----
  console.log('--- 1. Criando donos ---');
  const donoAuthUsers = [];
  for (const dono of DONOS) {
    const authUser = await createAuthUser(dono.email, dono.password, dono.nome);
    donoAuthUsers.push(authUser);
    summary.donos++;
  }
  console.log('');

  // ---- Step 2: Create empresas ----
  console.log('--- 2. Criando empresas ---');
  const empresaIds = [EXISTING_DONO.empresa_id]; // index 0 = existing
  for (const emp of EMPRESAS) {
    const id = await upsertEmpresa(emp);
    empresaIds.push(id);
    summary.empresas++;
  }
  console.log('');

  // ---- Step 3: Create usuario records for new donos ----
  console.log('--- 3. Criando usuarios dono ---');
  const donoUsuarioIds = [EXISTING_DONO.usuario_id]; // index 0 = existing

  // Dono 2 - primary empresa = empresaIds[2] (RM Cegonhas)
  const dono2UsuarioId = await upsertUsuario(
    donoAuthUsers[0].id, empresaIds[2], DONOS[0].nome, DONOS[0].email, 'dono', null,
  );
  donoUsuarioIds.push(dono2UsuarioId);

  // Dono 3 - primary empresa = empresaIds[4] (Oliveira Cegonhas)
  const dono3UsuarioId = await upsertUsuario(
    donoAuthUsers[1].id, empresaIds[4], DONOS[1].nome, DONOS[1].email, 'dono', null,
  );
  donoUsuarioIds.push(dono3UsuarioId);
  console.log('');

  // ---- Step 4: Create usuario_empresa bindings ----
  console.log('--- 4. Criando bindings usuario-empresa ---');
  // Dono 1 (existing) -> empresa 2 (Cegonha Express = empresaIds[1])
  await upsertUsuarioEmpresa(EXISTING_DONO.usuario_id, empresaIds[1], 'dono');
  // Dono 2 -> empresa 1 (RM Cegonhas = empresaIds[2])
  await upsertUsuarioEmpresa(dono2UsuarioId, empresaIds[2], 'dono');
  // Dono 2 -> empresa 2 (Auto Carrier = empresaIds[3])
  await upsertUsuarioEmpresa(dono2UsuarioId, empresaIds[3], 'dono');
  // Dono 3 -> empresa 1 (Oliveira = empresaIds[4])
  await upsertUsuarioEmpresa(dono3UsuarioId, empresaIds[4], 'dono');
  // Dono 3 -> empresa 2 (Sul Cegonha = empresaIds[5])
  await upsertUsuarioEmpresa(dono3UsuarioId, empresaIds[5], 'dono');
  console.log('');

  // ---- Step 5: Create motoristas per empresa ----
  console.log('--- 5. Criando motoristas ---');
  // motoristasPerEmpresa[empresaIndex] = [{ motoristaId, usuarioId }]
  const motoristasPerEmpresa = [];

  for (let empIdx = 0; empIdx < 6; empIdx++) {
    const empresaId = empresaIds[empIdx];
    const motList = MOTORISTAS_TEMPLATE[empIdx];
    const motResults = [];

    // Determine dono usuario_id for created_by
    let donoUsuarioId;
    if (empIdx === 0 || empIdx === 1) donoUsuarioId = donoUsuarioIds[0]; // dono 1
    else if (empIdx === 2 || empIdx === 3) donoUsuarioId = donoUsuarioIds[1]; // dono 2
    else donoUsuarioId = donoUsuarioIds[2]; // dono 3

    console.log(`\n  Empresa ${empIdx + 1} (${empresaId.substring(0, 8)}...):`);

    for (let motIdx = 0; motIdx < motList.length; motIdx++) {
      const emailSuffix = `mot${motIdx + 1}emp${empIdx + 1}`;
      const result = await createMotoristaComConta(empresaId, motList[motIdx], emailSuffix, donoUsuarioId);
      motResults.push(result);
      summary.motoristas++;
    }

    motoristasPerEmpresa.push(motResults);
  }
  console.log('');

  // For empresa 0 (existing), add existing motorista to the list
  motoristasPerEmpresa[0].unshift({
    motoristaId: EXISTING_MOTORISTA_ID,
    usuarioId: 'b796e14b-99e3-41a3-9fe2-68c0d3e84558',
    email: 'motorista@frotaviva.com.br',
  });

  // ---- Step 6: Create caminhoes ----
  console.log('--- 6. Criando caminhoes ---');
  const caminhoesPorEmpresa = [];

  for (let empIdx = 0; empIdx < 6; empIdx++) {
    const empresaId = empresaIds[empIdx];
    console.log(`\n  Empresa ${empIdx + 1}:`);
    const camIds = await createCaminhoes(empresaId, CAMINHOES_TEMPLATE[empIdx]);
    caminhoesPorEmpresa.push(camIds);
    summary.caminhoes += camIds.length;
  }

  // For empresa 0, include existing caminhoes
  const { data: existingCam } = await supabase
    .from('caminhao')
    .select('id')
    .eq('empresa_id', EXISTING_DONO.empresa_id)
    .eq('ativo', true);
  caminhoesPorEmpresa[0] = (existingCam || []).map(c => c.id);
  console.log('');

  // ---- Step 7: Create vinculos (1 motorista per caminhao) ----
  console.log('--- 7. Criando vinculos ---');
  for (let empIdx = 0; empIdx < 6; empIdx++) {
    const empresaId = empresaIds[empIdx];
    const mots = motoristasPerEmpresa[empIdx];
    const cams = caminhoesPorEmpresa[empIdx];

    console.log(`\n  Empresa ${empIdx + 1}:`);
    for (let i = 0; i < Math.min(mots.length, cams.length); i++) {
      await createVinculo(empresaId, mots[i].motoristaId, cams[i]);
    }
  }
  console.log('');

  // ---- Step 8: Create viagens and gastos ----
  console.log('--- 8. Criando viagens e gastos ---');
  for (let empIdx = 0; empIdx < 6; empIdx++) {
    const empresaId = empresaIds[empIdx];
    const mots = motoristasPerEmpresa[empIdx];
    const cams = caminhoesPorEmpresa[empIdx];

    let donoUsuarioId;
    if (empIdx === 0 || empIdx === 1) donoUsuarioId = donoUsuarioIds[0];
    else if (empIdx === 2 || empIdx === 3) donoUsuarioId = donoUsuarioIds[1];
    else donoUsuarioId = donoUsuarioIds[2];

    console.log(`\n  Empresa ${empIdx + 1}:`);
    for (let i = 0; i < mots.length; i++) {
      const camId = cams[i % cams.length];
      const percentual = MOTORISTAS_TEMPLATE[empIdx][i]?.percentual || 25;
      const viagCount = 3 + (i % 2); // 3-4 viagens per motorista
      const result = await createViagensEGastos(
        empresaId, mots[i].motoristaId, camId, donoUsuarioId, percentual, viagCount,
      );
      summary.viagens += result.viagensCreated;
      summary.gastos += result.gastosCreated;
      console.log(`    ${mots[i].email}: ${result.viagensCreated} viagens, ${result.gastosCreated} gastos`);
    }
  }

  // ---- Summary ----
  console.log('\n=========================================');
  console.log('        SEED CONCLUIDO COM SUCESSO');
  console.log('=========================================');
  console.log(`Donos:       ${summary.donos}`);
  console.log(`Empresas:    ${summary.empresas}`);
  console.log(`Motoristas:  ${summary.motoristas}`);
  console.log(`Caminhoes:   ${summary.caminhoes}`);
  console.log(`Viagens:     ${summary.viagens}`);
  console.log(`Gastos:      ${summary.gastos}`);
  console.log('-----------------------------------------');
  console.log('CONTAS DE ACESSO:');
  console.log('');
  console.log('  DONOS:');
  console.log('  1. teste@sigabem.com.br / SigaBem2026!');
  console.log('     -> Transportadora Teste Ltda (11.222.333/0001-81)');
  console.log('     -> Cegonha Express (22.333.444/0001-55)');
  console.log('  2. dono2@frotaviva.com.br / Dono2026!');
  console.log('     -> RM Cegonhas (33.444.555/0001-66)');
  console.log('     -> Auto Carrier (44.555.666/0001-77)');
  console.log('  3. dono3@frotaviva.com.br / Dono2026!');
  console.log('     -> Oliveira Cegonhas (55.666.777/0001-88)');
  console.log('     -> Sul Cegonha (66.777.888/0001-99)');
  console.log('');
  console.log('  MOTORISTAS (senha padrao: Motorista2026!):');
  for (let empIdx = 0; empIdx < 6; empIdx++) {
    const mots = motoristasPerEmpresa[empIdx];
    console.log(`    Empresa ${empIdx + 1}:`);
    for (const m of mots) {
      console.log(`      ${m.email}`);
    }
  }
  console.log('=========================================');
}

seed().catch(err => {
  console.error('\nFATAL:', err);
  process.exit(1);
});
