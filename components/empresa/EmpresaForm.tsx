'use client';

import { useForm } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { z } from 'zod';
import { useState, useTransition } from 'react';
import { validateCNPJ, maskCNPJ, maskPhone, maskCEP } from '@/lib/utils/validate-cnpj';
import { UF_LIST } from '@/types/empresa';
import type { Empresa, EmpresaFormData, EmpresaActionResult } from '@/types/empresa';
import { cn } from '@/lib/utils/cn';

const empresaFormSchema = z.object({
  cnpj: z.string()
    .min(1, 'CNPJ e obrigatorio')
    .refine((val) => validateCNPJ(val), 'CNPJ invalido'),
  razao_social: z.string()
    .min(1, 'Razao Social e obrigatoria')
    .max(255, 'Razao Social deve ter no maximo 255 caracteres'),
  nome_fantasia: z.string().max(255),
  endereco: z.string(),
  cidade: z.string(),
  estado: z.string(),
  cep: z.string(),
  telefone: z.string().max(20),
  email: z.string().refine(
    (val) => val === '' || z.string().email().safeParse(val).success,
    'Email invalido',
  ),
});

type FormValues = z.infer<typeof empresaFormSchema>;

interface EmpresaFormProps {
  empresa?: Empresa | null;
  mode: 'create' | 'edit';
  onSubmit: (data: EmpresaFormData) => Promise<EmpresaActionResult>;
}

export function EmpresaForm({ empresa, mode, onSubmit }: EmpresaFormProps) {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: standardSchemaResolver(empresaFormSchema),
    defaultValues: {
      cnpj: empresa?.cnpj ?? '',
      razao_social: empresa?.razao_social ?? '',
      nome_fantasia: empresa?.nome_fantasia ?? '',
      endereco: empresa?.endereco ?? '',
      cidade: empresa?.cidade ?? '',
      estado: empresa?.estado ?? '',
      cep: empresa?.cep ?? '',
      telefone: empresa?.telefone ?? '',
      email: empresa?.email ?? '',
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
      const result = await onSubmit(values as EmpresaFormData);

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

      {/* CNPJ */}
      <div>
        <label htmlFor="cnpj" className="mb-2 block text-base font-medium text-primary-900">
          CNPJ <span className="text-red-500">*</span>
        </label>
        <input
          id="cnpj"
          type="text"
          placeholder="00.000.000/0000-00"
          disabled={isEditing}
          {...register('cnpj', {
            onChange: handleMaskedChange('cnpj', maskCNPJ),
          })}
          className={cn(
            'w-full rounded-lg border px-4 py-3 text-base outline-none transition-colors',
            'focus:border-primary-500 focus:ring-1 focus:ring-primary-500',
            isEditing && 'cursor-not-allowed bg-surface-muted text-text-muted',
            errors.cnpj ? 'border-red-500' : 'border-surface-border',
          )}
        />
        {errors.cnpj && (
          <p className="mt-1.5 text-sm text-red-600 font-medium">{errors.cnpj.message}</p>
        )}
      </div>

      {/* Razao Social */}
      <div>
        <label htmlFor="razao_social" className="mb-2 block text-base font-medium text-primary-900">
          Razao Social <span className="text-red-500">*</span>
        </label>
        <input
          id="razao_social"
          type="text"
          placeholder="Razao social da empresa"
          {...register('razao_social')}
          className={cn(
            'w-full rounded-lg border px-4 py-3 text-base outline-none transition-colors',
            'focus:border-primary-500 focus:ring-1 focus:ring-primary-500',
            errors.razao_social ? 'border-red-500' : 'border-surface-border',
          )}
        />
        {errors.razao_social && (
          <p className="mt-1.5 text-sm text-red-600 font-medium">{errors.razao_social.message}</p>
        )}
      </div>

      {/* Nome Fantasia */}
      <div>
        <label htmlFor="nome_fantasia" className="mb-2 block text-base font-medium text-primary-900">
          Nome Fantasia
        </label>
        <input
          id="nome_fantasia"
          type="text"
          placeholder="Nome fantasia (opcional)"
          {...register('nome_fantasia')}
          className={cn(
            'w-full rounded-lg border px-4 py-3 text-base outline-none transition-colors',
            'focus:border-primary-500 focus:ring-1 focus:ring-primary-500',
            errors.nome_fantasia ? 'border-red-500' : 'border-surface-border',
          )}
        />
        {errors.nome_fantasia && (
          <p className="mt-1.5 text-sm text-red-600 font-medium">{errors.nome_fantasia.message}</p>
        )}
      </div>

      {/* Endereco */}
      <div>
        <label htmlFor="endereco" className="mb-2 block text-base font-medium text-primary-900">
          Endereco
        </label>
        <input
          id="endereco"
          type="text"
          placeholder="Rua, numero, complemento"
          {...register('endereco')}
          className="w-full rounded-lg border border-surface-border px-4 py-3 text-base outline-none transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
        />
      </div>

      {/* Cidade + Estado + CEP row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="cidade" className="mb-2 block text-base font-medium text-primary-900">
            Cidade
          </label>
          <input
            id="cidade"
            type="text"
            placeholder="Cidade"
            {...register('cidade')}
            className="w-full rounded-lg border border-surface-border px-4 py-3 text-base outline-none transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
          />
        </div>

        <div>
          <label htmlFor="estado" className="mb-2 block text-base font-medium text-primary-900">
            Estado (UF)
          </label>
          <select
            id="estado"
            {...register('estado')}
            className={cn(
              'w-full rounded-lg border px-4 py-3 text-base outline-none transition-colors',
              'focus:border-primary-500 focus:ring-1 focus:ring-primary-500',
              errors.estado ? 'border-red-500' : 'border-surface-border',
            )}
          >
            <option value="">Selecione</option>
            {UF_LIST.map((uf) => (
              <option key={uf} value={uf}>{uf}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="cep" className="mb-2 block text-base font-medium text-primary-900">
            CEP
          </label>
          <input
            id="cep"
            type="text"
            placeholder="00000-000"
            {...register('cep', {
              onChange: handleMaskedChange('cep', maskCEP),
            })}
            className="w-full rounded-lg border border-surface-border px-4 py-3 text-base outline-none transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Telefone + Email row */}
      <div className="grid gap-4 sm:grid-cols-2">
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

        <div>
          <label htmlFor="email" className="mb-2 block text-base font-medium text-primary-900">
            Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="contato@empresa.com.br"
            {...register('email')}
            className={cn(
              'w-full rounded-lg border px-4 py-3 text-base outline-none transition-colors',
              'focus:border-primary-500 focus:ring-1 focus:ring-primary-500',
              errors.email ? 'border-red-500' : 'border-surface-border',
            )}
          />
          {errors.email && (
            <p className="mt-1.5 text-sm text-red-600 font-medium">{errors.email.message}</p>
          )}
        </div>
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
          {isPending ? 'Salvando...' : isEditing ? 'Salvar Alteracoes' : 'Cadastrar Empresa'}
        </button>
      </div>
    </form>
  );
}
