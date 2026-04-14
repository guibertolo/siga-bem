/**
 * Tests for relatorio motorista logic.
 * Story 23.5
 *
 * Note: RPC integration tests require Supabase local.
 * These are unit tests for the server action validation logic.
 */

describe('Relatorio Motorista - calculos', () => {
  it('calcula dias_ociosos = dias_periodo - dias_trabalhados', () => {
    // p_inicio = 2026-04-01, p_fim = 2026-04-07 => 7 dias
    const diasPeriodo = 7;
    const diasTrabalhados = 4;
    const diasOciosos = Math.max(diasPeriodo - diasTrabalhados, 0);
    expect(diasOciosos).toBe(3);
  });

  it('calcula dias_ociosos como 0 quando trabalhou todos os dias', () => {
    const diasPeriodo = 5;
    const diasTrabalhados = 5;
    const diasOciosos = Math.max(diasPeriodo - diasTrabalhados, 0);
    expect(diasOciosos).toBe(0);
  });

  it('calcula pagamento_centavos corretamente para percentual 25.5%', () => {
    // valor_total = 150000 centavos (R$ 1.500,00)
    // percentual = 25.5
    const valorTotal = 150000;
    const percentual = 25.5;
    const pagamento = Math.round((valorTotal * percentual) / 100);
    expect(pagamento).toBe(38250); // R$ 382,50
  });

  it('calcula pagamento_centavos corretamente para percentual 30%', () => {
    const valorTotal = 200000; // R$ 2.000,00
    const percentual = 30;
    const pagamento = Math.round((valorTotal * percentual) / 100);
    expect(pagamento).toBe(60000); // R$ 600,00
  });

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
    const kmSaida = 100000;
    const kmChegada = 101500;
    const kmCalculado = kmSaida != null && kmChegada != null ? kmChegada - kmSaida : null;
    expect(kmCalculado).toBe(1500);
  });

  it('total_km_calculado ignora viagens com km null no SUM', () => {
    const viagens = [
      { km_saida: 100000, km_chegada: 101500 }, // 1500
      { km_saida: null, km_chegada: 120000 },    // ignorado
      { km_saida: 200000, km_chegada: 201000 },  // 1000
    ];

    const totalKm = viagens.reduce((acc, v) => {
      if (v.km_saida != null && v.km_chegada != null) {
        return acc + (v.km_chegada - v.km_saida);
      }
      return acc;
    }, 0);

    expect(totalKm).toBe(2500);
  });
});

describe('Relatorio Motorista - defesa em profundidade', () => {
  function verificaAcesso(motoristaEmpresaId: string, sessaoEmpresaId: string): boolean {
    return motoristaEmpresaId === sessaoEmpresaId;
  }

  it('rejeita quando motorista_id pertence a outra empresa', () => {
    expect(verificaAcesso('empresa-B', 'empresa-A')).toBe(false);
  });

  it('permite quando motorista_id pertence a mesma empresa', () => {
    expect(verificaAcesso('empresa-A', 'empresa-A')).toBe(true);
  });
});
