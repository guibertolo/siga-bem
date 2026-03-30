'use client';

import { useForm } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { z } from 'zod';
import { useState, useTransition } from 'react';
import { validatePlaca, maskPlaca } from '@/lib/utils/validate-placa';
import { validateRenavam } from '@/lib/utils/validate-renavam';
import { maskKm } from '@/lib/utils/mask-km';
import { TIPO_CEGONHA_OPTIONS } from '@/types/caminhao';
import type { Caminhao, CaminhaoFormData, CaminhaoActionResult } from '@/types/caminhao';
import { cn } from '@/lib/utils/cn';

const caminhaoFormSchema = z.object({
  placa: z.string()
    .min(1, 'Placa e obrigatoria')
    .refine((val) => validatePlaca(val), 'Placa invalida. Use formato Mercosul (ABC1D23) ou antigo (ABC-1234)'),
  modelo: z.string()
    .min(1, 'Modelo e obrigatorio')
    .max(100, 'Modelo deve ter no maximo 100 caracteres'),
  marca: z.string().max(100),
  ano: z.string().refine(
    (val) => {
      if (val === '') return true;
      const num = parseInt(val, 10);
      const maxYear = new Date().getFullYear() + 1;
      return !isNaN(num) && num >= 1970 && num <= maxYear;
    },
    'Ano invalido',
  ),
  renavam: z.string().refine(
    (val) => validateRenavam(val),
    'RENAVAM invalido',
  ),
  tipo_cegonha: z.enum(['aberta', 'fechada'], {
    error: 'Selecione o tipo de cegonha',
  }),
  capacidade_veiculos: z.string()
    .min(1, 'Capacidade e obrigatoria')
    .refine(
      (val) => {
        const num = parseInt(val, 10);
        return !isNaN(num) && num >= 1 && num <= 15;
      },
      'Capacidade deve ser entre 1 e 15',
    ),
  km_atual: z.string().refine(
    (val) => {
      if (val === '' || val === '0') return true;
      const num = parseInt(val.replace(/\./g, ''), 10);
      return !isNaN(num) && num >= 0;
    },
    'Km deve ser positivo',
  ),
  observacao: z.string().max(500),
});

type FormValues = z.infer<typeof caminhaoFormSchema>;

interface CaminhaoFormProps {
  caminhao?: Caminhao | null;
  mode: 'create' | 'edit';
  onSubmit: (data: CaminhaoFormData) => Promise<CaminhaoActionResult>;
}

export function CaminhaoForm({ caminhao, mode, onSubmit }: CaminhaoFormProps) {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: standardSchemaResolver(caminhaoFormSchema),
    defaultValues: {
      placa: caminhao?.placa ? maskPlaca(caminhao.placa) : '',
      modelo: caminhao?.modelo ?? '',
      marca: caminhao?.marca ?? '',
      ano: caminhao?.ano?.toString() ?? '',
      renavam: caminhao?.renavam ?? '',
      tipo_cegonha: caminhao?.tipo_cegonha ?? 'aberta',
      capacidade_veiculos: caminhao?.capacidade_veiculos?.toString() ?? '11',
      km_atual: caminhao?.km_atual ? maskKm(caminhao.km_atual.toString()) : '0',
      observacao: caminhao?.observacao ?? '',
    },
  });

  function handleMaskedChange(
    field: keyof FormValues,
    maskFn: (value: string) => string,
  ) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const masked = maskFn(e.target.value);
      setValue(field, masked, { shouldValidate: false });
      e.target.value = masked;
    };
  }

  async function onFormSubmit(values: FormValues) {
    setServerError(null);

    startTransition(async () => {
      const result = await onSubmit(values as CaminhaoFormData);

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
      }
    });
  }

  const isEditing = mode === 'edit';
  const inputClass = 'w-full rounded-lg border px-4 py-3 text-base outline-none transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500';

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6" noValidate>
      {serverError && (
        <div className="rounded-lg border border-danger/20 bg-alert-danger-bg p-4 text-base text-danger">
          {serverError}
        </div>
      )}

      {/* Placa + Tipo Cegonha row */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="placa" className="mb-2 block text-base font-medium text-primary-900">
            Placa <span className="text-danger">*</span>
          </label>
          <input
            id="placa"
            type="text"
            placeholder="ABC1D23 ou ABC-1234"
            maxLength={8}
            {...register('placa', {
              onChange: handleMaskedChange('placa', maskPlaca),
            })}
            className={cn(inputClass, errors.placa ? 'border-red-500' : 'border-surface-border')}
          />
          {errors.placa && (
            <p className="mt-1.5 text-sm text-danger font-medium">{errors.placa.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="tipo_cegonha" className="mb-2 block text-base font-medium text-primary-900">
            Tipo Cegonha <span className="text-danger">*</span>
          </label>
          <select
            id="tipo_cegonha"
            {...register('tipo_cegonha')}
            className={cn(inputClass, errors.tipo_cegonha ? 'border-red-500' : 'border-surface-border')}
          >
            {TIPO_CEGONHA_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {errors.tipo_cegonha && (
            <p className="mt-1.5 text-sm text-danger font-medium">{errors.tipo_cegonha.message}</p>
          )}
        </div>
      </div>

      {/* Modelo + Marca row */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="modelo" className="mb-2 block text-base font-medium text-primary-900">
            Modelo <span className="text-danger">*</span>
          </label>
          <input
            id="modelo"
            type="text"
            placeholder="Ex: VW Constellation 24.280"
            {...register('modelo')}
            className={cn(inputClass, errors.modelo ? 'border-red-500' : 'border-surface-border')}
          />
          {errors.modelo && (
            <p className="mt-1.5 text-sm text-danger font-medium">{errors.modelo.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="marca" className="mb-2 block text-base font-medium text-primary-900">
            Marca
          </label>
          <input
            id="marca"
            type="text"
            placeholder="Ex: Volkswagen"
            {...register('marca')}
            className={cn(inputClass, 'border-surface-border')}
          />
        </div>
      </div>

      {/* Ano + RENAVAM row */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="ano" className="mb-2 block text-base font-medium text-primary-900">
            Ano
          </label>
          <input
            id="ano"
            type="number"
            placeholder="Ex: 2023"
            min={1970}
            max={new Date().getFullYear() + 1}
            {...register('ano')}
            className={cn(inputClass, errors.ano ? 'border-red-500' : 'border-surface-border')}
          />
          {errors.ano && (
            <p className="mt-1.5 text-sm text-danger font-medium">{errors.ano.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="renavam" className="mb-2 block text-base font-medium text-primary-900">
            RENAVAM
          </label>
          <input
            id="renavam"
            type="text"
            placeholder="11 digitos (opcional)"
            maxLength={11}
            {...register('renavam')}
            className={cn(inputClass, errors.renavam ? 'border-red-500' : 'border-surface-border')}
          />
          {errors.renavam && (
            <p className="mt-1.5 text-sm text-danger font-medium">{errors.renavam.message}</p>
          )}
        </div>
      </div>

      {/* Capacidade + Km row */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="capacidade_veiculos" className="mb-2 block text-base font-medium text-primary-900">
            Capacidade (veiculos) <span className="text-danger">*</span>
          </label>
          <input
            id="capacidade_veiculos"
            type="number"
            min={1}
            max={15}
            {...register('capacidade_veiculos')}
            className={cn(inputClass, errors.capacidade_veiculos ? 'border-red-500' : 'border-surface-border')}
          />
          {errors.capacidade_veiculos && (
            <p className="mt-1.5 text-sm text-danger font-medium">{errors.capacidade_veiculos.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="km_atual" className="mb-2 block text-base font-medium text-primary-900">
            Km Atual
          </label>
          <input
            id="km_atual"
            type="text"
            inputMode="numeric"
            placeholder="Ex: 320.450"
            {...register('km_atual', {
              onChange: handleMaskedChange('km_atual', maskKm),
            })}
            className={cn(inputClass, errors.km_atual ? 'border-red-500' : 'border-surface-border')}
          />
          {errors.km_atual && (
            <p className="mt-1.5 text-sm text-danger font-medium">{errors.km_atual.message}</p>
          )}
        </div>
      </div>

      {/* Observacao */}
      <div>
        <label htmlFor="observacao" className="mb-2 block text-base font-medium text-primary-900">
          Observacao
        </label>
        <textarea
          id="observacao"
          rows={3}
          placeholder="Observacoes adicionais (opcional)"
          {...register('observacao')}
          className={cn(inputClass, 'border-surface-border')}
        />
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-3">
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
          {isPending ? 'Salvando...' : isEditing ? 'Salvar Alteracoes' : 'Cadastrar Caminhao'}
        </button>
      </div>
    </form>
  );
}
