'use client';

import { useState, useOptimistic, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { VeiculoForm } from '@/components/viagens/VeiculoForm';
import {
  addVeiculoViagem,
  updateVeiculoViagem,
  removeVeiculoViagem,
} from '@/app/(dashboard)/viagens/[id]/veiculos/actions';
import { cn } from '@/lib/utils/cn';
import type { ViagemVeiculo, ViagemVeiculoFormData, ViagemVeiculoActionResult } from '@/types/viagem-veiculo';

interface VeiculosSectionProps {
  viagemId: string;
  veiculos: ViagemVeiculo[];
  capacidade: number;
  readonly: boolean;
}

type OptimisticAction =
  | { type: 'remove'; id: string }
  | { type: 'add'; veiculo: ViagemVeiculo }
  | { type: 'update'; veiculo: ViagemVeiculo };

function veiculoReducer(
  state: ViagemVeiculo[],
  action: OptimisticAction,
): ViagemVeiculo[] {
  switch (action.type) {
    case 'remove':
      return state.filter((v) => v.id !== action.id);
    case 'add':
      return [...state, action.veiculo];
    case 'update':
      return state.map((v) => (v.id === action.veiculo.id ? action.veiculo : v));
    default:
      return state;
  }
}

function sortByPosicao(veiculos: ViagemVeiculo[]): ViagemVeiculo[] {
  return [...veiculos].sort((a, b) => {
    if (a.posicao === null && b.posicao === null) return 0;
    if (a.posicao === null) return 1;
    if (b.posicao === null) return -1;
    return a.posicao - b.posicao;
  });
}

export function VeiculosSection({
  viagemId,
  veiculos,
  capacidade,
  readonly,
}: VeiculosSectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optimisticVeiculos, dispatchOptimistic] = useOptimistic(
    veiculos,
    veiculoReducer,
  );

  const [showForm, setShowForm] = useState(false);
  const [editingVeiculo, setEditingVeiculo] = useState<ViagemVeiculo | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sorted = sortByPosicao(optimisticVeiculos);
  const qtdVeiculos = optimisticVeiculos.length;
  const excedeu = qtdVeiculos > capacidade;

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  async function handleAdd(data: ViagemVeiculoFormData): Promise<ViagemVeiculoActionResult> {
    setError(null);
    const result = await addVeiculoViagem(viagemId, data);
    if (result.success && result.veiculo) {
      startTransition(() => {
        dispatchOptimistic({ type: 'add', veiculo: result.veiculo! });
        router.refresh();
      });
    }
    return result;
  }

  async function handleUpdate(data: ViagemVeiculoFormData): Promise<ViagemVeiculoActionResult> {
    if (!editingVeiculo) return { success: false, error: 'Nenhum veiculo selecionado' };
    setError(null);
    const result = await updateVeiculoViagem(editingVeiculo.id, viagemId, data);
    if (result.success && result.veiculo) {
      startTransition(() => {
        dispatchOptimistic({ type: 'update', veiculo: result.veiculo! });
        router.refresh();
      });
    }
    return result;
  }

  function handleRemove(veiculoId: string) {
    setError(null);
    setConfirmDeleteId(null);

    startTransition(async () => {
      dispatchOptimistic({ type: 'remove', id: veiculoId });

      const result = await removeVeiculoViagem(veiculoId, viagemId);
      if (!result.success) {
        setError(result.error ?? 'Erro ao remover veiculo');
        router.refresh();
      }
    });
  }

  function openEdit(veiculo: ViagemVeiculo) {
    if (readonly) return;
    setEditingVeiculo(veiculo);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingVeiculo(null);
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="rounded-lg border border-surface-border bg-surface-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-medium uppercase tracking-wide text-primary-500">
            Veiculos Transportados
          </h3>
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
              excedeu
                ? 'bg-amber-100 text-amber-800'
                : 'bg-surface-muted text-text-muted',
            )}
          >
            {qtdVeiculos} de {capacidade} vagas preenchidas
          </span>
        </div>

        {!readonly && (
          <button
            type="button"
            onClick={() => {
              if (showForm && !editingVeiculo) {
                closeForm();
              } else {
                setEditingVeiculo(null);
                setShowForm(true);
              }
            }}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-4 py-3 text-base font-semibold min-h-[48px] transition-colors',
              showForm && !editingVeiculo
                ? 'border border-surface-border bg-surface-muted text-primary-700 hover:bg-surface-hover'
                : 'bg-btn-primary text-white hover:bg-btn-primary-hover disabled:opacity-50',
            )}
            disabled={isPending}
          >
            {showForm && !editingVeiculo ? (
              <>
                <svg className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Fechar
              </>
            ) : (
              <>
                <svg className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Adicionar Veiculo
              </>
            )}
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-danger/20 bg-alert-danger-bg px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {sorted.length === 0 ? (
        <p className="py-8 text-center text-sm text-text-subtle">
          Nenhum veiculo cadastrado nesta viagem.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-surface-border text-xs font-medium uppercase tracking-wide text-primary-500">
                <th className="pb-2 pr-4">Pos.</th>
                <th className="pb-2 pr-4">Marca / Modelo</th>
                <th className="pb-2 pr-4">Placa</th>
                <th className="pb-2 pr-4">Cor</th>
                {!readonly && <th className="pb-2 text-right">Acoes</th>}
              </tr>
            </thead>
            <tbody>
              {sorted.map((v) => (
                <tr
                  key={v.id}
                  className={cn(
                    'border-b border-surface-border last:border-b-0',
                    !readonly && 'cursor-pointer hover:bg-surface-muted',
                  )}
                  onClick={() => openEdit(v)}
                >
                  <td className="py-3 pr-4 tabular-nums text-primary-700">
                    {v.posicao ?? '-'}
                  </td>
                  <td className="py-3 pr-4 font-medium text-primary-900">
                    {[v.marca, v.modelo].filter(Boolean).join(' ')}
                  </td>
                  <td className="py-3 pr-4 font-mono text-xs text-primary-700">
                    {v.placa ?? '-'}
                  </td>
                  <td className="py-3 pr-4 text-primary-700">
                    {v.cor ?? '-'}
                  </td>
                  {!readonly && (
                    <td className="py-3 text-right">
                      {confirmDeleteId === v.id ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="text-xs text-danger">Confirmar?</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemove(v.id);
                            }}
                            className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700"
                            disabled={isPending}
                          >
                            Sim
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeleteId(null);
                            }}
                            className="rounded border border-surface-border px-2 py-1 text-xs font-medium text-text-muted hover:bg-surface-muted"
                          >
                            Nao
                          </button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteId(v.id);
                          }}
                          className="rounded p-1 text-text-subtle transition-colors hover:text-danger"
                          aria-label={`Remover veiculo ${v.modelo}`}
                          disabled={isPending}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit inline form */}
      {showForm && (
        <div className="mt-4 border-t border-surface-border pt-4">
          <VeiculoForm
            veiculo={editingVeiculo}
            onSubmit={editingVeiculo ? handleUpdate : handleAdd}
            onClose={closeForm}
          />
        </div>
      )}
    </div>
  );
}
