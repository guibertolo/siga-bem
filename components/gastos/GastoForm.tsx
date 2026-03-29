'use client';

import { useForm } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { z } from 'zod';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { parseBrlInputToCentavos } from '@/lib/utils/currency';
import { cn } from '@/lib/utils/cn';
import type { Gasto, GastoFormData, GastoActionResult } from '@/types/gasto';
import type { CategoriaGastoOption } from '@/types/categoria-gasto';

const gastoFormSchema = z.object({
  categoria_id: z.string().min(1, 'Selecione uma categoria'),
  motorista_id: z.string().min(1, 'Selecione um motorista'),
  caminhao_id: z.string(),
  valor: z.string()
    .min(1, 'Valor e obrigatorio')
    .refine((val) => {
      const centavos = parseBrlInputToCentavos(val);
      return centavos !== null && centavos > 0;
    }, 'Valor deve ser maior que zero'),
  data: z.string().min(1, 'Data e obrigatoria'),
  descricao: z.string().max(1000, 'Descricao deve ter no maximo 1000 caracteres'),
});

type FormValues = z.infer<typeof gastoFormSchema>;

interface GastoFormProps {
  mode: 'create' | 'edit';
  gasto?: Gasto | null;
  categorias: CategoriaGastoOption[];
  motoristas: Array<{ id: string; nome: string }>;
  caminhoes: Array<{ id: string; placa: string; modelo: string }>;
  motoristaFixo?: string | null; // Pre-filled for motorista role
  onSubmit: (data: GastoFormData) => Promise<GastoActionResult>;
}

function centavosToInputValue(centavos: number): string {
  return (centavos / 100).toFixed(2).replace('.', ',');
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

export function GastoForm({
  mode,
  gasto,
  categorias,
  motoristas,
  caminhoes,
  motoristaFixo,
  onSubmit,
}: GastoFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: standardSchemaResolver(gastoFormSchema),
    defaultValues: {
      categoria_id: gasto?.categoria_id ?? '',
      motorista_id: gasto?.motorista_id ?? motoristaFixo ?? '',
      caminhao_id: gasto?.caminhao_id ?? '',
      valor: gasto ? centavosToInputValue(gasto.valor) : '',
      data: gasto?.data ?? todayISO(),
      descricao: gasto?.descricao ?? '',
    },
  });

  async function onFormSubmit(values: FormValues) {
    setServerError(null);

    startTransition(async () => {
      const result = await onSubmit(values as GastoFormData);

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
      } else {
        router.push('/gastos');
      }
    });
  }

  const isEditing = mode === 'edit';
  const isMotoristaFixo = !!motoristaFixo;
  const inputClass = 'w-full rounded-lg border px-4 py-3 text-base outline-none transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500';

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6" noValidate>
      {serverError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-base text-red-700">
          {serverError}
        </div>
      )}

      {/* Categoria + Data row */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="categoria_id" className="mb-2 block text-base font-medium text-primary-900">
            Categoria <span className="text-red-500">*</span>
          </label>
          <select
            id="categoria_id"
            {...register('categoria_id')}
            className={cn(inputClass, errors.categoria_id ? 'border-red-500' : 'border-surface-border')}
          >
            <option value="">Selecione uma categoria</option>
            {categorias.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.nome}</option>
            ))}
          </select>
          {errors.categoria_id && (
            <p className="mt-1.5 text-sm text-red-600 font-medium">{errors.categoria_id.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="data" className="mb-2 block text-base font-medium text-primary-900">
            Data <span className="text-red-500">*</span>
          </label>
          <input
            id="data"
            type="date"
            {...register('data')}
            className={cn(inputClass, errors.data ? 'border-red-500' : 'border-surface-border')}
          />
          {errors.data && (
            <p className="mt-1.5 text-sm text-red-600 font-medium">{errors.data.message}</p>
          )}
        </div>
      </div>

      {/* Valor */}
      <div>
        <label htmlFor="valor" className="mb-2 block text-base font-medium text-primary-900">
          Valor (R$) <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base text-primary-500">R$</span>
          <input
            id="valor"
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            {...register('valor')}
            className={cn(inputClass, 'pl-10', errors.valor ? 'border-red-500' : 'border-surface-border')}
          />
        </div>
        {errors.valor && (
          <p className="mt-1.5 text-sm text-red-600 font-medium">{errors.valor.message}</p>
        )}
      </div>

      {/* Motorista + Caminhao row */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="motorista_id" className="mb-2 block text-base font-medium text-primary-900">
            Motorista <span className="text-red-500">*</span>
          </label>
          <select
            id="motorista_id"
            disabled={isMotoristaFixo}
            {...register('motorista_id')}
            className={cn(
              inputClass,
              errors.motorista_id ? 'border-red-500' : 'border-surface-border',
              isMotoristaFixo && 'cursor-not-allowed bg-gray-100',
            )}
          >
            <option value="">Selecione um motorista</option>
            {motoristas.map((m) => (
              <option key={m.id} value={m.id}>{m.nome}</option>
            ))}
          </select>
          {errors.motorista_id && (
            <p className="mt-1.5 text-sm text-red-600 font-medium">{errors.motorista_id.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="caminhao_id" className="mb-2 block text-base font-medium text-primary-900">
            Caminhao
          </label>
          <select
            id="caminhao_id"
            {...register('caminhao_id')}
            className={cn(inputClass, 'border-surface-border')}
          >
            <option value="">Nenhum (opcional)</option>
            {caminhoes.map((c) => (
              <option key={c.id} value={c.id}>{c.placa} - {c.modelo}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Descricao */}
      <div>
        <label htmlFor="descricao" className="mb-2 block text-base font-medium text-primary-900">
          Descricao
        </label>
        <textarea
          id="descricao"
          rows={3}
          placeholder="Detalhes adicionais (opcional)"
          {...register('descricao')}
          className={cn(inputClass, 'border-surface-border')}
        />
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => router.push('/gastos')}
          className="rounded-lg border border-surface-border px-6 py-3 text-base font-medium text-primary-700 min-h-[48px] transition-colors hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending}
          className={cn(
            'inline-flex items-center justify-center gap-2 rounded-lg bg-primary-700 px-6 py-3 text-base font-semibold text-white min-h-[48px] transition-colors',
            'hover:bg-primary-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
            isPending && 'cursor-not-allowed opacity-50',
          )}
        >
          <svg className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {isPending ? 'Salvando...' : isEditing ? 'Salvar Alteracoes' : 'Registrar Gasto'}
        </button>
      </div>
    </form>
  );
}
