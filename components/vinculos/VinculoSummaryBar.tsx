interface VinculoSummaryBarProps {
  totalVinculados: number;
  totalSemMotorista: number;
  totalEncerrados: number;
}

export function VinculoSummaryBar({
  totalVinculados,
  totalSemMotorista,
  totalEncerrados,
}: VinculoSummaryBarProps) {
  return (
    <div
      role="region"
      aria-label="Resumo dos vínculos"
      className="grid grid-cols-3 gap-3 sm:flex sm:items-center sm:gap-4"
    >
      <div className="flex items-center gap-2 rounded-lg border border-surface-border bg-surface-card px-4 py-3 sm:flex-1 sm:min-w-[140px]">
        <span className="text-xl sm:text-2xl font-bold text-success tabular-nums">
          {totalVinculados}
        </span>
        <span className="text-base text-primary-700">Vinculados</span>
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-surface-border bg-surface-card px-4 py-3 sm:flex-1 sm:min-w-[140px]">
        <span className="text-xl sm:text-2xl font-bold text-danger tabular-nums">
          {totalSemMotorista}
        </span>
        <span className="text-base text-primary-700">Sem Motorista</span>
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-surface-border bg-surface-card px-4 py-3 sm:flex-1 sm:min-w-[140px]">
        <span className="text-xl sm:text-2xl font-bold text-primary-500 tabular-nums">
          {totalEncerrados}
        </span>
        <span className="text-base text-primary-700">Encerrados</span>
      </div>
    </div>
  );
}
