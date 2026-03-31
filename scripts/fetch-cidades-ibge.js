#!/usr/bin/env node

/**
 * Fetch all Brazilian municipalities from IBGE API and save as a sorted JSON array.
 * Each entry formatted as "Cidade, UF" with accents removed.
 *
 * Run: node scripts/fetch-cidades-ibge.js
 * Output: public/data/cidades-brasil.json
 */

const fs = require('fs');
const path = require('path');

const IBGE_URL =
  'https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome';
const OUTPUT_PATH = path.resolve(__dirname, '..', 'public', 'data', 'cidades-brasil.json');

/**
 * Remove accents/diacritics from a string.
 */
function removeAccents(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

async function main() {
  console.log('Fetching municipalities from IBGE API...');

  const response = await fetch(IBGE_URL);

  if (!response.ok) {
    throw new Error(`IBGE API returned ${response.status}: ${response.statusText}`);
  }

  const municipios = await response.json();
  console.log(`Received ${municipios.length} municipalities.`);

  const cidades = municipios.map((m) => {
    const nome = removeAccents(m.nome);
    // Primary path: microrregiao.mesorregiao.UF.sigla
    // Fallback: regiao-imediata.regiao-intermediaria.UF.sigla (some newer municipalities)
    const uf =
      m.microrregiao?.mesorregiao?.UF?.sigla ??
      m['regiao-imediata']?.['regiao-intermediaria']?.UF?.sigla ??
      'XX';
    return `${nome}, ${uf}`;
  });

  // Sort alphabetically (accent-free strings sort naturally)
  cidades.sort((a, b) => a.localeCompare(b, 'pt-BR'));

  // Remove duplicates (shouldn't exist, but just in case)
  const unique = [...new Set(cidades)];

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(unique, null, 0), 'utf-8');

  const sizeKB = (Buffer.byteLength(JSON.stringify(unique)) / 1024).toFixed(1);
  console.log(`Saved ${unique.length} cities to ${OUTPUT_PATH} (${sizeKB} KB)`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
