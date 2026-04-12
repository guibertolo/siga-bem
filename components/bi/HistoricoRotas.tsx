'use client';

import { formatBRL } from '@/lib/utils/currency';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import type { BIHistoricoRotasResult } from '@/types/bi';

interface HistoricoRotasProps {
  data: BIHistoricoRotasResult | null;
  isLoading: boolean;
  searched: boolean;
  error: string | null;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('pt-BR');
  } catch {
    return iso;
  }
}

export function HistoricoRotas({
  data,
  isLoading,
  searched,
  error,
}: HistoricoRotasProps) {
  return (
    <div className="rounded-card border border-surface-border bg-surface-card p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-primary-900 mb-4 flex items-center gap-2">
        Viagens Parecidas que Você Já Fez
        <InfoTooltip text="Busca viagens anteriores com origem e destino similares para comparar custos e prazos." />
      </h3>

      {isLoading && (
        <div className="text-sm text-primary-500">Buscando histórico...</div>
      )}

      {error && (
        <div className="rounded-md bg-alert-danger-bg p-3 text-sm text-danger">
          {error}
        </div>
      )}

      {!isLoading && !searched && (
        <p className="text-sm text-text-muted">
          Preencha origem e destino no simulador e clique em Simular para
          buscar viagens similares.
        </p>
      )}

      {searched && !isLoading && data && data.viagens.length === 0 && (
        <div className="rounded-md bg-surface-muted p-4 text-center">
          <p className="text-sm text-text-muted">
            Nenhuma viagem concluída encontrada para esta rota.
          </p>
        </div>
      )}

      {/* Comparative stats */}
      {data?.comparativo && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-surface-border bg-surface-card p-3">
            <p className="text-xs text-primary-500">Viagens nessa rota</p>
            <p className="text-lg font-bold text-primary-900 tabular-nums">
              {data.comparativo.totalViagens}
            </p>
          </div>
          <div className="rounded-lg border border-surface-border bg-surface-card p-3">
            <p className="text-xs text-primary-500">Mais barata</p>
            <p className="text-lg font-bold text-primary-900 tabular-nums">
              {formatBRL(data.comparativo.custoMinCentavos)}
            </p>
          </div>
          <div className="rounded-lg border border-surface-border bg-surface-card p-3">
            <p className="text-xs text-primary-500">Mais cara</p>
            <p className="text-lg font-bold text-primary-900 tabular-nums">
              {formatBRL(data.comparativo.custoMaxCentavos)}
            </p>
          </div>
          <div className="rounded-lg border border-surface-border bg-surface-card p-3">
            <p className="text-xs text-primary-500">Custo normal</p>
            <p className="text-lg font-bold text-primary-900 tabular-nums">
              {formatBRL(data.comparativo.custoMedioCentavos)}
            </p>
          </div>
        </div>
      )}

      {/* Viagens list */}
      {data && data.viagens.length > 0 && (
        <div className="mt-4 space-y-3">
          {data.viagens.map((v) => (
            <div
              key={v.viagemId}
              className="rounded-lg border border-surface-border bg-surface-card p-4"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-primary-900">
                    {formatDate(v.dataSaida)}
                  </p>
                  <p className="text-xs text-primary-500">
                    {v.caminhaoPlaca} — {v.motoristaNome}
                  </p>
                </div>
                {v.kmRealizado != null && (
                  <p className="text-xs text-primary-500 tabular-nums">
                    {v.kmRealizado.toLocaleString('pt-BR')} km
                  </p>
                )}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div>
                  <p className="text-xs text-primary-500">Custo total</p>
                  <p className="text-sm font-semibold text-primary-900 tabular-nums">
                    {formatBRL(v.custoTotalCentavos)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-primary-500">Combustível</p>
                  <p className="text-sm font-semibold text-primary-900 tabular-nums">
                    {formatBRL(v.custoCombustivelCentavos)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-primary-500">Frete</p>
                  <p className="text-sm font-semibold text-primary-900 tabular-nums">
                    {v.freteCentavos != null
                      ? formatBRL(v.freteCentavos)
                      : 'Frete não cadastrado'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-primary-500">Lucro</p>
                  {v.lucroCentavos != null ? (
                    <p
                      className={`text-sm font-semibold tabular-nums ${
                        v.lucroCentavos >= 0
                          ? 'text-success'
                          : 'text-danger'
                      }`}
                    >
                      {formatBRL(v.lucroCentavos)}
                    </p>
                  ) : (
                    <p className="text-sm text-text-muted">--</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
