'use client';

import { formatBRL } from '@/lib/utils/currency';
import { resolveIcone } from '@/lib/utils/categoria-icone';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import type { BICategoriaItem } from '@/types/bi';

interface BiBreakdownCategoriasProps {
  data: BICategoriaItem[] | null;
}

const DEFAULT_COLOR = '#6B7280';

export function BiBreakdownCategorias({ data }: BiBreakdownCategoriasProps) {
  if (!data || data.length === 0) {
    return (
      <div className="rounded-card border border-surface-border bg-surface-card p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-primary-900 mb-4 flex items-center gap-2">
          Gastos por Tipo
          <InfoTooltip text="Divisão dos gastos por categoria: combustível, pedágio, alimentação, manutenção, etc." />
        </h3>
        <p className="text-sm text-text-muted">
          Nenhum gasto encontrado no período selecionado.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-card border border-surface-border bg-surface-card p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-primary-900 mb-4 flex items-center gap-2">
        Gastos por Tipo
        <InfoTooltip text="Divisão dos gastos por categoria: combustível, pedágio, alimentação, manutenção, etc." />
      </h3>
      <div className="space-y-4">
        {data.map((cat) => (
          <div key={cat.categoriaId}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-base">{resolveIcone(cat.categoriaIcone)}</span>
                <span className="text-sm font-medium text-primary-900">
                  {cat.categoriaNome}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-primary-500">
                  {cat.qtdLancamentos} gastos
                </span>
                <span className="text-sm font-semibold text-primary-900 tabular-nums">
                  {formatBRL(cat.total)}
                </span>
                <span className="text-xs font-medium text-primary-500 tabular-nums w-12 text-right">
                  {cat.porcentagem.toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="w-full bg-surface-muted rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.max(cat.porcentagem, 1)}%`,
                  backgroundColor: cat.categoriaCor ?? DEFAULT_COLOR,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
