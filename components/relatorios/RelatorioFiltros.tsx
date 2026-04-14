'use client';

import { useState, useMemo } from 'react';
import {
  rangeEsteMes,
  rangeMesPassado,
  rangeUltimos3Meses,
} from '@/lib/utils/periodo';
import { formatarRangeCurto } from '@/lib/utils/formato-periodo';

/**
 * Period selector with 4 large buttons + inline date picker.
 * Reusable: receives state via props, does NOT access router.
 * Story 23.4 — AC5, AC6, AC10
 */

export type PeriodoKey = 'este-mes' | 'mes-passado' | 'ultimos-3-meses' | 'custom';

interface RelatorioFiltrosProps {
  periodoAtivo: PeriodoKey;
  customInicio?: string;
  customFim?: string;
  onPeriodoChange: (periodo: PeriodoKey) => void;
  onCustomDatesChange: (inicio: string, fim: string) => void;
}

function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

interface PeriodoBotao {
  key: PeriodoKey;
  label: string;
  range: { inicio: string; fim: string };
}

export function RelatorioFiltros({
  periodoAtivo,
  customInicio = '',
  customFim = '',
  onPeriodoChange,
  onCustomDatesChange,
}: RelatorioFiltrosProps) {
  const [localInicio, setLocalInicio] = useState(customInicio);
  const [localFim, setLocalFim] = useState(customFim);

  const botoes: PeriodoBotao[] = useMemo(() => [
    { key: 'este-mes', label: 'Este mes', range: rangeEsteMes() },
    { key: 'mes-passado', label: 'Mes passado', range: rangeMesPassado() },
    { key: 'ultimos-3-meses', label: 'Ultimos 3 meses', range: rangeUltimos3Meses() },
  ], []);

  function handleCustomDateChange(field: 'inicio' | 'fim', value: string) {
    const newInicio = field === 'inicio' ? value : localInicio;
    const newFim = field === 'fim' ? value : localFim;
    if (field === 'inicio') setLocalInicio(value);
    if (field === 'fim') setLocalFim(value);
    if (newInicio && newFim) {
      onCustomDatesChange(newInicio, newFim);
    }
  }

  return (
    <div className="space-y-3">
      <h3 className="text-base font-bold text-primary-900">Período</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {botoes.map((botao) => {
          const isActive = periodoAtivo === botao.key;
          const rangeInicio = parseISODate(botao.range.inicio);
          const rangeFim = parseISODate(botao.range.fim);
          const subtexto = formatarRangeCurto(rangeInicio, rangeFim);

          return (
            <button
              key={botao.key}
              type="button"
              onClick={() => onPeriodoChange(botao.key)}
              className={`flex flex-col items-center justify-center rounded-lg border-2 px-4 py-3 text-center transition-colors min-h-[48px] w-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                isActive
                  ? 'border-primary-500 bg-primary-50 text-primary-900'
                  : 'border-surface-border bg-surface-card text-primary-700 hover:border-primary-300 hover:bg-surface-hover'
              }`}
            >
              <span className="text-base font-semibold">{botao.label}</span>
              <span className="text-xs text-primary-500 mt-0.5">{subtexto}</span>
            </button>
          );
        })}

        {/* Escolher datas */}
        <button
          type="button"
          onClick={() => onPeriodoChange('custom')}
          className={`flex flex-col items-center justify-center rounded-lg border-2 px-4 py-3 text-center transition-colors min-h-[48px] w-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
            periodoAtivo === 'custom'
              ? 'border-primary-500 bg-primary-50 text-primary-900'
              : 'border-surface-border bg-surface-card text-primary-700 hover:border-primary-300 hover:bg-surface-hover'
          }`}
        >
          <span className="text-base font-semibold">Escolher datas</span>
          <span className="text-xs text-primary-500 mt-0.5">Personalizado</span>
        </button>
      </div>

      {/* Inline date inputs revealed only when "Escolher datas" is active */}
      {periodoAtivo === 'custom' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div>
            <label htmlFor="relatorio-inicio" className="mb-1 block text-sm font-medium text-primary-700">
              Data inicio
            </label>
            <input
              id="relatorio-inicio"
              type="date"
              value={localInicio}
              onChange={(e) => handleCustomDateChange('inicio', e.target.value)}
              className="w-full rounded-lg border border-surface-border bg-surface-card px-4 py-3 text-base text-primary-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[48px]"
            />
          </div>
          <div>
            <label htmlFor="relatorio-fim" className="mb-1 block text-sm font-medium text-primary-700">
              Data fim
            </label>
            <input
              id="relatorio-fim"
              type="date"
              value={localFim}
              onChange={(e) => handleCustomDateChange('fim', e.target.value)}
              className="w-full rounded-lg border border-surface-border bg-surface-card px-4 py-3 text-base text-primary-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[48px]"
            />
          </div>
        </div>
      )}
    </div>
  );
}
