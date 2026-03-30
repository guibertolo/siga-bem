/**
 * Seed: 3 meses de dados ricos de operacao de frota (Jan-Mar 2026).
 * Run: node scripts/seed-dados-ricos.js
 *
 * Gera ~90-100 viagens para Empresa 1 (3 motoristas) e ~20 para Empresa 2 (1 motorista).
 * Inclui gastos realistas, fechamentos para Jan/Fev, e km_atual atualizado.
 *
 * Idempotent: cleanup primeiro, depois recria tudo.
 */
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://bsjuntynmnlhbvxemxqp.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzanVudHlubW5saGJ2eGVteHFwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDczOTc1MiwiZXhwIjoyMDkwMzE1NzUyfQ.K-4mVfrUvz1JWfoJ5RoDNVowpXO4yUDe22Re4bpYaC4';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const EMPRESA1_ID = '69b9706d-7f86-464d-bf5c-847b4b1526d6';
const EMPRESA2_ID = '58c20582-36ff-4e9a-b98a-e3f772a8c628';

// ============================================================
// ROTAS REALISTAS
// ============================================================

const ROTAS = [
  { origem: 'Sao Paulo, SP', destino: 'Curitiba, PR', km: 410, valorBase: 850000 },
  { origem: 'Curitiba, PR', destino: 'Porto Alegre, RS', km: 710, valorBase: 650000 },
  { origem: 'Sao Paulo, SP', destino: 'Belo Horizonte, MG', km: 585, valorBase: 720000 },
  { origem: 'Rio de Janeiro, RJ', destino: 'Sao Paulo, SP', km: 430, valorBase: 550000 },
  { origem: 'Belo Horizonte, MG', destino: 'Brasilia, DF', km: 735, valorBase: 980000 },
  { origem: 'Porto Alegre, RS', destino: 'Florianopolis, SC', km: 470, valorBase: 480000 },
  { origem: 'Sao Paulo, SP', destino: 'Campinas, SP', km: 100, valorBase: 320000 },
  { origem: 'Curitiba, PR', destino: 'Londrina, PR', km: 380, valorBase: 390000 },
];

const POSTOS = ['Posto Shell', 'Auto Posto Ipiranga', 'Posto Graal', 'Rede Sim', 'Posto Ale'];

// ============================================================
// HELPERS
// ============================================================

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min, max) {
  return min + Math.random() * (max - min);
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function toDateStr(date) {
  return date.toISOString().split('T')[0];
}

function toISO(date, hours, minutes = 0) {
  const d = new Date(date);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

/** Extract UF from "City, UF" format */
function extractUF(local) {
  const match = local.match(/,\s*([A-Z]{2})$/);
  return match ? match[1] : 'SP';
}

/** Get all weekdays (Mon-Sat) in a given week starting from weekStart (Monday) */
function getWeekdays(weekStart) {
  const days = [];
  for (let i = 0; i < 6; i++) { // Mon-Sat
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    days.push(d);
  }
  return days;
}

/** Generate all Mondays between startDate and endDate */
function getMondays(startDate, endDate) {
  const mondays = [];
  const d = new Date(startDate);
  // Advance to first Monday
  while (d.getDay() !== 1) d.setDate(d.getDate() + 1);
  while (d <= endDate) {
    mondays.push(new Date(d));
    d.setDate(d.getDate() + 7);
  }
  return mondays;
}

// ============================================================
// PHASE 0: CLEANUP
// ============================================================

async function cleanup() {
  console.log('============================================');
  console.log('  PHASE 0: CLEANUP (operational data only)');
  console.log('============================================\n');

  const { data: empresas } = await supabase.from('empresa').select('id, nome_fantasia');
  if (!empresas || empresas.length === 0) {
    console.log('  Nenhuma empresa encontrada. Abortando cleanup.');
    return;
  }
  console.log(`  Empresas: ${empresas.map(e => e.nome_fantasia || e.id.substring(0, 8)).join(', ')}`);

  for (const emp of empresas) {
    console.log(`\n  Limpando empresa: ${emp.nome_fantasia || emp.id.substring(0, 8)}...`);

    // 1. fechamento_item (depends on fechamento)
    const { data: fechamentos } = await supabase.from('fechamento').select('id').eq('empresa_id', emp.id);
    if (fechamentos && fechamentos.length > 0) {
      const fechIds = fechamentos.map(f => f.id);
      const { error: errFi } = await supabase.from('fechamento_item').delete().in('fechamento_id', fechIds);
      if (errFi) console.log(`    WARN fechamento_item: ${errFi.message}`);
      else console.log('    fechamento_item: removidos');
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
// PHASE 1: QUERY EXISTING DATA
// ============================================================

async function queryExistingData(empresaId) {
  // Motoristas
  const { data: motoristas } = await supabase
    .from('motorista')
    .select('id, nome, percentual_pagamento')
    .eq('empresa_id', empresaId)
    .eq('status', 'ativo');

  // Caminhoes
  const { data: caminhoes } = await supabase
    .from('caminhao')
    .select('id, placa, modelo, km_atual')
    .eq('empresa_id', empresaId)
    .eq('ativo', true);

  // Categorias (global + empresa)
  const { data: categorias } = await supabase
    .from('categoria_gasto')
    .select('id, nome')
    .or(`empresa_id.is.null,empresa_id.eq.${empresaId}`);

  // Dono usuario_id
  const { data: donoData } = await supabase
    .from('usuario_empresa')
    .select('usuario_id')
    .eq('empresa_id', empresaId)
    .eq('role', 'dono')
    .limit(1)
    .single();

  // Build categoria map (accent-insensitive, lowercase)
  const catMap = {};
  (categorias || []).forEach(c => {
    const key = c.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    catMap[key] = c.id;
  });

  return {
    motoristas: motoristas || [],
    caminhoes: caminhoes || [],
    catMap,
    donoUsuarioId: donoData?.usuario_id || null,
  };
}

// ============================================================
// PHASE 2: VINCULOS
// ============================================================

async function createVinculos(empresaId, motoristas, caminhoes, startDate) {
  console.log('============================================');
  console.log(`  PHASE 2: VINCULOS (empresa ${empresaId.substring(0, 8)})`);
  console.log('============================================\n');

  // Match motoristas to caminhoes by index (1:1 assignment)
  const count = Math.min(motoristas.length, caminhoes.length);
  const assignments = [];

  for (let i = 0; i < count; i++) {
    const mot = motoristas[i];
    const cam = caminhoes[i];

    const { error } = await supabase.from('motorista_caminhao').insert({
      empresa_id: empresaId,
      motorista_id: mot.id,
      caminhao_id: cam.id,
      data_inicio: toDateStr(startDate),
      ativo: true,
      observacao: `Vinculo trimestral - ${cam.modelo}`,
    });

    if (error) {
      console.log(`  WARN vinculo ${mot.nome} -> ${cam.placa}: ${error.message}`);
    } else {
      console.log(`  ${mot.nome} -> ${cam.placa} (${cam.modelo})`);
      assignments.push({ motorista: mot, caminhao: cam });
    }
  }

  console.log('');
  return assignments;
}

// ============================================================
// PHASE 3: GENERATE 3 MONTHS OF VIAGENS
// ============================================================

async function generateViagens(empresaId, assignments, catMap, donoUsuarioId, startDate, endDate, opts = {}) {
  console.log('============================================');
  console.log(`  PHASE 3: VIAGENS (empresa ${empresaId.substring(0, 8)})`);
  console.log(`  Periodo: ${toDateStr(startDate)} a ${toDateStr(endDate)}`);
  console.log('============================================\n');

  const mondays = getMondays(startDate, endDate);
  const totalWeeks = mondays.length;
  const viagensPerMotoristaPerWeek = opts.viagensPerWeek || [2, 3]; // min, max

  // Track km per caminhao
  const kmTracker = {};
  for (const a of assignments) {
    kmTracker[a.caminhao.id] = a.caminhao.km_atual || 200000;
  }

  const allViagens = [];
  const allGastos = [];
  let viagemCount = 0;
  let gastoCount = 0;

  // Determine how many viagens stay open (last 3-5)
  const totalExpectedViagens = totalWeeks * assignments.length * 2;
  const openViagemCount = rand(3, 5);

  for (let weekIdx = 0; weekIdx < totalWeeks; weekIdx++) {
    const weekStart = mondays[weekIdx];
    const weekdays = getWeekdays(weekStart);
    const isLastWeek = weekIdx >= totalWeeks - 1;

    for (const assignment of assignments) {
      const { motorista, caminhao } = assignment;
      const numViagens = rand(viagensPerMotoristaPerWeek[0], viagensPerMotoristaPerWeek[1]);

      for (let v = 0; v < numViagens; v++) {
        const rota = pick(ROTAS);
        const departureDay = weekdays[rand(0, Math.min(weekdays.length - 1, 3))];
        const departureHour = rand(5, 8);

        // Valor with variation (-10% to +15%)
        const valorVariation = randFloat(0.90, 1.15);
        const valorTotal = Math.round(rota.valorBase * valorVariation);

        // KM tracking
        const kmGap = rand(20, 80); // invisible km (garage, fuel stop, etc.)
        const currentKm = kmTracker[caminhao.id];
        const kmSaida = currentKm + kmGap;
        const kmVariation = randFloat(0.95, 1.05);
        const kmViagem = Math.round(rota.km * kmVariation);
        const kmChegada = kmSaida + kmViagem;
        kmTracker[caminhao.id] = kmChegada;

        // Travel time: 1-2 days
        const travelHours = rota.km < 200 ? rand(6, 12) : rand(18, 40);
        const arrivalDate = new Date(departureDay);
        arrivalDate.setHours(arrivalDate.getHours() + travelHours);

        // Determine status
        const viagensLeft = (totalWeeks - weekIdx - 1) * assignments.length * 2 +
          (assignments.indexOf(assignment)) * numViagens + (numViagens - v);
        let status = 'concluida';

        if (isLastWeek && v === numViagens - 1) {
          // Last viagem of last week: make some open
          const openStatuses = ['em_andamento', 'planejada'];
          status = pick(openStatuses);
        } else if (viagemCount >= totalExpectedViagens - openViagemCount) {
          status = pick(['em_andamento', 'planejada']);
        }

        const percentual = motorista.percentual_pagamento || 25;

        const viagemData = {
          empresa_id: empresaId,
          motorista_id: motorista.id,
          caminhao_id: caminhao.id,
          origem: rota.origem,
          destino: rota.destino,
          data_saida: toISO(departureDay, departureHour, rand(0, 59)),
          data_chegada_prevista: toISO(arrivalDate, rand(14, 20)),
          valor_total: valorTotal,
          percentual_pagamento: percentual,
          status,
          km_estimado: rota.km,
          km_saida: kmSaida,
          editavel_motorista: false,
          created_by: donoUsuarioId,
        };

        if (status === 'concluida') {
          viagemData.data_chegada_real = toISO(arrivalDate, rand(10, 20), rand(0, 59));
          viagemData.km_chegada = kmChegada;
        } else if (status === 'em_andamento') {
          // Em andamento: has km_saida but no chegada yet
          viagemData.km_chegada = null;
          viagemData.data_chegada_real = null;
        } else {
          // planejada
          viagemData.km_saida = null;
          viagemData.km_chegada = null;
          viagemData.data_chegada_real = null;
        }

        const { data: inserted, error: errV } = await supabase
          .from('viagem')
          .insert(viagemData)
          .select()
          .single();

        if (errV) {
          console.log(`  WARN viagem ${rota.origem}->${rota.destino}: ${errV.message}`);
          continue;
        }

        viagemCount++;
        allViagens.push({ ...inserted, _rota: rota });

        // Generate gastos only for concluida viagens
        if (status === 'concluida') {
          const gastos = generateGastos(
            empresaId, motorista, caminhao, inserted, rota,
            catMap, donoUsuarioId, departureDay
          );
          allGastos.push(...gastos);
        }

        if (viagemCount % 10 === 0) {
          process.stdout.write(`  Viagens: ${viagemCount}...\r`);
        }
      }
    }
  }

  console.log(`  Total viagens criadas: ${viagemCount}`);

  // Batch insert gastos (in chunks of 50 to avoid payload limits)
  if (allGastos.length > 0) {
    console.log(`  Inserindo ${allGastos.length} gastos...`);
    const chunkSize = 50;
    for (let i = 0; i < allGastos.length; i += chunkSize) {
      const chunk = allGastos.slice(i, i + chunkSize);
      const { data: insertedGastos, error: errG } = await supabase
        .from('gasto')
        .insert(chunk)
        .select('id, viagem_id, categoria_id, valor, data, motorista_id');

      if (errG) {
        console.log(`  WARN gastos chunk ${i}: ${errG.message}`);
      } else {
        gastoCount += insertedGastos.length;
      }
    }
    console.log(`  Total gastos criados: ${gastoCount}`);
  }

  console.log('');
  return { viagens: allViagens, gastoCount, kmTracker };
}

// ============================================================
// GASTO GENERATION
// ============================================================

function generateGastos(empresaId, motorista, caminhao, viagem, rota, catMap, donoUsuarioId, departureDay) {
  const gastos = [];

  const catComb = catMap['combustivel'];
  const catPed = catMap['pedagio'];
  const catAlim = catMap['alimentacao'];
  const catManut = catMap['manutencao'];
  const catPneu = catMap['pneu'];

  if (!catComb) return gastos; // safety

  // 1. Combustivel (ALWAYS)
  const consumoKmPerLitro = randFloat(2.0, 3.0);
  const litros = Math.round(rota.km / consumoKmPerLitro * 10) / 10; // 1 decimal
  const precoLitro = randFloat(6.50, 7.50);
  const valorComb = Math.round(litros * precoLitro * 100); // centavos

  gastos.push({
    empresa_id: empresaId,
    categoria_id: catComb,
    motorista_id: motorista.id,
    caminhao_id: caminhao.id,
    viagem_id: viagem.id,
    valor: valorComb,
    data: toDateStr(departureDay),
    descricao: `Abastecimento ${rota.origem.split(',')[0]} - ${rota.destino.split(',')[0]}`,
    litros,
    tipo_combustivel: Math.random() < 0.80 ? 'diesel_s10' : 'diesel_comum',
    posto_local: pick(POSTOS),
    uf_abastecimento: extractUF(rota.origem),
    created_by: donoUsuarioId,
  });

  // 2. Pedagio (90% chance)
  if (catPed && Math.random() < 0.90) {
    // Pedagio correlates with distance
    const pedBase = rota.km < 200 ? rand(8000, 20000) : rand(15000, 55000);
    const pedVariation = randFloat(0.85, 1.15);
    gastos.push({
      empresa_id: empresaId,
      categoria_id: catPed,
      motorista_id: motorista.id,
      caminhao_id: caminhao.id,
      viagem_id: viagem.id,
      valor: Math.round(pedBase * pedVariation),
      data: toDateStr(departureDay),
      descricao: `Pedagios ${rota.origem.split(',')[0]} - ${rota.destino.split(',')[0]}`,
      created_by: donoUsuarioId,
    });
  }

  // 3. Alimentacao (70% chance)
  if (catAlim && Math.random() < 0.70) {
    // Next day for food (en route)
    const foodDay = new Date(departureDay);
    foodDay.setDate(foodDay.getDate() + (rota.km < 200 ? 0 : 1));
    gastos.push({
      empresa_id: empresaId,
      categoria_id: catAlim,
      motorista_id: motorista.id,
      caminhao_id: caminhao.id,
      viagem_id: viagem.id,
      valor: rand(8000, 25000),
      data: toDateStr(foodDay),
      descricao: `Refeicoes em rota`,
      created_by: donoUsuarioId,
    });
  }

  // 4. Manutencao (15% chance)
  if (catManut && Math.random() < 0.15) {
    const manutDescricoes = [
      'Troca de lampada',
      'Troca de oleo',
      'Reparo no freio',
      'Ajuste na suspensao',
      'Troca de correia',
      'Reparo eletrico',
    ];
    gastos.push({
      empresa_id: empresaId,
      categoria_id: catManut,
      motorista_id: motorista.id,
      caminhao_id: caminhao.id,
      viagem_id: viagem.id,
      valor: rand(15000, 250000),
      data: toDateStr(departureDay),
      descricao: pick(manutDescricoes),
      created_by: donoUsuarioId,
    });
  }

  // 5. Pneu (5% chance)
  if (catPneu && Math.random() < 0.05) {
    gastos.push({
      empresa_id: empresaId,
      categoria_id: catPneu,
      motorista_id: motorista.id,
      caminhao_id: caminhao.id,
      viagem_id: viagem.id,
      valor: rand(80000, 350000),
      data: toDateStr(departureDay),
      descricao: 'Troca de pneu em rota',
      created_by: donoUsuarioId,
    });
  }

  return gastos;
}

// ============================================================
// PHASE 5: FECHAMENTOS (Jan + Feb)
// ============================================================

async function createFechamentos(empresaId, motoristas, donoUsuarioId) {
  console.log('============================================');
  console.log(`  PHASE 5: FECHAMENTOS (empresa ${empresaId.substring(0, 8)})`);
  console.log('============================================\n');

  const months = [
    { inicio: '2026-01-01', fim: '2026-01-31', status: 'pago', label: 'Janeiro' },
    { inicio: '2026-02-01', fim: '2026-02-28', status: 'fechado', label: 'Fevereiro' },
  ];

  let fechamentoCount = 0;
  let itemCount = 0;

  for (const month of months) {
    for (const mot of motoristas) {
      // Query viagens concluidas in period
      const { data: viagens } = await supabase
        .from('viagem')
        .select('id, valor_total, percentual_pagamento, data_saida')
        .eq('empresa_id', empresaId)
        .eq('motorista_id', mot.id)
        .eq('status', 'concluida')
        .gte('data_saida', `${month.inicio}T00:00:00`)
        .lte('data_saida', `${month.fim}T23:59:59`);

      // Query gastos in period
      const { data: gastos } = await supabase
        .from('gasto')
        .select('id, valor, data, descricao')
        .eq('empresa_id', empresaId)
        .eq('motorista_id', mot.id)
        .gte('data', month.inicio)
        .lte('data', month.fim);

      const totalViagens = (viagens || []).reduce((sum, v) => {
        return sum + Math.round(v.valor_total * v.percentual_pagamento / 100);
      }, 0);

      const totalGastos = (gastos || []).reduce((sum, g) => sum + g.valor, 0);
      const saldo = totalViagens - totalGastos;

      const now = new Date().toISOString();
      const fechamentoData = {
        empresa_id: empresaId,
        motorista_id: mot.id,
        tipo: 'mensal',
        status: month.status,
        periodo_inicio: month.inicio,
        periodo_fim: month.fim,
        total_viagens: totalViagens,
        total_gastos: totalGastos,
        saldo_motorista: saldo,
        observacao: `Fechamento ${month.label} 2026`,
        created_by: donoUsuarioId,
      };

      if (month.status === 'fechado' || month.status === 'pago') {
        fechamentoData.fechado_em = now;
        fechamentoData.fechado_por = donoUsuarioId;
      }
      if (month.status === 'pago') {
        fechamentoData.pago_em = now;
        fechamentoData.pago_por = donoUsuarioId;
      }

      const { data: fech, error: errFech } = await supabase
        .from('fechamento')
        .insert(fechamentoData)
        .select()
        .single();

      if (errFech) {
        console.log(`  WARN fechamento ${mot.nome} ${month.label}: ${errFech.message}`);
        continue;
      }

      fechamentoCount++;

      // Create fechamento_items for viagens
      const viagemItems = (viagens || []).map(v => ({
        fechamento_id: fech.id,
        tipo: 'viagem',
        referencia_id: v.id,
        descricao: `Viagem ${new Date(v.data_saida).toLocaleDateString('pt-BR')}`,
        valor: Math.round(v.valor_total * v.percentual_pagamento / 100),
        data: v.data_saida.split('T')[0],
      }));

      // Create fechamento_items for gastos
      const gastoItems = (gastos || []).map(g => ({
        fechamento_id: fech.id,
        tipo: 'gasto',
        referencia_id: g.id,
        descricao: g.descricao || 'Gasto operacional',
        valor: g.valor,
        data: g.data,
      }));

      const allItems = [...viagemItems, ...gastoItems];
      if (allItems.length > 0) {
        const { data: insertedItems, error: errItems } = await supabase
          .from('fechamento_item')
          .insert(allItems)
          .select('id');

        if (errItems) {
          console.log(`  WARN items ${mot.nome} ${month.label}: ${errItems.message}`);
        } else {
          itemCount += insertedItems.length;
        }
      }

      console.log(`  ${mot.nome} - ${month.label}: ${(viagens || []).length} viagens, ${(gastos || []).length} gastos, saldo R$ ${(saldo / 100).toFixed(2)} [${month.status}]`);
    }
  }

  console.log(`\n  Fechamentos: ${fechamentoCount}, Items: ${itemCount}`);
  console.log('  Marco: sem fechamento (pendente para acerto)\n');
}

// ============================================================
// PHASE 6: UPDATE KM_ATUAL
// ============================================================

async function updateKmAtual(kmTracker) {
  console.log('============================================');
  console.log('  PHASE 6: UPDATE KM_ATUAL');
  console.log('============================================\n');

  for (const [caminhaoId, km] of Object.entries(kmTracker)) {
    const { error } = await supabase
      .from('caminhao')
      .update({ km_atual: km })
      .eq('id', caminhaoId);

    if (error) {
      console.log(`  WARN km ${caminhaoId.substring(0, 8)}: ${error.message}`);
    } else {
      console.log(`  Caminhao ${caminhaoId.substring(0, 8)}: km_atual = ${km.toLocaleString()}`);
    }
  }
  console.log('');
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log('\n========================================================');
  console.log('  SEED: 3 MESES DE DADOS RICOS - FROTAVIVA');
  console.log('  Periodo: Janeiro a Marco 2026');
  console.log('========================================================\n');

  const startDate = new Date(2026, 0, 1); // Jan 1, 2026
  const endDate = new Date(2026, 2, 30);   // Mar 30, 2026

  // Phase 0: Cleanup
  await cleanup();

  // ============================
  // EMPRESA 1 (Transportadora principal)
  // ============================
  console.log('\n  ========== EMPRESA 1 ==========\n');

  const data1 = await queryExistingData(EMPRESA1_ID);
  if (data1.motoristas.length === 0) {
    console.log('  ERRO: Nenhum motorista encontrado para Empresa 1!');
    return;
  }
  if (data1.caminhoes.length === 0) {
    console.log('  ERRO: Nenhum caminhao encontrado para Empresa 1!');
    return;
  }
  if (!data1.donoUsuarioId) {
    console.log('  ERRO: Dono usuario_id nao encontrado para Empresa 1!');
    return;
  }

  console.log(`  Motoristas: ${data1.motoristas.map(m => m.nome).join(', ')}`);
  console.log(`  Caminhoes: ${data1.caminhoes.map(c => c.placa).join(', ')}`);
  console.log(`  Categorias: ${Object.keys(data1.catMap).join(', ')}`);
  console.log(`  Dono: ${data1.donoUsuarioId.substring(0, 8)}\n`);

  // Phase 2: Vinculos
  const assignments1 = await createVinculos(EMPRESA1_ID, data1.motoristas, data1.caminhoes, startDate);

  // Phase 3: Viagens + Phase 4: Gastos (generated together)
  const result1 = await generateViagens(
    EMPRESA1_ID, assignments1, data1.catMap, data1.donoUsuarioId,
    startDate, endDate, { viagensPerWeek: [2, 3] }
  );

  // Phase 5: Fechamentos
  await createFechamentos(EMPRESA1_ID, data1.motoristas, data1.donoUsuarioId);

  // ============================
  // EMPRESA 2 (RM Cegonhas - menor)
  // ============================
  console.log('\n  ========== EMPRESA 2 (RM Cegonhas) ==========\n');

  const data2 = await queryExistingData(EMPRESA2_ID);
  if (data2.motoristas.length === 0) {
    console.log('  Empresa 2: Nenhum motorista. Pulando.');
  } else if (data2.caminhoes.length === 0) {
    console.log('  Empresa 2: Nenhum caminhao. Pulando.');
  } else if (!data2.donoUsuarioId) {
    console.log('  Empresa 2: Dono nao encontrado. Pulando.');
  } else {
    console.log(`  Motoristas: ${data2.motoristas.map(m => m.nome).join(', ')}`);
    console.log(`  Caminhoes: ${data2.caminhoes.map(c => c.placa).join(', ')}`);
    console.log(`  Dono: ${data2.donoUsuarioId.substring(0, 8)}\n`);

    // Only use first motorista + first caminhao for smaller operation
    const smallMotoristas = [data2.motoristas[0]];
    const smallCaminhoes = [data2.caminhoes[0]];

    const assignments2 = await createVinculos(EMPRESA2_ID, smallMotoristas, smallCaminhoes, startDate);

    const result2 = await generateViagens(
      EMPRESA2_ID, assignments2, data2.catMap, data2.donoUsuarioId,
      startDate, endDate, { viagensPerWeek: [1, 2] }
    );

    await createFechamentos(EMPRESA2_ID, smallMotoristas, data2.donoUsuarioId);

    // Update km for empresa 2
    await updateKmAtual(result2.kmTracker);
  }

  // Phase 6: Update km_atual for empresa 1
  await updateKmAtual(result1.kmTracker);

  // ============================
  // SUMMARY
  // ============================
  console.log('========================================================');
  console.log('  SEED CONCLUIDO!');
  console.log('========================================================');
  console.log(`  Empresa 1: ${result1.viagens.length} viagens, ${result1.gastoCount} gastos`);
  console.log('  Fechamentos: Jan (pago), Fev (fechado), Mar (pendente)');
  console.log('========================================================\n');
}

main().catch(err => {
  console.error('ERRO FATAL:', err);
  process.exit(1);
});
