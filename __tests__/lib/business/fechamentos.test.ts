/**
 * Testes unitarios para funcoes puras de fechamento (acerto de contas).
 * Story 14.3 - Cobertura de testes para logica de fechamentos.
 *
 * Valores sempre em centavos (inteiro). R$ 150,00 = 15000.
 */

import { describe, it, expect } from '@jest/globals';
import {
  calcularValorMotorista,
  calcularTotalItens,
  calcularSaldoMotorista,
  validarTransicaoStatus,
  agruparDespesasPorViagem,
  periodosOverlap,
  validarPeriodo,
} from '@/lib/business/fechamentos';

// ---------------------------------------------------------------------------
// calcularValorMotorista
// ---------------------------------------------------------------------------

describe('calcularValorMotorista', () => {
  it('calcula 70% de R$ 10.000,00 = R$ 7.000,00', () => {
    expect(calcularValorMotorista(1_000_000, 70)).toBe(700_000);
  });

  it('calcula 100% retorna valor integral', () => {
    expect(calcularValorMotorista(50_000, 100)).toBe(50_000);
  });

  it('calcula 0% retorna 0', () => {
    expect(calcularValorMotorista(50_000, 0)).toBe(0);
  });

  it('arredonda corretamente quando percentual gera fracao de centavo', () => {
    // 33% de 10000 = 3300 (exato)
    expect(calcularValorMotorista(10_000, 33)).toBe(3_300);
    // 33% de 10001 = 3300.33 -> arredonda para 3300
    expect(calcularValorMotorista(10_001, 33)).toBe(3_300);
    // 67% de 10001 = 6700.67 -> arredonda para 6701
    expect(calcularValorMotorista(10_001, 67)).toBe(6_701);
  });

  it('retorna 0 quando valor total e 0', () => {
    expect(calcularValorMotorista(0, 70)).toBe(0);
  });

  it('lida com percentuais fracionarios (ex: 33.33)', () => {
    // 33.33% de 300000 = 99990
    expect(calcularValorMotorista(300_000, 33.33)).toBe(99_990);
  });
});

// ---------------------------------------------------------------------------
// calcularTotalItens
// ---------------------------------------------------------------------------

describe('calcularTotalItens', () => {
  it('retorna 0 para lista vazia', () => {
    expect(calcularTotalItens([])).toBe(0);
  });

  it('calcula corretamente com 1 item', () => {
    expect(calcularTotalItens([{ valor: 15_000 }])).toBe(15_000);
  });

  it('calcula corretamente com 5 itens', () => {
    const itens = [
      { valor: 10_000 },
      { valor: 20_000 },
      { valor: 30_000 },
      { valor: 15_000 },
      { valor: 25_000 },
    ];
    expect(calcularTotalItens(itens)).toBe(100_000);
  });

  it('mantem precisao com valores grandes (centenas de milhares)', () => {
    const itens = [
      { valor: 999_999 },
      { valor: 1 },
    ];
    expect(calcularTotalItens(itens)).toBe(1_000_000);
  });

  it('ignora propriedades extras dos objetos', () => {
    const itens = [
      { valor: 5_000, descricao: 'SP->RJ', id: 'abc' },
      { valor: 3_000, descricao: 'RJ->MG', id: 'def' },
    ];
    expect(calcularTotalItens(itens)).toBe(8_000);
  });
});

// ---------------------------------------------------------------------------
// calcularSaldoMotorista
// ---------------------------------------------------------------------------

describe('calcularSaldoMotorista', () => {
  it('saldo positivo quando viagens > gastos', () => {
    expect(calcularSaldoMotorista(100_000, 30_000)).toBe(70_000);
  });

  it('saldo zero quando viagens = gastos', () => {
    expect(calcularSaldoMotorista(50_000, 50_000)).toBe(0);
  });

  it('saldo negativo quando gastos > viagens', () => {
    expect(calcularSaldoMotorista(20_000, 35_000)).toBe(-15_000);
  });

  it('saldo zero quando ambos sao zero', () => {
    expect(calcularSaldoMotorista(0, 0)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// validarTransicaoStatus
// ---------------------------------------------------------------------------

describe('validarTransicaoStatus', () => {
  it('permite aberto -> fechado', () => {
    expect(validarTransicaoStatus('aberto', 'fechado')).toBe(true);
  });

  it('permite fechado -> pago', () => {
    expect(validarTransicaoStatus('fechado', 'pago')).toBe(true);
  });

  it('permite fechado -> aberto (reabrir)', () => {
    expect(validarTransicaoStatus('fechado', 'aberto')).toBe(true);
  });

  it('rejeita aberto -> pago (pular etapa)', () => {
    expect(validarTransicaoStatus('aberto', 'pago')).toBe(false);
  });

  it('rejeita pago -> aberto (terminal)', () => {
    expect(validarTransicaoStatus('pago', 'aberto')).toBe(false);
  });

  it('rejeita pago -> fechado (terminal)', () => {
    expect(validarTransicaoStatus('pago', 'fechado')).toBe(false);
  });

  it('rejeita transicao para o mesmo status', () => {
    expect(validarTransicaoStatus('aberto', 'aberto')).toBe(false);
    expect(validarTransicaoStatus('fechado', 'fechado')).toBe(false);
    expect(validarTransicaoStatus('pago', 'pago')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// agruparDespesasPorViagem
// ---------------------------------------------------------------------------

describe('agruparDespesasPorViagem', () => {
  it('retorna mapa vazio para lista vazia', () => {
    const resultado = agruparDespesasPorViagem([]);
    expect(resultado.size).toBe(0);
  });

  it('ignora gastos sem viagem_id (null)', () => {
    const gastos = [
      { viagem_id: null, valor: 5_000 },
      { viagem_id: null, valor: 3_000 },
    ];
    const resultado = agruparDespesasPorViagem(gastos);
    expect(resultado.size).toBe(0);
  });

  it('agrupa gastos de uma unica viagem', () => {
    const gastos = [
      { viagem_id: 'v1', valor: 5_000 },
      { viagem_id: 'v1', valor: 3_000 },
      { viagem_id: 'v1', valor: 2_000 },
    ];
    const resultado = agruparDespesasPorViagem(gastos);
    expect(resultado.get('v1')).toBe(10_000);
  });

  it('agrupa gastos de multiplas viagens corretamente', () => {
    const gastos = [
      { viagem_id: 'v1', valor: 5_000 },
      { viagem_id: 'v2', valor: 8_000 },
      { viagem_id: 'v1', valor: 3_000 },
      { viagem_id: 'v2', valor: 2_000 },
    ];
    const resultado = agruparDespesasPorViagem(gastos);
    expect(resultado.size).toBe(2);
    expect(resultado.get('v1')).toBe(8_000);
    expect(resultado.get('v2')).toBe(10_000);
  });

  it('mistura gastos com e sem viagem_id', () => {
    const gastos = [
      { viagem_id: 'v1', valor: 5_000 },
      { viagem_id: null, valor: 9_999 },
      { viagem_id: 'v1', valor: 3_000 },
    ];
    const resultado = agruparDespesasPorViagem(gastos);
    expect(resultado.size).toBe(1);
    expect(resultado.get('v1')).toBe(8_000);
  });
});

// ---------------------------------------------------------------------------
// periodosOverlap
// ---------------------------------------------------------------------------

describe('periodosOverlap', () => {
  it('detecta sobreposicao total', () => {
    expect(periodosOverlap('2026-01-01', '2026-01-31', '2026-01-01', '2026-01-31')).toBe(true);
  });

  it('detecta sobreposicao parcial no inicio', () => {
    expect(periodosOverlap('2026-01-15', '2026-02-15', '2026-01-01', '2026-01-31')).toBe(true);
  });

  it('detecta sobreposicao parcial no fim', () => {
    expect(periodosOverlap('2026-01-01', '2026-01-15', '2026-01-10', '2026-01-31')).toBe(true);
  });

  it('detecta sobreposicao quando um contem o outro', () => {
    expect(periodosOverlap('2026-01-01', '2026-03-31', '2026-02-01', '2026-02-28')).toBe(true);
  });

  it('nao detecta overlap em periodos adjacentes (dia seguinte)', () => {
    expect(periodosOverlap('2026-01-01', '2026-01-15', '2026-01-16', '2026-01-31')).toBe(false);
  });

  it('detecta overlap quando periodos compartilham exatamente 1 dia', () => {
    expect(periodosOverlap('2026-01-01', '2026-01-15', '2026-01-15', '2026-01-31')).toBe(true);
  });

  it('nao detecta overlap em periodos completamente separados', () => {
    expect(periodosOverlap('2026-01-01', '2026-01-31', '2026-03-01', '2026-03-31')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// validarPeriodo
// ---------------------------------------------------------------------------

describe('validarPeriodo', () => {
  it('valida periodo onde fim > inicio', () => {
    expect(validarPeriodo('2026-01-01', '2026-01-31')).toBe(true);
  });

  it('valida periodo onde fim = inicio (1 dia)', () => {
    expect(validarPeriodo('2026-01-15', '2026-01-15')).toBe(true);
  });

  it('rejeita periodo onde fim < inicio', () => {
    expect(validarPeriodo('2026-01-31', '2026-01-01')).toBe(false);
  });
});
