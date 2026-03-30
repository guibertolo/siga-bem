'use client';

import { useState, useTransition } from 'react';
import { formatBRL } from '@/lib/utils/currency';
import { getEstimativaCustoViagem } from '@/app/(dashboard)/bi/actions';
import type { BIEstimativaResult, BIFilterOptions } from '@/types/bi';
import { COMBUSTIVEL_TIPO_LABELS } from '@/types/precificacao';
import type { CombustivelTipo } from '@/types/precificacao';

interface SimuladorViagemProps {
  caminhoes: BIFilterOptions['caminhoes'];
  onOrigemDestinoChange?: (origem: string, destino: string) => void;
}

export function SimuladorViagem({
  caminhoes,
  onOrigemDestinoChange,
}: SimuladorViagemProps) {
  const [isPending, startTransition] = useTransition();
  const [origem, setOrigem] = useState('');
  const [destino, setDestino] = useState('');
  const [kmEstimado, setKmEstimado] = useState('');
  const [caminhaoId, setCaminhaoId] = useState('');
  const [tipoCombustivel, setTipoCombustivel] =
    useState<CombustivelTipo>('diesel_s10');
  const [valorFrete, setValorFrete] = useState('');
  const [resultado, setResultado] = useState<BIEstimativaResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleSimular() {
    const km = parseInt(kmEstimado, 10);
    if (!km || km <= 0) {
      setError('Informe o km estimado (numero inteiro positivo).');
      return;
    }

    setError(null);
    startTransition(async () => {
      const res = await getEstimativaCustoViagem({
        kmEstimado: km,
        caminhaoId: caminhaoId || undefined,
        tipoCombustivel,
      });

      if (res.error) {
        setError(res.error);
        setResultado(null);
      } else {
        setResultado(res.data);
      }

      // Trigger historical route search
      if (onOrigemDestinoChange && (origem.trim() || destino.trim())) {
        onOrigemDestinoChange(origem, destino);
      }
    });
  }

  // Margin calculation
  const freteValorCentavos = valorFrete
    ? Math.round(parseFloat(valorFrete.replace(/\./g, '').replace(',', '.')) * 100)
    : null;
  const margemCentavos =
    freteValorCentavos != null && resultado
      ? freteValorCentavos - resultado.custoEstimadoCentavos
      : null;
  const margemPercent =
    margemCentavos != null && freteValorCentavos && freteValorCentavos > 0
      ? (margemCentavos / freteValorCentavos) * 100
      : null;

  return (
    <div className="rounded-card border border-surface-border bg-surface-card p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-primary-900 mb-4">
        Calcular Custo da Viagem
      </h3>

      {/* Form */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Origem */}
        <div>
          <label
            htmlFor="sim-origem"
            className="mb-1 block text-xs font-medium text-primary-700"
          >
            Origem
          </label>
          <input
            id="sim-origem"
            type="text"
            value={origem}
            onChange={(e) => setOrigem(e.target.value)}
            placeholder="Ex: Sao Paulo"
            className="w-full min-h-[48px] rounded-md border border-surface-border bg-surface-card px-3 py-2 text-base text-primary-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        {/* Destino */}
        <div>
          <label
            htmlFor="sim-destino"
            className="mb-1 block text-xs font-medium text-primary-700"
          >
            Destino
          </label>
          <input
            id="sim-destino"
            type="text"
            value={destino}
            onChange={(e) => setDestino(e.target.value)}
            placeholder="Ex: Rio de Janeiro"
            className="w-full min-h-[48px] rounded-md border border-surface-border bg-surface-card px-3 py-2 text-base text-primary-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        {/* Km Estimado */}
        <div>
          <label
            htmlFor="sim-km"
            className="mb-1 block text-xs font-medium text-primary-700"
          >
            Km Estimado *
          </label>
          <input
            id="sim-km"
            type="number"
            inputMode="numeric"
            min={1}
            value={kmEstimado}
            onChange={(e) => setKmEstimado(e.target.value)}
            placeholder="Ex: 500"
            className="w-full min-h-[48px] rounded-md border border-surface-border bg-surface-card px-3 py-2 text-base text-primary-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        {/* Caminhao */}
        <div>
          <label
            htmlFor="sim-caminhao"
            className="mb-1 block text-xs font-medium text-primary-700"
          >
            Caminhao (opcional)
          </label>
          <select
            id="sim-caminhao"
            value={caminhaoId}
            onChange={(e) => setCaminhaoId(e.target.value)}
            className="w-full min-h-[48px] rounded-md border border-surface-border bg-surface-card px-3 py-2 text-base text-primary-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">Nenhum selecionado</option>
            {caminhoes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.placa} - {c.modelo}
              </option>
            ))}
          </select>
        </div>

        {/* Tipo Combustivel */}
        <div>
          <label
            htmlFor="sim-combustivel"
            className="mb-1 block text-xs font-medium text-primary-700"
          >
            Tipo de Combustivel
          </label>
          <select
            id="sim-combustivel"
            value={tipoCombustivel}
            onChange={(e) =>
              setTipoCombustivel(e.target.value as CombustivelTipo)
            }
            className="w-full min-h-[48px] rounded-md border border-surface-border bg-surface-card px-3 py-2 text-base text-primary-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            {Object.entries(COMBUSTIVEL_TIPO_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Button */}
        <div className="flex items-end">
          <button
            type="button"
            onClick={handleSimular}
            disabled={isPending}
            className="w-full min-h-[48px] rounded-md bg-primary-600 px-4 py-2 text-base font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
          >
            {isPending ? 'Calculando...' : 'Simular'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Results */}
      {resultado && (
        <div className="mt-6 space-y-4">
          {/* Estimation card */}
          <div className="rounded-lg border border-primary-200 bg-primary-50 p-4">
            <h4 className="text-sm font-semibold text-primary-900 mb-3">
              Custo estimado para {kmEstimado} km —{' '}
              {COMBUSTIVEL_TIPO_LABELS[tipoCombustivel]}
            </h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs text-primary-500">Vai gastar em diesel</p>
                <p className="text-lg font-bold text-primary-900 tabular-nums">
                  {resultado.litrosEstimados.toFixed(1)} L
                </p>
              </div>
              <div>
                <p className="text-xs text-primary-500">Valor do diesel</p>
                <p className="text-lg font-bold text-primary-900 tabular-nums">
                  {formatBRL(resultado.custoEstimadoCentavos)}
                </p>
              </div>
              <div>
                <p className="text-xs text-primary-500">Consumo do caminhao</p>
                <p className="text-lg font-bold text-primary-900 tabular-nums">
                  {resultado.consumoKmL.toFixed(1)} km/l
                </p>
              </div>
              <div>
                <p className="text-xs text-primary-500">Preco do litro</p>
                <p className="text-lg font-bold text-primary-900 tabular-nums">
                  {formatBRL(resultado.precoMedioLitroCentavos)}
                </p>
              </div>
            </div>

            {/* Source warning */}
            {resultado.fonteConsumo === 'padrao_cegonheiro' && (
              <div className="mt-3 rounded-md bg-yellow-50 border border-yellow-200 p-2 text-xs text-yellow-800">
                Sem historico — usando consumo padrao de cegonheiros (2,5 km/l)
              </div>
            )}
            {resultado.fonteConsumo === 'historico_real' && (
              <p className="mt-2 text-xs text-green-700">
                Fonte: Historico real do caminhao selecionado
              </p>
            )}
            {resultado.fontePreco === 'padrao' && (
              <p className="mt-1 text-xs text-yellow-700">
                Preco: Padrao nacional (R$ 6,50/l) — cadastre precos para
                estimativa mais precisa
              </p>
            )}
          </div>

          {/* Margin calculation */}
          <div className="rounded-lg border border-surface-border bg-surface-card p-4">
            <h4 className="text-sm font-semibold text-primary-900 mb-3">
              Quanto Vai Sobrar
            </h4>
            <div>
              <label
                htmlFor="sim-frete"
                className="mb-1 block text-xs font-medium text-primary-700"
              >
                Valor do Frete (R$)
              </label>
              <input
                id="sim-frete"
                type="text"
                inputMode="decimal"
                value={valorFrete}
                onChange={(e) => setValorFrete(e.target.value)}
                placeholder="Ex: 3000,00"
                className="w-full min-h-[48px] rounded-md border border-surface-border bg-surface-card px-3 py-2 text-base text-primary-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            {margemCentavos != null && margemPercent != null ? (
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-primary-500">Frete</p>
                  <p className="text-lg font-bold text-primary-900 tabular-nums">
                    {formatBRL(freteValorCentavos!)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-primary-500">Vai gastar</p>
                  <p className="text-lg font-bold text-primary-900 tabular-nums">
                    {formatBRL(resultado.custoEstimadoCentavos)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-primary-500">Vai sobrar</p>
                  <p
                    className={`text-lg font-bold tabular-nums ${
                      margemCentavos >= 0
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {formatBRL(margemCentavos)} ({margemPercent.toFixed(1)}%)
                  </p>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-primary-400">
                Preencha o valor do frete para calcular a margem.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
