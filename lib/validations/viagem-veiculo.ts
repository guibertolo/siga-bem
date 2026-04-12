import { z } from 'zod';

/**
 * Zod schema for viagem veiculo form validation.
 * Placa is optional but validated when present.
 */
export const viagemVeiculoSchema = z.object({
  modelo: z
    .string()
    .min(1, 'Modelo é obrigatório')
    .max(100, 'Modelo deve ter no maximo 100 caracteres'),
  marca: z
    .string()
    .max(50, 'Marca deve ter no maximo 50 caracteres')
    .optional()
    .transform((val) => val || undefined),
  placa: z
    .string()
    .max(8, 'Placa deve ter no maximo 8 caracteres')
    .optional()
    .transform((val) => (val ? val.toUpperCase().replace(/\s/g, '') : undefined))
    .refine(
      (val) =>
        !val ||
        /^[A-Z]{3}-?\d{4}$/.test(val) ||
        /^[A-Z]{3}\d[A-Z]\d{2}$/.test(val),
      { message: 'Placa inválida (ex: ABC-1234 ou ABC1D23)' },
    ),
  chassi: z
    .string()
    .max(20, 'Chassi deve ter no maximo 20 caracteres')
    .optional()
    .transform((val) => val || undefined),
  cor: z
    .string()
    .max(30, 'Cor deve ter no maximo 30 caracteres')
    .optional()
    .transform((val) => val || undefined),
  posicao: z
    .number()
    .int('Posicao deve ser um numero inteiro')
    .min(1, 'Posicao minima e 1')
    .max(15, 'Posicao maxima e 15')
    .optional()
    .nullable(),
  observacao: z
    .string()
    .max(300, 'Observacao deve ter no maximo 300 caracteres')
    .optional()
    .transform((val) => val || undefined),
});

export type ViagemVeiculoFormValues = z.infer<typeof viagemVeiculoSchema>;
export type ViagemVeiculoFormInput = z.input<typeof viagemVeiculoSchema>;
