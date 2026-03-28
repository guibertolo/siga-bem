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
            {editingPreco ? 'Editar Preco' : 'Novo Preco de Combustivel'}
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
          className="rounded-lg bg-primary-700 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-800"
        >
          + Novo Preco
        </button>
      )}

      {/* List */}
      {precos.length === 0 ? (
        <div className="rounded-lg border border-dashed border-surface-border bg-gray-50 p-8 text-center">
          <p className="text-sm text-primary-500">
            Nenhum preco de combustivel cadastrado.
          </p>
          <p className="mt-1 text-xs text-primary-400">
            O sistema usara o valor padrao de R$ 6,50/l para estimativas.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-surface-border">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-surface-border bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-primary-500">Regiao</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-primary-500">Tipo</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-primary-500">Preco/l</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-primary-500">Referencia</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-primary-500">Fonte</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-primary-500">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border bg-white">
              {precos.map((preco) => (
                <tr key={preco.id} className="transition-colors hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-primary-900">{preco.regiao}</td>
                  <td className="px-4 py-3 text-primary-700">{COMBUSTIVEL_TIPO_LABELS[preco.tipo]}</td>
                  <td className="px-4 py-3 tabular-nums font-medium text-primary-900">
                    {formatBRL(preco.preco_centavos)}
                  </td>
                  <td className="px-4 py-3 text-primary-700">{formatDate(preco.data_referencia)}</td>
                  <td className="px-4 py-3 text-primary-500">{preco.fonte ?? '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(preco)}
                        className="text-sm text-primary-500 transition-colors hover:text-primary-700"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(preco.id)}
                        disabled={isPending}
                        className="text-sm text-red-500 transition-colors hover:text-red-700 disabled:opacity-50"
                      >
                        {deletingId === preco.id ? 'Confirmar?' : 'Excluir'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
