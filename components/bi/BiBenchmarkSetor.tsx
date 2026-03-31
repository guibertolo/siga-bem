'use client';

import { formatBRL } from '@/lib/utils/currency';
import type { BIBenchmarkSetor, BIBenchmarkProprio } from '@/types/bi';

/** Minimum empresas required for k-anonymity (LGPD Art. 12) */
const K_ANONYMITY_MIN = 5;

interface BiBenchmarkSetorProps {
  setor: BIBenchmarkSetor[] | null;
  proprio: BIBenchmarkProprio[] | null;
}

type ComparisonResult = 'acima' | 'abaixo' | 'igual' | null;

/**
 * Compare own value vs sector median.
 * For metrics where HIGHER is better (kml, margem): acima = green.
 * For metrics where LOWER is better (custo, % combustivel, manutencoes): acima = red (inverted).
 */
function compare(
  proprio: number | null,
  setor: number | null,
): ComparisonResult {
  if (proprio == null || setor == null || setor === 0) return null;
  const diff = ((proprio - setor) / Math.abs(setor)) * 100;
  if (Math.abs(diff) < 2) return 'igual';
  return diff > 0 ? 'acima' : 'abaixo';
}

function ArrowUp({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2.5}
      width={16}
      height={16}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
    </svg>
  );
}

function ArrowDown({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2.5}
      width={16}
      height={16}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function ArrowEqual({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2.5}
      width={16}
      height={16}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
    </svg>
  );
}

interface MetricCardProps {
  label: string;
  proprioValor: string;
  setorValor: string;
  comparison: ComparisonResult;
  /** If true, "acima" means worse (e.g., custo, % combustivel) */
  invertido?: boolean;
}

function MetricCard({
  label,
  proprioValor,
  setorValor,
  comparison,
  invertido = false,
}: MetricCardProps) {
  // Determine color: green = good, red = bad
  let colorClass = 'text-text-muted';
  let bgClass = 'bg-surface-muted/50';

  if (comparison === 'acima') {
    colorClass = invertido ? 'text-danger' : 'text-success';
    bgClass = invertido ? 'bg-danger/5' : 'bg-success/5';
  } else if (comparison === 'abaixo') {
    colorClass = invertido ? 'text-success' : 'text-danger';
    bgClass = invertido ? 'bg-success/5' : 'bg-danger/5';
  } else if (comparison === 'igual') {
    colorClass = 'text-warning';
    bgClass = 'bg-warning/5';
  }

  const ComparisonIcon =
    comparison === 'acima'
      ? ArrowUp
      : comparison === 'abaixo'
        ? ArrowDown
        : ArrowEqual;

  const comparisonLabel =
    comparison === 'acima'
      ? 'Acima do setor'
      : comparison === 'abaixo'
        ? 'Abaixo do setor'
        : comparison === 'igual'
          ? 'Na média do setor'
          : '';

  return (
    <div
      className={`rounded-card border border-surface-border p-4 shadow-sm ${bgClass}`}
    >
      <p className="text-sm font-medium text-primary-700 mb-2">{label}</p>

      {/* Own value */}
      <p className="text-xl font-bold tabular-nums text-primary-900">
        {proprioValor}
      </p>
      <p className="text-xs text-text-muted mt-0.5">Sua frota</p>

      {/* Sector comparison */}
      <div className="mt-3 pt-3 border-t border-surface-border">
        <div className="flex items-center gap-1.5">
          {comparison != null && (
            <ComparisonIcon className={`shrink-0 ${colorClass}`} />
          )}
          <span className="text-sm tabular-nums text-primary-600">
            {setorValor}
          </span>
        </div>
        <p className="text-xs text-text-muted mt-0.5">
          Mediana do setor FrotaViva
        </p>
        {comparison != null && (
          <p className={`text-xs font-medium mt-1 ${colorClass}`}>
            {comparisonLabel}
          </p>
        )}
      </div>
    </div>
  );
}

function formatTipoCegonha(tipo: string, totalTipos: number): string {
  if (totalTipos <= 1) return 'Cegonha';
  return tipo === 'aberta' ? 'Cegonha Aberta' : 'Cegonha Fechada';
}

export function BiBenchmarkSetor({ setor, proprio }: BiBenchmarkSetorProps) {
  if (!setor || setor.length === 0) {
    return null;
  }

  // Check if ANY tipo has enough empresas
  const tiposComDados = setor.filter((s) => s.totalEmpresas >= K_ANONYMITY_MIN);

  if (tiposComDados.length === 0) {
    return (
      <div className="rounded-card border border-surface-border bg-surface-card p-6 shadow-sm">
        <h3 className="text-lg font-bold text-primary-900 mb-2">
          Comparativo com o Setor
        </h3>
        <div className="flex items-center gap-3 rounded-lg bg-surface-muted/50 p-4">
          <svg
            className="h-8 w-8 text-primary-400 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
            />
          </svg>
          <div>
            <p className="text-sm font-medium text-primary-700">
              Benchmark disponível quando houver mais empresas na plataforma
            </p>
            <p className="text-xs text-text-muted mt-1">
              Para garantir anonimato, os dados do setor so aparecem quando pelo
              menos {K_ANONYMITY_MIN} empresas contribuem.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Build comparison for each tipo that has enough data
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-primary-900">
          Comparativo com o Setor
        </h3>
        <p className="text-sm text-primary-500 mt-0.5">
          Veja como sua frota se compara com outras empresas do setor
        </p>
      </div>

      {tiposComDados.map((setorItem) => {
        const proprioItem = (proprio ?? []).find(
          (p) => p.tipoCegonha === setorItem.tipoCegonha,
        );

        const atualizadoEm = setorItem.atualizadoEm
          ? new Date(setorItem.atualizadoEm).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
          : null;

        return (
          <div
            key={setorItem.tipoCegonha}
            className="rounded-card border border-surface-border bg-surface-card p-5 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-semibold text-primary-800">
                {formatTipoCegonha(setorItem.tipoCegonha, tiposComDados.length)}
              </h4>
              <span className="text-xs text-text-muted">
                {setorItem.totalEmpresas} empresas no setor
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {/* 1. km/L */}
              <MetricCard
                label="Consumo (km/L)"
                proprioValor={
                  proprioItem?.kml != null
                    ? `${proprioItem.kml.toFixed(1)} km/L`
                    : 'Sem dados'
                }
                setorValor={
                  setorItem.medianaKml != null
                    ? `${setorItem.medianaKml.toFixed(1)} km/L`
                    : 'Sem dados'
                }
                comparison={compare(
                  proprioItem?.kml ?? null,
                  setorItem.medianaKml,
                )}
                invertido={false}
              />

              {/* 2. Custo por km */}
              <MetricCard
                label="Custo por km"
                proprioValor={
                  proprioItem?.custoPorKm != null
                    ? formatBRL(proprioItem.custoPorKm)
                    : 'Sem dados'
                }
                setorValor={
                  setorItem.medianaCustoPorKm != null
                    ? formatBRL(setorItem.medianaCustoPorKm)
                    : 'Sem dados'
                }
                comparison={compare(
                  proprioItem?.custoPorKm ?? null,
                  setorItem.medianaCustoPorKm,
                )}
                invertido={true}
              />

              {/* 3. % Combustivel sobre frete */}
              <MetricCard
                label="Combustivel / Frete"
                proprioValor={
                  proprioItem?.pctCombustivelFrete != null
                    ? `${proprioItem.pctCombustivelFrete.toFixed(1)}%`
                    : 'Sem dados'
                }
                setorValor={
                  setorItem.medianaPctCombustivelFrete != null
                    ? `${setorItem.medianaPctCombustivelFrete.toFixed(1)}%`
                    : 'Sem dados'
                }
                comparison={compare(
                  proprioItem?.pctCombustivelFrete ?? null,
                  setorItem.medianaPctCombustivelFrete,
                )}
                invertido={true}
              />

              {/* 4. Margem por viagem */}
              <MetricCard
                label="Margem por Viagem"
                proprioValor={
                  proprioItem?.margemViagem != null
                    ? `${proprioItem.margemViagem.toFixed(1)}%`
                    : 'Sem dados'
                }
                setorValor={
                  setorItem.medianaMargemViagem != null
                    ? `${setorItem.medianaMargemViagem.toFixed(1)}%`
                    : 'Sem dados'
                }
                comparison={compare(
                  proprioItem?.margemViagem ?? null,
                  setorItem.medianaMargemViagem,
                )}
                invertido={false}
              />

              {/* 5. Manutencoes por caminhao */}
              <MetricCard
                label="Manutenções / Caminhão"
                proprioValor={
                  proprioItem?.manutencoesPorCaminhao != null
                    ? `${proprioItem.manutencoesPorCaminhao.toFixed(1)}`
                    : 'Sem dados'
                }
                setorValor={
                  setorItem.medianaManutencoesPorCaminhao != null
                    ? `${setorItem.medianaManutencoesPorCaminhao.toFixed(1)}`
                    : 'Sem dados'
                }
                comparison={compare(
                  proprioItem?.manutencoesPorCaminhao ?? null,
                  setorItem.medianaManutencoesPorCaminhao,
                )}
                invertido={true}
              />
            </div>

            {/* Footer with LGPD notice and update time */}
            <div className="mt-4 pt-3 border-t border-surface-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
              <p className="text-xs text-text-muted">
                Dados anonimizados conforme Art. 12 da LGPD
              </p>
              {atualizadoEm && (
                <p className="text-xs text-text-muted">
                  Atualizado em {atualizadoEm}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
