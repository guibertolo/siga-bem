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
      'block w-full rounded-lg border px-3 py-2 text-sm transition-colors',
      'focus:outline-none focus:ring-2 focus:ring-primary-500',
      errors[fieldName]
        ? 'border-red-300 bg-red-50'
        : 'border-surface-border bg-white',
    );

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
      {serverError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="regiao" className="mb-1 block text-sm font-medium text-primary-700">
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
            <p className="mt-1 text-xs text-red-600">{errors.regiao.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="tipo" className="mb-1 block text-sm font-medium text-primary-700">
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
            <p className="mt-1 text-xs text-red-600">{errors.tipo.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="preco" className="mb-1 block text-sm font-medium text-primary-700">
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
            <p className="mt-1 text-xs text-red-600">{errors.preco.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="data_referencia" className="mb-1 block text-sm font-medium text-primary-700">
            Data de Referencia *
          </label>
          <input
            id="data_referencia"
            type="date"
            {...register('data_referencia')}
            className={inputClasses('data_referencia')}
          />
          {errors.data_referencia && (
            <p className="mt-1 text-xs text-red-600">{errors.data_referencia.message}</p>
          )}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="fonte" className="mb-1 block text-sm font-medium text-primary-700">
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
            <p className="mt-1 text-xs text-red-600">{errors.fonte.message}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-primary-700 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? 'Salvando...' : preco ? 'Salvar Alteracoes' : 'Cadastrar'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-surface-border px-5 py-2 text-sm font-medium text-primary-700 transition-colors hover:bg-gray-50"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
