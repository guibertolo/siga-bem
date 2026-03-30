import Link from 'next/link';
import { formatBRL } from '@/lib/utils/currency';
import type { ProximaViagemItem } from '@/app/(dashboard)/dashboard/actions';

/**
 * Dashboard card showing the motorista's next planned trip.
 * Displays route, departure date, freight value, and a link to details.
 * Story S-DASH-1 — Motorista dashboard differentiation.
 */

interface ProximaViagemCardProps {
  viagem: ProximaViagemItem | null;
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

export function ProximaViagemCard({ viagem }: ProximaViagemCardProps) {
  if (!viagem) {
    return (
      <div
        className="rounded-card border border-surface-border bg-surface-card p-6 shadow-sm"
        role="region"
        aria-label="Proxima viagem: nenhuma viagem planejada"
      >
        <h3 className="text-lg font-semibold text-primary-900">
          Proxima Viagem
        </h3>
        <p className="mt-2 text-base text-text-muted">
          Nenhuma viagem planejada
        </p>
      </div>
    );
  }

  return (
    <Link
      href={`/viagens/${viagem.id}`}
      className="block rounded-card border border-surface-border border-l-4 border-l-blue-400 bg-surface-card p-6 shadow-sm no-underline text-inherit hover:border-primary-500 transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none"
      role="region"
      aria-label={`Proxima viagem: ${viagem.origem} para ${viagem.destino}, saida em ${formatDate(viagem.data_saida)}`}
    >
      <h3 className="text-lg font-semibold text-primary-900">
        Proxima Viagem
      </h3>
      <p className="mt-2 text-xl font-bold text-primary-900">
        {viagem.origem} &rarr; {viagem.destino}
      </p>
      <div className="mt-2 space-y-1 text-sm text-primary-700">
        <p>Saida: {formatDate(viagem.data_saida)}</p>
        <p className="text-base font-semibold tabular-nums">
          Frete: {formatBRL(viagem.valor_total)}
        </p>
      </div>
      <p className="mt-3 text-sm font-medium text-primary-500">
        Ver Detalhes &rarr;
      </p>
    </Link>
  );
}
