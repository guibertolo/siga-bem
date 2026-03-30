'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatBRL } from '@/lib/utils/currency';
import { calcularEstimativa } from '@/lib/utils/precificacao';
import { calcularConsumoMedio } from '@/lib/utils/consumo-calc';
import { getPrecoDieselAtual } from '@/app/(dashboard)/configuracoes/combustivel/actions';
import type { EstimativaViagem as EstimativaViagemType } from '@/types/precificacao';

interface EstimativaViagemProps {
  kmEstimado: number | null;
  caminhaoId: string;
  valorTotalCentavos: number;
}

/**
 * Bloco de estimativa de custo de combustivel para viagem.
 * Story 3.3 (AC1, AC3): Recalcula automaticamente quando
 * distancia, caminhao ou valor total mudam.
 */
export function EstimativaViagem({
  kmEstimado,
  caminhaoId,
  valorTotalCentavos,
}: EstimativaViagemProps) {
  const [estimativa, setEstimativa] = useState<EstimativaViagemType | null>(null);
  const [loading, setLoading] = useState(false);

  const calcular = useCallback(async () => {
    if (!kmEstimado || kmEstimado <= 0 || !caminhaoId) {
      setEstimativa(null);
      return;
    }

    setLoading(true);

    try {
      const [consumoResult, precoResult] = await Promise.all([
        calcularConsumoMedio(caminhaoId, null),
        getPrecoDieselAtual(),
      ]);

      const result = calcularEstimativa(
        kmEstimado,
        consumoResult.kmL,
        precoResult.precoCentavos,
        valorTotalCentavos,
        consumoResult.fonte,
        precoResult.fonte,
      );

      setEstimativa(result);
    } catch {
      setEstimativa(null);
    } finally {
      setLoading(false);
    }
  }, [kmEstimado, caminhaoId, valorTotalCentavos]);

  useEffect(() => {
    calcular();
  }, [calcular]);

  if (!kmEstimado || kmEstimado <= 0) {
    return (
      <div className="rounded-lg border border-dashed border-surface-border bg-surface-muted p-4">
        <p className="text-center text-sm text-primary-500">
          Preencha a distancia estimada para ver a estimativa de custo.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-surface-border bg-surface-card p-4">
        <p className="text-center text-sm text-primary-500">Calculando estimativa...</p>
      </div>
    );
  }

  if (!estimativa) {
    return null;
  }

  const margemNegativa = estimativa.margem_bruta_centavos < 0;

  return (
    <div className="rounded-lg border border-surface-border bg-surface-card p-4">
      <h4 className="mb-3 text-sm font-medium uppercase tracking-wide text-primary-700">
        Estimativa de Custo
      </h4>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <p className="text-xs text-primary-500">Distancia</p>
          <p className="text-sm font-medium tabular-nums text-primary-900">
            {kmEstimado.toLocaleString('pt-BR')} km
          </p>
        </div>

        <div>
          <p className="text-xs text-primary-500">
            Consumo medio
            <span className="ml-1 text-xs text-primary-400">
              ({estimativa.consumo_fonte === 'historico' ? 'historico' : 'padrao'})
            </span>
          </p>
          <p className="text-sm font-medium tabular-nums text-primary-900">
            {estimativa.consumo_medio_km_l.toFixed(1).replace('.', ',')} km/l
          </p>
          {estimativa.consumo_fonte === 'padrao' && (
            <p className="text-xs text-warning">Dados insuficientes</p>
          )}
        </div>

        <div>
          <p className="text-xs text-primary-500">
            Preco diesel
            <span className="ml-1 text-xs text-primary-400">
              ({estimativa.preco_diesel_fonte === 'tabela' ? 'tabela' : 'padrao'})
            </span>
          </p>
          <p className="text-sm font-medium tabular-nums text-primary-900">
            {formatBRL(estimativa.preco_diesel_centavos)}/l
          </p>
        </div>

        <div>
          <p className="text-xs text-primary-500">Custo estimado combustivel</p>
          <p className="text-sm font-bold tabular-nums text-danger">
            {formatBRL(estimativa.custo_combustivel_centavos)}
          </p>
        </div>

        {valorTotalCentavos > 0 && (
          <>
            <div>
              <p className="text-xs text-primary-500">Margem bruta estimada</p>
              <p className={`text-sm font-bold tabular-nums ${margemNegativa ? 'text-danger' : 'text-success'}`}>
                {formatBRL(estimativa.margem_bruta_centavos)}
              </p>
            </div>

            <div>
              <p className="text-xs text-primary-500">Percentual de margem</p>
              <p className={`text-sm font-bold tabular-nums ${margemNegativa ? 'text-danger' : 'text-success'}`}>
                {estimativa.margem_percentual.toFixed(1).replace('.', ',')}%
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
