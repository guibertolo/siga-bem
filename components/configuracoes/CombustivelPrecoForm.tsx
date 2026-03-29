'use client';

import { useForm } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { z } from 'zod';
import { useState, useTransition } from 'react';
import { parseBrlInputToCentavos } from '@/lib/utils/currency';
import { cn } from '@/lib/utils/cn';
import {
  COMBUSTIVEL_TIPO_OPTIONS,
  COMBUSTIVEL_TIPO_LABELS,
} from '@/types/precificacao';
import type {
  CombustivelPreco,
  CombustivelPrecoFormData,
  CombustivelPrecoActionResult,
} from '@/types/precificacao';

const formSchema = z.object({
  regiao: z.string()
    .min(1, 'Regiao e obrigatoria')
    .max(100, 'Maximo 100 caracteres'),
  tipo: z.enum(['diesel_s10', 'diesel_comum'], {
    error: 'Selecione um tipo de combustivel',
  }),
  preco: z.string()
    .min(1, 'Preco e obrigatorio')
    .refine((val) => {
      const centavos = parseBrlInputToCentavos(val);
      return centavos !== null && centavos > 0;
    }, 'Preco deve ser maior que zero'),
  data_referencia: z.string()
    .min(1, 'Data e obrigatoria')
    .refine((val) => !isNaN(Date.parse(val)), 'Data invalida'),
  fonte: z.string().max(100, 'Maximo 100 caracteres'),
});

type FormValues = z.infer<typeof formSchema>;

interface CombustivelPrecoFormProps {
  preco?: CombustivelPreco | null;
  onSubmit: (data: CombustivelPrecoFormData) => Promise<CombustivelPrecoActionResult>;
  onCancel: () => void;
}

export function CombustivelPrecoForm({
  preco,
  onSubmit,
  onCancel,
}: CombustivelPrecoFormProps) {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: standardSchemaResolver(formSchema),
    defaultValues: {
      regiao: preco?.regiao ?? 'Geral',
      tipo: preco?.tipo ?? 'diesel_s10',
      preco: preco ? (preco.preco_centavos / 100).toFixed(2).replace('.', ',') : '',
      data_referencia: preco?.data_referencia ?? new Date().toISOString().slice(0, 10),
      fonte: preco?.fonte ?? 'Manual',
    },
  });

  function onFormSubmit(values: FormValues) {
    setServerError(null);

    startTransition(async () => {
      const result = await onSubmit(values);

      if (!result.success) {
        if (result.fieldErrors) {
          for (const [field, message] of Object.entries(result.fieldErrors)) {
            if (message) {
              setError(field as keyof FormValues, { message });
            }
          }
        }
        if (result.error) {
          setServerError(result.error);
        }
        return;
      }

      onCancel();
    });
  }

  const inputClasses = (fieldName: keyof FormValues) =>
    cn(
      'block w-full rounded-lg border px-4 py-3 text-base transition-colors',
      'focus:outline-none focus:ring-2 focus:ring-primary-500',
      errors[fieldName]
        ? 'border-red-300 bg-red-50'
        : 'border-surface-border bg-surface-card',
    );

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
      {serverError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-base text-red-700">
          {serverError}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="regiao" className="mb-2 block text-base font-medium text-primary-700">
            Regiao *
          </label>
          <input
            id="regiao"
            type="text"
            placeholder="Ex: Sul, Sudeste, Geral"
            {...register('regiao')}
            className={inputClasses('regiao')}
          />
          {errors.regiao && (
            <p className="mt-1.5 text-sm text-red-600 font-medium">{errors.regiao.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="tipo" className="mb-2 block text-base font-medium text-primary-700">
            Tipo *
          </label>
          <select
            id="tipo"
            {...register('tipo')}
            className={inputClasses('tipo')}
          >
            {COMBUSTIVEL_TIPO_OPTIONS.map((t) => (
              <option key={t} value={t}>{COMBUSTIVEL_TIPO_LABELS[t]}</option>
            ))}
          </select>
          {errors.tipo && (
            <p className="mt-1.5 text-sm text-red-600 font-medium">{errors.tipo.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="preco" className="mb-2 block text-base font-medium text-primary-700">
            Preco por litro (R$) *
          </label>
          <input
            id="preco"
            type="text"
            placeholder="Ex: 6,50"
            {...register('preco')}
            className={inputClasses('preco')}
          />
          {errors.preco && (
            <p className="mt-1.5 text-sm text-red-600 font-medium">{errors.preco.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="data_referencia" className="mb-2 block text-base font-medium text-primary-700">
            Data de Referencia *
          </label>
          <input
            id="data_referencia"
            type="date"
            {...register('data_referencia')}
            className={inputClasses('data_referencia')}
          />
          {errors.data_referencia && (
            <p className="mt-1.5 text-sm text-red-600 font-medium">{errors.data_referencia.message}</p>
          )}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="fonte" className="mb-2 block text-base font-medium text-primary-700">
            Fonte
          </label>
          <input
            id="fonte"
            type="text"
            placeholder="Ex: Manual, ANP"
            {...register('fonte')}
            className={inputClasses('fonte')}
          />
          {errors.fonte && (
            <p className="mt-1.5 text-sm text-red-600 font-medium">{errors.fonte.message}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-700 px-5 py-3 text-base font-semibold text-white min-h-[48px] transition-colors hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {isPending ? 'Salvando...' : preco ? 'Salvar Alteracoes' : 'Cadastrar'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-surface-border px-5 py-3 text-base font-medium text-primary-700 min-h-[48px] transition-colors hover:bg-surface-muted"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
