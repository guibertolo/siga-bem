'use client';

import { useState, useTransition, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createAbastecimento } from '@/app/(dashboard)/viagens/[id]/actions';
import type { AbastecimentoInput } from '@/app/(dashboard)/viagens/[id]/actions';
import { ComprovantesUpload } from '@/components/gastos/ComprovantesUpload';
import { parseBrlInputToCentavos } from '@/lib/utils/currency';
import { cn } from '@/lib/utils/cn';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const UF_LIST = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const;

const TIPO_COMBUSTIVEL_OPTIONS = [
  { value: 'diesel_s10', label: 'Diesel S10' },
  { value: 'diesel_comum', label: 'Diesel Comum' },
] as const;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AbastecimentoFormProps {
  viagemId: string;
  empresaId: string;
  origem: string;
  destino: string;
  motoristaNome: string;
  caminhaoPlaca: string;
  kmSaida: number | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

const inputClass =
  'w-full rounded-lg border px-4 py-3 text-base outline-none transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500 min-h-[48px]';
const labelClass = 'mb-2 block text-base font-medium text-primary-900';
const errorClass = 'mt-1.5 text-sm text-red-600 font-medium';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AbastecimentoForm({
  viagemId,
  empresaId,
  origem,
  destino,
  motoristaNome,
  caminhaoPlaca,
  kmSaida,
}: AbastecimentoFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Form state
  const [litrosStr, setLitrosStr] = useState('');
  const [valorStr, setValorStr] = useState('');
  const [uf, setUf] = useState('');
  const [tipoCombustivel, setTipoCombustivel] = useState('diesel_s10');
  const [postoLocal, setPostoLocal] = useState('');
  const [kmOdometroStr, setKmOdometroStr] = useState('');
  const [observacao, setObservacao] = useState('');
  const [data, setData] = useState(todayISO());

  // Post-submit state
  const [savedGastoId, setSavedGastoId] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Real-time price per liter calculation (AC 6)
  const precoLitro = useMemo(() => {
    const litros = parseFloat(litrosStr.replace(',', '.'));
    const valorCentavos = parseBrlInputToCentavos(valorStr);
    if (!litros || litros <= 0 || !valorCentavos || valorCentavos <= 0) return null;
    const valorReais = valorCentavos / 100;
    return (valorReais / litros).toFixed(3).replace('.', ',');
  }, [litrosStr, valorStr]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setFieldErrors({});

    // Client-side validation
    const errors: Partial<Record<string, string>> = {};
    const litros = parseFloat(litrosStr.replace(',', '.'));
    const valorCentavos = parseBrlInputToCentavos(valorStr);
    const kmOdometro = kmOdometroStr ? parseInt(kmOdometroStr, 10) : null;

    if (!litros || litros <= 0) {
      errors.litros = 'Litros deve ser maior que zero';
    } else if (litros > 9999.999) {
      errors.litros = 'Litros deve ser no maximo 9.999,999';
    }

    if (!valorCentavos || valorCentavos <= 0) {
      errors.valor_centavos = 'Valor deve ser maior que zero';
    }

    if (!uf) {
      errors.uf_abastecimento = 'Selecione a UF';
    }

    if (!data) {
      errors.data = 'Data e obrigatoria';
    }

    if (kmOdometro != null) {
      if (isNaN(kmOdometro) || kmOdometro <= 0) {
        errors.km_odometro = 'Odometro deve ser um numero positivo';
      } else if (kmSaida != null && kmOdometro < kmSaida) {
        errors.km_odometro = `Odometro deve ser maior ou igual ao KM de saida (${kmSaida.toLocaleString('pt-BR')} km)`;
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    const input: AbastecimentoInput = {
      viagem_id: viagemId,
      litros,
      valor_centavos: valorCentavos!,
      uf_abastecimento: uf,
      tipo_combustivel: tipoCombustivel as 'diesel_s10' | 'diesel_comum',
      posto_local: postoLocal || null,
      km_odometro: kmOdometro,
      observacao: observacao || null,
      data,
    };

    startTransition(async () => {
      const result = await createAbastecimento(input);

      if (!result.success) {
        if (result.fieldErrors) {
          setFieldErrors(result.fieldErrors);
        }
        if (result.error) {
          setServerError(result.error);
        }
        return;
      }

      // Success - show upload area if gastoId returned
      setSavedGastoId(result.gastoId ?? null);
      setSuccessMessage('Abastecimento registrado com sucesso!');
    });
  }, [litrosStr, valorStr, uf, tipoCombustivel, postoLocal, kmOdometroStr, observacao, data, viagemId, kmSaida, startTransition]);

  // After successful save, show upload + redirect option
  if (savedGastoId) {
    return (
      <div className="space-y-6">
        {/* Success message */}
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-base font-medium text-green-700">
          {successMessage}
        </div>

        {/* Upload comprovante */}
        <div className="rounded-lg border border-surface-border bg-surface-card p-6">
          <h3 className="mb-4 text-base font-medium text-primary-900">
            Foto do Comprovante (opcional)
          </h3>
          <ComprovantesUpload
            gastoId={savedGastoId}
            empresaId={empresaId}
            comprovantes={[]}
            onComprovanteChange={() => {
              router.refresh();
            }}
          />
        </div>

        {/* Back to trip button */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => {
              router.push(`/viagens/${viagemId}`);
              router.refresh();
            }}
            className={cn(
              'inline-flex items-center justify-center gap-2 rounded-lg bg-primary-700 px-6 py-3 text-base font-semibold text-white min-h-[48px] transition-colors',
              'hover:bg-primary-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
            )}
          >
            Voltar para a Viagem
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {/* Server error banner (AC 11) */}
      {serverError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-base text-red-700">
          {serverError}
        </div>
      )}

      {/* Readonly pre-filled fields (AC 3, 13) */}
      <div className="rounded-lg border border-surface-border bg-surface-muted p-4">
        <p className="mb-2 text-sm font-medium text-primary-500">Dados da viagem (automaticos)</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs text-primary-500">Viagem</p>
            <p className="text-sm font-medium text-primary-900">{origem} &rarr; {destino}</p>
          </div>
          <div>
            <p className="text-xs text-primary-500">Caminhao</p>
            <p className="text-sm font-medium text-primary-900">{caminhaoPlaca}</p>
          </div>
          <div>
            <p className="text-xs text-primary-500">Motorista</p>
            <p className="text-sm font-medium text-primary-900">{motoristaNome}</p>
          </div>
          <div>
            <p className="text-xs text-primary-500">Categoria</p>
            <p className="text-sm font-medium text-primary-900">Combustivel</p>
          </div>
        </div>
      </div>

      {/* Litros + Valor Total (AC 4) */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="litros" className={labelClass}>
            Litros <span className="text-red-500">*</span>
          </label>
          <input
            id="litros"
            type="text"
            inputMode="decimal"
            placeholder="Ex: 450,5"
            value={litrosStr}
            onChange={(e) => setLitrosStr(e.target.value)}
            className={cn(inputClass, fieldErrors.litros ? 'border-red-500' : 'border-surface-border')}
          />
          {fieldErrors.litros && <p className={errorClass}>{fieldErrors.litros}</p>}
        </div>

        <div>
          <label htmlFor="valor_total" className={labelClass}>
            Valor Total (R$) <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base text-primary-500">R$</span>
            <input
              id="valor_total"
              type="text"
              inputMode="decimal"
              placeholder="Ex: 3.500,00"
              value={valorStr}
              onChange={(e) => setValorStr(e.target.value)}
              className={cn(inputClass, 'pl-10', fieldErrors.valor_centavos ? 'border-red-500' : 'border-surface-border')}
            />
          </div>
          {fieldErrors.valor_centavos && <p className={errorClass}>{fieldErrors.valor_centavos}</p>}
        </div>
      </div>

      {/* Preco por litro (AC 6) — readonly, calculated */}
      {precoLitro && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm text-primary-500">Preco por litro (calculado automaticamente)</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-primary-900">
            R$ {precoLitro}/L
          </p>
        </div>
      )}

      {/* UF + Tipo Combustivel (AC 4, 5) */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="uf_abastecimento" className={labelClass}>
            UF do Abastecimento <span className="text-red-500">*</span>
          </label>
          <select
            id="uf_abastecimento"
            value={uf}
            onChange={(e) => setUf(e.target.value)}
            className={cn(inputClass, fieldErrors.uf_abastecimento ? 'border-red-500' : 'border-surface-border')}
          >
            <option value="">Selecione a UF</option>
            {UF_LIST.map((estado) => (
              <option key={estado} value={estado}>{estado}</option>
            ))}
          </select>
          {fieldErrors.uf_abastecimento && <p className={errorClass}>{fieldErrors.uf_abastecimento}</p>}
        </div>

        <div>
          <label htmlFor="tipo_combustivel" className={labelClass}>
            Tipo de Combustivel
          </label>
          <select
            id="tipo_combustivel"
            value={tipoCombustivel}
            onChange={(e) => setTipoCombustivel(e.target.value)}
            className={cn(inputClass, 'border-surface-border')}
          >
            {TIPO_COMBUSTIVEL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Posto/Local (AC 5) */}
      <div>
        <label htmlFor="posto_local" className={labelClass}>
          Posto / Local
        </label>
        <input
          id="posto_local"
          type="text"
          maxLength={200}
          placeholder="Nome do posto (opcional)"
          value={postoLocal}
          onChange={(e) => setPostoLocal(e.target.value)}
          className={cn(inputClass, 'border-surface-border')}
        />
      </div>

      {/* Data + Odometro (AC 5) */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="data" className={labelClass}>
            Data <span className="text-red-500">*</span>
          </label>
          <input
            id="data"
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            className={cn(inputClass, fieldErrors.data ? 'border-red-500' : 'border-surface-border')}
          />
          {fieldErrors.data && <p className={errorClass}>{fieldErrors.data}</p>}
        </div>

        <div>
          <label htmlFor="km_odometro" className={labelClass}>
            Leitura do Odometro (km)
          </label>
          <input
            id="km_odometro"
            type="text"
            inputMode="numeric"
            placeholder={kmSaida != null ? `Minimo: ${kmSaida.toLocaleString('pt-BR')} km` : 'Opcional'}
            value={kmOdometroStr}
            onChange={(e) => setKmOdometroStr(e.target.value)}
            className={cn(inputClass, fieldErrors.km_odometro ? 'border-red-500' : 'border-surface-border')}
          />
          {fieldErrors.km_odometro && <p className={errorClass}>{fieldErrors.km_odometro}</p>}
        </div>
      </div>

      {/* Observacao (AC 5) */}
      <div>
        <label htmlFor="observacao" className={labelClass}>
          Observacao
        </label>
        <textarea
          id="observacao"
          rows={3}
          maxLength={500}
          placeholder="Detalhes adicionais (opcional)"
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          className={cn(inputClass, 'border-surface-border')}
        />
      </div>

      {/* Submit button (AC 12 — 56px for primary action) */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className={cn(
            'inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary-700 px-6 py-3 text-base font-semibold text-white min-h-[56px] transition-colors sm:w-auto',
            'hover:bg-primary-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
            isPending && 'cursor-not-allowed opacity-50',
          )}
        >
          <svg className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {isPending ? 'Registrando...' : 'Registrar Abastecimento'}
        </button>
      </div>
    </form>
  );
}
