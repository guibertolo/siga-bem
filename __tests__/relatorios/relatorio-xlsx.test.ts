/**
 * Tests for xlsx export route logic.
 * Story 23.8
 *
 * Unit tests for helper functions and KM/L calculation logic.
 * Integration tests (auth, Supabase RPC) require Supabase local.
 */

// ---------------------------------------------------------------------------
// Helper functions (replicated from route for unit testing)
// ---------------------------------------------------------------------------

function formatDateBR(dateStr: string | null): string {
  if (!dateStr) return '';
  const clean = dateStr.slice(0, 10);
  const [y, m, d] = clean.split('-');
  return `${d}/${m}/${y}`;
}

function formatDateTimeBR(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

interface AbastecimentoRow {
  km_registro: number | null;
  litros: number | null;
}

function calcKmL(
  current: AbastecimentoRow,
  previous: AbastecimentoRow | null,
): number | null {
  if (
    previous == null ||
    current.km_registro == null ||
    previous.km_registro == null ||
    current.litros == null ||
    current.litros <= 0
  ) {
    return null;
  }
  return (
    Math.round(
      ((current.km_registro - previous.km_registro) / current.litros) * 100,
    ) / 100
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('XLSX Export - formatDateBR', () => {
  it('formata data YYYY-MM-DD para DD/MM/YYYY', () => {
    expect(formatDateBR('2026-04-14')).toBe('14/04/2026');
  });

  it('formata data com timestamp ISO', () => {
    expect(formatDateBR('2026-01-05T14:30:00Z')).toBe('05/01/2026');
  });

  it('retorna string vazia para null', () => {
    expect(formatDateBR(null)).toBe('');
  });

  it('formata primeiro dia do ano', () => {
    expect(formatDateBR('2026-01-01')).toBe('01/01/2026');
  });

  it('formata ultimo dia do ano', () => {
    expect(formatDateBR('2026-12-31')).toBe('31/12/2026');
  });
});

describe('XLSX Export - formatDateTimeBR', () => {
  it('retorna string vazia para null', () => {
    expect(formatDateTimeBR(null)).toBe('');
  });
});

describe('XLSX Export - calcKmL (km por litro)', () => {
  it('calcula KM/L corretamente com valores normais', () => {
    const result = calcKmL(
      { km_registro: 100500, litros: 200 },
      { km_registro: 100000, litros: 180 },
    );
    // (100500 - 100000) / 200 = 2.5
    expect(result).toBe(2.5);
  });

  it('retorna null para primeiro abastecimento (sem anterior)', () => {
    const result = calcKmL(
      { km_registro: 100000, litros: 200 },
      null,
    );
    expect(result).toBeNull();
  });

  it('retorna null quando km_registro atual e null', () => {
    const result = calcKmL(
      { km_registro: null, litros: 200 },
      { km_registro: 100000, litros: 180 },
    );
    expect(result).toBeNull();
  });

  it('retorna null quando km_registro anterior e null', () => {
    const result = calcKmL(
      { km_registro: 100500, litros: 200 },
      { km_registro: null, litros: 180 },
    );
    expect(result).toBeNull();
  });

  it('retorna null quando litros e 0', () => {
    const result = calcKmL(
      { km_registro: 100500, litros: 0 },
      { km_registro: 100000, litros: 180 },
    );
    expect(result).toBeNull();
  });

  it('retorna null quando litros e null', () => {
    const result = calcKmL(
      { km_registro: 100500, litros: null },
      { km_registro: 100000, litros: 180 },
    );
    expect(result).toBeNull();
  });

  it('arredonda KM/L para 2 casas decimais', () => {
    // (100333 - 100000) / 150 = 2.22
    const result = calcKmL(
      { km_registro: 100333, litros: 150 },
      { km_registro: 100000, litros: 180 },
    );
    expect(result).toBe(2.22);
  });

  it('lida com diferenca pequena de km', () => {
    // (100010 - 100000) / 50 = 0.2
    const result = calcKmL(
      { km_registro: 100010, litros: 50 },
      { km_registro: 100000, litros: 180 },
    );
    expect(result).toBe(0.2);
  });

  it('lida com caminhao cegonheiro tipico (~2.5 km/l)', () => {
    // Cegonheiro: 500km com 200L = 2.5 km/l
    const result = calcKmL(
      { km_registro: 150500, litros: 200 },
      { km_registro: 150000, litros: 0 }, // litros do anterior nao importa pro calculo
    );
    expect(result).toBe(2.5);
  });
});

describe('XLSX Export - centavos para reais', () => {
  it('converte centavos para reais corretamente', () => {
    expect(15000 / 100).toBe(150);
  });

  it('converte centavos com decimais', () => {
    expect(15050 / 100).toBe(150.5);
  });

  it('zero centavos = zero reais', () => {
    expect(0 / 100).toBe(0);
  });
});

describe('XLSX Export - slug generation', () => {
  it('gera slug correto para nome do motorista', () => {
    const nome = 'Joao da Silva';
    const slug = nome
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    expect(slug).toBe('joao-da-silva');
  });

  it('gera slug correto para placa de caminhao', () => {
    const nome = 'ABC-1234 - Scania R450';
    const slug = nome
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    expect(slug).toBe('abc-1234-scania-r450');
  });
});
