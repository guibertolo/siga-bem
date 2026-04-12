/**
 * Seed script for FrotaViva test data.
 * Run: node scripts/seed-frota-viva.js
 *
 * Uses Supabase service role key to bypass RLS.
 */
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bsjuntynmnlhbvxemxqp.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY env var e obrigatoria. Defina em .env.local antes de rodar o seed.');
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const EMPRESA_ID = '69b9706d-7f86-464d-bf5c-847b4b1526d6';
const MOTORISTA_ID = '7ea0c555-7379-40d3-8421-54adb18a6e64';
// created_by references usuario.id (NOT auth_id)
const CREATED_BY_USUARIO_ID = '993182f0-aade-4ec3-a219-3400f6fb96c4';

async function seed() {
  const summary = { caminhoes: 0, vinculos: 0, viagens: 0, gastos: 0 };

  // 0. Cleanup: remove previous seed data if it exists
  console.log('--- Limpando dados anteriores do seed ---');
  // Delete gastos for these trips first (FK dependency)
  const { data: existingCam } = await supabase.from('caminhao').select('id').eq('empresa_id', EMPRESA_ID).in('placa', ['ABC1D23', 'XYZ4E56']);
  if (existingCam && existingCam.length > 0) {
    const camIds = existingCam.map(c => c.id);
    // Delete gastos linked to these caminhoes
    await supabase.from('gasto').delete().eq('empresa_id', EMPRESA_ID).in('caminhao_id', camIds);
    // Delete viagens linked to these caminhoes
    await supabase.from('viagem').delete().eq('empresa_id', EMPRESA_ID).in('caminhao_id', camIds);
    // Delete vinculos
    await supabase.from('motorista_caminhao').delete().eq('empresa_id', EMPRESA_ID).in('caminhao_id', camIds);
    // Delete caminhoes
    await supabase.from('caminhao').delete().eq('empresa_id', EMPRESA_ID).in('placa', ['ABC1D23', 'XYZ4E56']);
    console.log('Dados anteriores removidos.');
  } else {
    console.log('Nenhum dado anterior encontrado.');
  }

  // 1. Criar 2 caminhoes
  console.log('--- Criando caminhoes ---');
  const { data: caminhoes, error: errCam } = await supabase
    .from('caminhao')
    .insert([
      {
        empresa_id: EMPRESA_ID,
        placa: 'ABC1D23',
        modelo: 'Scania R450',
        marca: 'Scania',
        ano: 2022,
        tipo_cegonha: 'aberta',
        capacidade_veiculos: 11,
        km_atual: 320000,
        ativo: true,
      },
      {
        empresa_id: EMPRESA_ID,
        placa: 'XYZ4E56',
        modelo: 'Volvo FH 540',
        marca: 'Volvo',
        ano: 2023,
        tipo_cegonha: 'fechada',
        capacidade_veiculos: 11,
        km_atual: 180000,
        ativo: true,
      },
    ])
    .select();

  if (errCam) {
    console.error('ERRO caminhoes:', errCam.message);
    return;
  }
  summary.caminhoes = caminhoes.length;
  console.log('Caminhoes criados:', caminhoes.map(c => c.placa));

  const cam1 = caminhoes.find(c => c.placa === 'ABC1D23');
  const cam2 = caminhoes.find(c => c.placa === 'XYZ4E56');

  // 2. Vinculo motorista-caminhao
  console.log('\n--- Criando vinculo motorista-caminhao ---');
  const { data: vinculo, error: errVinc } = await supabase
    .from('motorista_caminhao')
    .insert({
      empresa_id: EMPRESA_ID,
      motorista_id: MOTORISTA_ID,
      caminhao_id: cam1.id,
      data_inicio: '2024-01-15',
      ativo: true,
      observacao: 'Motorista principal do Scania R450',
    })
    .select();

  if (errVinc) {
    console.error('ERRO vinculo:', errVinc.message);
    return;
  }
  summary.vinculos = 1;
  console.log('Vinculo criado:', vinculo[0].id);

  // 3. Buscar categorias de gasto
  console.log('\n--- Buscando categorias de gasto ---');
  const { data: categorias, error: errCat } = await supabase
    .from('categoria_gasto')
    .select('id, nome')
    .or(`empresa_id.is.null,empresa_id.eq.${EMPRESA_ID}`);

  if (errCat) {
    console.error('ERRO categorias:', errCat.message);
    return;
  }
  console.log('Categorias encontradas:', categorias.map(c => c.nome));

  // Build map (case-insensitive, accent-insensitive)
  const catMap = {};
  categorias.forEach(c => {
    catMap[c.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')] = c.id;
  });

  // Create missing categories
  const neededCats = [
    { key: 'combustivel', nome: 'Combustivel', icone: 'fuel', cor: '#F59E0B' },
    { key: 'pedagio', nome: 'Pedagio', icone: 'toll', cor: '#6366F1' },
    { key: 'alimentacao', nome: 'Alimentacao', icone: 'utensils', cor: '#10B981' },
    { key: 'manutencao', nome: 'Manutencao', icone: 'wrench', cor: '#EF4444' },
  ];

  for (const cat of neededCats) {
    if (!catMap[cat.key]) {
      console.log(`Categoria "${cat.nome}" nao encontrada, criando...`);
      const { data: newCat, error: errNew } = await supabase
        .from('categoria_gasto')
        .insert({
          empresa_id: EMPRESA_ID,
          nome: cat.nome,
          icone: cat.icone,
          cor: cat.cor,
          ativa: true,
          ordem: neededCats.indexOf(cat) + 1,
        })
        .select()
        .single();

      if (errNew) {
        console.error(`ERRO criando categoria ${cat.nome}:`, errNew.message);
        return;
      }
      catMap[cat.key] = newCat.id;
      console.log(`Categoria "${cat.nome}" criada: ${newCat.id}`);
    }
  }

  const catCombustivel = catMap['combustivel'];
  const catPedagio = catMap['pedagio'];
  const catAlimentacao = catMap['alimentacao'];
  const catManutencao = catMap['manutencao'];

  console.log('\nCategorias mapeadas:', { catCombustivel, catPedagio, catAlimentacao, catManutencao });

  if (!catCombustivel || !catPedagio || !catAlimentacao || !catManutencao) {
    console.error('ERRO: Nem todas as categorias foram resolvidas!');
    console.log('catMap:', catMap);
    return;
  }

  // 4. Criar 3 viagens
  console.log('\n--- Criando viagens ---');
  const { data: viagens, error: errViag } = await supabase
    .from('viagem')
    .insert([
      {
        empresa_id: EMPRESA_ID,
        motorista_id: MOTORISTA_ID,
        caminhao_id: cam1.id,
        origem: 'Sao Paulo, SP',
        destino: 'Curitiba, PR',
        data_saida: '2025-03-10T08:00:00Z',
        data_chegada_prevista: '2025-03-11T18:00:00Z',
        data_chegada_real: '2025-03-11T16:30:00Z',
        valor_total: 850000,
        percentual_pagamento: 25.0,
        status: 'concluida',
        km_estimado: 410,
        km_saida: 319500,
        km_chegada: 319910,
        observacao: 'Entrega concluida sem ocorrencias',
        editavel_motorista: false,
        created_by: CREATED_BY_USUARIO_ID,
      },
      {
        empresa_id: EMPRESA_ID,
        motorista_id: MOTORISTA_ID,
        caminhao_id: cam1.id,
        origem: 'Curitiba, PR',
        destino: 'Porto Alegre, RS',
        data_saida: '2025-03-20T06:00:00Z',
        data_chegada_prevista: '2025-03-21T14:00:00Z',
        valor_total: 650000,
        percentual_pagamento: 25.0,
        status: 'em_andamento',
        km_estimado: 710,
        km_saida: 319910,
        observacao: 'Em rota pela BR-116',
        editavel_motorista: true,
        created_by: CREATED_BY_USUARIO_ID,
      },
      {
        empresa_id: EMPRESA_ID,
        motorista_id: MOTORISTA_ID,
        caminhao_id: cam2.id,
        origem: 'Sao Paulo, SP',
        destino: 'Belo Horizonte, MG',
        data_saida: '2025-04-01T07:00:00Z',
        data_chegada_prevista: '2025-04-02T12:00:00Z',
        valor_total: 720000,
        percentual_pagamento: 25.0,
        status: 'planejada',
        km_estimado: 585,
        observacao: 'Viagem agendada',
        editavel_motorista: true,
        created_by: CREATED_BY_USUARIO_ID,
      },
    ])
    .select();

  if (errViag) {
    console.error('ERRO viagens:', errViag.message);
    return;
  }
  summary.viagens = viagens.length;
  console.log('Viagens criadas:');
  viagens.forEach(v => console.log(`  ${v.origem} -> ${v.destino} (${v.status}): ${v.id}`));

  const viag1 = viagens.find(v => v.status === 'concluida');
  const viag2 = viagens.find(v => v.status === 'em_andamento');

  // 5. Criar gastos vinculados
  console.log('\n--- Criando gastos ---');
  const gastosData = [
    // Viagem 1 - concluida (4 gastos)
    {
      empresa_id: EMPRESA_ID,
      categoria_id: catCombustivel,
      motorista_id: MOTORISTA_ID,
      caminhao_id: cam1.id,
      viagem_id: viag1.id,
      valor: 320000,
      data: '2025-03-10',
      descricao: 'Abastecimento saida SP',
      litros: 480.5,
      tipo_combustivel: 'diesel_s10',
      posto_local: 'Posto Shell BR-116',
      uf_abastecimento: 'SP',
      created_by: CREATED_BY_USUARIO_ID,
    },
    {
      empresa_id: EMPRESA_ID,
      categoria_id: catPedagio,
      motorista_id: MOTORISTA_ID,
      caminhao_id: cam1.id,
      viagem_id: viag1.id,
      valor: 45000,
      data: '2025-03-10',
      descricao: 'Pedagios SP-PR via Regis Bittencourt',
      created_by: CREATED_BY_USUARIO_ID,
    },
    {
      empresa_id: EMPRESA_ID,
      categoria_id: catAlimentacao,
      motorista_id: MOTORISTA_ID,
      caminhao_id: cam1.id,
      viagem_id: viag1.id,
      valor: 28000,
      data: '2025-03-10',
      descricao: 'Refeicoes em rota SP-PR',
      created_by: CREATED_BY_USUARIO_ID,
    },
    {
      empresa_id: EMPRESA_ID,
      categoria_id: catManutencao,
      motorista_id: MOTORISTA_ID,
      caminhao_id: cam1.id,
      viagem_id: viag1.id,
      valor: 15000,
      data: '2025-03-11',
      descricao: 'Troca de lampada farol dianteiro',
      created_by: CREATED_BY_USUARIO_ID,
    },
    // Viagem 2 - em_andamento (3 gastos)
    {
      empresa_id: EMPRESA_ID,
      categoria_id: catCombustivel,
      motorista_id: MOTORISTA_ID,
      caminhao_id: cam1.id,
      viagem_id: viag2.id,
      valor: 180000,
      data: '2025-03-20',
      descricao: 'Abastecimento saida Curitiba',
      litros: 270.3,
      tipo_combustivel: 'diesel_s10',
      posto_local: 'Auto Posto Ipiranga',
      uf_abastecimento: 'PR',
      created_by: CREATED_BY_USUARIO_ID,
    },
    {
      empresa_id: EMPRESA_ID,
      categoria_id: catPedagio,
      motorista_id: MOTORISTA_ID,
      caminhao_id: cam1.id,
      viagem_id: viag2.id,
      valor: 32000,
      data: '2025-03-20',
      descricao: 'Pedagios PR-RS via BR-116',
      created_by: CREATED_BY_USUARIO_ID,
    },
    {
      empresa_id: EMPRESA_ID,
      categoria_id: catAlimentacao,
      motorista_id: MOTORISTA_ID,
      caminhao_id: cam1.id,
      viagem_id: viag2.id,
      valor: 18000,
      data: '2025-03-20',
      descricao: 'Almoco posto rodoviario',
      created_by: CREATED_BY_USUARIO_ID,
    },
  ];

  const { data: gastos, error: errGasto } = await supabase
    .from('gasto')
    .insert(gastosData)
    .select();

  if (errGasto) {
    console.error('ERRO gastos:', errGasto.message);
    return;
  }
  summary.gastos = gastos.length;
  console.log(`Gastos criados: ${gastos.length}`);

  // 7. Resumo final
  const totalGastosCentavos = gastosData.reduce((s, g) => s + g.valor, 0);
  const totalViagensCentavos = 850000 + 650000 + 720000;

  console.log('\n====================================');
  console.log('     SEED CONCLUIDO COM SUCESSO');
  console.log('====================================');
  console.log(`Caminhoes criados:  ${summary.caminhoes}`);
  console.log(`Vinculos criados:   ${summary.vinculos}`);
  console.log(`Viagens criadas:    ${summary.viagens}`);
  console.log(`Gastos criados:     ${summary.gastos}`);
  console.log('------------------------------------');
  console.log(`Total gastos:       R$ ${(totalGastosCentavos / 100).toFixed(2)}`);
  console.log(`Total frete:        R$ ${(totalViagensCentavos / 100).toFixed(2)}`);
  console.log('------------------------------------');
  console.log('IDs dos caminhoes:');
  console.log(`  Scania R450 (ABC1D23):   ${cam1.id}`);
  console.log(`  Volvo FH 540 (XYZ4E56):  ${cam2.id}`);
  console.log('IDs das viagens:');
  viagens.forEach(v => console.log(`  ${v.origem} -> ${v.destino}: ${v.id}`));
  console.log('====================================');
}

seed().catch(err => console.error('FATAL:', err));
