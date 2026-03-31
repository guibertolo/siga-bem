'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { formatBRL } from '@/lib/utils/currency';
import { CombustivelPrecoForm } from '@/components/configuracoes/CombustivelPrecoForm';
import {
  createCombustivelPreco,
  updateCombustivelPreco,
  deleteCombustivelPreco,
} from '@/app/(dashboard)/configuracoes/combustivel/actions';
import { COMBUSTIVEL_TIPO_LABELS } from '@/types/precificacao';
import type { CombustivelPreco, CombustivelPrecoFormData } from '@/types/precificacao';

interface CombustivelPrecoListProps {
  precos: CombustivelPreco[];
}

export function CombustivelPrecoList({ precos }: CombustivelPrecoListProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editingPreco, setEditingPreco] = useState<CombustivelPreco | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleEdit(preco: CombustivelPreco) {
    setEditingPreco(preco);
    setShowForm(true);
  }

  function handleCancelForm() {
    setShowForm(false);
    setEditingPreco(null);
    router.refresh();
  }

  async function handleSubmit(data: CombustivelPrecoFormData) {
    if (editingPreco) {
      return updateCombustivelPreco(editingPreco.id, data);
    }
    return createCombustivelPreco(data);
  }

  function handleDelete(precoId: string) {
    if (deletingId === precoId) {
      // Confirm delete
      startTransition(async () => {
        await deleteCombustivelPreco(precoId);
        setDeletingId(null);
        router.refresh();
      });
    } else {
      setDeletingId(precoId);
      // Auto-cancel after 3s
      setTimeout(() => setDeletingId(null), 3000);
    }
  }

  function formatDate(dateStr: string): string {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  }

  return (
    <div className="space-y-6">
      {/* Add/Edit form */}
      {showForm ? (
        <div className="rounded-lg border border-surface-border bg-surface-card p-6">
          <h3 className="mb-4 text-lg font-medium text-primary-900">
            {editingPreco ? 'Editar Preço' : 'Novo Preço de Combustível'}
          </h3>
          <CombustivelPrecoForm
            preco={editingPreco}
            onSubmit={handleSubmit}
            onCancel={handleCancelForm}
          />
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="rounded-lg bg-btn-primary px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-btn-primary-hover"
        >
          + Novo Preco
        </button>
      )}

      {/* List */}
      {precos.length === 0 ? (
        <div className="rounded-lg border border-dashed border-surface-border bg-surface-muted p-8 text-center">
          <p className="text-base text-primary-500">
            Nenhum preço de combustível cadastrado.
          </p>
          <p className="mt-1 text-sm text-text-muted">
            O sistema usara o valor padrao de R$ 6,50/l para estimativas.
          </p>
        </div>
      ) : (
        <>
        {/* Mobile card view */}
        <div className="space-y-3 md:hidden">
          {precos.map((preco) => (
            <div key={preco.id} className="rounded-lg border border-surface-border bg-surface-card p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="text-base font-medium text-primary-900">{preco.regiao}</div>
                  <div className="text-sm text-primary-500">{COMBUSTIVEL_TIPO_LABELS[preco.tipo]}</div>
                </div>
                <span className="text-lg font-semibold tabular-nums text-primary-900">
                  {formatBRL(preco.preco_centavos)}
                </span>
              </div>
              <div className="text-sm text-primary-700">
                <p>Ref: {formatDate(preco.data_referencia)} {preco.fonte ? `- ${preco.fonte}` : ''}</p>
              </div>
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => handleEdit(preco)}
                  className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-primary-700 hover:bg-surface-hover transition-colors min-h-[48px]"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(preco.id)}
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-danger hover:bg-alert-danger-bg transition-colors min-h-[48px] disabled:opacity-50"
                >
                  {deletingId === preco.id ? 'Confirmar?' : 'Excluir'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop table view */}
        <div className="hidden md:block overflow-x-auto rounded-lg border border-surface-border">
          <table className="w-full text-left">
            <thead className="border-b border-surface-border bg-surface-muted">
              <tr>
                <th className="px-4 py-3.5 text-sm font-medium uppercase tracking-wide text-primary-500">Região</th>
                <th className="px-4 py-3.5 text-sm font-medium uppercase tracking-wide text-primary-500">Tipo</th>
                <th className="px-4 py-3.5 text-sm font-medium uppercase tracking-wide text-primary-500">Preço/l</th>
                <th className="px-4 py-3.5 text-sm font-medium uppercase tracking-wide text-primary-500">Referência</th>
                <th className="px-4 py-3.5 text-sm font-medium uppercase tracking-wide text-primary-500">Fonte</th>
                <th className="px-4 py-3.5 text-sm font-medium uppercase tracking-wide text-primary-500">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border bg-surface-card">
              {precos.map((preco) => (
                <tr key={preco.id} className="transition-colors hover:bg-surface-muted">
                  <td className="px-4 py-3.5 text-base font-medium text-primary-900">{preco.regiao}</td>
                  <td className="px-4 py-3.5 text-base text-primary-700">{COMBUSTIVEL_TIPO_LABELS[preco.tipo]}</td>
                  <td className="px-4 py-3.5 text-base tabular-nums font-medium text-primary-900">
                    {formatBRL(preco.preco_centavos)}
                  </td>
                  <td className="px-4 py-3.5 text-base text-primary-700">{formatDate(preco.data_referencia)}</td>
                  <td className="px-4 py-3.5 text-base text-primary-500">{preco.fonte ?? '-'}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(preco)}
                        className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-primary-700 hover:bg-surface-hover transition-colors min-h-[40px]"
                      >
                        <svg className="h-4 w-4" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(preco.id)}
                        disabled={isPending}
                        className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-danger hover:bg-alert-danger-bg transition-colors min-h-[40px] disabled:opacity-50"
                      >
                        <svg className="h-4 w-4" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        {deletingId === preco.id ? 'Confirmar?' : 'Excluir'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
    </div>
  );
}
