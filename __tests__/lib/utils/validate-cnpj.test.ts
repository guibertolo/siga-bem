import {
  validateCNPJ,
  formatCNPJ,
  stripCNPJ,
  maskCNPJ,
  maskPhone,
  maskCEP,
} from '@/lib/utils/validate-cnpj';

describe('validateCNPJ', () => {
  it('accepts a valid CNPJ (formatted)', () => {
    expect(validateCNPJ('11.222.333/0001-81')).toBe(true);
  });

  it('accepts a valid CNPJ (raw digits)', () => {
    expect(validateCNPJ('11222333000181')).toBe(true);
  });

  it('rejects CNPJ with wrong check digits', () => {
    expect(validateCNPJ('11.222.333/0001-82')).toBe(false);
  });

  it('rejects CNPJ with all same digits', () => {
    expect(validateCNPJ('11.111.111/1111-11')).toBe(false);
    expect(validateCNPJ('00.000.000/0000-00')).toBe(false);
  });

  it('rejects CNPJ with wrong length', () => {
    expect(validateCNPJ('123')).toBe(false);
    expect(validateCNPJ('1122233300018199')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(validateCNPJ('')).toBe(false);
  });

  it('accepts another known valid CNPJ', () => {
    // Petrobras CNPJ
    expect(validateCNPJ('33.000.167/0001-01')).toBe(true);
  });

  it('rejects CNPJ with invalid first check digit', () => {
    expect(validateCNPJ('11.222.333/0001-91')).toBe(false);
  });
});

describe('formatCNPJ', () => {
  it('formats raw digits to XX.XXX.XXX/XXXX-XX', () => {
    expect(formatCNPJ('11222333000181')).toBe('11.222.333/0001-81');
  });

  it('returns original string if not 14 digits', () => {
    expect(formatCNPJ('123')).toBe('123');
  });
});

describe('stripCNPJ', () => {
  it('removes all non-digit characters', () => {
    expect(stripCNPJ('11.222.333/0001-81')).toBe('11222333000181');
  });
});

describe('maskCNPJ', () => {
  it('masks progressively as digits are added', () => {
    expect(maskCNPJ('11')).toBe('11');
    expect(maskCNPJ('112')).toBe('11.2');
    expect(maskCNPJ('11222')).toBe('11.222');
    expect(maskCNPJ('112223')).toBe('11.222.3');
    expect(maskCNPJ('11222333')).toBe('11.222.333');
    expect(maskCNPJ('112223330')).toBe('11.222.333/0');
    expect(maskCNPJ('112223330001')).toBe('11.222.333/0001');
    expect(maskCNPJ('11222333000181')).toBe('11.222.333/0001-81');
  });

  it('truncates at 14 digits', () => {
    expect(maskCNPJ('112223330001819999')).toBe('11.222.333/0001-81');
  });
});

describe('maskPhone', () => {
  it('masks progressively for mobile (11 digits)', () => {
    expect(maskPhone('11')).toBe('(11');
    expect(maskPhone('119')).toBe('(11) 9');
    expect(maskPhone('11999')).toBe('(11) 999');
    expect(maskPhone('1199999')).toBe('(11) 9999-9');
    expect(maskPhone('11999999999')).toBe('(11) 99999-9999');
  });

  it('returns empty for empty input', () => {
    expect(maskPhone('')).toBe('');
  });
});

describe('maskCEP', () => {
  it('masks CEP as 00000-000', () => {
    expect(maskCEP('01310')).toBe('01310');
    expect(maskCEP('01310100')).toBe('01310-100');
  });
});
