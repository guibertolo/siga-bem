'use client';

import { formatBRL } from '@/lib/utils/currency';
import type { BIEficienciaItem } from '@/types/bi';

interface BiEficienciaCombustivelProps {
  data: BIEficienciaItem[] | null;
}

function getBadgeClasses(
  classificacao: BIEficienciaItem['classificacao'],
): string {
  switch (classificacao) {
    case 'bom':
      return 'bg-success/10 text-success border border-success/20';
    case 'medio':
      return 'bg-warning/10 text-warning border border-warning/20';
    case 'ruim':
      return 'bg-danger/10 text-danger border border-danger/20';
    default:
      return 'bg-surface-muted text-text-muted border border-surface-border';
  }
}

function getClassificacaoLabel(
  classificacao: BIEficienciaItem['classificacao'],
): string {
  switch (classificacao) {
    case 'bom':
      return 'Bom';
    case 'medio':
      return 'Regular';
    case 'ruim':
      return 'Baixo';
    default:
      return 'Sem dados';
  }
}

function getMetodoLabel(metodo: BIEficienciaItem['metodo']): string {
  switch (metodo) {
    case 'viagem':
      return 'Baseado nas viagens';
    case 'estimativa':
      return 'Dados insuficientes';
    default:
      return '';
  }
}

function formatKmPorLitro(
  kmPorLitro: number | null,
  metodo: BIEficienciaItem['metodo'],
): string {
  if (kmPorLitro != null) {
    return kmPorLitro.toFixed(2);
  }
  if (metodo === 'estimativa') {
    return '---';
  }
  return '---';
}

export function BiEficienciaCombustivel({
  data,
}: BiEficienciaCombustivelProps) {
  if (!data || data.length === 0) {
    return (
      <div className="rounded-card border border-surface-border bg-surface-card p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-primary-900 mb-2">
          Eficiencia de Combustivel
        </h3>
        <p className="text-xs text-text-muted mb-4">
          Referencia cegonheiro: ~2,5 km/L
        </p>
        <p className="text-sm text-text-muted">
          Nenhum dado de abastecimento no período selecionado.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-card border border-surface-border bg-surface-card p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-primary-900 mb-2">
        Eficiencia de Combustivel
      </h3>
      <p className="text-xs text-text-muted mb-4">
        Referencia cegonheiro: ~2,5 km/L | Verde {'>'} 2,5 | Amarelo 2,0-2,5 |
        Vermelho {'<'} 2,0
      </p>

      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-border text-left">
              <th className="pb-2 font-semibold text-primary-700">#</th>
              <th className="pb-2 font-semibold text-primary-700">Placa</th>
              <th className="pb-2 font-semibold text-primary-700">Modelo</th>
              <th className="pb-2 font-semibold text-primary-700 text-right">
                km/L
              </th>
              <th className="pb-2 font-semibold text-primary-700 text-right">
                Total Litros
              </th>
              <th className="pb-2 font-semibold text-primary-700 text-right">
                Total Gasto
              </th>
              <th className="pb-2 font-semibold text-primary-700 text-center">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr
                key={item.caminhaoId}
                className="border-b border-surface-border"
              >
                <td className="py-2.5 text-primary-500">{index + 1}</td>
                <td className="py-2.5 font-medium text-primary-900">
                  {item.placa}
                </td>
                <td className="py-2.5 text-primary-700">{item.modelo}</td>
                <td className="py-2.5 text-right">
                  <span className="font-semibold text-primary-900 tabular-nums">
                    {formatKmPorLitro(item.kmPorLitro, item.metodo)}
                  </span>
                  {item.metodo && (
                    <span className="block text-xs text-text-muted">
                      {getMetodoLabel(item.metodo)}
                    </span>
                  )}
                </td>
                <td className="py-2.5 text-right text-primary-700 tabular-nums">
                  {item.totalLitros.toFixed(1)} L
                </td>
                <td className="py-2.5 text-right font-semibold text-primary-900 tabular-nums">
                  {formatBRL(item.totalGastoCentavos)}
                </td>
                <td className="py-2.5 text-center">
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${getBadgeClasses(item.classificacao)}`}
                  >
                    {getClassificacaoLabel(item.classificacao)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-3">
        {data.map((item, index) => (
          <div
            key={item.caminhaoId}
            className="rounded-lg border border-surface-border bg-surface-muted p-3"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-primary-500">#{index + 1}</span>
              <span
                className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${getBadgeClasses(item.classificacao)}`}
              >
                {getClassificacaoLabel(item.classificacao)}
              </span>
            </div>
            <p className="font-semibold text-primary-900">
              {item.placa} — {item.modelo}
            </p>
            <div className="flex items-center justify-between mt-2">
              <div>
                <span className="text-xs text-primary-500">km/L: </span>
                <span className="text-sm font-bold text-primary-900 tabular-nums">
                  {formatKmPorLitro(item.kmPorLitro, item.metodo)}
                </span>
                {item.metodo && (
                  <span className="block text-xs text-text-muted">
                    {getMetodoLabel(item.metodo)}
                  </span>
                )}
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-primary-900 tabular-nums">
                  {formatBRL(item.totalGastoCentavos)}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-primary-500">
                {item.totalLitros.toFixed(1)} litros
              </span>
              <span className="text-xs text-primary-500">
                {item.totalAbastecimentos} abastecimentos
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
