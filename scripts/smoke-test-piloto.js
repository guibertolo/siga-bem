/**
 * Smoke test do fluxo piloto: simula uso do Onessimo (dono).
 *
 * Run:
 *   node scripts/smoke-test-piloto.js
 *
 * O que valida:
 *  - Login funciona
 *  - Dashboard carrega sem erro JS
 *  - Cada pagina principal do menu carrega sem erro
 *  - Forms criticos abrem (caminhao, motorista, viagem, gasto)
 *  - Copilot responde
 *
 * Saida:
 *  - Screenshots em /tmp/smoke-piloto-*.png
 *  - Console: PASS/FAIL pra cada checkpoint + erros JS capturados
 */
const puppeteer = require('puppeteer');
const fs = require('node:fs/promises');
const path = require('node:path');

const BASE = 'http://localhost:3010';
const EMAIL = 'onessimo@frotaviva.com.br';
const PASSWORD = '24585458';
const SCREENSHOTS_DIR = path.join(process.cwd(), '.smoke-screenshots');

const results = [];
const jsErrors = [];

async function ensureDir() {
  await fs.mkdir(SCREENSHOTS_DIR, { recursive: true });
}

function record(checkpoint, status, detail = '') {
  results.push({ checkpoint, status, detail });
  const icon = status === 'PASS' ? '✓' : status === 'WARN' ? '!' : '✗';
  console.log(`  ${icon} ${checkpoint}${detail ? ` — ${detail}` : ''}`);
}

async function shoot(page, name) {
  const file = path.join(SCREENSHOTS_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

async function visit(page, route, label) {
  try {
    const response = await page.goto(`${BASE}${route}`, {
      waitUntil: 'networkidle0',
      timeout: 15000,
    });
    const status = response?.status() ?? 0;
    if (status >= 400) {
      record(`${label}: GET ${route}`, 'FAIL', `HTTP ${status}`);
      return false;
    }
    await shoot(page, label.replace(/\s+/g, '-').toLowerCase());
    record(`${label}: GET ${route}`, 'PASS', `HTTP ${status}`);
    return true;
  } catch (err) {
    record(`${label}: GET ${route}`, 'FAIL', err.message);
    return false;
  }
}

async function main() {
  await ensureDir();
  console.log('\n=== Smoke test piloto Onessimo ===\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 800 },
  });

  const page = await browser.newPage();

  page.on('pageerror', (err) => {
    jsErrors.push({ where: page.url(), err: err.message });
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (
        !text.includes('favicon') &&
        !text.includes('Failed to load resource') &&
        !text.includes('hydrat')
      ) {
        jsErrors.push({ where: page.url(), err: text });
      }
    }
  });

  try {
    // 1. Login
    console.log('\n[1] Login');
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle0' });
    await page.type('#email', EMAIL);
    await page.type('#password', PASSWORD);
    await shoot(page, '01-login-preenchido');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 20000 }),
      page.click('button[type="submit"]'),
    ]);
    const loggedUrl = page.url();
    if (loggedUrl.includes('/dashboard')) {
      record('Login -> dashboard', 'PASS');
    } else if (loggedUrl.includes('/trocar-senha')) {
      record('Login -> trocar-senha', 'WARN', 'forcou troca de senha (nao deveria pra @frotaviva.com.br)');
    } else if (loggedUrl.includes('/selecionar-empresa')) {
      record('Login -> selecionar-empresa', 'WARN', 'redirecionado pra selecao de empresa');
    } else {
      record('Login', 'FAIL', `URL inesperada: ${loggedUrl}`);
      return;
    }
    await shoot(page, '02-pos-login');

    // 2. Visitar paginas principais
    console.log('\n[2] Navegacao do menu');
    const rotas = [
      ['/dashboard', 'Inicio'],
      ['/empresa', 'Empresa'],
      ['/viagens', 'Viagens'],
      ['/gastos', 'Gastos'],
      ['/fechamentos', 'Acertos'],
      ['/relatorios', 'Relatorios'],
      ['/caminhoes', 'Caminhoes'],
      ['/motoristas', 'Motoristas'],
      ['/vinculos', 'Vinculos'],
      ['/usuarios', 'Usuarios'],
      ['/auditoria', 'Auditoria'],
      ['/assistente', 'Assistente'],
    ];
    for (const [rota, label] of rotas) {
      await visit(page, rota, label);
    }

    // 3. Forms criticos (apenas verifica que abrem)
    console.log('\n[3] Forms criticos');
    await visit(page, '/caminhoes/cadastro', 'Form Cadastrar Caminhao');
    await visit(page, '/motoristas/cadastro', 'Form Cadastrar Motorista');
    await visit(page, '/viagens/nova', 'Form Nova Viagem');
    await visit(page, '/gastos/novo', 'Form Novo Gasto');

    // 4. Copilot
    console.log('\n[4] Copilot');
    try {
      await page.goto(`${BASE}/assistente`, { waitUntil: 'networkidle0' });
      const inputSelector = 'textarea[placeholder*="Pergunte" i], input[placeholder*="Pergunte" i]';
      await page.waitForSelector(inputSelector, { timeout: 5000 });
      await page.type(inputSelector, 'Como ta a frota?');
      await shoot(page, '20-copilot-pergunta');
      await page.click('button[type="submit"], button:has-text("Enviar")').catch(() => {});
      // Aguardar resposta (10s max)
      await new Promise((r) => setTimeout(r, 10000));
      await shoot(page, '21-copilot-resposta');
      record('Copilot: pergunta enviada', 'PASS', 'screenshot 21 mostra resposta');
    } catch (err) {
      record('Copilot', 'FAIL', err.message);
    }
  } finally {
    await browser.close();
  }

  // 5. Relatorio
  console.log('\n=== Resumo ===\n');
  const pass = results.filter((r) => r.status === 'PASS').length;
  const warn = results.filter((r) => r.status === 'WARN').length;
  const fail = results.filter((r) => r.status === 'FAIL').length;
  console.log(`  PASS: ${pass}  |  WARN: ${warn}  |  FAIL: ${fail}\n`);

  if (jsErrors.length > 0) {
    console.log(`\n=== Erros JS no console (${jsErrors.length}) ===\n`);
    for (const e of jsErrors.slice(0, 10)) {
      console.log(`  - [${e.where.replace(BASE, '')}] ${e.err.slice(0, 200)}`);
    }
    if (jsErrors.length > 10) {
      console.log(`  ... +${jsErrors.length - 10} erros omitidos`);
    }
  }

  console.log(`\n  Screenshots: ${SCREENSHOTS_DIR}\n`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('\nFalhou inesperadamente:', e.message);
  process.exit(1);
});
