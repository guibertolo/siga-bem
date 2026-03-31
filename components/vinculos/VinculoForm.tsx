'use client';

import { useForm } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { z } from 'zod';
import { useState, useTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import { getVinculoAtivoCaminhao, getVinculoAtivoMotorista } from '@/app/(dashboard)/vinculos/actions';
import type {
  MotoristaCaminhaoFormData,
  VinculoActionResult,
  MotoristaOption,
  CaminhaoOption,
} from '@/types/motorista-caminhao';

const vinculoFormSchema = z.object({
  motorista_id: z.string().min(1, 'Selecione um motorista'),
  caminhao_id: z.string().min(1, 'Selecione um caminhão'),
  data_inicio: z.string().min(1, 'Data de início é obrigatória'),
  observacao: z.string().max(1000, 'Observação deve ter no máximo 1000 caracteres'),
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

  // Warning states for active vinculos
  const [caminhaoWarning, setCaminhaoWarning] = useState<string | null>(null);
  const [motoristaWarning, setMotoristaWarning] = useState<string | null>(null);

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

  const handleCaminhaoChange = useCallback(async (caminhaoId: string) => {
    setCaminhaoWarning(null);
    if (!caminhaoId) return;

    const result = await getVinculoAtivoCaminhao(caminhaoId);
    if (result.motoristas.length > 0) {
      const nomes = result.motoristas.join(', ');
      setCaminhaoWarning(
        `Este caminhao ja possui ${result.motoristas.length === 1 ? 'o motorista' : 'os motoristas'} ${nomes} vinculado${result.motoristas.length > 1 ? 's' : ''}. O novo vinculo sera adicionado.`,
      );
    }
  }, []);

  const handleMotoristaChange = useCallback(async (motoristaId: string) => {
    setMotoristaWarning(null);
    if (!motoristaId) return;

    const result = await getVinculoAtivoMotorista(motoristaId);
    if (result.caminhoes.length > 0) {
      const placas = result.caminhoes.join(', ');
      setMotoristaWarning(
        `Este motorista ja esta vinculado ao${result.caminhoes.length > 1 ? 's' : ''} caminha${result.caminhoes.length > 1 ? 'oes' : 'o'} ${placas}. O novo vinculo sera adicionado.`,
      );
    }
  }, []);

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

  const { onChange: caminhaoRegisterOnChange, ...caminhaoRegisterRest } = register('caminhao_id');
  const { onChange: motoristaRegisterOnChange, ...motoristaRegisterRest } = register('motorista_id');

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      {serverError && (
        <div className="rounded-lg border border-danger/20 bg-alert-danger-bg p-4 text-base text-danger">
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
          {...motoristaRegisterRest}
          onChange={(e) => {
            motoristaRegisterOnChange(e);
            handleMotoristaChange(e.target.value);
          }}
          className={cn(
            'w-full rounded-lg border px-4 py-3 text-base text-primary-900 outline-none transition-colors',
            'focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20',
            errors.motorista_id ? 'border-red-300 bg-alert-danger-bg' : 'border-surface-border bg-surface-card',
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
          <p className="mt-1.5 text-sm text-danger font-medium">{errors.motorista_id.message}</p>
        )}
        {motoristaWarning && (
          <div className="mt-2 rounded-lg border border-primary-500/30 bg-primary-500/5 p-3 text-sm text-primary-700">
            <div className="flex items-start gap-2">
              <svg className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{motoristaWarning}</span>
            </div>
          </div>
        )}
      </div>

      {/* Caminhao Select */}
      <div>
        <label htmlFor="caminhao_id" className="mb-2 block text-base font-medium text-primary-700">
          Caminhão *
        </label>
        <select
          id="caminhao_id"
          {...caminhaoRegisterRest}
          onChange={(e) => {
            caminhaoRegisterOnChange(e);
            handleCaminhaoChange(e.target.value);
          }}
          className={cn(
            'w-full rounded-lg border px-4 py-3 text-base text-primary-900 outline-none transition-colors',
            'focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20',
            errors.caminhao_id ? 'border-red-300 bg-alert-danger-bg' : 'border-surface-border bg-surface-card',
          )}
          disabled={isPending}
        >
          <option value="">Selecione um caminhão</option>
          {caminhoes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.placa} — {c.modelo}
            </option>
          ))}
        </select>
        {errors.caminhao_id && (
          <p className="mt-1.5 text-sm text-danger font-medium">{errors.caminhao_id.message}</p>
        )}
        {caminhaoWarning && (
          <div className="mt-2 rounded-lg border border-warning/30 bg-alert-warning-bg p-3 text-sm text-amber-800 dark:text-amber-200">
            <div className="flex items-start gap-2">
              <svg className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.832c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span>{caminhaoWarning}</span>
            </div>
          </div>
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
            errors.data_inicio ? 'border-red-300 bg-alert-danger-bg' : 'border-surface-border bg-surface-card',
          )}
          disabled={isPending}
        />
        {errors.data_inicio && (
          <p className="mt-1.5 text-sm text-danger font-medium">{errors.data_inicio.message}</p>
        )}
      </div>

      {/* Observacao */}
      <div>
        <label htmlFor="observacao" className="mb-2 block text-base font-medium text-primary-700">
          Observação        </label>
        <textarea
          id="observacao"
          rows={3}
          {...register('observacao')}
          className={cn(
            'w-full rounded-lg border px-4 py-3 text-base text-primary-900 outline-none transition-colors',
            'focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20',
            errors.observacao ? 'border-red-300 bg-alert-danger-bg' : 'border-surface-border bg-surface-card',
          )}
          disabled={isPending}
          placeholder="Observações sobre este vínculo (opcional)"
        />
        {errors.observacao && (
          <p className="mt-1.5 text-sm text-danger font-medium">{errors.observacao.message}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-btn-primary px-6 py-3 text-base font-semibold text-white min-h-[48px] transition-colors hover:bg-btn-primary-hover disabled:opacity-50"
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
