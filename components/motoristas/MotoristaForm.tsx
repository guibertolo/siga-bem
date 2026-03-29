'use client';

import { useForm } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { z } from 'zod';
import { useState, useTransition } from 'react';
import { validateCPF, maskCPF } from '@/lib/utils/validate-cpf';
import { maskPhone } from '@/lib/utils/validate-cnpj';
import { CNH_CATEGORIA_OPTIONS } from '@/types/motorista';
import type { Motorista, MotoristaFormData, MotoristaActionResult } from '@/types/motorista';
import { cn } from '@/lib/utils/cn';

const CNH_CATEGORIAS = ['A', 'B', 'C', 'D', 'E', 'AB', 'AC', 'AD', 'AE'] as const;

const motoristaFormSchema = z.object({
  nome: z.string()
    .min(1, 'Nome e obrigatorio')
    .max(255, 'Nome deve ter no maximo 255 caracteres'),
  cpf: z.string()
    .min(1, 'CPF e obrigatorio')
    .refine((val) => validateCPF(val), 'CPF invalido'),
  cnh_numero: z.string()
    .min(1, 'Numero da CNH e obrigatorio')
    .max(20, 'Numero da CNH deve ter no maximo 20 caracteres'),
  cnh_categoria: z.enum(CNH_CATEGORIAS, {
    error: 'Selecione uma categoria',
  }),
  cnh_validade: z.string()
    .min(1, 'Validade da CNH e obrigatoria'),
  telefone: z.string().max(20, 'Telefone deve ter no maximo 20 caracteres'),
  observacao: z.string().max(1000, 'Observacao deve ter no maximo 1000 caracteres'),
});

type FormValues = z.infer<typeof motoristaFormSchema>;

interface MotoristaFormProps {
  motorista?: Motorista | null;
  mode: 'create' | 'edit';
  onSubmit: (data: MotoristaFormData) => Promise<MotoristaActionResult>;
}

export function MotoristaForm({ motorista, mode, onSubmit }: MotoristaFormProps) {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: standardSchemaResolver(motoristaFormSchema),
    defaultValues: {
      nome: motorista?.nome ?? '',
      cpf: motorista?.cpf ?? '',
      cnh_numero: motorista?.cnh_numero ?? '',
      cnh_categoria: motorista?.cnh_categoria ?? 'E',
      cnh_validade: motorista?.cnh_validade ?? '',
      telefone: motorista?.telefone ?? '',
      observacao: motorista?.observacao ?? '',
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
      const result = await onSubmit(values as MotoristaFormData);

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

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6" noValidate>
      {serverError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-base text-red-700">
          {serverError}
        </div>
      )}

      {/* Nome */}
      <div>
        <label htmlFor="nome" className="mb-2 block text-base font-medium text-primary-900">
          Nome Completo <span className="text-red-500">*</span>
        </label>
        <input
          id="nome"
          type="text"
          placeholder="Nome completo do motorista"
          {...register('nome')}
          className={cn(
            'w-full rounded-lg border px-4 py-3 text-base outline-none transition-colors',
            'focus:border-primary-500 focus:ring-1 focus:ring-primary-500',
            errors.nome ? 'border-red-500' : 'border-surface-border',
          )}
        />
        {errors.nome && (
          <p className="mt-1.5 text-sm text-red-600 font-medium">{errors.nome.message}</p>
        )}
      </div>

      {/* CPF */}
      <div>
        <label htmlFor="cpf" className="mb-2 block text-base font-medium text-primary-900">
          CPF <span className="text-red-500">*</span>
        </label>
        <input
          id="cpf"
          type="text"
          placeholder="000.000.000-00"
          disabled={isEditing}
          {...register('cpf', {
            onChange: handleMaskedChange('cpf', maskCPF),
          })}
          className={cn(
            'w-full rounded-lg border px-4 py-3 text-base outline-none transition-colors',
            'focus:border-primary-500 focus:ring-1 focus:ring-primary-500',
            isEditing && 'cursor-not-allowed bg-gray-100 text-gray-500',
            errors.cpf ? 'border-red-500' : 'border-surface-border',
          )}
        />
        {errors.cpf && (
          <p className="mt-1.5 text-sm text-red-600 font-medium">{errors.cpf.message}</p>
        )}
      </div>

      {/* CNH Numero + Categoria row */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="cnh_numero" className="mb-2 block text-base font-medium text-primary-900">
            Numero da CNH <span className="text-red-500">*</span>
          </label>
          <input
            id="cnh_numero"
            type="text"
            placeholder="Numero do registro da CNH"
            {...register('cnh_numero')}
            className={cn(
              'w-full rounded-lg border px-4 py-3 text-base outline-none transition-colors',
              'focus:border-primary-500 focus:ring-1 focus:ring-primary-500',
              errors.cnh_numero ? 'border-red-500' : 'border-surface-border',
            )}
          />
          {errors.cnh_numero && (
            <p className="mt-1.5 text-sm text-red-600 font-medium">{errors.cnh_numero.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="cnh_categoria" className="mb-2 block text-base font-medium text-primary-900">
            Categoria <span className="text-red-500">*</span>
          </label>
          <select
            id="cnh_categoria"
            {...register('cnh_categoria')}
            className={cn(
              'w-full rounded-lg border px-4 py-3 text-base outline-none transition-colors',
              'focus:border-primary-500 focus:ring-1 focus:ring-primary-500',
              errors.cnh_categoria ? 'border-red-500' : 'border-surface-border',
            )}
          >
            {CNH_CATEGORIA_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {errors.cnh_categoria && (
            <p className="mt-1.5 text-sm text-red-600 font-medium">{errors.cnh_categoria.message}</p>
          )}
        </div>
      </div>

      {/* CNH Validade */}
      <div>
        <label htmlFor="cnh_validade" className="mb-2 block text-base font-medium text-primary-900">
          Validade da CNH <span className="text-red-500">*</span>
        </label>
        <input
          id="cnh_validade"
          type="date"
          {...register('cnh_validade')}
          className={cn(
            'w-full rounded-lg border px-4 py-3 text-base outline-none transition-colors',
            'focus:border-primary-500 focus:ring-1 focus:ring-primary-500',
            errors.cnh_validade ? 'border-red-500' : 'border-surface-border',
          )}
        />
        {errors.cnh_validade && (
          <p className="mt-1.5 text-sm text-red-600 font-medium">{errors.cnh_validade.message}</p>
        )}
      </div>

      {/* Telefone */}
      <div>
        <label htmlFor="telefone" className="mb-2 block text-base font-medium text-primary-900">
          Telefone
        </label>
        <input
          id="telefone"
          type="text"
          placeholder="(00) 00000-0000"
          {...register('telefone', {
            onChange: handleMaskedChange('telefone', maskPhone),
          })}
          className="w-full rounded-lg border border-surface-border px-4 py-3 text-base outline-none transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
        />
      </div>

      {/* Observacao */}
      <div>
        <label htmlFor="observacao" className="mb-2 block text-base font-medium text-primary-900">
          Observacao
        </label>
        <textarea
          id="observacao"
          rows={3}
          placeholder="Observacoes sobre o motorista (opcional)"
          {...register('observacao')}
          className={cn(
            'w-full rounded-lg border px-4 py-3 text-base outline-none transition-colors',
            'focus:border-primary-500 focus:ring-1 focus:ring-primary-500',
            errors.observacao ? 'border-red-500' : 'border-surface-border',
          )}
        />
        {errors.observacao && (
          <p className="mt-1.5 text-sm text-red-600 font-medium">{errors.observacao.message}</p>
        )}
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
          {isPending ? 'Salvando...' : isEditing ? 'Salvar Alteracoes' : 'Cadastrar Motorista'}
        </button>
      </div>
    </form>
  );
}
