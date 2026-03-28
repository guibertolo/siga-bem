'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { MotoristaListItem } from '@/types/motorista';
import { softDeleteMotorista, reactivateMotorista } from '@/app/(dashboard)/motoristas/actions';
import { cn } from '@/lib/utils/cn';

interface MotoristaListProps {
  motoristas: MotoristaListItem[];
}

export function MotoristaList({ motoristas }: MotoristaListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [filter, setFilter] = useState<'todos' | 'ativo' | 'inativo'>('todos');

  const filtered = motoristas.filter((m) => {
    if (filter === 'todos') return true;
    return m.status === filter;
  });

  const cnhAlerts = motoristas.filter((m) => m.cnh_vencida || m.cnh_vence_em_30_dias);

  function handleToggleStatus(motoristaId: string, currentStatus: string) {
    startTransition(async () => {
      if (currentStatus === 'ativo') {
        await softDeleteMotorista(motoristaId);
      } else {
        await reactivateMotorista(motoristaId);
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {/* CNH Alert Banner */}
      {cnhAlerts.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-800">
            Atencao: {cnhAlerts.length} motorista(s) com CNH vencida ou proxima do vencimento
          </p>
          <ul className="mt-2 space-y-1">
            {cnhAlerts.map((m) => (
              <li key={m.id} className="text-sm text-amber-700">
                {m.nome} &mdash;{' '}
                {m.cnh_vencida
                  ? 'CNH vencida'
                  : 'CNH vence em menos de 30 dias'}{' '}
                ({m.cnh_validade})
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {(['todos', 'ativo', 'inativo'] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setFilter(option)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              filter === option
                ? 'bg-primary-700 text-white'
                : 'bg-surface-card text-primary-700 hover:bg-surface-hover',
            )}
          >
            {option === 'todos' ? 'Todos' : option === 'ativo' ? 'Ativos' : 'Inativos'}
          </button>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-surface-border bg-surface-card p-8 text-center">
          <p className="text-sm text-primary-500">Nenhum motorista encontrado.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-surface-border bg-surface-card shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border bg-surface-background">
                <th className="px-4 py-3 text-left font-medium text-primary-500">Nome</th>
                <th className="px-4 py-3 text-left font-medium text-primary-500">CPF</th>
                <th className="px-4 py-3 text-left font-medium text-primary-500">CNH</th>
                <th className="px-4 py-3 text-left font-medium text-primary-500">Categoria</th>
                <th className="px-4 py-3 text-left font-medium text-primary-500">Validade CNH</th>
                <th className="px-4 py-3 text-left font-medium text-primary-500">Telefone</th>
                <th className="px-4 py-3 text-left font-medium text-primary-500">Status</th>
                <th className="px-4 py-3 text-right font-medium text-primary-500">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {filtered.map((m) => (
                <tr key={m.id} className="hover:bg-surface-hover">
                  <td className="px-4 py-3 font-medium text-primary-900">{m.nome}</td>
                  <td className="px-4 py-3 text-primary-700">{m.cpf}</td>
                  <td className="px-4 py-3 text-primary-700">{m.cnh_numero}</td>
                  <td className="px-4 py-3 text-primary-700">{m.cnh_categoria}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                        m.cnh_vencida
                          ? 'bg-red-100 text-red-700'
                          : m.cnh_vence_em_30_dias
                            ? 'bg-amber-100 text-amber-700'
                            : 'text-primary-700',
                      )}
                    >
                      {m.cnh_validade}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-primary-700">{m.telefone || '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                        m.status === 'ativo'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600',
                      )}
                    >
                      {m.status === 'ativo' ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleToggleStatus(m.id, m.status)}
                      className={cn(
                        'rounded px-2 py-1 text-xs font-medium transition-colors',
                        m.status === 'ativo'
                          ? 'text-red-600 hover:bg-red-50'
                          : 'text-green-600 hover:bg-green-50',
                        isPending && 'cursor-not-allowed opacity-50',
                      )}
                    >
                      {m.status === 'ativo' ? 'Inativar' : 'Reativar'}
                    </button>
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
