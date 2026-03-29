import type { MediaCombustivelRegiao as MediaCombustivelRegiaoType } from '@/types/precificacao';

interface MediaCombustivelRegiaoProps {
  data: MediaCombustivelRegiaoType[];
}

function formatPrecoLitro(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  }).format(valor);
}

function formatLitros(litros: number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(litros);
}

function formatDate(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

export function MediaCombustivelRegiao({ data }: MediaCombustivelRegiaoProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-surface-border bg-surface-muted p-8 text-center">
        <p className="text-base text-primary-500">
          Nenhum abastecimento registrado ainda.
        </p>
        <p className="mt-2 text-sm text-primary-400">
          Os dados aparecerao conforme os motoristas registrarem abastecimentos
          nas viagens.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {data.map((regiao) => {
        const poucoDados = regiao.total_abastecimentos < 3;
        const key = `${regiao.uf_abastecimento}-${regiao.tipo_combustivel}`;

        return (
          <div
            key={key}
            className="rounded-lg border border-surface-border bg-surface-card p-5"
          >
            {/* Header */}
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-primary-900">
                  {regiao.uf_abastecimento}
                </span>
                <span className="rounded-md bg-surface-muted px-2 py-0.5 text-sm text-primary-600">
                  {regiao.tipo_combustivel}
                </span>
              </div>
              {poucoDados && (
                <span className="rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-700">
                  Dados insuficientes ({regiao.total_abastecimentos}{' '}
                  abastecimento
                  {regiao.total_abastecimentos !== 1 ? 's' : ''})
                </span>
              )}
            </div>

            {/* Preco medio destaque */}
            <div className="mb-4">
              <p className="text-sm text-primary-500">Preco medio/litro</p>
              <p className="text-2xl font-bold tabular-nums text-primary-900">
                {formatPrecoLitro(regiao.preco_medio_litro)}
              </p>
            </div>

            {/* Grid de dados */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-primary-500">Min</p>
                <p className="font-medium tabular-nums text-primary-800">
                  {formatPrecoLitro(regiao.preco_min_litro)}
                </p>
              </div>
              <div>
                <p className="text-primary-500">Max</p>
                <p className="font-medium tabular-nums text-primary-800">
                  {formatPrecoLitro(regiao.preco_max_litro)}
                </p>
              </div>
              <div>
                <p className="text-primary-500">Abastecimentos</p>
                <p className="font-medium text-primary-800">
                  {regiao.total_abastecimentos}
                </p>
              </div>
              <div>
                <p className="text-primary-500">Total litros</p>
                <p className="font-medium tabular-nums text-primary-800">
                  {formatLitros(regiao.total_litros)}
                </p>
              </div>
            </div>

            {/* Ultima data */}
            <div className="mt-3 border-t border-surface-border pt-3">
              <p className="text-xs text-primary-400">
                Ultimo abastecimento: {formatDate(regiao.ultima_data)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
