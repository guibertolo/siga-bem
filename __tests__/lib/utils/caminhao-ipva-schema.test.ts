import { z } from 'zod';
import { parseBrlInputToCentavos } from '@/lib/utils/currency';
import { isValidDateBr } from '@/lib/utils/validate-date-br';

/**
 * Extracted Zod schema for IPVA fields only, for isolated testing.
 * Mirrors the schema in app/(dashboard)/caminhoes/actions.ts.
 */
const ipvaFieldsSchema = z.object({
  doc_vencimento: z.string().refine(isValidDateBr, 'Data invalida. Use DD/MM/AAAA'),
  ipva_pago: z.boolean().default(false),
  ipva_valor_centavos: z.string().refine(
    (val) => {
      if (val === '' || val === '0,00') return true;
      const centavos = parseBrlInputToCentavos(val);
      return centavos !== null && centavos >= 0;
    },
    'Valor invalido',
  ),
  ipva_ano_referencia: z.string().refine(
    (val) => {
      if (val === '') return true;
      const num = parseInt(val, 10);
      return !isNaN(num) && num >= 2000 && num <= new Date().getFullYear() + 1;
    },
    'Ano invalido',
  ),
});

describe('IPVA fields Zod schema', () => {
  describe('doc_vencimento', () => {
    it('accepts empty string (optional)', () => {
      const result = ipvaFieldsSchema.safeParse({
        doc_vencimento: '',
        ipva_pago: false,
        ipva_valor_centavos: '',
        ipva_ano_referencia: '',
      });
      expect(result.success).toBe(true);
    });

    it('accepts DD/MM/YYYY format', () => {
      const result = ipvaFieldsSchema.safeParse({
        doc_vencimento: '15/04/2026',
        ipva_pago: false,
        ipva_valor_centavos: '',
        ipva_ano_referencia: '',
      });
      expect(result.success).toBe(true);
    });

    it('accepts ISO YYYY-MM-DD format', () => {
      const result = ipvaFieldsSchema.safeParse({
        doc_vencimento: '2026-04-15',
        ipva_pago: false,
        ipva_valor_centavos: '',
        ipva_ano_referencia: '',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid date format', () => {
      const result = ipvaFieldsSchema.safeParse({
        doc_vencimento: '04-15-2026',
        ipva_pago: false,
        ipva_valor_centavos: '',
        ipva_ano_referencia: '',
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid date values (Feb 30)', () => {
      const result = ipvaFieldsSchema.safeParse({
        doc_vencimento: '30/02/2026',
        ipva_pago: false,
        ipva_valor_centavos: '',
        ipva_ano_referencia: '',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('ipva_pago', () => {
    it('defaults to false', () => {
      const result = ipvaFieldsSchema.safeParse({
        doc_vencimento: '',
        ipva_valor_centavos: '',
        ipva_ano_referencia: '',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.ipva_pago).toBe(false);
      }
    });

    it('accepts true', () => {
      const result = ipvaFieldsSchema.safeParse({
        doc_vencimento: '',
        ipva_pago: true,
        ipva_valor_centavos: '',
        ipva_ano_referencia: '',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('ipva_valor_centavos', () => {
    it('accepts empty string (optional)', () => {
      const result = ipvaFieldsSchema.safeParse({
        doc_vencimento: '',
        ipva_pago: false,
        ipva_valor_centavos: '',
        ipva_ano_referencia: '',
      });
      expect(result.success).toBe(true);
    });

    it('accepts "0,00"', () => {
      const result = ipvaFieldsSchema.safeParse({
        doc_vencimento: '',
        ipva_pago: false,
        ipva_valor_centavos: '0,00',
        ipva_ano_referencia: '',
      });
      expect(result.success).toBe(true);
    });

    it('accepts BRL formatted value "1.500,00"', () => {
      const result = ipvaFieldsSchema.safeParse({
        doc_vencimento: '',
        ipva_pago: false,
        ipva_valor_centavos: '1.500,00',
        ipva_ano_referencia: '',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid value "abc"', () => {
      const result = ipvaFieldsSchema.safeParse({
        doc_vencimento: '',
        ipva_pago: false,
        ipva_valor_centavos: 'abc',
        ipva_ano_referencia: '',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('ipva_ano_referencia', () => {
    it('accepts empty string (optional)', () => {
      const result = ipvaFieldsSchema.safeParse({
        doc_vencimento: '',
        ipva_pago: false,
        ipva_valor_centavos: '',
        ipva_ano_referencia: '',
      });
      expect(result.success).toBe(true);
    });

    it('accepts current year', () => {
      const result = ipvaFieldsSchema.safeParse({
        doc_vencimento: '',
        ipva_pago: false,
        ipva_valor_centavos: '',
        ipva_ano_referencia: String(new Date().getFullYear()),
      });
      expect(result.success).toBe(true);
    });

    it('rejects year before 2000', () => {
      const result = ipvaFieldsSchema.safeParse({
        doc_vencimento: '',
        ipva_pago: false,
        ipva_valor_centavos: '',
        ipva_ano_referencia: '1999',
      });
      expect(result.success).toBe(false);
    });

    it('rejects non-numeric value', () => {
      const result = ipvaFieldsSchema.safeParse({
        doc_vencimento: '',
        ipva_pago: false,
        ipva_valor_centavos: '',
        ipva_ano_referencia: 'abc',
      });
      expect(result.success).toBe(false);
    });
  });
});
