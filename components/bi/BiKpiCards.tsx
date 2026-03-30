'use client';

import { formatBRL } from '@/lib/utils/currency';
import type { BIKpis } from '@/types/bi';

interface BiKpiCardsProps {
  data: BIKpis | null;
}

/**
 * Hero KPI cards — profit-first layout.
 * Card 1: Lucro Bruto (green/red)
 * Card 2: Margem Media por Viagem (green/yellow/red thresholds)
 * Card 3: Receita em Fretes (blue/primary — neutral)
 * Card 4: Custos Totais (muted — second plane)
 */
export function BiKpiCards({ data }: BiKpiCardsProps) {
  const lucro = data?.lucroBruto ?? 0;
  const margemMedia = data?.margemMediaViagem ?? 0;
  const margemMediaPct = data?.margemMediaPercentual ?? 0;
  const receita = data?.receitaFrete ?? 0;
  const custo = data?.custoTotal ?? 0;
  const margemGeral = data?.margemPercentual ?? 0;
  const viagensConcluidas = data?.viagensConcluidas ?? 0;

  // Custo como % da receita
  const custoPctReceita = receita > 0
    ? Math.round((custo / receita) * 10000) / 100
    : 0;

  // Color logic for Lucro Bruto
  const lucroPositivo = lucro >= 0;
  const lucroTextColor = lucroPositivo ? 'text-success' : 'text-danger';
  const lucroBgColor = lucroPositivo ? 'bg-alert-success-bg' : 'bg-alert-danger-bg';

  // Color logic for Margem Media (green > 40%, yellow 20-40%, red < 20%)
  const margemColor = margemMediaPct >= 40
    ? 'text-success'
    : margemMediaPct >= 20
      ? 'text-warning'
      : 'text-danger';
  const margemBadgeBg = margemMediaPct >= 40
    ? 'bg-alert-success-bg'
    : margemMediaPct >= 20
      ? 'bg-alert-warning-bg'
      : 'bg-alert-danger-bg';

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Card 1: Lucro Bruto */}
      <div
        className={`rounded-card border p-5 shadow-sm ${lucroBgColor} ${
          lucroPositivo ? 'border-success/20' : 'border-danger/20'
        }`}
      >
        <div className="flex items-center gap-2 mb-1">
          <svg
            className={`h-5 w-5 ${lucroTextColor}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            {lucroPositivo ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M2 12l5 5L20 4" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
            )}
          </svg>
          <p className="text-base font-medium text-primary-700">Lucro Bruto</p>
        </div>
        <p className={`text-2xl sm:text-3xl font-bold tabular-nums ${lucroTextColor}`}>
          {formatBRL(Math.abs(lucro))}
        </p>
        <p className={`text-sm mt-1 ${lucroTextColor} font-medium`}>
          {lucroPositivo ? '+' : '-'}{margemGeral.toFixed(1)}% de margem
        </p>
      </div>

      {/* Card 2: Margem Media por Viagem */}
      <div className="rounded-card border border-surface-border bg-surface-card p-5 shadow-sm">
        <p className="text-base font-medium text-primary-700 mb-1">
          Margem Media por Viagem
        </p>
        <p className={`text-2xl sm:text-3xl font-bold tabular-nums ${margemColor}`}>
          {formatBRL(margemMedia)}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-semibold ${margemBadgeBg} ${margemColor}`}
          >
            {margemMediaPct.toFixed(1)}%
          </span>
          <span className="text-sm text-primary-500">
            {viagensConcluidas} {viagensConcluidas === 1 ? 'viagem' : 'viagens'}
          </span>
        </div>
      </div>

      {/* Card 3: Receita (Fretes) — always primary/blue, neutral */}
      <div className="rounded-card border border-primary-300/40 bg-primary-50/50 p-5 shadow-sm dark:border-primary-500/20 dark:bg-primary-900/10">
        <p className="text-base font-medium text-primary-700 mb-1">
          Receita em Fretes
        </p>
        <p className="text-2xl sm:text-3xl font-bold tabular-nums text-primary-900">
          {formatBRL(receita)}
        </p>
        <p className="text-sm text-primary-500 mt-1">
          {viagensConcluidas} {viagensConcluidas === 1 ? 'viagem concluida' : 'viagens concluidas'}
        </p>
      </div>

      {/* Card 4: Custos Totais — muted, second plane */}
      <div className="rounded-card border border-surface-border bg-surface-card p-5 shadow-sm">
        <p className="text-base font-medium text-primary-400 mb-1">
          Custos Totais
        </p>
        <p className="text-2xl sm:text-3xl tabular-nums text-primary-500">
          {formatBRL(custo)}
        </p>
        <p className="text-sm text-primary-400 mt-1">
          {custoPctReceita.toFixed(1)}% da receita
        </p>
      </div>
    </div>
  );
}
