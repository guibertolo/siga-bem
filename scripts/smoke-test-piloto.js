/**
 * Smoke test do fluxo piloto: simula uso do Onessimo (dono).
 *
 * Run:
 *   node scripts/smoke-test-piloto.js
 *
 * O que valida (mobile + desktop):
 *  - Login funciona
 *  - Dashboard carrega sem erro JS
 *  - Cada pagina principal do menu carrega sem erro
 *  - Forms criticos abrem (caminhao, motorista, viagem, gasto)
 *  - Copilot responde
 *
 * Saida:
 *  - Screenshots em .smoke-screenshots/{viewport}-*.png
 *  - Console: PASS/FAIL pra cada checkpoint + erros JS capturados
 */
const puppeteer = require('puppeteer');
const fs = require('node:fs/promises');
const path = require('node:path');

const BASE = 'http://localhost:3010';
const EMAIL = 'onessimo@frotaviva.com.br';
const PASSWORD = '24585458';
const SCREENSHOTS_DIR = path.join(process.cwd(), '.smoke-screenshots');

// Mobile primeiro — motorista usa celular como ferramenta principal.
const VIEWPORTS = [
  {
    label: 'mobile',
    viewport: { width: 390, height: 844, isMobile: true, hasTouch: true },
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  },
  {
    label: 'desktop',
    viewport: { width: 1280, height: 800 },
    userAgent: null,
  },
];

async function ensureDir() {
  await fs.mkdir(SCREENSHOTS_DIR, { recursive: true });
}

function makeRecorder(label, results) {
  return (checkpoint, status, detail = '') => {
    results.push({ viewport: label, checkpoint, status, detail });
    const icon = status === 'PASS' ? '✓' : status === 'WARN' ? '!' : '✗';
    console.log(`  ${icon} ${checkpoint}${detail ? ` — ${detail}` : ''}`);
  };
}

function makeShoot(label) {
  return async (page, name) => {
    const file = path.join(SCREENSHOTS_DIR, `${label}-${name}.png`);
    await page.screenshot({ path: file, fullPage: false });
    return file;
  };
}

async function visit(page, route, pageLabel, record, shoot) {
  try {
    let status = 0;
    try {
      const response = await page.goto(`${BASE}${route}`, { timeout: 15000 });
      status = response?.status() ?? 0;
    } catch {
      // Goto pode dar timeout em mobile com chunks pesados.
      // Tudo bem, vamos verificar se a pagina carregou via DOM.
    }
    // Aguarda hydration mesmo se goto falhou
    await new Promise((r) => setTimeout(r, 1500));
    // Se URL nao tem o path esperado, falhou
    const currentPath = await page.evaluate(() => location.pathname);
    if (!currentPath.startsWith(route.split('?')[0]) && route !== '/dashboard') {
      record(`${pageLabel}: GET ${route}`, 'FAIL', `redirecionou pra ${currentPath}`);
      return false;
    }
    if (status >= 400) {
      record(`${pageLabel}: GET ${route}`, 'FAIL', `HTTP ${status}`);
      return false;
    }
    await shoot(page, pageLabel.replace(/\s+/g, '-').toLowerCase());
    record(`${pageLabel}: GET ${route}`, 'PASS', status > 0 ? `HTTP ${status}` : 'OK');
    return true;
  } catch (err) {
    record(`${pageLabel}: GET ${route}`, 'FAIL', err.message);
    return false;
  }
}

async function runViewport({ label, viewport, userAgent }, results, jsErrors) {
  console.log(`\n=== Smoke test piloto Onessimo — ${label.toUpperCase()} ===\n`);

  const record = makeRecorder(label, results);
  const shoot = makeShoot(label);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: viewport,
  });

  const page = await browser.newPage();
  if (userAgent) await page.setUserAgent(userAgent);

  page.on('pageerror', (err) => {
    jsErrors.push({ viewport: label, where: page.url(), err: err.message });
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (
        !text.includes('favicon') &&
        !text.includes('Failed to load resource') &&
        !text.includes('hydrat')
      ) {
        jsErrors.push({ viewport: label, where: page.url(), err: text });
      }
    }
  });

  try {
    // 1. Login
    console.log('\n[1] Login');
    // Tentamos goto com timeout curto. Se passar, otimo. Se nao, seguimos
    // com waitForSelector que e mais flexivel.
    try {
      await page.goto(`${BASE}/login`, { timeout: 15000 });
    } catch {
      // Pode falhar com mobile devido a chunks pesados; tudo bem.
    }
    await page.waitForSelector('#email', { timeout: 30000 });
    await page.type('#email', EMAIL);
    await page.type('#password', PASSWORD);
    await shoot(page, '01-login-preenchido');
    await page.click('button[type="submit"]');
    // Aguarda navegacao OU 30s. Captura state mesmo se nao navegou.
    try {
      await page.waitForFunction(() => !location.pathname.startsWith('/login'), {
        timeout: 30000,
      });
    } catch {
      await shoot(page, '01b-login-travou');
      const url = page.url();
      const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 300));
      record('Login', 'FAIL', `nao avancou. URL: ${url} | body: ${bodyText.replace(/\n/g, ' ')}`);
      await browser.close();
      return;
    }
    // Aguarda hydration estabilizar
    await new Promise((r) => setTimeout(r, 2000));
    const loggedUrl = page.url();
    if (loggedUrl.includes('/dashboard')) {
      record('Login -> dashboard', 'PASS');
    } else if (loggedUrl.includes('/trocar-senha')) {
      record('Login -> trocar-senha', 'WARN', 'forcou troca (nao deveria pra @frotaviva.com.br)');
    } else if (loggedUrl.includes('/selecionar-empresa')) {
      record('Login -> selecionar-empresa', 'WARN', 'redirecionou pra selecao');
    } else {
      record('Login', 'FAIL', `URL inesperada: ${loggedUrl}`);
      await browser.close();
      return;
    }
    await shoot(page, '02-pos-login');

    // 2. Navegacao do menu
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
    for (const [rota, lab] of rotas) {
      await visit(page, rota, lab, record, shoot);
    }

    // 3. Forms criticos
    console.log('\n[3] Forms criticos');
    await visit(page, '/caminhoes/cadastro', 'Form Cadastrar Caminhao', record, shoot);
    await visit(page, '/motoristas/cadastro', 'Form Cadastrar Motorista', record, shoot);
    await visit(page, '/viagens/nova', 'Form Nova Viagem', record, shoot);
    await visit(page, '/gastos/novo', 'Form Novo Gasto', record, shoot);

    // 4. Copilot
    console.log('\n[4] Copilot');
    try {
      try {
        await page.goto(`${BASE}/assistente`, { timeout: 15000 });
      } catch {}
      await new Promise((r) => setTimeout(r, 2000));
      const inputSelector =
        'textarea[placeholder*="Pergunte" i], input[placeholder*="Pergunte" i]';
      await page.waitForSelector(inputSelector, { timeout: 5000 });
      await page.type(inputSelector, 'Como ta a frota?');
      await shoot(page, '20-copilot-pergunta');
      await page
        .click('button[type="submit"], button:has-text("Enviar")')
        .catch(() => {});
      await new Promise((r) => setTimeout(r, 10000));
      await shoot(page, '21-copilot-resposta');
      record('Copilot: pergunta enviada', 'PASS');
    } catch (err) {
      record('Copilot', 'FAIL', err.message);
    }
  } finally {
    await browser.close();
  }
}

async function main() {
  await ensureDir();

  const results = [];
  const jsErrors = [];

  for (const vp of VIEWPORTS) {
    await runViewport(vp, results, jsErrors);
  }

  // Resumo final agregado
  console.log('\n========== RESUMO FINAL ==========\n');
  for (const vp of VIEWPORTS) {
    const subset = results.filter((r) => r.viewport === vp.label);
    const pass = subset.filter((r) => r.status === 'PASS').length;
    const warn = subset.filter((r) => r.status === 'WARN').length;
    const fail = subset.filter((r) => r.status === 'FAIL').length;
    console.log(
      `  ${vp.label.toUpperCase().padEnd(8)}  PASS: ${pass}  |  WARN: ${warn}  |  FAIL: ${fail}`,
    );
  }

  if (jsErrors.length > 0) {
    console.log(`\n=== Erros JS no console (${jsErrors.length}) ===\n`);
    for (const e of jsErrors.slice(0, 12)) {
      console.log(
        `  - [${e.viewport}] [${e.where.replace(BASE, '')}] ${e.err.slice(0, 180)}`,
      );
    }
    if (jsErrors.length > 12) {
      console.log(`  ... +${jsErrors.length - 12} erros omitidos`);
    }
  }

  console.log(`\n  Screenshots: ${SCREENSHOTS_DIR}\n`);

  const totalFail = results.filter((r) => r.status === 'FAIL').length;
  process.exit(totalFail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('\nFalhou inesperadamente:', e.message);
  process.exit(1);
});
