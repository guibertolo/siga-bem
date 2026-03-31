#!/usr/bin/env node

/**
 * Refresh benchmarking sector data.
 *
 * Calls fn_refresh_benchmarking() via Supabase service role client.
 * Can be run manually or scheduled via pg_cron / external cron.
 *
 * Usage:
 *   node scripts/refresh-benchmarking.js
 *
 * Requires environment variables:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

const { createClient } = require('@supabase/supabase-js');

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      'Erro: defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY',
    );
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log('Atualizando benchmarks do setor...');
  const startTime = Date.now();

  const { error } = await supabase.rpc('fn_refresh_benchmarking');

  if (error) {
    console.error('Erro ao atualizar benchmarks:', error.message);
    process.exit(1);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`Benchmarks atualizados com sucesso em ${elapsed}s`);

  // Print current state
  const { data, error: readErr } = await supabase
    .from('benchmarking_setor')
    .select('*')
    .order('tipo_cegonha');

  if (readErr) {
    console.error('Erro ao ler benchmarks:', readErr.message);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.log('\nNenhum dado no setor ainda (sem viagens concluidas).');
    return;
  }

  console.log('\n--- Benchmarks Atuais ---');
  for (const row of data) {
    console.log(`\nTipo: ${row.tipo_cegonha}`);
    console.log(`  Empresas: ${row.total_empresas}`);
    console.log(`  Caminhoes: ${row.total_caminhoes}`);
    console.log(
      `  Mediana km/L: ${row.mediana_kml != null ? row.mediana_kml : 'N/A'}`,
    );
    console.log(
      `  Mediana custo/km: ${row.mediana_custo_por_km_centavos != null ? `R$ ${(row.mediana_custo_por_km_centavos / 100).toFixed(2)}` : 'N/A'}`,
    );
    console.log(
      `  Mediana % combustivel/frete: ${row.mediana_pct_combustivel_frete != null ? `${row.mediana_pct_combustivel_frete}%` : 'N/A'}`,
    );
    console.log(
      `  Mediana margem viagem: ${row.mediana_margem_viagem_pct != null ? `${row.mediana_margem_viagem_pct}%` : 'N/A'}`,
    );
    console.log(
      `  Mediana manutencoes/caminhao: ${row.mediana_manutencoes_por_caminhao ?? 'N/A'}`,
    );
    console.log(`  Atualizado: ${row.atualizado_em}`);
  }
}

main().catch((err) => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
