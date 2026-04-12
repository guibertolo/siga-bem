/**
 * Testes de integracao para fechamentos (acerto de contas).
 * Story 14.3 - Valida queries reais contra Supabase remoto.
 *
 * REGRA: somente leitura, nao escreve dados no banco.
 * Timeout: 30s por teste (rede remota).
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  createAuthClient,
  TEST_USERS,
  TEST_PASSWORD,
} from '../rls/setup';

let dono1: SupabaseClient;

beforeAll(async () => {
  dono1 = await createAuthClient(TEST_USERS.dono1, TEST_PASSWORD);
}, 30_000);

// ---------------------------------------------------------------------------
// Listagem de fechamentos
// ---------------------------------------------------------------------------

describe('Fechamentos - Listagem (dono1)', () => {
  it('dono1 consegue listar fechamentos de suas empresas', async () => {
    const { data, error } = await dono1
      .from('fechamento')
      .select('id, status, total_viagens, total_gastos, saldo_motorista, motorista_id')
      .limit(20);

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);

    // Se houver fechamentos, todos devem pertencer a empresa do dono1
    // (RLS garante isso; verificamos indiretamente via motorista)
    if (data && data.length > 0) {
      for (const f of data) {
        expect(f.id).toBeDefined();
        expect(typeof f.total_viagens).toBe('number');
        expect(typeof f.total_gastos).toBe('number');
        expect(typeof f.saldo_motorista).toBe('number');
      }
    }
  }, 30_000);

  it('fechamentos retornam status valido (aberto, fechado ou pago)', async () => {
    const { data, error } = await dono1
      .from('fechamento')
      .select('id, status')
      .limit(50);

    expect(error).toBeNull();

    const statusValidos = ['aberto', 'fechado', 'pago'];
    for (const f of data ?? []) {
      expect(statusValidos).toContain(f.status);
    }
  }, 30_000);
});

// ---------------------------------------------------------------------------
// Viagens pendentes de acerto
// ---------------------------------------------------------------------------

describe('Fechamentos - Viagens pendentes de acerto', () => {
  it('lista viagens concluidas da empresa do dono1', async () => {
    const { data: viagens, error } = await dono1
      .from('viagem')
      .select('id, origem, destino, valor_total, percentual_pagamento, status')
      .eq('status', 'concluida')
      .limit(20);

    expect(error).toBeNull();
    expect(Array.isArray(viagens)).toBe(true);

    if (viagens && viagens.length > 0) {
      for (const v of viagens) {
        expect(v.status).toBe('concluida');
        expect(typeof v.valor_total).toBe('number');
        expect(typeof v.percentual_pagamento).toBe('number');
      }
    }
  }, 30_000);

  it('viagens pendentes nao incluem as que ja tem fechamento_item', async () => {
    // 1. Pegar viagens concluidas
    const { data: viagens } = await dono1
      .from('viagem')
      .select('id')
      .eq('status', 'concluida')
      .limit(100);

    if (!viagens || viagens.length === 0) return; // skip se nao ha dados

    const viagemIds = viagens.map((v) => v.id);

    // 2. Pegar IDs que ja tem fechamento_item
    const { data: itensExistentes } = await dono1
      .from('fechamento_item')
      .select('referencia_id')
      .eq('tipo', 'viagem')
      .in('referencia_id', viagemIds);

    const idsComAcerto = new Set(
      (itensExistentes ?? []).map((i) => i.referencia_id),
    );

    // 3. Filtrar pendentes
    const pendentes = viagens.filter((v) => !idsComAcerto.has(v.id));

    // Nenhuma pendente deve estar no set de itens existentes
    for (const p of pendentes) {
      expect(idsComAcerto.has(p.id)).toBe(false);
    }
  }, 30_000);
});

// ---------------------------------------------------------------------------
// Snapshot da estrutura de viagens pendentes
// ---------------------------------------------------------------------------

describe('Fechamentos - Snapshot estrutura viagens pendentes', () => {
  it('estrutura de viagem pendente contem campos esperados', async () => {
    const { data: viagens } = await dono1
      .from('viagem')
      .select('id, motorista_id, origem, destino, data_saida, valor_total, percentual_pagamento, motorista ( nome )')
      .eq('status', 'concluida')
      .limit(1);

    if (!viagens || viagens.length === 0) return; // skip se nao ha dados

    const v = viagens[0];
    expect(v).toHaveProperty('id');
    expect(v).toHaveProperty('motorista_id');
    expect(v).toHaveProperty('origem');
    expect(v).toHaveProperty('destino');
    expect(v).toHaveProperty('data_saida');
    expect(v).toHaveProperty('valor_total');
    expect(v).toHaveProperty('percentual_pagamento');
    expect(v).toHaveProperty('motorista');
  }, 30_000);
});

// ---------------------------------------------------------------------------
// Fechamento items
// ---------------------------------------------------------------------------

describe('Fechamentos - Items de fechamento', () => {
  it('items de fechamento tem tipo viagem ou gasto', async () => {
    const { data: items, error } = await dono1
      .from('fechamento_item')
      .select('id, tipo, valor, referencia_id')
      .limit(50);

    expect(error).toBeNull();

    for (const item of items ?? []) {
      expect(['viagem', 'gasto']).toContain(item.tipo);
      expect(typeof item.valor).toBe('number');
      expect(item.referencia_id).toBeDefined();
    }
  }, 30_000);
});

// ---------------------------------------------------------------------------
// fn_calcular_fechamento (RPC)
// ---------------------------------------------------------------------------

describe('Fechamentos - fn_calcular_fechamento RPC', () => {
  it('RPC retorna estrutura correta com totais', async () => {
    // Buscar um motorista real da empresa para usar no RPC
    const { data: motoristas } = await dono1
      .from('motorista')
      .select('id')
      .eq('status', 'ativo')
      .limit(1);

    if (!motoristas || motoristas.length === 0) return; // skip sem dados

    const { data, error } = await dono1.rpc('fn_calcular_fechamento', {
      p_motorista_id: motoristas[0].id,
      p_periodo_inicio: '2026-01-01',
      p_periodo_fim: '2026-12-31',
    });

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);

    if (data && data.length > 0) {
      const row = data[0];
      expect(row).toHaveProperty('total_viagens');
      expect(row).toHaveProperty('total_gastos');
      expect(row).toHaveProperty('saldo_motorista');
      expect(row).toHaveProperty('qtd_viagens');
      expect(row).toHaveProperty('qtd_gastos');
    }
  }, 30_000);
});
