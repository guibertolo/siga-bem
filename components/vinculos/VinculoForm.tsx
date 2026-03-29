'use client';

import { useForm } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { z } from 'zod';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import type {
  MotoristaCaminhaoFormData,
  VinculoActionResult,
  MotoristaOption,
  CaminhaoOption,
} from '@/types/motorista-caminhao';

const vinculoFormSchema = z.object({
  motorista_id: z.string().min(1, 'Selecione um motorista'),
  caminhao_id: z.string().min(1, 'Selecione um caminhao'),
  data_inicio: z.string().min(1, 'Data de inicio e obrigatoria'),
  observacao: z.string().max(1000, 'Observacao deve ter no maximo 1000 caracteres'),
});

type FormValues = z.infer<typeof vinculoFormSchema>;

interface VinculoFormProps {
  motoristas: MotoristaOption[];
  caminhoes: CaminhaoOption[];
  onSubmit: (data: MotoristaCaminhaoFormData) => Promise<VinculoActionResult>;
}

export function VinculoForm({ motoristas, caminhoes, onSubmit }: VinculoFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: standardSchemaResolver(vinculoFormSchema),
    defaultValues: {
      motorista_id: '',
      caminhao_id: '',
      data_inicio: today,
      observacao: '',
    },
  });

  const onFormSubmit = (values: FormValues) => {
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

      router.push('/vinculos');
    });
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      {serverError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-base text-red-700">
          {serverError}
        </div>
      )}

      {/* Motorista Select */}
      <div>
        <label htmlFor="motorista_id" className="mb-2 block text-base font-medium text-primary-700">
          Motorista *
        </label>
        <select
          id="motorista_id"
          {...register('motorista_id')}
          className={cn(
            'w-full rounded-lg border px-4 py-3 text-base text-primary-900 outline-none transition-colors',
            'focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20',
            errors.motorista_id ? 'border-red-300 bg-red-50' : 'border-surface-border bg-white',
          )}
          disabled={isPending}
        >
          <option value="">Selecione um motorista</option>
          {motoristas.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nome} — {m.cpf}
            </option>
          ))}
        </select>
        {errors.motorista_id && (
          <p className="mt-1.5 text-sm text-red-600 font-medium">{errors.motorista_id.message}</p>
        )}
      </div>

      {/* Caminhao Select */}
      <div>
        <label htmlFor="caminhao_id" className="mb-2 block text-base font-medium text-primary-700">
          Caminhao *
        </label>
        <select
          id="caminhao_id"
          {...register('caminhao_id')}
          className={cn(
            'w-full rounded-lg border px-4 py-3 text-base text-primary-900 outline-none transition-colors',
            'focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20',
            errors.caminhao_id ? 'border-red-300 bg-red-50' : 'border-surface-border bg-white',
          )}
          disabled={isPending}
        >
          <option value="">Selecione um caminhao</option>
          {caminhoes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.placa} — {c.modelo}
            </option>
          ))}
        </select>
        {errors.caminhao_id && (
          <p className="mt-1.5 text-sm text-red-600 font-medium">{errors.caminhao_id.message}</p>
        )}
      </div>

      {/* Data Inicio */}
      <div>
        <label htmlFor="data_inicio" className="mb-2 block text-base font-medium text-primary-700">
          Data de Inicio *
        </label>
        <input
          id="data_inicio"
          type="date"
          {...register('data_inicio')}
          className={cn(
            'w-full rounded-lg border px-4 py-3 text-base text-primary-900 outline-none transition-colors',
            'focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20',
            errors.data_inicio ? 'border-red-300 bg-red-50' : 'border-surface-border bg-white',
          )}
          disabled={isPending}
        />
        {errors.data_inicio && (
          <p className="mt-1.5 text-sm text-red-600 font-medium">{errors.data_inicio.message}</p>
        )}
      </div>

      {/* Observacao */}
      <div>
        <label htmlFor="observacao" className="mb-2 block text-base font-medium text-primary-700">
          Observacao
        </label>
        <textarea
          id="observacao"
          rows={3}
          {...register('observacao')}
          className={cn(
            'w-full rounded-lg border px-4 py-3 text-base text-primary-900 outline-none transition-colors',
            'focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20',
            errors.observacao ? 'border-red-300 bg-red-50' : 'border-surface-border bg-white',
          )}
          disabled={isPending}
          placeholder="Observacoes sobre este vinculo (opcional)"
        />
        {errors.observacao && (
          <p className="mt-1.5 text-sm text-red-600 font-medium">{errors.observacao.message}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-700 px-6 py-3 text-base font-semibold text-white min-h-[48px] transition-colors hover:bg-primary-800 disabled:opacity-50"
        >
          <svg className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {isPending ? 'Salvando...' : 'Criar Vinculo'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/vinculos')}
          disabled={isPending}
          className="rounded-lg border border-surface-border px-6 py-3 text-base font-medium text-primary-700 min-h-[48px] transition-colors hover:bg-surface-hover"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
