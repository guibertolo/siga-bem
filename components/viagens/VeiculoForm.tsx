'use client';

import { useForm } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { useState, useTransition, useEffect } from 'react';
import { viagemVeiculoSchema } from '@/lib/validations/viagem-veiculo';
import { maskPlaca } from '@/lib/utils/validate-placa';
import { cn } from '@/lib/utils/cn';
import type { ViagemVeiculo, ViagemVeiculoFormData, ViagemVeiculoActionResult } from '@/types/viagem-veiculo';
import type { ViagemVeiculoFormValues } from '@/lib/validations/viagem-veiculo';

interface VeiculoFormProps {
  veiculo?: ViagemVeiculo | null;
  onSubmit: (data: ViagemVeiculoFormData) => Promise<ViagemVeiculoActionResult>;
  onClose: () => void;
}

export function VeiculoForm({ veiculo, onSubmit, onClose }: VeiculoFormProps) {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<ViagemVeiculoFormValues>({
    resolver: standardSchemaResolver(viagemVeiculoSchema),
    defaultValues: {
      modelo: veiculo?.modelo ?? '',
      marca: veiculo?.marca ?? '',
      placa: veiculo?.placa ?? '',
      chassi: veiculo?.chassi ?? '',
      cor: veiculo?.cor ?? '',
      posicao: veiculo?.posicao ?? undefined,
      observacao: veiculo?.observacao ?? '',
    },
  });

  const watchedPlaca = watch('placa');

  // Apply placa mask on change
  useEffect(() => {
    if (watchedPlaca) {
      const masked = maskPlaca(watchedPlaca);
      if (masked !== watchedPlaca) {
        setValue('placa', masked, { shouldValidate: false });
      }
    }
  }, [watchedPlaca, setValue]);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  function onFormSubmit(values: ViagemVeiculoFormValues) {
    setServerError(null);

    startTransition(async () => {
      const formData: ViagemVeiculoFormData = {
        modelo: values.modelo,
        marca: values.marca || undefined,
        placa: values.placa || undefined,
        chassi: values.chassi || undefined,
        cor: values.cor || undefined,
        posicao: values.posicao ?? undefined,
        observacao: values.observacao || undefined,
      };

      const result = await onSubmit(formData);

      if (!result.success) {
        if (result.fieldErrors) {
          for (const [field, message] of Object.entries(result.fieldErrors)) {
            if (message) {
              setError(field as keyof ViagemVeiculoFormValues, { message });
            }
          }
        }
        if (result.error) {
          setServerError(result.error);
        }
      } else {
        onClose();
      }
    });
  }

  const isEdit = !!veiculo;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? 'Editar veiculo' : 'Adicionar veiculo'}
    >
      <div
        className="w-full max-w-lg rounded-lg bg-surface-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-primary-900">
            {isEdit ? 'Editar Veiculo' : 'Adicionar Veiculo'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-400 transition-colors hover:text-gray-600"
            aria-label="Fechar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {serverError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-base text-red-700">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          {/* Modelo (required) */}
          <div>
            <label htmlFor="vf-modelo" className="mb-2 block text-base font-medium text-primary-700">
              Modelo <span className="text-red-500">*</span>
            </label>
            <input
              id="vf-modelo"
              type="text"
              maxLength={100}
              className={cn(
                'w-full rounded-lg border px-4 py-3 text-base transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500',
                errors.modelo ? 'border-red-300 bg-red-50' : 'border-surface-border bg-surface-card',
              )}
              placeholder="Ex: Onix, HB20, Corolla"
              {...register('modelo')}
            />
            {errors.modelo && (
              <p className="mt-1.5 text-sm text-red-600 font-medium">{errors.modelo.message}</p>
            )}
          </div>

          {/* Marca */}
          <div>
            <label htmlFor="vf-marca" className="mb-2 block text-base font-medium text-primary-700">
              Marca
            </label>
            <input
              id="vf-marca"
              type="text"
              maxLength={50}
              className={cn(
                'w-full rounded-lg border px-4 py-3 text-base transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500',
                errors.marca ? 'border-red-300 bg-red-50' : 'border-surface-border bg-surface-card',
              )}
              placeholder="Ex: Chevrolet, Hyundai, Toyota"
              {...register('marca')}
            />
            {errors.marca && (
              <p className="mt-1.5 text-sm text-red-600 font-medium">{errors.marca.message}</p>
            )}
          </div>

          {/* Placa + Chassi row */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="vf-placa" className="mb-2 block text-base font-medium text-primary-700">
                Placa
              </label>
              <input
                id="vf-placa"
                type="text"
                maxLength={8}
                className={cn(
                  'w-full rounded-lg border px-4 py-3 text-base uppercase transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500',
                  errors.placa ? 'border-red-300 bg-red-50' : 'border-surface-border bg-surface-card',
                )}
                placeholder="ABC-1234 ou ABC1D23"
                {...register('placa')}
              />
              {errors.placa && (
                <p className="mt-1.5 text-sm text-red-600 font-medium">{errors.placa.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="vf-chassi" className="mb-2 block text-base font-medium text-primary-700">
                Chassi
              </label>
              <input
                id="vf-chassi"
                type="text"
                maxLength={20}
                className={cn(
                  'w-full rounded-lg border px-4 py-3 text-base transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500',
                  errors.chassi ? 'border-red-300 bg-red-50' : 'border-surface-border bg-surface-card',
                )}
                placeholder="Chassi do veiculo"
                {...register('chassi')}
              />
              {errors.chassi && (
                <p className="mt-1.5 text-sm text-red-600 font-medium">{errors.chassi.message}</p>
              )}
            </div>
          </div>

          {/* Cor + Posicao row */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="vf-cor" className="mb-2 block text-base font-medium text-primary-700">
                Cor
              </label>
              <input
                id="vf-cor"
                type="text"
                maxLength={30}
                className={cn(
                  'w-full rounded-lg border px-4 py-3 text-base transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500',
                  errors.cor ? 'border-red-300 bg-red-50' : 'border-surface-border bg-surface-card',
                )}
                placeholder="Ex: Branco, Prata, Preto"
                {...register('cor')}
              />
              {errors.cor && (
                <p className="mt-1.5 text-sm text-red-600 font-medium">{errors.cor.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="vf-posicao" className="mb-2 block text-base font-medium text-primary-700">
                Posicao na cegonha
              </label>
              <input
                id="vf-posicao"
                type="number"
                min={1}
                max={15}
                className={cn(
                  'w-full rounded-lg border px-4 py-3 text-base transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500',
                  errors.posicao ? 'border-red-300 bg-red-50' : 'border-surface-border bg-surface-card',
                )}
                placeholder="1 a 15"
                {...register('posicao', {
                  setValueAs: (v: string) => (v === '' ? undefined : Number(v)),
                })}
              />
              {errors.posicao && (
                <p className="mt-1.5 text-sm text-red-600 font-medium">{errors.posicao.message}</p>
              )}
            </div>
          </div>

          {/* Observacao */}
          <div>
            <label htmlFor="vf-observacao" className="mb-2 block text-base font-medium text-primary-700">
              Observacao
            </label>
            <textarea
              id="vf-observacao"
              maxLength={300}
              rows={2}
              className={cn(
                'w-full rounded-lg border px-4 py-3 text-base transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500',
                errors.observacao ? 'border-red-300 bg-red-50' : 'border-surface-border bg-surface-card',
              )}
              placeholder="Observacoes sobre o veiculo"
              {...register('observacao')}
            />
            {errors.observacao && (
              <p className="mt-1.5 text-sm text-red-600 font-medium">{errors.observacao.message}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-surface-border px-4 py-3 text-base font-medium text-primary-700 min-h-[48px] transition-colors hover:bg-surface-muted"
              disabled={isPending}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-700 px-4 py-3 text-base font-semibold text-white min-h-[48px] transition-colors hover:bg-primary-800 disabled:opacity-50"
              disabled={isPending}
            >
              <svg className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {isPending ? 'Salvando...' : isEdit ? 'Salvar' : 'Adicionar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
