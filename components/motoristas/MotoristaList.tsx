'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { MotoristaListItem } from '@/types/motorista';
import { softDeleteMotorista, reactivateMotorista } from '@/app/(dashboard)/motoristas/actions';
import { cn } from '@/lib/utils/cn';
import { OverflowMenu } from '@/components/ui/OverflowMenu';

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
        <div className="rounded-lg border border-warning/20 bg-alert-warning-bg p-4">
          <p className="text-sm font-medium text-amber-800">
            Atencao: {cnhAlerts.length} motorista(s) com CNH vencida ou proxima do vencimento
          </p>
          <ul className="mt-2 space-y-1">
            {cnhAlerts.map((m) => (
              <li key={m.id} className="text-sm text-warning">
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
              'rounded-full border px-4 py-2 text-sm font-medium transition-colors min-h-[40px]',
              filter === option
                ? 'border-primary-700 bg-btn-primary text-white'
                : 'border-surface-border bg-surface-card text-primary-700 hover:bg-surface-hover',
            )}
          >
            {option === 'todos' ? 'Todos' : option === 'ativo' ? 'Ativos' : 'Inativos'}
          </button>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-surface-border bg-surface-card p-8 text-center">
          <p className="text-base text-primary-500">Nenhum motorista encontrado.</p>
          <p className="mt-1 text-sm text-text-muted">Cadastre um motorista para comecar.</p>
        </div>
      ) : (
        <>
        {/* Mobile card view */}
        <div className="space-y-3 md:hidden">
          {filtered.map((m) => (
            <div key={m.id} className="rounded-xl border border-surface-border bg-surface-card p-4 shadow-sm">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-base font-medium text-primary-900">{m.nome}</p>
                  <p className="text-sm text-primary-500">{m.cpf}</p>
                </div>
                <span
                  className={cn(
                    'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold',
                    m.status === 'ativo' ? 'bg-alert-success-bg text-success' : 'bg-surface-muted text-text-muted',
                  )}
                >
                  {m.status === 'ativo' ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              <div className="text-sm text-primary-700 space-y-0.5">
                <p>CNH: {m.cnh_numero} ({m.cnh_categoria})</p>
                <p>
                  Validade:{' '}
                  <span
                    className={cn(
                      m.cnh_vencida ? 'text-danger font-semibold' : m.cnh_vence_em_30_dias ? 'text-warning font-semibold' : '',
                    )}
                  >
                    {m.cnh_validade}
                  </span>
                </p>
                {m.telefone && <p>Tel: {m.telefone}</p>}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Link
                  href={`/motoristas/${m.id}`}
                  className="inline-flex items-center gap-1.5 rounded-md bg-btn-primary px-3 py-2 text-sm font-semibold text-white no-underline transition-colors hover:bg-btn-primary-hover min-h-[40px]"
                >
                  Ver Detalhes
                </Link>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleToggleStatus(m.id, m.status)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors min-h-[40px]',
                    m.status === 'ativo' ? 'text-danger hover:bg-alert-danger-bg' : 'text-success hover:bg-alert-success-bg',
                    isPending && 'cursor-not-allowed opacity-50',
                  )}
                >
                  {m.status === 'ativo' ? 'Inativar' : 'Reativar'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop table view */}
        <div className="hidden md:block overflow-x-auto rounded-xl border border-surface-border bg-surface-card shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-border bg-surface-background">
                <th className="px-4 py-3.5 text-left text-base font-medium text-primary-500">Nome</th>
                <th className="px-4 py-3.5 text-left text-base font-medium text-primary-500">CPF</th>
                <th className="px-4 py-3.5 text-left text-base font-medium text-primary-500">CNH</th>
                <th className="px-4 py-3.5 text-left text-base font-medium text-primary-500">Categoria</th>
                <th className="px-4 py-3.5 text-left text-base font-medium text-primary-500">Validade CNH</th>
                <th className="px-4 py-3.5 text-left text-base font-medium text-primary-500">Telefone</th>
                <th className="px-4 py-3.5 text-left text-base font-medium text-primary-500">Situação</th>
                <th className="px-4 py-3.5 text-right text-base font-medium text-primary-500">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {filtered.map((m) => (
                <tr key={m.id} className="hover:bg-surface-hover">
                  <td className="px-4 py-3.5 text-base font-medium text-primary-900">{m.nome}</td>
                  <td className="px-4 py-3.5 text-base text-primary-700">{m.cpf}</td>
                  <td className="px-4 py-3.5 text-base text-primary-700">{m.cnh_numero}</td>
                  <td className="px-4 py-3.5 text-base text-primary-700">{m.cnh_categoria}</td>
                  <td className="px-4 py-3.5">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold',
                        m.cnh_vencida
                          ? 'bg-alert-danger-bg text-danger'
                          : m.cnh_vence_em_30_dias
                            ? 'bg-amber-100 text-warning'
                            : 'text-primary-700',
                      )}
                    >
                      {m.cnh_validade}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-base text-primary-700">{m.telefone || '—'}</td>
                  <td className="px-4 py-3.5">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold',
                        m.status === 'ativo'
                          ? 'bg-alert-success-bg text-success'
                          : 'bg-surface-muted text-text-muted',
                      )}
                    >
                      {m.status === 'ativo' ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/motoristas/${m.id}`}
                        className="inline-flex items-center gap-1.5 rounded-md bg-btn-primary px-3 py-2 text-sm font-semibold text-white no-underline transition-colors hover:bg-btn-primary-hover min-h-[40px]"
                      >
                        Ver
                      </Link>
                      <OverflowMenu
                        items={[
                          {
                            label: m.status === 'ativo' ? 'Inativar' : 'Reativar',
                            variant: m.status === 'ativo' ? 'danger' : 'default',
                            onClick: () => handleToggleStatus(m.id, m.status),
                            icon: m.status === 'ativo' ? (
                              <svg className="h-4 w-4" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            ) : undefined,
                          },
                        ]}
                      />
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
