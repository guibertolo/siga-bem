'use client';

import { useForm } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { z } from 'zod';
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { parseBrlInputToCentavos } from '@/lib/utils/currency';
import { maskCurrency } from '@/lib/utils/mask-currency';
import { cn } from '@/lib/utils/cn';
import type { Gasto, GastoFormData, GastoActionResult } from '@/types/gasto';
import type { CategoriaGastoOption } from '@/types/categoria-gasto';

export interface ViagemOption {
  id: string;
  origem: string;
  destino: string;
  status: string;
  motorista_id: string;
  caminhao_id: string;
}

const gastoFormSchema = z.object({
  categoria_id: z.string().min(1, 'Selecione uma categoria'),
  motorista_id: z.string().min(1, 'Selecione um motorista'),
  caminhao_id: z.string(),
  viagem_id: z.string(),
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
  viagens?: ViagemOption[];
  viagemIdInicial?: string | null;
  motoristaFixo?: string | null; // Pre-filled for motorista role
  onSubmit: (data: GastoFormData) => Promise<GastoActionResult>;
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
  viagens = [],
  viagemIdInicial,
  motoristaFixo,
  onSubmit,
}: GastoFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const defaultViagemId = gasto?.viagem_id ?? viagemIdInicial ?? '';

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: standardSchemaResolver(gastoFormSchema),
    defaultValues: {
      categoria_id: gasto?.categoria_id ?? '',
      motorista_id: gasto?.motorista_id ?? motoristaFixo ?? '',
      caminhao_id: gasto?.caminhao_id ?? '',
      viagem_id: defaultViagemId,
      valor: gasto ? maskCurrency(String(gasto.valor)) : '',
      data: gasto?.data ?? todayISO(),
      descricao: gasto?.descricao ?? '',
    },
  });

  const watchedViagemId = watch('viagem_id');
  const watchedValor = watch('valor');

  // Currency mask for valor field
  useEffect(() => {
    if (watchedValor) {
      const masked = maskCurrency(watchedValor);
      if (masked !== watchedValor) {
        setValue('valor', masked, { shouldValidate: false });
      }
    }
  }, [watchedValor, setValue]);

  // Auto-fill motorista/caminhao from pre-selected viagem on mount
  useEffect(() => {
    if (defaultViagemId && viagens.length > 0) {
      const viagem = viagens.find((v) => v.id === defaultViagemId);
      if (viagem) {
        setValue('motorista_id', viagem.motorista_id);
        setValue('caminhao_id', viagem.caminhao_id);
      }
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleViagemChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const selectedId = e.target.value;
    setValue('viagem_id', selectedId);
    if (selectedId && !motoristaFixo) {
      const viagem = viagens.find((v) => v.id === selectedId);
      if (viagem) {
        setValue('motorista_id', viagem.motorista_id);
        setValue('caminhao_id', viagem.caminhao_id);
      }
    }
    if (!selectedId) {
      // Clear auto-filled fields only if not locked
      if (!motoristaFixo) {
        setValue('motorista_id', '');
        setValue('caminhao_id', '');
      }
    }
  }

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
        router.push(viagemIdInicial ? `/viagens/${viagemIdInicial}` : '/gastos');
      }
    });
  }

  // Filter out "Combustivel" — fuel is registered via AbastecimentoSection
  const filteredCategorias = categorias.filter(
    (c) => c.nome.toLowerCase() !== 'combustivel',
  );

  const isEditing = mode === 'edit';
  const isMotoristaFixo = !!motoristaFixo;
  const isViagemSelected = !!watchedViagemId;
  const isMotoristaLocked = isMotoristaFixo || isViagemSelected;
  const isCaminhaoLocked = isViagemSelected;
  const inputClass = 'w-full rounded-lg border px-4 py-3 text-base outline-none transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500';

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6" noValidate>
      {serverError && (
        <div className="rounded-lg border border-danger/20 bg-alert-danger-bg p-4 text-base text-danger">
          {serverError}
        </div>
      )}

      {/* Viagem (opcional) */}
      {viagens.length > 0 && (
        <div>
          <label htmlFor="viagem_id" className="mb-2 block text-base font-medium text-primary-900">
            De qual viagem? (opcional)
          </label>
          <select
            id="viagem_id"
            {...register('viagem_id')}
            onChange={handleViagemChange}
            disabled={!!viagemIdInicial}
            className={cn(
              inputClass,
              'border-surface-border',
              !!viagemIdInicial && 'cursor-not-allowed bg-surface-muted',
            )}
          >
            <option value="">Sem viagem vinculada</option>
            {viagens.map((v) => (
              <option key={v.id} value={v.id}>
                {v.origem} &rarr; {v.destino} ({v.status === 'em_andamento' ? 'Em Viagem' : 'Planejada'})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Categoria + Data row */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="categoria_id" className="mb-2 block text-base font-medium text-primary-900">
            Tipo de Gasto <span className="text-danger">*</span>
          </label>
          <select
            id="categoria_id"
            {...register('categoria_id')}
            className={cn(inputClass, errors.categoria_id ? 'border-red-500' : 'border-surface-border')}
          >
            <option value="">Selecione o tipo de gasto</option>
            {filteredCategorias.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.nome}</option>
            ))}
          </select>
          {errors.categoria_id && (
            <p className="mt-1.5 text-sm text-danger font-medium">{errors.categoria_id.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="data" className="mb-2 block text-base font-medium text-primary-900">
            Data <span className="text-danger">*</span>
          </label>
          <input
            id="data"
            type="date"
            {...register('data')}
            className={cn(inputClass, errors.data ? 'border-red-500' : 'border-surface-border')}
          />
          {errors.data && (
            <p className="mt-1.5 text-sm text-danger font-medium">{errors.data.message}</p>
          )}
        </div>
      </div>

      {/* Valor */}
      <div>
        <label htmlFor="valor" className="mb-2 block text-base font-medium text-primary-900">
          Valor (R$) <span className="text-danger">*</span>
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base text-primary-500">R$</span>
          <input
            id="valor"
            type="text"
            inputMode="numeric"
            placeholder="0,00"
            {...register('valor')}
            className={cn(inputClass, 'pl-10', errors.valor ? 'border-red-500' : 'border-surface-border')}
          />
        </div>
        {errors.valor && (
          <p className="mt-1.5 text-sm text-danger font-medium">{errors.valor.message}</p>
        )}
      </div>

      {/* Motorista + Caminhao row */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="motorista_id" className="mb-2 block text-base font-medium text-primary-900">
            Motorista <span className="text-danger">*</span>
          </label>
          <select
            id="motorista_id"
            disabled={isMotoristaLocked}
            {...register('motorista_id')}
            className={cn(
              inputClass,
              errors.motorista_id ? 'border-red-500' : 'border-surface-border',
              isMotoristaLocked && 'cursor-not-allowed bg-surface-muted',
            )}
          >
            <option value="">Selecione um motorista</option>
            {motoristas.map((m) => (
              <option key={m.id} value={m.id}>{m.nome}</option>
            ))}
          </select>
          {errors.motorista_id && (
            <p className="mt-1.5 text-sm text-danger font-medium">{errors.motorista_id.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="caminhao_id" className="mb-2 block text-base font-medium text-primary-900">
            Caminhao
          </label>
          <select
            id="caminhao_id"
            disabled={isCaminhaoLocked}
            {...register('caminhao_id')}
            className={cn(
              inputClass,
              'border-surface-border',
              isCaminhaoLocked && 'cursor-not-allowed bg-surface-muted',
            )}
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
          onClick={() => router.push(viagemIdInicial ? `/viagens/${viagemIdInicial}` : '/gastos')}
          className="rounded-lg border border-surface-border px-6 py-3 text-base font-medium text-primary-700 min-h-[48px] transition-colors hover:bg-surface-muted"
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
