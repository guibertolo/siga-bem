'use client';

import { useForm } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { z } from 'zod';
import { useState, useTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { validateCPF, maskCPF } from '@/lib/utils/validate-cpf';
import { maskPhone } from '@/lib/utils/validate-cnpj';
import { CNH_CATEGORIA_OPTIONS } from '@/types/motorista';
import type { Motorista, MotoristaFormData, MotoristaActionResult, MotoristaComContaFormData, MotoristaComContaActionResult } from '@/types/motorista';
import { cn } from '@/lib/utils/cn';

const CNH_CATEGORIAS = ['A', 'B', 'C', 'D', 'E', 'AB', 'AC', 'AD', 'AE'] as const;

const motoristaFormSchema = z.object({
  nome: z.string()
    .min(1, 'Nome é obrigatório')
    .max(255, 'Nome deve ter no máximo 255 caracteres'),
  cpf: z.string()
    .min(1, 'CPF é obrigatório')
    .refine((val) => validateCPF(val), 'CPF inválido'),
  cnh_numero: z.string()
    .min(1, 'Número da CNH é obrigatório')
    .max(20, 'Número da CNH deve ter no máximo 20 caracteres'),
  cnh_categoria: z.enum(CNH_CATEGORIAS, {
    error: 'Selecione uma categoria',
  }),
  cnh_validade: z.string()
    .min(1, 'Validade da CNH é obrigatória'),
  telefone: z.string().max(20, 'Telefone deve ter no máximo 20 caracteres'),
  observacao: z.string().max(1000, 'Observação deve ter no máximo 1000 caracteres'),
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
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [criarConta, setCriarConta] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [credenciais, setCredenciais] = useState<{
    email: string;
    senha: string;
    nomeMotorista: string;
  } | null>(null);

  const handleCopiarSenha = useCallback(async () => {
    if (!credenciais) return;
    try {
      await navigator.clipboard.writeText(credenciais.senha);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = credenciais.senha;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    }
  }, [credenciais]);

  const handleEnviarWhatsApp = useCallback(() => {
    if (!credenciais) return;
    const mensagem = encodeURIComponent(
      `Ola! Suas credenciais do FrotaViva:\nEmail: ${credenciais.email}\nSenha: ${credenciais.senha}\nAcesse: ${window.location.origin}/login`
    );
    window.open(`https://wa.me/?text=${mensagem}`, '_blank', 'noopener,noreferrer');
  }, [credenciais]);

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
        setEmailError('Email é obrigatório quando criar acesso está ativo');
        return;
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(values.email)) {
        setEmailError('Email inválido');
        return;
      }

      if (!onSubmitComConta) {
        setServerError('Funcionalidade de criar conta não disponível');
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

  // After successful creation with credentials, show inline card instead of form
  if (credenciais) {
    return (
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-alert-success-bg">
            <svg className="h-7 w-7 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-primary-900 sm:text-2xl">
            Conta Criada com Sucesso
          </h2>
          <p className="mt-1 text-base text-primary-500">
            Motorista: <span className="font-semibold text-primary-700">{credenciais.nomeMotorista}</span>
          </p>
        </div>

        {/* Warning */}
        <div className="rounded-lg border border-warning/30 bg-alert-warning-bg p-4">
          <div className="flex items-start gap-3">
            <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="text-base font-semibold text-badge-warning-fg">
              Anote a senha! Ela não será mostrada novamente.
            </p>
          </div>
        </div>

        {/* Credentials display */}
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-primary-500">Email</label>
            <div className="rounded-lg border border-surface-border bg-surface-muted px-4 py-3">
              <span className="font-mono text-lg font-semibold text-primary-900 sm:text-xl">
                {credenciais.email}
              </span>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-primary-500">Senha Temporaria</label>
            <div className="rounded-lg border border-surface-border bg-surface-muted px-4 py-3">
              <span className="font-mono text-lg font-semibold text-primary-900 sm:text-xl">
                {credenciais.senha}
              </span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleCopiarSenha}
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-base font-semibold min-h-[48px] transition-colors',
              copiado
                ? 'bg-success text-white'
                : 'bg-btn-primary text-white hover:bg-btn-primary-hover',
            )}
          >
            {copiado ? (
              <>
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Copiado!
              </>
            ) : (
              <>
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copiar Senha
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleEnviarWhatsApp}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-success px-4 py-3 text-base font-semibold text-white min-h-[48px] transition-colors hover:bg-success/80"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Enviar por WhatsApp
          </button>

          <button
            type="button"
            onClick={() => router.push('/motoristas')}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-surface-border px-4 py-3 text-base font-semibold text-primary-700 min-h-[48px] transition-colors hover:bg-surface-hover"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            Ir para Lista de Motoristas
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6" noValidate>
        {/* InfoBox — empresa ativa (Story 8.2) */}
        {empresaInfo && (
          <div className="rounded-lg border border-info/20 bg-alert-info-bg p-4">
            <div className="flex items-start gap-3">
              <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-info" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <div>
                <p className="text-base font-semibold text-badge-info-fg">
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
              errors.nome ? 'border-danger' : 'border-surface-border',
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
              errors.cpf ? 'border-danger' : 'border-surface-border',
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
              Número da CNH <span className="text-danger">*</span>
            </label>
            <input
              id="cnh_numero"
              type="text"
              placeholder="Número do registro da CNH"
              {...register('cnh_numero')}
              className={cn(
                'w-full rounded-lg border px-4 py-3 text-base outline-none transition-colors',
                'focus:border-primary-500 focus:ring-1 focus:ring-primary-500',
                errors.cnh_numero ? 'border-danger' : 'border-surface-border',
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
                errors.cnh_categoria ? 'border-danger' : 'border-surface-border',
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
              errors.cnh_validade ? 'border-danger' : 'border-surface-border',
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
              errors.percentual_pagamento ? 'border-danger' : 'border-surface-border',
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
            Observação</label>
          <textarea
            id="observacao"
            rows={3}
            placeholder="Observações sobre o motorista (opcional)"
            {...register('observacao')}
            className={cn(
              'w-full rounded-lg border px-4 py-3 text-base outline-none transition-colors',
              'focus:border-primary-500 focus:ring-1 focus:ring-primary-500',
              errors.observacao ? 'border-danger' : 'border-surface-border',
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
                  criarConta ? 'bg-btn-primary' : 'bg-surface-border',
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
                    emailError ? 'border-danger' : 'border-surface-border',
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
              'inline-flex items-center justify-center gap-2 rounded-lg bg-btn-primary px-6 py-3 text-base font-semibold text-white min-h-[48px] transition-colors',
              'hover:bg-btn-primary-hover focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
              isPending && 'cursor-not-allowed opacity-50',
            )}
          >
            <svg className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {isPending ? 'Salvando...' : isEditing ? 'Salvar Alterações' : criarConta ? 'Cadastrar com Acesso' : 'Cadastrar Motorista'}
          </button>
        </div>
      </form>
  );
}
