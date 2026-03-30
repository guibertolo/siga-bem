import Link from 'next/link';
import { formatBRL } from '@/lib/utils/currency';
import type { ViagemAtivaItem } from '@/app/(dashboard)/dashboard/actions';

interface ViagemAtivaCardProps {
  viagens: ViagemAtivaItem[];
  count: number;
  isMotorista: boolean;
}

function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function EmptyState() {
  return (
    <div className="rounded-xl border-2 border-dashed border-surface-border bg-surface-card p-6 mb-6">
      <p className="text-base font-medium text-primary-500">
        Nenhuma viagem em andamento
      </p>
      <p className="mt-1 text-sm text-primary-400">
        Quando voce iniciar uma viagem, ela aparecera aqui.
      </p>
    </div>
  );
}

function MotoristaView({ viagem }: { viagem: ViagemAtivaItem }) {
  return (
    <div
      role="region"
      aria-label={`Viagem em andamento de ${viagem.origem} para ${viagem.destino}`}
      className="rounded-xl border border-warning/30 border-l-4 bg-alert-warning-bg p-5 mb-6"
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-block rounded-full bg-warning px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
          Em Viagem
        </span>
      </div>

      <h3 className="text-xl font-bold text-primary-900">
        {viagem.origem} &rarr; {viagem.destino}
      </h3>

      <div className="mt-2 space-y-1 text-sm text-primary-700">
        <p>
          Caminhao: {viagem.caminhao_placa} - {viagem.caminhao_modelo}
        </p>
        <p>Saida: {formatDateTime(viagem.data_saida)}</p>
        <p className="text-base font-semibold tabular-nums">
          Frete: {formatBRL(viagem.valor_total)}
        </p>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Link
          href={`/viagens/${viagem.id}`}
          className="flex items-center justify-center gap-2 rounded-lg bg-primary-700 px-6 py-4 text-lg font-bold text-white no-underline transition-colors hover:bg-primary-800 min-h-[56px] w-full sm:w-auto"
        >
          Ir para Viagem
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
        <Link
          href={`/viagens/${viagem.id}#despesas`}
          className="flex items-center justify-center rounded-lg border border-surface-border px-4 py-3 text-base font-medium text-primary-700 no-underline transition-colors hover:bg-surface-hover min-h-[48px]"
        >
          + Registrar Despesa
        </Link>
        <Link
          href={`/viagens/${viagem.id}#abastecimentos`}
          className="flex items-center justify-center rounded-lg border border-surface-border px-4 py-3 text-base font-medium text-primary-700 no-underline transition-colors hover:bg-surface-hover min-h-[48px]"
        >
          + Abastecimento
        </Link>
      </div>
    </div>
  );
}

function DonoView({ viagens, count }: { viagens: ViagemAtivaItem[]; count: number }) {
  const displayViagens = viagens.slice(0, 3);
  const hasMore = count > 3;

  return (
    <div
      role="region"
      aria-label={`${count} viagen${count !== 1 ? 's' : ''} em andamento`}
      className="rounded-xl border border-warning/30 border-l-4 bg-alert-warning-bg p-5 mb-6"
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-block rounded-full bg-warning px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
          {count} viagen{count !== 1 ? 's' : ''} em andamento
        </span>
      </div>

      <div className="space-y-3">
        {displayViagens.map((v) => (
          <div
            key={v.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-surface-border bg-surface-card p-3"
          >
            <div className="min-w-0 flex-1">
              <p className="text-base font-bold text-primary-900 truncate">
                {v.origem} &rarr; {v.destino}
              </p>
              <p className="text-sm text-primary-500 truncate">
                {v.motorista_nome} - {v.caminhao_placa}
              </p>
            </div>
            <Link
              href={`/viagens/${v.id}`}
              className="shrink-0 rounded-lg bg-primary-700 px-4 py-2 text-sm font-semibold text-white no-underline transition-colors hover:bg-primary-800 min-h-[40px] flex items-center"
            >
              Ver
            </Link>
          </div>
        ))}
      </div>

      {hasMore && (
        <Link
          href="/viagens?status=em_andamento"
          className="mt-4 flex items-center justify-center rounded-lg bg-primary-700 px-6 py-4 text-lg font-bold text-white no-underline transition-colors hover:bg-primary-800 min-h-[56px] w-full"
        >
          Ver Todas as Viagens
        </Link>
      )}
    </div>
  );
}

export function ViagemAtivaCard({ viagens, count, isMotorista }: ViagemAtivaCardProps) {
  if (count === 0 || viagens.length === 0) {
    return <EmptyState />;
  }

  if (isMotorista) {
    return <MotoristaView viagem={viagens[0]} />;
  }

  return <DonoView viagens={viagens} count={count} />;
}
