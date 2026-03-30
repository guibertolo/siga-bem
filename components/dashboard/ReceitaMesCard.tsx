import { formatBRL } from '@/lib/utils/currency';

interface ReceitaMesCardProps {
  receitaCentavos: number;
  custoCentavos: number;
}

export function ReceitaMesCard({ receitaCentavos, custoCentavos }: ReceitaMesCardProps) {
  const lucro = receitaCentavos - custoCentavos;
  const margem = receitaCentavos > 0 ? (lucro / receitaCentavos) * 100 : 0;
  const isPositivo = lucro >= 0;

  return (
    <div className="rounded-card border border-surface-border bg-surface-card p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-primary-900">Lucro do Mes</h3>
      <p className={`mt-2 text-3xl font-bold tabular-nums ${isPositivo ? 'text-success' : 'text-danger'}`}>
        {formatBRL(lucro)}
      </p>
      <div className="mt-2 flex items-center gap-3 text-sm">
        <span className="text-primary-500">
          Receita: <span className="font-medium text-primary-700 tabular-nums">{formatBRL(receitaCentavos)}</span>
        </span>
        <span className="text-primary-500">
          Margem: <span className={`font-medium tabular-nums ${isPositivo ? 'text-success' : 'text-danger'}`}>{margem.toFixed(0)}%</span>
        </span>
      </div>
    </div>
  );
}
