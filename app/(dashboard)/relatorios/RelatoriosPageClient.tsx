'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CardsTipoRelatorio } from '@/components/relatorios/CardsTipoRelatorio';
import { ListaSeletora } from '@/components/relatorios/ListaSeletora';
import { RelatorioFiltros } from '@/components/relatorios/RelatorioFiltros';
import type { ListaSeletoraItem } from '@/components/relatorios/ListaSeletora';
import type { PeriodoKey } from '@/components/relatorios/RelatorioFiltros';
import { listMotoristas } from '@/app/(dashboard)/motoristas/actions';
import { listCaminhoes } from '@/app/(dashboard)/caminhoes/actions';

/**
 * Client component that manages the full /relatorios navigation flow.
 * State is 100% driven by query string (AC7).
 * Story 23.4
 */

type Tipo = 'motorista' | 'caminhao';

export function RelatoriosPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  // Read state from URL
  const tipo = searchParams.get('tipo') as Tipo | null;
  const selectedId = searchParams.get('id');
  const periodoParam = (searchParams.get('periodo') ?? 'este-mes') as PeriodoKey;
  const customInicio = searchParams.get('inicio') ?? '';
  const customFim = searchParams.get('fim') ?? '';

  // Local data state
  const [motoristas, setMotoristas] = useState<ListaSeletoraItem[]>([]);
  const [caminhoes, setCaminhoes] = useState<ListaSeletoraItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch list when tipo changes
  useEffect(() => {
    if (!tipo) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    if (tipo === 'motorista') {
      listMotoristas().then((result) => {
        if (cancelled) return;
        setIsLoading(false);
        if (!result.success || !result.motoristas) {
          setError(result.error ?? 'Erro desconhecido');
          return;
        }
        setMotoristas(
          result.motoristas.map((m) => ({
            id: m.id,
            label: m.nome,
            sublabel: m.cpf,
          })),
        );
      });
    } else {
      listCaminhoes().then((result) => {
        if (cancelled) return;
        setIsLoading(false);
        if (result.error || !result.data) {
          setError(result.error ?? 'Erro desconhecido');
          return;
        }
        setCaminhoes(
          result.data.map((c) => ({
            id: c.id,
            label: `${c.placa} - ${c.modelo}`,
            sublabel: c.marca ?? undefined,
          })),
        );
      });
    }

    return () => {
      cancelled = true;
    };
  }, [tipo]);

  const updateUrl = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === '') {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      startTransition(() => {
        router.push(`/relatorios?${params.toString()}`);
      });
    },
    [router, searchParams, startTransition],
  );

  function handleTipoSelect(t: Tipo) {
    updateUrl({ tipo: t, id: null, periodo: null, inicio: null, fim: null });
  }

  function handleItemSelect(id: string) {
    updateUrl({ id, periodo: 'este-mes', inicio: null, fim: null });
  }

  function handleVoltar() {
    if (selectedId) {
      updateUrl({ id: null, periodo: null, inicio: null, fim: null });
    } else {
      updateUrl({ tipo: null, id: null, periodo: null, inicio: null, fim: null });
    }
  }

  function handlePeriodoChange(periodo: PeriodoKey) {
    if (periodo === 'custom') {
      updateUrl({ periodo: 'custom' });
    } else {
      updateUrl({ periodo, inicio: null, fim: null });
    }
  }

  function handleCustomDatesChange(inicio: string, fim: string) {
    updateUrl({ periodo: 'custom', inicio, fim });
  }

  // Step 1: No tipo selected - show cards
  if (!tipo) {
    return (
      <div className="w-full max-w-3xl">
        <h2 className="mb-6 text-2xl sm:text-3xl font-bold text-primary-900">Relatorios</h2>
        <p className="mb-6 text-base text-primary-600">
          Escolha como quer ver o relatorio:
        </p>
        <CardsTipoRelatorio onSelect={handleTipoSelect} />
      </div>
    );
  }

  // Step 2: Tipo selected but no id - show list
  if (!selectedId) {
    const items = tipo === 'motorista' ? motoristas : caminhoes;
    return (
      <div className="w-full max-w-3xl">
        <h2 className="mb-6 text-2xl sm:text-3xl font-bold text-primary-900">Relatorios</h2>
        <ListaSeletora
          items={items}
          tipo={tipo}
          onSelect={handleItemSelect}
          onVoltar={handleVoltar}
          isLoading={isLoading}
          error={error}
        />
      </div>
    );
  }

  // Step 3: Tipo + id selected - show period selector + report placeholder
  const selectedName = tipo === 'motorista'
    ? motoristas.find((m) => m.id === selectedId)?.label
    : caminhoes.find((c) => c.id === selectedId)?.label;

  return (
    <div className="w-full max-w-3xl">
      <h2 className="mb-2 text-2xl sm:text-3xl font-bold text-primary-900">Relatorios</h2>
      <div className="mb-6 flex items-center gap-2">
        <button
          type="button"
          onClick={handleVoltar}
          className="text-sm text-primary-500 transition-colors hover:text-primary-700 min-h-[48px] px-2"
        >
          &larr; Voltar
        </button>
        {selectedName && (
          <span className="text-base font-semibold text-primary-700">{selectedName}</span>
        )}
      </div>

      <RelatorioFiltros
        periodoAtivo={periodoParam}
        customInicio={customInicio}
        customFim={customFim}
        onPeriodoChange={handlePeriodoChange}
        onCustomDatesChange={handleCustomDatesChange}
      />

      {/* Zero-state placeholder — AC8 */}
      <div className="mt-6 rounded-lg border border-surface-border bg-surface-muted p-8 text-center">
        <p className="text-base text-primary-500">
          Sem viagens neste periodo. Tente outro intervalo de datas.
        </p>
      </div>
    </div>
  );
}
