'use client';

import { useForm } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { z } from 'zod';
import { useState, useTransition, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { parseBrlInputToCentavos, formatBRL } from '@/lib/utils/currency';
import { calcularValorMotorista } from '@/lib/utils/viagem-calc';
import { listCaminhoesPorMotorista } from '@/app/(dashboard)/viagens/actions';
import { cn } from '@/lib/utils/cn';
import { parseBrlInputToCentavos as parseCentavos } from '@/lib/utils/currency';
import { EstimativaViagem } from '@/components/viagens/EstimativaViagem';
import type { Viagem, ViagemFormData, ViagemActionResult } from '@/types/viagem';

const viagemFormSchema = z.object({
  motorista_id: z.string().min(1, 'Selecione um motorista'),
  caminhao_id: z.string().min(1, 'Selecione um caminhao'),
  origem: z.string()
    .min(1, 'Origem e obrigatoria')
    .max(200, 'Origem deve ter no maximo 200 caracteres'),
  destino: z.string()
    .min(1, 'Destino e obrigatorio')
    .max(200, 'Destino deve ter no maximo 200 caracteres'),
  data_saida: z.string().min(1, 'Data de saida e obrigatoria'),
  data_chegada_prevista: z.string(),
  valor_total: z.string()
    .min(1, 'Valor total e obrigatorio')
    .refine((val) => {
      const centavos = parseBrlInputToCentavos(val);
      return centavos !== null && centavos > 0;
    }, 'Valor deve ser maior que zero'),
  percentual_pagamento: z.string()
    .min(1, 'Percentual e obrigatorio')
    .refine((val) => {
      const num = parseFloat(val.replace(',', '.'));
      return !isNaN(num) && num >= 0 && num <= 100;
    }, 'Percentual deve ser entre 0 e 100'),
  km_estimado: z.string()
    .refine(
      (val) => val === '' || (!isNaN(Number(val)) && Number(val) > 0),
      'Distancia estimada deve ser maior que zero',
    ),
  km_saida: z.string(),
  observacao: z.string().max(1000, 'Maximo 1000 caracteres'),
});

type FormValues = z.infer<typeof viagemFormSchema>;

function centavosToInputValue(centavos: number): string {
  return (centavos / 100).toFixed(2).replace('.', ',');
}

function toDatetimeLocal(isoString: string | null): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  // Format as YYYY-MM-DDTHH:mm for datetime-local input
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

interface ViagemFormProps {
  mode: 'create' | 'edit';
  viagem?: Viagem | null;
  motoristas: Array<{ id: string; nome: string }>;
  caminhoes: Array<{ id: string; placa: string; modelo: string }>;
  onSubmit: (data: ViagemFormData) => Promise<ViagemActionResult>;
  /** When true, core fields (origem, destino, valor_total) are disabled */
  camposLocked?: boolean;
  /** When true, hides motorista select and auto-assigns motorista */
  isMotorista?: boolean;
  /** Message explaining why fields are locked */
  noCaminhaoMessage?: string;
}

export function ViagemForm({
  mode,
  viagem,
  motoristas,
  caminhoes: initialCaminhoes,
  onSubmit,
  camposLocked = false,
  isMotorista = false,
  noCaminhaoMessage,
}: ViagemFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [caminhoes, setCaminhoes] = useState(initialCaminhoes);
  const [loadingCaminhoes, setLoadingCaminhoes] = useState(false);
  const [valorMotorista, setValorMotorista] = useState<string>('');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: standardSchemaResolver(viagemFormSchema),
    defaultValues: {
      motorista_id: viagem?.motorista_id ?? (isMotorista && motoristas[0]?.id ? motoristas[0].id : ''),
      caminhao_id: viagem?.caminhao_id ?? '',
      origem: viagem?.origem ?? '',
      destino: viagem?.destino ?? '',
      data_saida: viagem ? toDatetimeLocal(viagem.data_saida) : '',
      data_chegada_prevista: viagem ? toDatetimeLocal(viagem.data_chegada_prevista) : '',
      valor_total: viagem ? centavosToInputValue(viagem.valor_total) : '',
      percentual_pagamento: viagem ? String(viagem.percentual_pagamento).replace('.', ',') : '0',
      km_estimado: viagem?.km_estimado != null ? String(viagem.km_estimado) : '',
      km_saida: viagem?.km_saida != null ? String(viagem.km_saida) : '',
      observacao: viagem?.observacao ?? '',
    },
  });

  const watchedMotoristaId = watch('motorista_id');
  const watchedCaminhaoId = watch('caminhao_id');
  const watchedValorTotal = watch('valor_total');
  const watchedPercentual = watch('percentual_pagamento');
  const watchedKmEstimado = watch('km_estimado');

  // Load caminhoes when motorista changes (AC1)
  const loadCaminhoes = useCallback(async (motoristaId: string) => {
    if (!motoristaId) {
      setCaminhoes([]);
      setValue('caminhao_id', '');
      return;
    }
    setLoadingCaminhoes(true);
    const result = await listCaminhoesPorMotorista(motoristaId);
    setLoadingCaminhoes(false);
    if (result.data) {
      setCaminhoes(result.data);
      // Reset caminhao selection if current one not in new list
      const currentCaminhao = watch('caminhao_id');
      const exists = result.data.some((c) => c.id === currentCaminhao);
      if (!exists) {
        setValue('caminhao_id', '');
      }
    }
  }, [setValue, watch]);

  useEffect(() => {
    if (watchedMotoristaId && watchedMotoristaId !== viagem?.motorista_id) {
      loadCaminhoes(watchedMotoristaId);
    }
  }, [watchedMotoristaId, viagem?.motorista_id, loadCaminhoes]);

  // Real-time motorista payment calculation (AC2)
  useEffect(() => {
    const centavos = parseBrlInputToCentavos(watchedValorTotal || '0');
    const perc = parseFloat((watchedPercentual || '0').replace(',', '.'));

    if (centavos != null && !isNaN(perc) && perc >= 0 && perc <= 100) {
      const valorMot = calcularValorMotorista(centavos, perc);
      setValorMotorista(formatBRL(valorMot));
    } else {
      setValorMotorista('');
    }
  }, [watchedValorTotal, watchedPercentual]);

  function onFormSubmit(values: FormValues) {
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

      router.push('/viagens');
      router.refresh();
    });
  }

  const inputClasses = (fieldName: keyof FormValues, disabled = false) =>
    cn(
      'block w-full rounded-lg border px-4 py-3 text-base transition-colors',
      'focus:outline-none focus:ring-2 focus:ring-primary-500',
      errors[fieldName]
        ? 'border-red-300 bg-red-50'
        : 'border-surface-border bg-surface-card',
      disabled && 'bg-gray-100 text-gray-500 cursor-not-allowed',
    );

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      {serverError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-base text-red-700">
          {serverError}
        </div>
      )}

      {camposLocked && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-base text-amber-800">
          Campos definidos pelo proprietario -- origem, destino e valor nao podem ser alterados.
        </div>
      )}

      {noCaminhaoMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-base text-red-700">
          {noCaminhaoMessage}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Motorista — hidden for motorista role (auto-assigned) */}
        {!isMotorista && (
          <div>
            <label htmlFor="motorista_id" className="mb-2 block text-base font-medium text-primary-700">
              Motorista *
            </label>
            <select
              id="motorista_id"
              {...register('motorista_id')}
              className={inputClasses('motorista_id')}
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
        )}

        {/* Caminhao */}
        <div>
          <label htmlFor="caminhao_id" className="mb-2 block text-base font-medium text-primary-700">
            Caminhao *
          </label>
          <select
            id="caminhao_id"
            {...register('caminhao_id')}
            className={inputClasses('caminhao_id')}
            disabled={loadingCaminhoes}
          >
            <option value="">
              {loadingCaminhoes ? 'Carregando...' : 'Selecione um caminhao'}
            </option>
            {caminhoes.map((c) => (
              <option key={c.id} value={c.id}>{c.placa} - {c.modelo}</option>
            ))}
          </select>
          {errors.caminhao_id && (
            <p className="mt-1.5 text-sm text-red-600 font-medium">{errors.caminhao_id.message}</p>
          )}
        </div>

        {/* Origem */}
        <div>
          <label htmlFor="origem" className="mb-2 block text-base font-medium text-primary-700">
            Origem *
          </label>
          <input
            id="origem"
            type="text"
            maxLength={200}
            placeholder="Ex: Sao Paulo, SP"
            disabled={camposLocked}
            {...register('origem')}
            className={inputClasses('origem', camposLocked)}
          />
          {errors.origem && (
            <p className="mt-1.5 text-sm text-red-600 font-medium">{errors.origem.message}</p>
          )}
        </div>

        {/* Destino */}
        <div>
          <label htmlFor="destino" className="mb-2 block text-base font-medium text-primary-700">
            Destino *
          </label>
          <input
            id="destino"
            type="text"
            maxLength={200}
            placeholder="Ex: Rio de Janeiro, RJ"
            disabled={camposLocked}
            {...register('destino')}
            className={inputClasses('destino', camposLocked)}
          />
          {errors.destino && (
            <p className="mt-1.5 text-sm text-red-600 font-medium">{errors.destino.message}</p>
          )}
        </div>

        {/* Data de Saida */}
        <div>
          <label htmlFor="data_saida" className="mb-2 block text-base font-medium text-primary-700">
            Data de Saida *
          </label>
          <input
            id="data_saida"
            type="datetime-local"
            {...register('data_saida')}
            className={inputClasses('data_saida')}
          />
          {errors.data_saida && (
            <p className="mt-1.5 text-sm text-red-600 font-medium">{errors.data_saida.message}</p>
          )}
        </div>

        {/* Data de Chegada Prevista */}
        <div>
          <label htmlFor="data_chegada_prevista" className="mb-2 block text-base font-medium text-primary-700">
            Chegada Prevista
          </label>
          <input
            id="data_chegada_prevista"
            type="datetime-local"
            {...register('data_chegada_prevista')}
            className={inputClasses('data_chegada_prevista')}
          />
          {errors.data_chegada_prevista && (
            <p className="mt-1.5 text-sm text-red-600 font-medium">{errors.data_chegada_prevista.message}</p>
          )}
        </div>

        {/* Valor Total */}
        <div>
          <label htmlFor="valor_total" className="mb-2 block text-base font-medium text-primary-700">
            Valor Total (R$) *
          </label>
          <input
            id="valor_total"
            type="text"
            placeholder="Ex: 1.500,00"
            disabled={camposLocked}
            {...register('valor_total')}
            className={inputClasses('valor_total', camposLocked)}
          />
          {errors.valor_total && (
            <p className="mt-1.5 text-sm text-red-600 font-medium">{errors.valor_total.message}</p>
          )}
        </div>

        {/* Percentual Pagamento */}
        <div>
          <label htmlFor="percentual_pagamento" className="mb-2 block text-base font-medium text-primary-700">
            Percentual Motorista (%) *
          </label>
          <input
            id="percentual_pagamento"
            type="text"
            placeholder="Ex: 25,50"
            {...register('percentual_pagamento')}
            className={inputClasses('percentual_pagamento')}
          />
          {errors.percentual_pagamento && (
            <p className="mt-1.5 text-sm text-red-600 font-medium">{errors.percentual_pagamento.message}</p>
          )}
          {valorMotorista && (
            <p className="mt-1.5 text-sm text-green-700 font-medium">
              Motorista recebera: {valorMotorista}
            </p>
          )}
        </div>

        {/* KM Estimado (Story 3.3 - AC1, AC7/CON-006) */}
        <div>
          <label htmlFor="km_estimado" className="mb-2 block text-base font-medium text-primary-700">
            Distancia Estimada (km)
          </label>
          <input
            id="km_estimado"
            type="number"
            min={1}
            placeholder="ex: 1.250 km (SP -> BH)"
            {...register('km_estimado')}
            className={inputClasses('km_estimado')}
          />
          {errors.km_estimado && (
            <p className="mt-1.5 text-sm text-red-600 font-medium">{errors.km_estimado.message}</p>
          )}
        </div>

        {/* KM Saida */}
        <div>
          <label htmlFor="km_saida" className="mb-2 block text-base font-medium text-primary-700">
            KM na Saida
          </label>
          <input
            id="km_saida"
            type="number"
            min={0}
            placeholder="Ex: 120000"
            {...register('km_saida')}
            className={inputClasses('km_saida')}
          />
          {errors.km_saida && (
            <p className="mt-1.5 text-sm text-red-600 font-medium">{errors.km_saida.message}</p>
          )}
        </div>
      </div>

      {/* Estimativa de Custo (Story 3.3 - AC3) */}
      <EstimativaViagem
        kmEstimado={watchedKmEstimado ? Number(watchedKmEstimado) : null}
        caminhaoId={watchedCaminhaoId}
        valorTotalCentavos={parseCentavos(watchedValorTotal || '0') ?? 0}
      />

      {/* Observacao */}
      <div>
        <label htmlFor="observacao" className="mb-2 block text-base font-medium text-primary-700">
          Observacao
        </label>
        <textarea
          id="observacao"
          rows={3}
          maxLength={1000}
          {...register('observacao')}
          className={inputClasses('observacao')}
        />
        {errors.observacao && (
          <p className="mt-1.5 text-sm text-red-600 font-medium">{errors.observacao.message}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={isPending || !!noCaminhaoMessage}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-700 px-6 py-3 text-base font-semibold text-white min-h-[48px] transition-colors hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {isPending
            ? 'Salvando...'
            : mode === 'create' ? 'Cadastrar Viagem' : 'Salvar Alteracoes'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/viagens')}
          className="rounded-lg border border-surface-border px-6 py-3 text-base font-medium text-primary-700 min-h-[48px] transition-colors hover:bg-surface-muted"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
