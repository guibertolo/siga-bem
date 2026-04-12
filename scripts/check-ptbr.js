#!/usr/bin/env node
/**
 * check-ptbr.js — Detect unaccented PT-BR words in user-visible strings.
 *
 * Scans .tsx and .ts files in components/ and app/ for common Portuguese words
 * that are missing diacritics. Only flags matches that appear inside:
 *   - JSX text content (between > and <, outside of expressions {})
 *   - String literals used as user-visible content (error messages, labels, titles)
 *   - Specific JSX attributes: placeholder, title, aria-label, alt, label
 *   - Object literal values for keys: titulo, descricao, referencia, valor, error
 *
 * Does NOT flag: import paths, variable names, function names, DB columns,
 * code comments, type annotations, className, htmlFor, id, route paths,
 * Supabase .select()/.eq()/.in() queries, or property access like {item.descricao}.
 *
 * Exit code 0 = clean, exit code 1 = violations found.
 * Usage: node scripts/check-ptbr.js
 */

const fs = require('fs');
const path = require('path');

// Dictionary: unaccented -> accented
const DICTIONARY = [
  ['Situacao', 'Situação'],
  ['Saida', 'Saída'],
  ['Distancia', 'Distância'],
  ['Opcao', 'Opção'],
  ['Opcoes', 'Opções'],
  ['Veiculo', 'Veículo'],
  ['Veiculos', 'Veículos'],
  ['Numero', 'Número'],
  ['Descricao', 'Descrição'],
  ['Observacao', 'Observação'],
  ['Periodo', 'Período'],
  ['Manutencao', 'Manutenção'],
  ['Manutencoes', 'Manutenções'],
  ['Informacoes', 'Informações'],
  ['Vinculo', 'Vínculo'],
  ['Vinculos', 'Vínculos'],
  ['Historico', 'Histórico'],
  ['Posicao', 'Posição'],
  ['Condicao', 'Condição'],
  ['Condicoes', 'Condições'],
  ['Restricao', 'Restrição'],
  ['Operacao', 'Operação'],
  ['Inclusao', 'Inclusão'],
  ['Exclusao', 'Exclusão'],
  ['Classificacao', 'Classificação'],
  ['Referencia', 'Referência'],
  ['Frequencia', 'Frequência'],
  ['Matricula', 'Matrícula'],
  ['Concluida', 'Concluída'],
  ['Concluidas', 'Concluídas'],
  ['Concluido', 'Concluído'],
  ['Concluidos', 'Concluídos'],
  ['Titulo', 'Título'],
  ['Codigo', 'Código'],
  ['Unico', 'Único'],
  ['Unica', 'Única'],
  ['Inicio', 'Início'],
  ['Minimo', 'Mínimo'],
  ['Maximo', 'Máximo'],
  ['Odometro', 'Odômetro'],
  ['Quilometro', 'Quilômetro'],
  ['Combustivel', 'Combustível'],
];

const fixMap = new Map(
  DICTIONARY.map(([bad, good]) => [bad.toLowerCase(), good]),
);

const dictWords = new Set(DICTIONARY.map(([bad]) => bad.toLowerCase()));

/**
 * Extract all user-visible string segments from a line.
 * Returns array of { text, startCol } for segments that are user-visible.
 */
function extractUserVisibleSegments(line) {
  const segments = [];
  const trimmed = line.trim();

  // Skip lines that are purely code structure (no user-visible text possible)
  if (/^\s*\/\//.test(line)) return segments; // single-line comment
  if (/^\s*\*/.test(trimmed)) return segments; // block comment continuation
  if (/^\s*import\s/.test(line)) return segments; // import statement
  if (/^\s*export\s+(type|interface)\s/.test(line)) return segments; // type export
  if (/^\s*(type|interface)\s/.test(trimmed)) return segments; // type/interface def
  if (/\.(eq|in|select|order|filter)\s*\(/.test(line)) return segments; // Supabase queries
  if (/revalidatePath\(/.test(line)) return segments; // Next.js revalidate
  if (/router\.push\(/.test(line)) return segments; // router navigation
  if (/href\s*=/.test(line) && !/aria-label/.test(line)) return segments; // links (but allow aria-label on same line)
  if (/\.register\(/.test(line)) return segments; // react-hook-form register
  if (/searchParams\.get\(/.test(line)) return segments; // URL params
  if (/^\s*\{\/\*.*\*\/\}\s*$/.test(line)) return segments; // JSX comment line

  // 1. Extract JSX text content: text between > and < that is NOT inside {}
  //    Match >...text...< but not >{expression}<
  const jsxTextRe = />([^<{]*)</g;
  let m;
  while ((m = jsxTextRe.exec(line)) !== null) {
    if (m[1].trim()) {
      segments.push(m[1]);
    }
  }

  // 2. Extract user-visible attribute values
  const attrRe = /(?:placeholder|title|aria-label|alt)\s*=\s*(?:"([^"]*)"|'([^']*)'|\{`([^`]*)`\})/g;
  while ((m = attrRe.exec(line)) !== null) {
    segments.push(m[1] || m[2] || m[3] || '');
  }

  // 3. Extract label= prop value (for component props)
  const labelRe = /\blabel\s*=\s*"([^"]*)"/g;
  while ((m = labelRe.exec(line)) !== null) {
    segments.push(m[1]);
  }

  // 4. Extract string literals assigned to user-visible object keys
  //    titulo: '...', descricao: '...', error: '...', referencia: '...', valor: '...'
  const objKeyRe = /(?:titulo|descricao|referencia|valor|error)\s*:\s*(?:'([^']*)'|"([^"]*)"|`([^`]*)`)/g;
  while ((m = objKeyRe.exec(line)) !== null) {
    segments.push(m[1] || m[2] || m[3] || '');
  }

  // 5. Extract error message strings: setError('...'), errors.x = '...'
  const errorRe = /(?:setError|errors\.\w+\s*=)\s*(?:\(\s*)?(?:'([^']*)'|"([^"]*)"|`([^`]*)`)/g;
  while ((m = errorRe.exec(line)) !== null) {
    segments.push(m[1] || m[2] || m[3] || '');
  }

  // 6. Extract metadata title/description: title: '...', description: '...'
  const metaRe = /(?:title|description)\s*:\s*(?:'([^']*)'|"([^"]*)")/g;
  while ((m = metaRe.exec(line)) !== null) {
    segments.push(m[1] || m[2] || '');
  }

  // 7. Extract standalone user-facing string literals in ternary expressions
  //    e.g.: isPending ? 'Salvando...' : 'Criar Vinculo'
  const ternaryRe = /\?\s*'([^']*)'\s*:\s*'([^']*)'/g;
  while ((m = ternaryRe.exec(line)) !== null) {
    segments.push(m[1], m[2]);
  }

  // 8. Extract CSV header strings in arrays: 'Periodo Inicio', 'Periodo Fim'
  //    Only match capitalized words that look like PT-BR labels in array literals
  if (/\[\s*$/.test(line) === false) {
    const arrayStrRe = /^\s*'([A-Z][^']+)'\s*,?\s*$/;
    const arrayMatch = arrayStrRe.exec(trimmed);
    if (arrayMatch) {
      segments.push(arrayMatch[1]);
    }
  }

  return segments;
}

function collectFiles(dir, extensions) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next') continue;
      results.push(...collectFiles(fullPath, extensions));
    } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
      results.push(fullPath);
    }
  }
  return results;
}

function main() {
  const rootDir = path.resolve(__dirname, '..');
  const dirs = [
    path.join(rootDir, 'components'),
    path.join(rootDir, 'app'),
  ];

  const files = dirs.flatMap((d) => collectFiles(d, ['.tsx', '.ts']));
  let totalViolations = 0;
  const violations = [];

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const segments = extractUserVisibleSegments(line);

      for (const segment of segments) {
        // Check each dictionary word against this segment
        for (const [bad] of DICTIONARY) {
          const re = new RegExp(`\\b${bad}\\b`, 'gi');
          if (re.test(segment)) {
            const fix = fixMap.get(bad.toLowerCase());
            const relPath = path.relative(rootDir, file).replace(/\\/g, '/');
            violations.push({
              file: relPath,
              line: i + 1,
              word: bad,
              fix: fix || '?',
              text: line.trim(),
            });
            totalViolations++;
          }
        }
      }
    }
  }

  if (totalViolations === 0) {
    console.log('check-ptbr: OK — nenhuma palavra sem acento encontrada.');
    process.exit(0);
  }

  console.error(`check-ptbr: ${totalViolations} violacao(oes) encontrada(s):\n`);
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}`);
    console.error(`    "${v.word}" -> "${v.fix}"`);
    console.error(`    ${v.text}\n`);
  }
  process.exit(1);
}

main();
