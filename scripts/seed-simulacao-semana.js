/**
 * Seed: Simulacao de 1 semana realista de operacao de frota.
 * Run: node scripts/seed-simulacao-semana.js
 *
 * - Phase 0: Cleanup ALL operational data (keeps motorista, caminhao, usuario, empresa, categoria_gasto)
 * - Phase 1: Update motoristas percentual_pagamento
 * - Phase 2: Create vinculos (motorista -> caminhao)
 * - Phase 3: Simulate 7 days (last week) of realistic operations
 * - Phase 4: Create fechamento (acerto) for Jose Carlos
 * - Phase 5: Smaller operation for Dono 2 (RM Cegonhas)
 *
 * Idempotent: running twice produces the same result (cleanup first).
 */
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bsjuntynmnlhbvxemxqp.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY env var e obrigatoria. Defina em .env.local antes de rodar o seed.');
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Known empresa IDs
const EMPRESA1_ID = '69b9706d-7f86-464d-bf5c-847b4b1526d6'; // Transportadora Teste Ltda

// ============================================================
// DATE HELPERS
// ============================================================

function getLastWeekDates() {
  const now = new Date();
  // Find last Monday
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon, ...
  const daysToLastMonday = dayOfWeek === 0 ? 8 : dayOfWeek + 6;
  const monday = new Date(today);
  monday.setDate(today.getDate() - daysToLastMonday);

  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d);
  }
  return days;
}

function toISO(date, hours = 8, minutes = 0) {
  const d = new Date(date);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

function toDateStr(date) {
  return date.toISOString().split('T')[0];
}

// ============================================================
// PHASE 0: CLEANUP
// ============================================================

async function cleanup() {
  console.log('============================================');
  console.log('  PHASE 0: CLEANUP (operational data only)');
  console.log('============================================\n');

  // Get all empresa IDs
  const { data: empresas } = await supabase.from('empresa').select('id, nome_fantasia');
  if (!empresas || empresas.length === 0) {
    console.log('  Nenhuma empresa encontrada. Abortando cleanup.');
    return;
  }
  console.log(`  Empresas encontradas: ${empresas.map(e => e.nome_fantasia || e.id.substring(0, 8)).join(', ')}`);

  for (const emp of empresas) {
    console.log(`\n  Limpando empresa: ${emp.nome_fantasia || emp.id.substring(0, 8)}...`);

    // 1. fechamento_item (depends on fechamento)
    const { data: fechamentos } = await supabase.from('fechamento').select('id').eq('empresa_id', emp.id);
    if (fechamentos && fechamentos.length > 0) {
      const fechIds = fechamentos.map(f => f.id);
      const { error: errFi } = await supabase.from('fechamento_item').delete().in('fechamento_id', fechIds);
      if (errFi) console.log(`    WARN fechamento_item: ${errFi.message}`);
      else console.log(`    fechamento_item: removidos`);
    }

    // 2. fechamento
    const { error: errF } = await supabase.from('fechamento').delete().eq('empresa_id', emp.id);
    if (errF) console.log(`    WARN fechamento: ${errF.message}`);
    else console.log('    fechamento: removidos');

    // 3. foto_comprovante (depends on gasto)
    const { data: gastos } = await supabase.from('gasto').select('id').eq('empresa_id', emp.id);
    if (gastos && gastos.length > 0) {
      const gastoIds = gastos.map(g => g.id);
      const { error: errFoto } = await supabase.from('foto_comprovante').delete().in('gasto_id', gastoIds);
      if (errFoto) console.log(`    WARN foto_comprovante: ${errFoto.message}`);
      else console.log('    foto_comprovante: removidos');
    }

    // 4. gasto
    const { error: errG } = await supabase.from('gasto').delete().eq('empresa_id', emp.id);
    if (errG) console.log(`    WARN gasto: ${errG.message}`);
    else console.log('    gasto: removidos');

    // 5. viagem_veiculo (depends on viagem)
    const { error: errVV } = await supabase.from('viagem_veiculo').delete().eq('empresa_id', emp.id);
    if (errVV) console.log(`    WARN viagem_veiculo: ${errVV.message}`);
    else console.log('    viagem_veiculo: removidos');

    // 6. viagem
    const { error: errV } = await supabase.from('viagem').delete().eq('empresa_id', emp.id);
    if (errV) console.log(`    WARN viagem: ${errV.message}`);
    else console.log('    viagem: removidos');

    // 7. motorista_caminhao (vinculos)
    const { error: errMC } = await supabase.from('motorista_caminhao').delete().eq('empresa_id', emp.id);
    if (errMC) console.log(`    WARN motorista_caminhao: ${errMC.message}`);
    else console.log('    motorista_caminhao: removidos');
  }

  console.log('\n  Cleanup concluido.\n');
}

// ============================================================
// PHASE 1: UPDATE MOTORISTAS
// ============================================================

async function updateMotoristas() {
  console.log('============================================');
  console.log('  PHASE 1: UPDATE MOTORISTAS');
  console.log('============================================\n');

  const { data: motoristas } = await supabase
    .from('motorista')
    .select('id, nome, percentual_pagamento')
    .eq('empresa_id', EMPRESA1_ID)
    .eq('status', 'ativo');

  if (!motoristas || motoristas.length === 0) {
    console.log('  ERRO: Nenhum motorista encontrado para empresa 1!');
    return {};
  }

  const percentuais = {
    'Jose Carlos Silva': 25,
    'Antonio Pereira': 28,
    'Marcos Ribeiro': 25,
  };

  const motMap = {};
  for (const mot of motoristas) {
    const perc = percentuais[mot.nome];
    if (perc !== undefined) {
      await supabase.from('motorista').update({ percentual_pagamento: perc }).eq('id', mot.id);
      console.log(`  ${mot.nome}: percentual_pagamento = ${perc}%`);
      motMap[mot.nome] = { id: mot.id, percentual: perc };
    }
  }

  console.log('');
  return motMap;
}

// ============================================================
// PHASE 2: VINCULOS
// ============================================================

async function createVinculos(motMap) {
  console.log('============================================');
  console.log('  PHASE 2: VINCULOS (Monday morning)');
  console.log('============================================\n');

  // Get caminhoes
  const { data: caminhoes } = await supabase
    .from('caminhao')
    .select('id, placa, modelo')
    .eq('empresa_id', EMPRESA1_ID)
    .eq('ativo', true);

  if (!caminhoes || caminhoes.length === 0) {
    console.log('  ERRO: Nenhum caminhao encontrado!');
    return {};
  }

  const camMap = {};
  for (const c of caminhoes) {
    camMap[c.placa] = { id: c.id, modelo: c.modelo };
  }

  const vinculos = [
    { motorista: 'Jose Carlos Silva', placa: 'ABC1D23' },
    { motorista: 'Antonio Pereira', placa: 'XYZ4E56' },
    { motorista: 'Marcos Ribeiro', placa: 'DEF2G34' },
  ];

  for (const v of vinculos) {
    const mot = motMap[v.motorista];
    const cam = camMap[v.placa];
    if (!mot || !cam) {
      console.log(`  WARN: Nao encontrado ${v.motorista} ou ${v.placa}`);
      continue;
    }

    const { error } = await supabase.from('motorista_caminhao').insert({
      empresa_id: EMPRESA1_ID,
      motorista_id: mot.id,
      caminhao_id: cam.id,
      data_inicio: toDateStr(getLastWeekDates()[0]),
      ativo: true,
      observacao: `Vinculo semanal - ${cam.modelo}`,
    });

    if (error) {
      console.log(`  WARN vinculo ${v.motorista} -> ${v.placa}: ${error.message}`);
    } else {
      console.log(`  ${v.motorista} -> ${v.placa} (${cam.modelo})`);
    }
  }

  console.log('');
  return camMap;
}

// ============================================================
// HELPERS: categoria lookup
// ============================================================

async function getCategorias(empresaId) {
  const { data: categorias } = await supabase
    .from('categoria_gasto')
    .select('id, nome')
    .or(`empresa_id.is.null,empresa_id.eq.${empresaId}`);

  const map = {};
  (categorias || []).forEach(c => {
    map[c.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')] = c.id;
  });
  return map;
}

async function getDonoUsuarioId(empresaId) {
  const { data } = await supabase
    .from('usuario_empresa')
    .select('usuario_id')
    .eq('empresa_id', empresaId)
    .eq('role', 'dono')
    .limit(1)
    .single();
  return data?.usuario_id || null;
}

// ============================================================
// PHASE 3: WEEK SIMULATION
// ============================================================

async function simulateWeek(motMap, camMap) {
  console.log('============================================');
  console.log('  PHASE 3: SIMULACAO DA SEMANA');
  console.log('============================================\n');

  const days = getLastWeekDates();
  const dayNames = ['Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado', 'Domingo'];
  console.log(`  Periodo: ${toDateStr(days[0])} a ${toDateStr(days[6])}\n`);

  const catMap = await getCategorias(EMPRESA1_ID);
  const createdBy = await getDonoUsuarioId(EMPRESA1_ID);

  if (!createdBy) {
    console.log('  ERRO: Dono usuario_id nao encontrado!');
    return { viagens: {}, gastos: [] };
  }

  const catComb = catMap['combustivel'];
  const catPed = catMap['pedagio'];
  const catAlim = catMap['alimentacao'];
  const catManut = catMap['manutencao'];

  if (!catComb || !catPed || !catAlim) {
    console.log('  ERRO: Categorias essenciais nao encontradas!');
    console.log('  catMap:', catMap);
    return { viagens: {}, gastos: [] };
  }

  const jose = motMap['Jose Carlos Silva'];
  const antonio = motMap['Antonio Pereira'];
  const marcos = motMap['Marcos Ribeiro'];
  const camJose = camMap['ABC1D23'];
  const camAntonio = camMap['XYZ4E56'];
  const camMarcos = camMap['DEF2G34'];

  const viagens = {};
  const allGastos = [];
  let viagemCount = 0;
  let gastoCount = 0;

  // ---- MONDAY (Dia 1): Dono creates 3 viagens ----
  console.log(`  --- ${dayNames[0]} (${toDateStr(days[0])}) ---`);

  // Jose Carlos: SP -> Curitiba
  const { data: v1 } = await supabase.from('viagem').insert({
    empresa_id: EMPRESA1_ID,
    motorista_id: jose.id,
    caminhao_id: camJose.id,
    origem: 'Sao Paulo, SP',
    destino: 'Curitiba, PR',
    data_saida: toISO(days[0], 6, 30),
    data_chegada_prevista: toISO(days[2], 18, 0),
    valor_total: 850000,
    percentual_pagamento: jose.percentual,
    status: 'em_andamento',
    km_estimado: 410,
    km_saida: 320000,
    observacao: 'Transporte de 8 veiculos para concessionaria em Curitiba',
    editavel_motorista: false,
    created_by: createdBy,
  }).select().single();
  viagens.joseSPCuritiba = v1;
  viagemCount++;
  console.log(`  Jose Carlos: SP -> Curitiba (R$ 8.500) - ID: ${v1?.id?.substring(0, 8)}`);

  // Antonio: SP -> BH
  const { data: v2 } = await supabase.from('viagem').insert({
    empresa_id: EMPRESA1_ID,
    motorista_id: antonio.id,
    caminhao_id: camAntonio.id,
    origem: 'Sao Paulo, SP',
    destino: 'Belo Horizonte, MG',
    data_saida: toISO(days[0], 7, 0),
    data_chegada_prevista: toISO(days[2], 16, 0),
    valor_total: 720000,
    percentual_pagamento: antonio.percentual,
    status: 'em_andamento',
    km_estimado: 585,
    km_saida: 180000,
    observacao: 'Entrega de veiculos na FIAT Betim',
    editavel_motorista: false,
    created_by: createdBy,
  }).select().single();
  viagens.antonioSPBH = v2;
  viagemCount++;
  console.log(`  Antonio: SP -> BH (R$ 7.200) - ID: ${v2?.id?.substring(0, 8)}`);

  // Marcos: SP -> Rio
  const { data: v3 } = await supabase.from('viagem').insert({
    empresa_id: EMPRESA1_ID,
    motorista_id: marcos.id,
    caminhao_id: camMarcos.id,
    origem: 'Sao Paulo, SP',
    destino: 'Rio de Janeiro, RJ',
    data_saida: toISO(days[0], 8, 0),
    data_chegada_prevista: toISO(days[3], 12, 0),
    valor_total: 550000,
    percentual_pagamento: marcos.percentual,
    status: 'em_andamento',
    km_estimado: 430,
    km_saida: 285000,
    observacao: 'Transporte para patio no Rio - 6 veiculos',
    editavel_motorista: false,
    created_by: createdBy,
  }).select().single();
  viagens.marcosSPRio = v3;
  viagemCount++;
  console.log(`  Marcos: SP -> Rio (R$ 5.500) - ID: ${v3?.id?.substring(0, 8)}`);

  // ---- MONDAY-WEDNESDAY: Gastos during trips ----
  console.log(`\n  --- ${dayNames[0]} a ${dayNames[2]}: Gastos em rota ---`);

  // Jose Carlos gastos
  const gastosJoseIda = [
    {
      empresa_id: EMPRESA1_ID, categoria_id: catComb, motorista_id: jose.id,
      caminhao_id: camJose.id, viagem_id: v1.id, valor: 245000,
      data: toDateStr(days[0]), descricao: 'Abastecimento completo - saida SP',
      litros: 350, tipo_combustivel: 'diesel_s10', posto_local: 'Posto Shell Anchieta SP',
      uf_abastecimento: 'SP', created_by: createdBy,
    },
    {
      empresa_id: EMPRESA1_ID, categoria_id: catPed, motorista_id: jose.id,
      caminhao_id: camJose.id, viagem_id: v1.id, valor: 45000,
      data: toDateStr(days[0]), descricao: 'Pedagios SP-PR via Regis Bittencourt',
      created_by: createdBy,
    },
    {
      empresa_id: EMPRESA1_ID, categoria_id: catAlim, motorista_id: jose.id,
      caminhao_id: camJose.id, viagem_id: v1.id, valor: 18000,
      data: toDateStr(days[1]), descricao: 'Almoco e jantar em rota - Registro SP',
      created_by: createdBy,
    },
  ];

  // Antonio gastos
  const gastosAntonioIda = [
    {
      empresa_id: EMPRESA1_ID, categoria_id: catComb, motorista_id: antonio.id,
      caminhao_id: camAntonio.id, viagem_id: v2.id, valor: 196000,
      data: toDateStr(days[0]), descricao: 'Diesel S10 - saida pela Fernao Dias',
      litros: 280, tipo_combustivel: 'diesel_s10', posto_local: 'Auto Posto Ipiranga Atibaia',
      uf_abastecimento: 'SP', created_by: createdBy,
    },
    {
      empresa_id: EMPRESA1_ID, categoria_id: catPed, motorista_id: antonio.id,
      caminhao_id: camAntonio.id, viagem_id: v2.id, valor: 38000,
      data: toDateStr(days[0]), descricao: 'Pedagios SP-MG Fernao Dias',
      created_by: createdBy,
    },
    {
      empresa_id: EMPRESA1_ID, categoria_id: catAlim, motorista_id: antonio.id,
      caminhao_id: camAntonio.id, viagem_id: v2.id, valor: 18000,
      data: toDateStr(days[1]), descricao: 'Refeicoes em rota - Pouso Alegre MG',
      created_by: createdBy,
    },
  ];

  // Marcos gastos
  const gastosMarcosIda = [
    {
      empresa_id: EMPRESA1_ID, categoria_id: catComb, motorista_id: marcos.id,
      caminhao_id: camMarcos.id, viagem_id: v3.id, valor: 140000,
      data: toDateStr(days[0]), descricao: 'Abastecimento saida SP - Dutra',
      litros: 200, tipo_combustivel: 'diesel_s10', posto_local: 'Posto Graal Guarulhos',
      uf_abastecimento: 'SP', created_by: createdBy,
    },
    {
      empresa_id: EMPRESA1_ID, categoria_id: catPed, motorista_id: marcos.id,
      caminhao_id: camMarcos.id, viagem_id: v3.id, valor: 32000,
      data: toDateStr(days[0]), descricao: 'Pedagios SP-RJ via Dutra',
      created_by: createdBy,
    },
    {
      empresa_id: EMPRESA1_ID, categoria_id: catAlim, motorista_id: marcos.id,
      caminhao_id: camMarcos.id, viagem_id: v3.id, valor: 18000,
      data: toDateStr(days[1]), descricao: 'Refeicoes na Dutra - Volta Redonda RJ',
      created_by: createdBy,
    },
  ];

  const allIdaGastos = [...gastosJoseIda, ...gastosAntonioIda, ...gastosMarcosIda];
  const { data: insertedIda, error: errIda } = await supabase.from('gasto').insert(allIdaGastos).select('id');
  if (errIda) console.log(`  WARN gastos ida: ${errIda.message}`);
  else {
    gastoCount += insertedIda.length;
    console.log(`  ${insertedIda.length} gastos de ida criados`);
  }

  // ---- WEDNESDAY (Dia 3): Jose e Antonio chegam ----
  console.log(`\n  --- ${dayNames[2]} (${toDateStr(days[2])}) ---`);

  // Jose Carlos arrives Curitiba
  await supabase.from('viagem').update({
    status: 'concluida',
    km_chegada: 320410,
    data_chegada_real: toISO(days[2], 14, 30),
  }).eq('id', v1.id);
  console.log('  Jose Carlos: chegou Curitiba (km: 320410) - CONCLUIDA');

  // Antonio arrives BH
  await supabase.from('viagem').update({
    status: 'concluida',
    km_chegada: 180585,
    data_chegada_real: toISO(days[2], 16, 0),
  }).eq('id', v2.id);
  console.log('  Antonio: chegou BH (km: 180585) - CONCLUIDA');

  // ---- THURSDAY (Dia 4): Marcos chega, 2 viagens de retorno ----
  console.log(`\n  --- ${dayNames[3]} (${toDateStr(days[3])}) ---`);

  // Marcos arrives Rio
  await supabase.from('viagem').update({
    status: 'concluida',
    km_chegada: 285430,
    data_chegada_real: toISO(days[3], 10, 0),
  }).eq('id', v3.id);
  console.log('  Marcos: chegou Rio (km: 285430) - CONCLUIDA');

  // Jose Carlos: Curitiba -> SP (return)
  const { data: v4 } = await supabase.from('viagem').insert({
    empresa_id: EMPRESA1_ID,
    motorista_id: jose.id,
    caminhao_id: camJose.id,
    origem: 'Curitiba, PR',
    destino: 'Sao Paulo, SP',
    data_saida: toISO(days[3], 7, 0),
    data_chegada_prevista: toISO(days[4], 18, 0),
    valor_total: 780000,
    percentual_pagamento: jose.percentual,
    status: 'em_andamento',
    km_estimado: 410,
    km_saida: 320450, // gap of 40km (km invisivel)
    observacao: 'Retorno Curitiba-SP com 7 veiculos da Renault',
    editavel_motorista: false,
    created_by: createdBy,
  }).select().single();
  viagens.joseRetorno = v4;
  viagemCount++;
  console.log(`  Jose Carlos: Curitiba -> SP (R$ 7.800, km_saida: 320450) - km invisivel: 40km`);

  // Antonio: BH -> SP (return)
  const { data: v5 } = await supabase.from('viagem').insert({
    empresa_id: EMPRESA1_ID,
    motorista_id: antonio.id,
    caminhao_id: camAntonio.id,
    origem: 'Belo Horizonte, MG',
    destino: 'Sao Paulo, SP',
    data_saida: toISO(days[3], 8, 0),
    data_chegada_prevista: toISO(days[4], 20, 0),
    valor_total: 690000,
    percentual_pagamento: antonio.percentual,
    status: 'em_andamento',
    km_estimado: 585,
    km_saida: 180620, // gap of 35km (km invisivel)
    observacao: 'Retorno BH-SP com 9 veiculos Honda Ipatinga',
    editavel_motorista: false,
    created_by: createdBy,
  }).select().single();
  viagens.antonioRetorno = v5;
  viagemCount++;
  console.log(`  Antonio: BH -> SP (R$ 6.900, km_saida: 180620) - km invisivel: 35km`);

  // ---- THURSDAY-FRIDAY: Gastos return trips ----
  console.log(`\n  --- ${dayNames[3]} a ${dayNames[4]}: Gastos retorno ---`);

  const gastosRetorno = [
    // Jose Carlos return gastos
    {
      empresa_id: EMPRESA1_ID, categoria_id: catComb, motorista_id: jose.id,
      caminhao_id: camJose.id, viagem_id: v4.id, valor: 238000,
      data: toDateStr(days[3]), descricao: 'Diesel completo Curitiba - retorno SP',
      litros: 340, tipo_combustivel: 'diesel_s10', posto_local: 'Posto Petrobras Curitiba',
      uf_abastecimento: 'PR', created_by: createdBy,
    },
    {
      empresa_id: EMPRESA1_ID, categoria_id: catPed, motorista_id: jose.id,
      caminhao_id: camJose.id, viagem_id: v4.id, valor: 45000,
      data: toDateStr(days[3]), descricao: 'Pedagios PR-SP Regis Bittencourt',
      created_by: createdBy,
    },
    {
      empresa_id: EMPRESA1_ID, categoria_id: catAlim, motorista_id: jose.id,
      caminhao_id: camJose.id, viagem_id: v4.id, valor: 15000,
      data: toDateStr(days[3]), descricao: 'Jantar rodoviaria Registro SP',
      created_by: createdBy,
    },
    {
      empresa_id: EMPRESA1_ID, categoria_id: catManut, motorista_id: jose.id,
      caminhao_id: camJose.id, viagem_id: v4.id, valor: 15000,
      data: toDateStr(days[4]), descricao: 'Troca de lampada farol dianteiro direito',
      created_by: createdBy,
    },
    // Antonio return gastos
    {
      empresa_id: EMPRESA1_ID, categoria_id: catComb, motorista_id: antonio.id,
      caminhao_id: camAntonio.id, viagem_id: v5.id, valor: 189000,
      data: toDateStr(days[3]), descricao: 'Abastecimento BH - retorno Fernao Dias',
      litros: 270, tipo_combustivel: 'diesel_s10', posto_local: 'Posto Zema Betim MG',
      uf_abastecimento: 'MG', created_by: createdBy,
    },
    {
      empresa_id: EMPRESA1_ID, categoria_id: catPed, motorista_id: antonio.id,
      caminhao_id: camAntonio.id, viagem_id: v5.id, valor: 38000,
      data: toDateStr(days[3]), descricao: 'Pedagios MG-SP Fernao Dias',
      created_by: createdBy,
    },
    {
      empresa_id: EMPRESA1_ID, categoria_id: catAlim, motorista_id: antonio.id,
      caminhao_id: camAntonio.id, viagem_id: v5.id, valor: 16000,
      data: toDateStr(days[4]), descricao: 'Almoco em rota - Extrema MG',
      created_by: createdBy,
    },
  ];

  const { data: insertedRet, error: errRet } = await supabase.from('gasto').insert(gastosRetorno).select('id');
  if (errRet) console.log(`  WARN gastos retorno: ${errRet.message}`);
  else {
    gastoCount += insertedRet.length;
    console.log(`  ${insertedRet.length} gastos de retorno criados (incl. manutencao Jose Carlos)`);
  }

  // ---- FRIDAY (Dia 5): Jose e Antonio chegam SP ----
  console.log(`\n  --- ${dayNames[4]} (${toDateStr(days[4])}) ---`);

  await supabase.from('viagem').update({
    status: 'concluida',
    km_chegada: 320860,
    data_chegada_real: toISO(days[4], 17, 0),
  }).eq('id', v4.id);
  console.log('  Jose Carlos: chegou SP (km: 320860) - CONCLUIDA');

  await supabase.from('viagem').update({
    status: 'concluida',
    km_chegada: 181205,
    data_chegada_real: toISO(days[4], 19, 30),
  }).eq('id', v5.id);
  console.log('  Antonio: chegou SP (km: 181205) - CONCLUIDA');

  // ---- SATURDAY (Dia 6): Marcos SP -> Campinas (short trip same day) ----
  console.log(`\n  --- ${dayNames[5]} (${toDateStr(days[5])}) ---`);

  const { data: v6 } = await supabase.from('viagem').insert({
    empresa_id: EMPRESA1_ID,
    motorista_id: marcos.id,
    caminhao_id: camMarcos.id,
    origem: 'Sao Paulo, SP',
    destino: 'Campinas, SP',
    data_saida: toISO(days[5], 6, 0),
    data_chegada_prevista: toISO(days[5], 12, 0),
    data_chegada_real: toISO(days[5], 11, 30),
    valor_total: 320000,
    percentual_pagamento: marcos.percentual,
    status: 'concluida',
    km_estimado: 100,
    km_saida: 285500,
    km_chegada: 285600,
    observacao: 'Viagem curta SP-Campinas, 4 veiculos',
    editavel_motorista: false,
    created_by: createdBy,
  }).select().single();
  viagens.marcosCampinas = v6;
  viagemCount++;
  console.log(`  Marcos: SP -> Campinas (R$ 3.200) - mesma dia, CONCLUIDA`);

  // Marcos Saturday gastos
  const gastosSabado = [
    {
      empresa_id: EMPRESA1_ID, categoria_id: catComb, motorista_id: marcos.id,
      caminhao_id: camMarcos.id, viagem_id: v6.id, valor: 35000,
      data: toDateStr(days[5]), descricao: 'Diesel parcial SP-Campinas',
      litros: 50, tipo_combustivel: 'diesel_s10', posto_local: 'Posto Shell Anhanguera',
      uf_abastecimento: 'SP', created_by: createdBy,
    },
    {
      empresa_id: EMPRESA1_ID, categoria_id: catPed, motorista_id: marcos.id,
      caminhao_id: camMarcos.id, viagem_id: v6.id, valor: 8000,
      data: toDateStr(days[5]), descricao: 'Pedagio Anhanguera SP-Campinas',
      created_by: createdBy,
    },
  ];

  const { data: insertedSab, error: errSab } = await supabase.from('gasto').insert(gastosSabado).select('id');
  if (errSab) console.log(`  WARN gastos sabado: ${errSab.message}`);
  else {
    gastoCount += insertedSab.length;
    console.log(`  ${insertedSab.length} gastos sabado criados`);
  }

  // ---- SUNDAY (Dia 7): No new active trips, 1 planejada ----
  console.log(`\n  --- ${dayNames[6]} (${toDateStr(days[6])}) ---`);

  const nextMonday = new Date(days[6]);
  nextMonday.setDate(nextMonday.getDate() + 1);

  const { data: v7 } = await supabase.from('viagem').insert({
    empresa_id: EMPRESA1_ID,
    motorista_id: jose.id,
    caminhao_id: camJose.id,
    origem: 'Sao Paulo, SP',
    destino: 'Porto Alegre, RS',
    data_saida: toISO(nextMonday, 5, 0),
    data_chegada_prevista: toISO(new Date(nextMonday.getTime() + 2 * 86400000), 18, 0),
    valor_total: 1200000,
    percentual_pagamento: jose.percentual,
    status: 'planejada',
    km_estimado: 1100,
    observacao: 'Viagem longa SP-POA com 11 veiculos - planejada para proxima segunda',
    editavel_motorista: false,
    created_by: createdBy,
  }).select().single();
  viagens.josePlanejada = v7;
  viagemCount++;
  console.log(`  Jose Carlos: SP -> Porto Alegre (R$ 12.000) - PLANEJADA para ${toDateStr(nextMonday)}`);
  console.log('  Nenhuma viagem nova em andamento (domingo de descanso)');

  // ---- Update caminhao km_atual ----
  console.log('\n  --- Atualizando km_atual dos caminhoes ---');
  await supabase.from('caminhao').update({ km_atual: 320860 }).eq('id', camJose.id);
  console.log(`  ABC1D23 (Scania R450): km_atual = 320860`);
  await supabase.from('caminhao').update({ km_atual: 181205 }).eq('id', camAntonio.id);
  console.log(`  XYZ4E56 (Volvo FH 540): km_atual = 181205`);
  await supabase.from('caminhao').update({ km_atual: 285600 }).eq('id', camMarcos.id);
  console.log(`  DEF2G34 (Mercedes-Benz Actros): km_atual = 285600`);

  console.log(`\n  Resumo Fase 3: ${viagemCount} viagens, ${gastoCount} gastos\n`);
  return { viagens, gastoCount, viagemCount, days, createdBy };
}

// ============================================================
// PHASE 4: FECHAMENTO (ACERTO) - Jose Carlos
// ============================================================

async function createFechamento(motMap, weekData) {
  console.log('============================================');
  console.log('  PHASE 4: FECHAMENTO (Jose Carlos)');
  console.log('============================================\n');

  const { days, viagens, createdBy } = weekData;
  const jose = motMap['Jose Carlos Silva'];

  // Calculate totals for Jose Carlos
  // Viagens concluidas: SP->Curitiba (R$ 8.500) + Curitiba->SP (R$ 7.800) = R$ 16.300
  // valor_motorista = valor_total * percentual / 100
  const joseViagens = [viagens.joseSPCuritiba, viagens.joseRetorno];
  let totalViagensMotorista = 0;
  const viagemItems = [];

  for (const v of joseViagens) {
    if (!v) continue;
    const valorMotorista = Math.round(v.valor_total * jose.percentual / 100);
    totalViagensMotorista += valorMotorista;
    viagemItems.push({
      tipo: 'viagem',
      referencia_id: v.id,
      descricao: `${v.origem} -> ${v.destino}`,
      valor: valorMotorista,
      data: toDateStr(days[0]),
    });
  }

  // Get Jose's gastos for the week
  const { data: joseGastos } = await supabase.from('gasto')
    .select('id, valor, descricao, data')
    .eq('motorista_id', jose.id)
    .gte('data', toDateStr(days[0]))
    .lte('data', toDateStr(days[6]));

  let totalGastos = 0;
  const gastoItems = [];
  for (const g of (joseGastos || [])) {
    totalGastos += g.valor;
    gastoItems.push({
      tipo: 'gasto',
      referencia_id: g.id,
      descricao: g.descricao,
      valor: g.valor,
      data: g.data,
    });
  }

  const saldo = totalViagensMotorista - totalGastos;

  console.log(`  Jose Carlos - Periodo: ${toDateStr(days[0])} a ${toDateStr(days[6])}`);
  console.log(`  Viagens (valor motorista 25%): R$ ${(totalViagensMotorista / 100).toFixed(2)}`);
  console.log(`  Gastos totais: R$ ${(totalGastos / 100).toFixed(2)}`);
  console.log(`  Saldo: R$ ${(saldo / 100).toFixed(2)}`);

  const { data: fechamento, error: errFech } = await supabase.from('fechamento').insert({
    empresa_id: EMPRESA1_ID,
    motorista_id: jose.id,
    tipo: 'semanal',
    status: 'fechado',
    periodo_inicio: toDateStr(days[0]),
    periodo_fim: toDateStr(days[6]),
    total_viagens: totalViagensMotorista,
    total_gastos: totalGastos,
    saldo_motorista: saldo,
    observacao: 'Fechamento semanal automatico - simulacao',
    fechado_em: new Date().toISOString(),
    fechado_por: createdBy,
    created_by: createdBy,
  }).select().single();

  if (errFech) {
    console.log(`  ERRO fechamento: ${errFech.message}`);
    return;
  }
  console.log(`  Fechamento criado: ${fechamento.id.substring(0, 8)} (status: fechado)`);

  // Insert fechamento_items
  const allItems = [...viagemItems, ...gastoItems].map(item => ({
    ...item,
    fechamento_id: fechamento.id,
  }));

  const { data: items, error: errItems } = await supabase.from('fechamento_item').insert(allItems).select('id');
  if (errItems) {
    console.log(`  ERRO fechamento_items: ${errItems.message}`);
  } else {
    console.log(`  ${items.length} itens no fechamento (${viagemItems.length} viagens, ${gastoItems.length} gastos)`);
  }

  console.log(`\n  Antonio e Marcos: SEM acerto (pendente para o dono resolver)\n`);
}

// ============================================================
// PHASE 5: EMPRESA 2 (RM Cegonhas) - Smaller operation
// ============================================================

async function simulateEmpresa2() {
  console.log('============================================');
  console.log('  PHASE 5: RM CEGONHAS (operacao menor)');
  console.log('============================================\n');

  // Find RM Cegonhas empresa
  const { data: empresa } = await supabase.from('empresa')
    .select('id')
    .eq('cnpj', '33.444.555/0001-66')
    .single();

  if (!empresa) {
    console.log('  RM Cegonhas nao encontrada. Pulando fase 5.');
    return;
  }

  const emp2Id = empresa.id;
  console.log(`  Empresa: RM Cegonhas (${emp2Id.substring(0, 8)}...)`);

  // Get dono usuario_id
  const createdBy = await getDonoUsuarioId(emp2Id);
  if (!createdBy) {
    console.log('  WARN: Dono nao encontrado para RM Cegonhas. Pulando.');
    return;
  }

  // Get first motorista and caminhao
  const { data: motoristas } = await supabase.from('motorista')
    .select('id, nome, percentual_pagamento')
    .eq('empresa_id', emp2Id)
    .eq('status', 'ativo')
    .limit(1);

  const { data: caminhoes } = await supabase.from('caminhao')
    .select('id, placa')
    .eq('empresa_id', emp2Id)
    .eq('ativo', true)
    .limit(1);

  if (!motoristas?.length || !caminhoes?.length) {
    console.log('  WARN: Sem motorista ou caminhao em RM Cegonhas. Pulando.');
    return;
  }

  const mot = motoristas[0];
  const cam = caminhoes[0];
  console.log(`  Motorista: ${mot.nome} (${mot.percentual_pagamento}%)`);
  console.log(`  Caminhao: ${cam.placa}`);

  // Create vinculo
  await supabase.from('motorista_caminhao').insert({
    empresa_id: emp2Id,
    motorista_id: mot.id,
    caminhao_id: cam.id,
    data_inicio: toDateStr(getLastWeekDates()[0]),
    ativo: true,
  });
  console.log(`  Vinculo criado: ${mot.nome} -> ${cam.placa}`);

  const days = getLastWeekDates();
  const catMap = await getCategorias(emp2Id);
  const catComb = catMap['combustivel'];
  const catPed = catMap['pedagio'];

  // Viagem 1: BH -> Brasilia (concluded)
  const { data: vr1 } = await supabase.from('viagem').insert({
    empresa_id: emp2Id,
    motorista_id: mot.id,
    caminhao_id: cam.id,
    origem: 'Belo Horizonte, MG',
    destino: 'Brasilia, DF',
    data_saida: toISO(days[1], 7, 0),
    data_chegada_prevista: toISO(days[2], 18, 0),
    data_chegada_real: toISO(days[2], 16, 0),
    valor_total: 980000,
    percentual_pagamento: mot.percentual_pagamento,
    status: 'concluida',
    km_estimado: 735,
    km_saida: 310000,
    km_chegada: 310735,
    observacao: 'Entrega de veiculos para loja em Brasilia',
    editavel_motorista: false,
    created_by: createdBy,
  }).select().single();
  console.log(`  Viagem 1: BH -> Brasilia (R$ 9.800) - CONCLUIDA`);

  // Viagem 2: Brasilia -> Goiania (em_andamento)
  const { data: vr2 } = await supabase.from('viagem').insert({
    empresa_id: emp2Id,
    motorista_id: mot.id,
    caminhao_id: cam.id,
    origem: 'Brasilia, DF',
    destino: 'Goiania, GO',
    data_saida: toISO(days[4], 8, 0),
    data_chegada_prevista: toISO(days[5], 14, 0),
    valor_total: 520000,
    percentual_pagamento: mot.percentual_pagamento,
    status: 'em_andamento',
    km_estimado: 210,
    km_saida: 310800,
    observacao: 'Transporte de 5 veiculos para concessionaria GO',
    editavel_motorista: false,
    created_by: createdBy,
  }).select().single();
  console.log(`  Viagem 2: Brasilia -> Goiania (R$ 5.200) - EM_ANDAMENTO`);

  // Gastos for both trips
  if (catComb && catPed && vr1 && vr2) {
    const gastosEmp2 = [
      {
        empresa_id: emp2Id, categoria_id: catComb, motorista_id: mot.id,
        caminhao_id: cam.id, viagem_id: vr1.id, valor: 280000,
        data: toDateStr(days[1]), descricao: 'Diesel BH-Brasilia',
        litros: 400, tipo_combustivel: 'diesel_s10', posto_local: 'Posto Petrobras Sete Lagoas',
        uf_abastecimento: 'MG', created_by: createdBy,
      },
      {
        empresa_id: emp2Id, categoria_id: catPed, motorista_id: mot.id,
        caminhao_id: cam.id, viagem_id: vr1.id, valor: 22000,
        data: toDateStr(days[1]), descricao: 'Pedagios BR-040 MG-DF',
        created_by: createdBy,
      },
      {
        empresa_id: emp2Id, categoria_id: catComb, motorista_id: mot.id,
        caminhao_id: cam.id, viagem_id: vr2.id, valor: 98000,
        data: toDateStr(days[4]), descricao: 'Diesel Brasilia-Goiania',
        litros: 140, tipo_combustivel: 'diesel_s10', posto_local: 'Auto Posto Ipiranga Anapolis',
        uf_abastecimento: 'GO', created_by: createdBy,
      },
    ];

    const { data: gEmp2, error: errGE } = await supabase.from('gasto').insert(gastosEmp2).select('id');
    if (errGE) console.log(`  WARN gastos emp2: ${errGE.message}`);
    else console.log(`  ${gEmp2.length} gastos criados`);
  }

  // Update km_atual
  await supabase.from('caminhao').update({ km_atual: 310800 }).eq('id', cam.id);
  console.log(`  km_atual atualizado: ${cam.placa} = 310800\n`);
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log('');
  console.log('=============================================');
  console.log('  FROTAVIVA - SIMULACAO DE SEMANA REALISTA');
  console.log('=============================================');
  console.log(`  Data de execucao: ${new Date().toISOString().split('T')[0]}`);
  console.log(`  Semana simulada: ${toDateStr(getLastWeekDates()[0])} a ${toDateStr(getLastWeekDates()[6])}`);
  console.log('=============================================\n');

  try {
    // Phase 0: Cleanup
    await cleanup();

    // Phase 1: Update motoristas
    const motMap = await updateMotoristas();
    if (Object.keys(motMap).length === 0) {
      console.log('FATAL: Nenhum motorista encontrado. Verifique se seed-test-accounts.js foi executado.');
      process.exit(1);
    }

    // Phase 2: Vinculos
    const camMap = await createVinculos(motMap);

    // Phase 3: Week simulation
    const weekData = await simulateWeek(motMap, camMap);

    // Phase 4: Fechamento
    await createFechamento(motMap, weekData);

    // Phase 5: Empresa 2
    await simulateEmpresa2();

    // Final summary
    const days = getLastWeekDates();
    console.log('=============================================');
    console.log('  SIMULACAO CONCLUIDA COM SUCESSO');
    console.log('=============================================');
    console.log(`  Periodo: ${toDateStr(days[0])} (seg) a ${toDateStr(days[6])} (dom)`);
    console.log('');
    console.log('  EMPRESA 1 - Transportadora Teste Ltda:');
    console.log('  ----------------------------------------');
    console.log('  Motoristas:');
    console.log('    Jose Carlos Silva (25%) -> ABC1D23 Scania R450');
    console.log('    Antonio Pereira (28%)   -> XYZ4E56 Volvo FH 540');
    console.log('    Marcos Ribeiro (25%)    -> DEF2G34 Mercedes Actros');
    console.log('');
    console.log('  Viagens:');
    console.log('    Jose Carlos: SP->Curitiba (concl.) + Curitiba->SP (concl.) + SP->POA (plan.)');
    console.log('    Antonio:     SP->BH (concl.) + BH->SP (concl.)');
    console.log('    Marcos:      SP->Rio (concl.) + SP->Campinas (concl.)');
    console.log('');
    console.log('  Fechamento:');
    console.log('    Jose Carlos: FECHADO (semanal) - aguardando pagamento');
    console.log('    Antonio:     PENDENTE (sem acerto)');
    console.log('    Marcos:      PENDENTE (sem acerto)');
    console.log('');
    console.log('  EMPRESA 2 - RM Cegonhas:');
    console.log('  ----------------------------------------');
    console.log('    1 motorista, 2 viagens (1 concluida, 1 em andamento)');
    console.log('');
    console.log('  KM Atualizados:');
    console.log('    ABC1D23: 320.860 km');
    console.log('    XYZ4E56: 181.205 km');
    console.log('    DEF2G34: 285.600 km');
    console.log('=============================================');
  } catch (err) {
    console.error('\nFATAL:', err);
    process.exit(1);
  }
}

main();
