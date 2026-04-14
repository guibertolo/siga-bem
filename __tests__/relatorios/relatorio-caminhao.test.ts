/**
 * Tests for relatorio caminhao logic.
 * Story 23.6
 *
 * Note: RPC integration tests require Supabase local.
 * These are unit tests for calculation and validation logic.
 */

describe('Relatorio Caminhao - custo por km', () => {
  function custoPorKm(custoTotal: number, kmTotal: number): number | null {
    if (kmTotal === 0) return null;
    return Math.round(custoTotal / kmTotal);
  }

  it('retorna null quando km_total_calculado = 0 (divisao por zero segura)', () => {
    expect(custoPorKm(50000, 0)).toBeNull();
  });

  it('calcula custo por km em centavos corretamente', () => {
    // custo = R$ 500,00 (50000 centavos), km = 1000
    // custo/km = 50 centavos = R$ 0,50/km
    expect(custoPorKm(50000, 1000)).toBe(50);
  });

  it('arredonda custo por km para inteiro', () => {
    // custo = R$ 333,33 (33333 centavos), km = 1000
    // custo/km = 33.333 -> arredonda para 33 centavos
    expect(custoPorKm(33333, 1000)).toBe(33);
  });

  it('arredonda custo por km para cima quando >= 0.5', () => {
    // custo = 150 centavos, km = 4
    // custo/km = 37.5 -> arredonda para 38 (Math.round)
    expect(custoPorKm(150, 4)).toBe(38);
  });
});

describe('Relatorio Caminhao - margem percentual', () => {
  function margemPercentual(receita: number, custo: number): number | null {
    if (receita === 0) return null;
    return Math.round((receita - custo) * 1000 / receita) / 10;
  }

  it('retorna null quando receita = 0 (divisao por zero segura)', () => {
    expect(margemPercentual(0, 50000)).toBeNull();
  });

  it('calcula margem positiva corretamente', () => {
    // receita = R$ 10.000 (1000000), custo = R$ 4.000 (400000)
    // margem = (1000000 - 400000) * 100 / 1000000 = 60.0%
    expect(margemPercentual(1000000, 400000)).toBe(60.0);
  });

  it('calcula margem negativa (prejuizo) corretamente', () => {
    // receita = R$ 1.000 (100000), custo = R$ 1.200 (120000)
    // margem = (100000 - 120000) * 100 / 100000 = -20.0%
    expect(margemPercentual(100000, 120000)).toBe(-20.0);
  });

  it('calcula margem com 1 casa decimal', () => {
    // receita = 300000, custo = 262500
    // margem = 37500 * 100 / 300000 = 12.5%
    expect(margemPercentual(300000, 262500)).toBe(12.5);
  });
});

describe('Relatorio Caminhao - dias parado', () => {
  it('calcula dias_parado = dias_periodo - dias_em_rota', () => {
    const diasPeriodo = 30;
    const diasEmRota = 22;
    const diasParado = Math.max(diasPeriodo - diasEmRota, 0);
    expect(diasParado).toBe(8);
  });

  it('dias_parado nunca e negativo', () => {
    // Caso improvavel onde viagens ultrapassam periodo (data edge)
    const diasPeriodo = 5;
    const diasEmRota = 7;
    const diasParado = Math.max(diasPeriodo - diasEmRota, 0);
    expect(diasParado).toBe(0);
  });

  it('calcula dias_parado = 0 quando em rota todos os dias', () => {
    const diasPeriodo = 10;
    const diasEmRota = 10;
    const diasParado = Math.max(diasPeriodo - diasEmRota, 0);
    expect(diasParado).toBe(0);
  });
});

describe('Relatorio Caminhao - km calculado', () => {
  it('km_calculado retorna null quando km_saida e null', () => {
    const kmSaida: number | null = null;
    const kmChegada: number | null = 120000;
    const kmCalculado = kmSaida != null && kmChegada != null ? kmChegada - kmSaida : null;
    expect(kmCalculado).toBeNull();
  });

  it('km_calculado retorna null quando km_chegada e null', () => {
    const kmSaida: number | null = 100000;
    const kmChegada: number | null = null;
    const kmCalculado = kmSaida != null && kmChegada != null ? kmChegada - kmSaida : null;
    expect(kmCalculado).toBeNull();
  });

  it('km_calculado retorna diferenca quando ambos preenchidos', () => {
    const kmSaida = 200000;
    const kmChegada = 201800;
    const kmCalculado = kmSaida != null && kmChegada != null ? kmChegada - kmSaida : null;
    expect(kmCalculado).toBe(1800);
  });

  it('total_km_calculado ignora viagens com km null', () => {
    const viagens = [
      { km_saida: 100000, km_chegada: 101500 }, // 1500
      { km_saida: null, km_chegada: 120000 },    // ignorado
      { km_saida: 200000, km_chegada: null },     // ignorado
      { km_saida: 300000, km_chegada: 302000 },  // 2000
    ];

    const totalKm = viagens.reduce((acc, v) => {
      if (v.km_saida != null && v.km_chegada != null) {
        return acc + (v.km_chegada - v.km_saida);
      }
      return acc;
    }, 0);

    expect(totalKm).toBe(3500);
  });
});

describe('Relatorio Caminhao - custos diretos', () => {
  it('soma custos por categoria corretamente', () => {
    const gastos = [
      { categoria: 'Combustivel', valor: 15000 },
      { categoria: 'Combustivel', valor: 20000 },
      { categoria: 'Manutencao', valor: 8000 },
      { categoria: 'Pedagio', valor: 5000 },
      { categoria: 'Pedagio', valor: 3000 },
      { categoria: 'Alimentacao', valor: 2000 }, // nao entra nos custos diretos
    ];

    const combustivel = gastos
      .filter(g => g.categoria.toLowerCase() === 'combustivel')
      .reduce((acc, g) => acc + g.valor, 0);
    const manutencao = gastos
      .filter(g => g.categoria.toLowerCase() === 'manutencao')
      .reduce((acc, g) => acc + g.valor, 0);
    const pedagio = gastos
      .filter(g => g.categoria.toLowerCase() === 'pedagio')
      .reduce((acc, g) => acc + g.valor, 0);

    expect(combustivel).toBe(35000);
    expect(manutencao).toBe(8000);
    expect(pedagio).toBe(8000);
    expect(combustivel + manutencao + pedagio).toBe(51000);
  });

  it('retorna 0 quando nao ha gastos no periodo', () => {
    const gastos: Array<{ categoria: string; valor: number }> = [];
    const total = gastos.reduce((acc, g) => acc + g.valor, 0);
    expect(total).toBe(0);
  });
});

describe('Relatorio Caminhao - defesa em profundidade', () => {
  function verificaAcesso(caminhaoEmpresaId: string, sessaoEmpresaId: string): boolean {
    return caminhaoEmpresaId === sessaoEmpresaId;
  }

  it('rejeita quando caminhao_id pertence a outra empresa', () => {
    expect(verificaAcesso('empresa-B', 'empresa-A')).toBe(false);
  });

  it('permite quando caminhao_id pertence a mesma empresa', () => {
    expect(verificaAcesso('empresa-A', 'empresa-A')).toBe(true);
  });
});
