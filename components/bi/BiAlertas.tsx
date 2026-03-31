'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { dispensarAlerta } from '@/app/(dashboard)/bi/actions';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import type { BIAlerta } from '@/types/bi';

interface BiAlertasProps {
  data: BIAlerta[] | null;
  verificados?: BIAlerta[];
}

const MAX_VISIBLE = 5;

export function BiAlertas({ data, verificados = [] }: BiAlertasProps) {
  const [showAll, setShowAll] = useState(false);
  const [showVerificados, setShowVerificados] = useState(false);
  const alertas = data ?? [];

  // Empty state — all good
  if (alertas.length === 0) {
    return (
      <div className="rounded-lg border-l-4 border-l-success bg-alert-success-bg p-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl" aria-hidden="true">
            &#x2705;
          </span>
          <div>
            <p className="text-base font-bold text-success flex items-center gap-2">
              Nenhum alerta
              <InfoTooltip text="O sistema detecta automaticamente quando algum caminhão ou motorista está fora do padrão da sua frota." />
            </p>
            <p className="text-sm text-primary-600 dark:text-primary-400">
              Operacao dentro do esperado no periodo selecionado
            </p>
          </div>
        </div>
      </div>
    );
  }

  const visibleAlertas = showAll ? alertas : alertas.slice(0, MAX_VISIBLE);
  const hasMore = alertas.length > MAX_VISIBLE;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-bold text-primary-900 flex items-center gap-2">
          Alertas da Frota
          <InfoTooltip text="O sistema detecta automaticamente quando algum caminhão ou motorista está fora do padrão da sua frota." />
        </h3>
        <span className="inline-flex items-center rounded-full bg-danger/10 px-2.5 py-0.5 text-sm font-semibold text-danger">
          {alertas.length}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {visibleAlertas.map((alerta, index) => (
          <AlertaCard key={`${alerta.tipo}-${alerta.entidade}-${index}`} alerta={alerta} />
        ))}
      </div>

      {hasMore && !showAll && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="min-h-[48px] rounded-lg bg-surface-muted px-4 py-3 text-base font-semibold text-primary-700 transition-colors hover:bg-surface-hover active:bg-surface-active"
        >
          Ver todos ({alertas.length} alertas)
        </button>
      )}

      {/* Verificados — colapsável */}
      {verificados.length > 0 && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowVerificados(!showVerificados)}
            className="flex items-center gap-2 text-sm font-medium text-primary-500 hover:text-primary-700 transition-colors min-h-[36px]"
          >
            <svg
              className={`h-4 w-4 transition-transform ${showVerificados ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            {verificados.length} alerta{verificados.length !== 1 ? 's' : ''} verificado{verificados.length !== 1 ? 's' : ''} (reaparecem em 30 dias se persistirem)
          </button>

          {showVerificados && (
            <div className="mt-2 grid grid-cols-1 gap-2">
              {verificados.map((alerta, index) => (
                <div
                  key={`v-${alerta.tipo}-${alerta.entidade}-${index}`}
                  className="rounded-lg border border-surface-border bg-surface-muted p-3 opacity-60"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm">
                      <span className="font-medium text-primary-700">{alerta.entidade}</span>
                      <span className="text-primary-500 ml-2">{alerta.titulo}</span>
                      <span className="text-primary-400 ml-2">{alerta.valor}</span>
                    </div>
                    <ReativarButton tipo={alerta.tipo} entidade={alerta.entidade} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ReativarButton({ tipo, entidade }: { tipo: string; entidade: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleReativar() {
    startTransition(async () => {
      const { reativarAlerta } = await import('@/app/(dashboard)/bi/actions');
      await reativarAlerta(tipo, entidade);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleReativar}
      disabled={isPending}
      className="shrink-0 inline-flex items-center gap-1 rounded-md border border-surface-border bg-surface-card px-3 py-1.5 text-xs font-medium text-primary-700 transition-colors hover:bg-surface-hover min-h-[36px]"
    >
      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      {isPending ? 'Reativando...' : 'Reativar'}
    </button>
  );
}

function AlertaCard({ alerta }: { alerta: BIAlerta }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isAlto = alerta.severidade === 'alto';

  const borderColor = isAlto ? 'border-l-danger' : 'border-l-warning';
  const bgColor = isAlto ? 'bg-alert-danger-bg' : 'bg-alert-warning-bg';
  const iconLabel = isAlto ? '\u26A0\uFE0F' : '\u2139\uFE0F';

  function handleDismiss() {
    startTransition(async () => {
      await dispensarAlerta(alerta.tipo, alerta.entidade);
      router.refresh();
    });
  }

  return (
    <div
      className={`rounded-lg border-l-4 ${borderColor} ${bgColor} px-3 py-2`}
      role="alert"
    >
      <div className="flex items-start gap-2">
        <span className="mt-0.5 text-base" aria-hidden="true">
          {iconLabel}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-bold text-primary-900">
              {alerta.titulo}
            </p>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${
                isAlto
                  ? 'bg-danger/10 text-danger'
                  : 'bg-warning/10 text-warning'
              }`}
            >
              {isAlto ? 'Alto' : 'Médio'}
            </span>
          </div>

          <p className="mt-1 text-sm text-primary-600 dark:text-primary-400">
            {alerta.descricao}
          </p>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span className="font-semibold text-primary-900">
                {alerta.entidade}
              </span>
              <span className="text-danger font-semibold">
                {alerta.valor}
              </span>
              <span className="text-primary-500">
                ({alerta.referencia})
              </span>
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-md bg-surface-card px-3 py-2 text-xs font-medium text-primary-700 transition-colors hover:bg-surface-hover min-h-[36px] shrink-0"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {isPending ? 'Salvando...' : 'Verificado'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
