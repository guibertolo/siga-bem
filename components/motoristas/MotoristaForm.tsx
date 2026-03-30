'use client';

import { useForm } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { z } from 'zod';
import { useState, useTransition } from 'react';
import { validateCPF, maskCPF } from '@/lib/utils/validate-cpf';
import { maskPhone } from '@/lib/utils/validate-cnpj';
import { CNH_CATEGORIA_OPTIONS } from '@/types/motorista';
import type { Motorista, MotoristaFormData, MotoristaActionResult, MotoristaComContaFormData, MotoristaComContaActionResult } from '@/types/motorista';
import { cn } from '@/lib/utils/cn';
import { CredenciaisModal } from '@/components/motoristas/CredenciaisModal';

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
  percentual_pagamento: z.string()
    .refine(
      (val) => {
        if (val === '') return true;
        const num = parseFloat(val.replace(',', '.'));
        return !isNaN(num) && num >= 0 && num <= 100;
      },
      'Percentual deve ser entre 0 e 100',
    ),
  email: z.string().max(255).optional(),
});

type FormValues = z.infer<typeof motoristaFormSchema>;

/**
 * Dados da empresa ativa para exibicao no InfoBox.
 */
interface EmpresaInfo {
  nome: string;
  cnpj: string;
}

interface MotoristaFormProps {
  motorista?: Motorista | null;
  mode: 'create' | 'edit';
  empresaInfo?: EmpresaInfo | null;
  onSubmit: (data: MotoristaFormData) => Promise<MotoristaActionResult>;
  onSubmitComConta?: (data: MotoristaComContaFormData) => Promise<MotoristaComContaActionResult>;
}

/**
 * Formulario expandido de motorista com toggle de criacao de conta.
 * Story 8.2 — Formulario de Motorista Expandido
 */
export function MotoristaForm({ motorista, mode, empresaInfo, onSubmit, onSubmitComConta }: MotoristaFormProps) {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [criarConta, setCriarConta] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [credenciais, setCredenciais] = useState<{
    email: string;
    senha: string;
    nomeMotorista: string;
  } | null>(null);

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
      percentual_pagamento: motorista?.percentual_pagamento != null
        ? String(motorista.percentual_pagamento).replace('.', ',')
        : '',
      email: '',
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
    setEmailError(null);

    // If toggle ON, validate email and call createMotoristaComConta
    if (criarConta) {
      if (!values.email || values.email.trim() === '') {
        setEmailError('Email e obrigatorio quando criar acesso esta ativo');
        return;
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(values.email)) {
        setEmailError('Email invalido');
        return;
      }

      if (!onSubmitComConta) {
        setServerError('Funcionalidade de criar conta nao disponivel');
        return;
      }

      startTransition(async () => {
        const comContaData: MotoristaComContaFormData = {
          nome: values.nome,
          cpf: values.cpf,
          cnh_numero: values.cnh_numero,
          cnh_categoria: values.cnh_categoria,
          cnh_validade: values.cnh_validade,
          telefone: values.telefone ?? '',
          observacao: values.observacao ?? '',
          percentual_pagamento: values.percentual_pagamento ?? '',
          email: values.email!,
          criar_conta: true,
        };

        const result = await onSubmitComConta(comContaData);

        if (!result.success) {
          if (result.fieldErrors) {
            for (const [field, message] of Object.entries(result.fieldErrors)) {
              if (message) {
                if (field === 'email') {
                  setEmailError(message);
                } else {
                  setError(field as keyof FormValues, { message });
                }
              }
            }
          }
          if (result.error) {
            setServerError(result.error);
          }
        } else if (result.credenciais) {
          // Success with credentials — show modal (Story 8.3)
          setCredenciais({
            email: result.credenciais.email,
            senha: result.credenciais.senha,
            nomeMotorista: values.nome,
          });
        }
      });
      return;
    }

    // Toggle OFF — normal motorista creation
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
    <>
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6" noValidate>
        {/* InfoBox — empresa ativa (Story 8.2) */}
        {empresaInfo && (
          <div className="rounded-lg border border-info/20 bg-alert-info-bg p-4">
            <div className="flex items-start gap-3">
              <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <div>
                <p className="text-base font-semibold text-blue-900">
                  Cadastrando para: {empresaInfo.nome}
                </p>
                <p className="text-sm text-info">
                  CNPJ: {empresaInfo.cnpj}
                </p>
              </div>
            </div>
          </div>
        )}

        {serverError && (
          <div className="rounded-lg border border-danger/20 bg-alert-danger-bg p-4 text-base text-danger">
            {serverError}
          </div>
        )}

        {/* Nome */}
        <div>
          <label htmlFor="nome" className="mb-2 block text-base font-medium text-primary-900">
            Nome Completo <span className="text-danger">*</span>
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
            <p className="mt-1.5 text-sm text-danger font-medium">{errors.nome.message}</p>
          )}
        </div>

        {/* CPF */}
        <div>
          <label htmlFor="cpf" className="mb-2 block text-base font-medium text-primary-900">
            CPF <span className="text-danger">*</span>
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
              isEditing && 'cursor-not-allowed bg-surface-muted text-text-muted',
              errors.cpf ? 'border-red-500' : 'border-surface-border',
            )}
          />
          {errors.cpf && (
            <p className="mt-1.5 text-sm text-danger font-medium">{errors.cpf.message}</p>
          )}
        </div>

        {/* CNH Numero + Categoria row */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="cnh_numero" className="mb-2 block text-base font-medium text-primary-900">
              Numero da CNH <span className="text-danger">*</span>
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
              <p className="mt-1.5 text-sm text-danger font-medium">{errors.cnh_numero.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="cnh_categoria" className="mb-2 block text-base font-medium text-primary-900">
              Categoria <span className="text-danger">*</span>
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
              <p className="mt-1.5 text-sm text-danger font-medium">{errors.cnh_categoria.message}</p>
            )}
          </div>
        </div>

        {/* CNH Validade */}
        <div>
          <label htmlFor="cnh_validade" className="mb-2 block text-base font-medium text-primary-900">
            Validade da CNH <span className="text-danger">*</span>
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
            <p className="mt-1.5 text-sm text-danger font-medium">{errors.cnh_validade.message}</p>
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

        {/* Percentual de Pagamento */}
        <div>
          <label htmlFor="percentual_pagamento" className="mb-2 block text-base font-medium text-primary-900">
            Quanto o motorista recebe por viagem (%)
          </label>
          <input
            id="percentual_pagamento"
            type="number"
            min={0}
            max={100}
            step={0.5}
            placeholder="Ex: 25"
            {...register('percentual_pagamento')}
            className={cn(
              'w-full rounded-lg border px-4 py-3 text-base outline-none transition-colors',
              'focus:border-primary-500 focus:ring-1 focus:ring-primary-500',
              errors.percentual_pagamento ? 'border-red-500' : 'border-surface-border',
            )}
          />
          <p className="mt-1 text-sm text-primary-500">
            Percentual que o motorista recebe sobre o valor do frete. Sera aplicado automaticamente em cada viagem.
          </p>
          {errors.percentual_pagamento && (
            <p className="mt-1.5 text-sm text-danger font-medium">{errors.percentual_pagamento.message}</p>
          )}
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
            <p className="mt-1.5 text-sm text-danger font-medium">{errors.observacao.message}</p>
          )}
        </div>

        {/* Toggle: Criar acesso ao sistema (Story 8.2) — only in create mode */}
        {mode === 'create' && onSubmitComConta && (
          <div className="rounded-lg border border-surface-border bg-surface-muted p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-base font-medium text-primary-900">
                  Deseja criar um login para este motorista?
                </p>
                <p className="mt-0.5 text-sm text-primary-500">
                  O motorista podera acessar o sistema com email e senha
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={criarConta}
                onClick={() => {
                  setCriarConta(!criarConta);
                  setEmailError(null);
                }}
                className={cn(
                  'relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
                  criarConta ? 'bg-primary-700' : 'bg-surface-border',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                    criarConta ? 'translate-x-5' : 'translate-x-0',
                  )}
                />
              </button>
            </div>

            {/* Email field — shown when toggle is ON */}
            {criarConta && (
              <div className="mt-4">
                <label htmlFor="email" className="mb-2 block text-base font-medium text-primary-900">
                  Email <span className="text-danger">*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="email@exemplo.com"
                  {...register('email')}
                  className={cn(
                    'w-full rounded-lg border px-4 py-3 text-base outline-none transition-colors',
                    'focus:border-primary-500 focus:ring-1 focus:ring-primary-500',
                    emailError ? 'border-red-500' : 'border-surface-border',
                  )}
                />
                {emailError && (
                  <p className="mt-1.5 text-sm text-danger font-medium">{emailError}</p>
                )}
              </div>
            )}
          </div>
        )}

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
            {isPending ? 'Salvando...' : isEditing ? 'Salvar Alteracoes' : criarConta ? 'Cadastrar com Acesso' : 'Cadastrar Motorista'}
          </button>
        </div>
      </form>

      {/* Credentials modal (Story 8.3) */}
      {credenciais && (
        <CredenciaisModal
          email={credenciais.email}
          senha={credenciais.senha}
          nomeMotorista={credenciais.nomeMotorista}
          onClose={() => setCredenciais(null)}
        />
      )}
    </>
  );
}
