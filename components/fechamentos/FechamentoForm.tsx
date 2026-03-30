'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { formatBRL } from '@/lib/utils/currency';
import { calcularRangeMensal, calcularRangeSemanal, getMonthOptions } from '@/lib/utils/periodo';
import { formatarData } from '@/lib/utils/format-date';
import { previewFechamentoDetalhado, createFechamento } from '@/app/(dashboard)/fechamentos/actions';
import type {
  FechamentoFormData,
  FechamentoActionResult,
  PreviewFechamento,
} from '@/types/fechamento';
import type { FechamentoTipo } from '@/types/database';

interface FechamentoFormProps {
  motoristas: Array<{ id: string; nome: string }>;
}

export function FechamentoForm({ motoristas }: FechamentoFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Step 1: params
  const [motoristaId, setMotoristaId] = useState('');
  const [tipo, setTipo] = useState<FechamentoTipo>('mensal');
  const [periodoInicio, setPeriodoInicio] = useState('');
  const [periodoFim, setPeriodoFim] = useState('');
  const [observacao, setObservacao] = useState('');

  // Month selector for mensal
  const monthOptions = getMonthOptions();
  const [selectedMonth, setSelectedMonth] = useState('');

  // Step 2: preview
  const [preview, setPreview] = useState<PreviewFechamento | null>(null);
  const [step, setStep] = useState<1 | 2>(1);

  // UI state
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FechamentoFormData, string>>>({});
  const [viagensOpen, setViagensOpen] = useState(false);
  const [gastosOpen, setGastosOpen] = useState(false);

  function handleMonthChange(value: string) {
    setSelectedMonth(value);
    if (!value) {
      setPeriodoInicio('');
      setPeriodoFim('');
      return;
    }
    const [ano, mes] = value.split('-').map(Number);
    const range = calcularRangeMensal(ano, mes);
    setPeriodoInicio(range.inicio);
    setPeriodoFim(range.fim);
  }

  function handleTipoChange(novoTipo: FechamentoTipo) {
    setTipo(novoTipo);
    setPeriodoInicio('');
    setPeriodoFim('');
    setSelectedMonth('');
    setPreview(null);
    setStep(1);
  }

  function handleWeekDateChange(dateStr: string) {
    if (!dateStr) {
      setPeriodoInicio('');
      setPeriodoFim('');
      return;
    }
    const range = calcularRangeSemanal(new Date(dateStr + 'T12:00:00'));
    setPeriodoInicio(range.inicio);
    setPeriodoFim(range.fim);
  }

  function handleCalcular() {
    setError(null);
    setFieldErrors({});

    if (!motoristaId) {
      setFieldErrors({ motorista_id: 'Selecione um motorista' });
      return;
    }
    if (!periodoInicio || !periodoFim) {
      setError('Selecione o periodo');
      return;
    }

    startTransition(async () => {
      const result = await previewFechamentoDetalhado(motoristaId, periodoInicio, periodoFim);
      if (result.error) {
        setError(result.error);
        return;
      }
      setPreview(result.data);
      setStep(2);
    });
  }

  function handleVoltar() {
    setStep(1);
    setPreview(null);
  }

  function handleConfirmar() {
    setError(null);

    startTransition(async () => {
      const formData: FechamentoFormData = {
        motorista_id: motoristaId,
        tipo,
        periodo_inicio: periodoInicio,
        periodo_fim: periodoFim,
        observacao,
      };

      const result: FechamentoActionResult = await createFechamento(formData);

      if (!result.success) {
        if (result.fieldErrors) {
          setFieldErrors(result.fieldErrors);
          setStep(1);
        } else {
          setError(result.error ?? 'Erro ao criar fechamento');
        }
        return;
      }

      router.push('/fechamentos');
    });
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-base text-red-700">
          {error}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4 rounded-lg border border-surface-border bg-surface-card p-6">
          <h3 className="text-lg font-semibold text-primary-900">Parametros do Acerto</h3>

          {/* Motorista */}
          <div>
            <label htmlFor="motorista" className="mb-2 block text-base font-medium text-primary-700">
              Motorista *
            </label>
            <select
              id="motorista"
              value={motoristaId}
              onChange={(e) => setMotoristaId(e.target.value)}
              className="w-full rounded-lg border border-surface-border bg-surface-card px-4 py-3 text-base text-primary-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">Selecione um motorista</option>
              {motoristas.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
            </select>
            {fieldErrors.motorista_id && (
              <p className="mt-1.5 text-sm text-red-600 font-medium">{fieldErrors.motorista_id}</p>
            )}
          </div>

          {/* Tipo */}
          <div>
            <label className="mb-2 block text-base font-medium text-primary-700">
              Tipo de Periodo *
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-base text-primary-900">
                <input
                  type="radio"
                  name="tipo"
                  value="mensal"
                  checked={tipo === 'mensal'}
                  onChange={() => handleTipoChange('mensal')}
                  className="text-primary-700"
                />
                Mensal
              </label>
              <label className="flex items-center gap-2 text-base text-primary-900">
                <input
                  type="radio"
                  name="tipo"
                  value="semanal"
                  checked={tipo === 'semanal'}
                  onChange={() => handleTipoChange('semanal')}
                  className="text-primary-700"
                />
                Semanal
              </label>
            </div>
          </div>

          {/* Periodo selector */}
          {tipo === 'mensal' ? (
            <div>
              <label htmlFor="mes" className="mb-2 block text-base font-medium text-primary-700">
                Mes/Ano *
              </label>
              <select
                id="mes"
                value={selectedMonth}
                onChange={(e) => handleMonthChange(e.target.value)}
                className="w-full rounded-lg border border-surface-border bg-surface-card px-4 py-3 text-base text-primary-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="">Selecione o mes</option>
                {monthOptions.map((opt) => (
                  <option key={`${opt.ano}-${opt.mes}`} value={`${opt.ano}-${opt.mes}`}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label htmlFor="semana" className="mb-2 block text-base font-medium text-primary-700">
                Data de referencia da semana *
              </label>
              <input
                id="semana"
                type="date"
                onChange={(e) => handleWeekDateChange(e.target.value)}
                className="w-full rounded-lg border border-surface-border bg-surface-card px-4 py-3 text-base text-primary-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              {periodoInicio && periodoFim && (
                <p className="mt-1 text-xs text-primary-500">
                  Semana: {formatarData(periodoInicio)} a {formatarData(periodoFim)}
                </p>
              )}
            </div>
          )}

          {/* Observacao */}
          <div>
            <label htmlFor="observacao" className="mb-2 block text-base font-medium text-primary-700">
              Observacao
            </label>
            <textarea
              id="observacao"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={2}
              maxLength={1000}
              className="w-full rounded-lg border border-surface-border bg-surface-card px-4 py-3 text-base text-primary-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="Observacao opcional..."
            />
          </div>

          <button
            type="button"
            onClick={handleCalcular}
            disabled={isPending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary-700 px-4 py-3 text-base font-semibold text-white min-h-[48px] transition-colors hover:bg-primary-800 disabled:opacity-50"
          >
            {isPending ? 'Calculando...' : 'Calcular Preview'}
          </button>
        </div>
      )}

      {step === 2 && preview && (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-surface-border bg-surface-card p-4 text-center">
              <p className="text-sm text-primary-500">Viagens ({preview.totais.qtd_viagens})</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-primary-900">
                {formatBRL(preview.totais.total_viagens)}
              </p>
            </div>
            <div className="rounded-lg border border-surface-border bg-surface-card p-4 text-center">
              <p className="text-sm text-primary-500">Gastos ({preview.totais.qtd_gastos})</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-primary-900">
                {formatBRL(preview.totais.total_gastos)}
              </p>
            </div>
            <div className="rounded-lg border border-surface-border bg-surface-card p-4 text-center">
              <p className="text-sm text-primary-500">Saldo Liquido</p>
              <p
                className={`mt-1 text-xl font-bold tabular-nums ${
                  preview.totais.saldo_motorista >= 0 ? 'text-green-700' : 'text-red-700'
                }`}
              >
                {formatBRL(preview.totais.saldo_motorista)}
              </p>
            </div>
          </div>

          {/* Viagens collapsible */}
          <div className="rounded-lg border border-surface-border bg-surface-card">
            <button
              type="button"
              onClick={() => setViagensOpen(!viagensOpen)}
              className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-primary-900 hover:bg-surface-muted"
            >
              <span>Viagens ({preview.viagens.length})</span>
              <svg
                className={`h-4 w-4 transition-transform ${viagensOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {viagensOpen && (
              <div className="border-t border-surface-border">
                {preview.viagens.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-primary-500">Nenhuma viagem concluida no periodo.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-surface-border bg-surface-muted text-left">
                        <th className="px-4 py-2 font-medium text-primary-700">Rota</th>
                        <th className="px-4 py-2 font-medium text-primary-700">Data</th>
                        <th className="px-4 py-2 text-right font-medium text-primary-700">Valor Total</th>
                        <th className="px-4 py-2 text-right font-medium text-primary-700">%</th>
                        <th className="px-4 py-2 text-right font-medium text-primary-700">Valor Motorista</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.viagens.map((v) => (
                        <tr key={v.id} className="border-b border-surface-border last:border-0">
                          <td className="px-4 py-2 text-primary-900">
                            {v.origem} &rarr; {v.destino}
                          </td>
                          <td className="whitespace-nowrap px-4 py-2 tabular-nums text-primary-700">
                            {formatarData(v.data_saida)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums text-primary-700">
                            {formatBRL(v.valor_total)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums text-primary-700">
                            {v.percentual_pagamento}%
                          </td>
                          <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums font-medium text-primary-900">
                            {formatBRL(v.valor_motorista)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>

          {/* Gastos collapsible */}
          <div className="rounded-lg border border-surface-border bg-surface-card">
            <button
              type="button"
              onClick={() => setGastosOpen(!gastosOpen)}
              className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-primary-900 hover:bg-surface-muted"
            >
              <span>Gastos ({preview.gastos.length})</span>
              <svg
                className={`h-4 w-4 transition-transform ${gastosOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {gastosOpen && (
              <div className="border-t border-surface-border">
                {preview.gastos.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-primary-500">Nenhum gasto no periodo.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-surface-border bg-surface-muted text-left">
                        <th className="px-4 py-2 font-medium text-primary-700">Data</th>
                        <th className="px-4 py-2 font-medium text-primary-700">Categoria</th>
                        <th className="px-4 py-2 font-medium text-primary-700">Descricao</th>
                        <th className="px-4 py-2 text-right font-medium text-primary-700">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.gastos.map((g) => (
                        <tr key={g.id} className="border-b border-surface-border last:border-0">
                          <td className="whitespace-nowrap px-4 py-2 tabular-nums text-primary-700">
                            {formatarData(g.data)}
                          </td>
                          <td className="px-4 py-2 text-primary-900">{g.categoria}</td>
                          <td className="px-4 py-2 text-primary-700">{g.descricao ?? '-'}</td>
                          <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums font-medium text-primary-900">
                            {formatBRL(g.valor)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleVoltar}
              disabled={isPending}
              className="flex-1 rounded-lg border border-surface-border bg-surface-card px-4 py-3 text-base font-medium text-primary-700 min-h-[48px] transition-colors hover:bg-surface-muted disabled:opacity-50"
            >
              Voltar
            </button>
            <button
              type="button"
              onClick={handleConfirmar}
              disabled={isPending}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary-700 px-4 py-3 text-base font-semibold text-white min-h-[48px] transition-colors hover:bg-primary-800 disabled:opacity-50"
            >
              <svg className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {isPending ? 'Confirmando...' : 'Confirmar Acerto'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
