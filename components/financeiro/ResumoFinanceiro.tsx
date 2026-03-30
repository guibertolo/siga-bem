import { formatBRL } from '@/lib/utils/currency';
import type { ResumoFinanceiro as ResumoFinanceiroType } from '@/types/fechamento';

interface ResumoFinanceiroProps {
  resumo: ResumoFinanceiroType;
}

export function ResumoFinanceiro({ resumo }: ResumoFinanceiroProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {/* Pago no mes */}
      <div className="rounded-lg border border-surface-border bg-surface-card p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-primary-500">
          Pago no Mes
        </p>
        <p className="mt-1 text-2xl font-bold text-success">
          {formatBRL(resumo.totalPagoMesCentavos)}
        </p>
      </div>

      {/* Em aberto */}
      <div className="rounded-lg border border-surface-border bg-surface-card p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-primary-500">
          Em Aberto
        </p>
        <p className="mt-1 text-2xl font-bold text-warning">
          {formatBRL(resumo.totalEmAbertoCentavos)}
        </p>
      </div>

      {/* Pendentes */}
      <div className="rounded-lg border border-surface-border bg-surface-card p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-primary-500">
          Acertos Pendentes
        </p>
        <p className="mt-1 text-2xl font-bold text-primary-900">
          {resumo.qtdPendentes}
        </p>
      </div>
    </div>
  );
}
