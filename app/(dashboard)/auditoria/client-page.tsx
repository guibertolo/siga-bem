'use client';

import { useMemo, useState } from 'react';
import type { AuditLogEntry } from '@/lib/observability/audit';

interface Props {
  logs: AuditLogEntry[];
  error: string | null;
}

const ACAO_LABEL: Record<string, string> = {
  create: 'Criou',
  update: 'Alterou',
  delete: 'Removeu',
};

const ENTIDADE_LABEL: Record<string, string> = {
  viagem: 'viagem',
  gasto: 'despesa',
  manutencao: 'manutenção',
  caminhao: 'caminhão',
  motorista: 'motorista',
  usuario: 'usuário',
  empresa: 'empresa',
  fechamento: 'acerto',
  dispensa_alerta: 'alerta',
};

const ROLE_LABEL: Record<string, string> = {
  dono: 'Dono',
  admin: 'Gestor',
  motorista: 'Motorista',
};

function formatarDataHora(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function AcaoBadge({ acao }: { acao: string }) {
  const base = 'inline-flex rounded-md px-2 py-0.5 text-xs font-medium';
  if (acao === 'create') {
    return <span className={`${base} bg-alert-success-bg text-success`}>{ACAO_LABEL[acao]}</span>;
  }
  if (acao === 'delete') {
    return <span className={`${base} bg-alert-danger-bg text-danger`}>{ACAO_LABEL[acao]}</span>;
  }
  return <span className={`${base} bg-alert-info-bg text-info`}>{ACAO_LABEL[acao] ?? acao}</span>;
}

export default function AuditoriaClientPage({ logs, error }: Props) {
  const [roleFilter, setRoleFilter] = useState<string>('todos');
  const [entidadeFilter, setEntidadeFilter] = useState<string>('todos');

  const entidadesDisponiveis = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => set.add(l.entidade));
    return Array.from(set);
  }, [logs]);

  const logsFiltrados = useMemo(() => {
    return logs.filter((l) => {
      if (roleFilter !== 'todos' && l.usuario_role !== roleFilter) return false;
      if (entidadeFilter !== 'todos' && l.entidade !== entidadeFilter) return false;
      return true;
    });
  }, [logs, roleFilter, entidadeFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-primary-900">Auditoria</h2>
        <p className="mt-1 text-sm text-primary-500">
          Histórico de alterações feitas por você e seus gestores. Útil para acompanhar o que mudou na sua frota.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-danger/20 bg-alert-danger-bg p-3 text-sm text-danger">
          {error}
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <div>
          <label htmlFor="role-filter" className="mb-1 block text-xs font-medium text-primary-600">
            Quem fez
          </label>
          <select
            id="role-filter"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-md border border-surface-border bg-surface-card px-3 py-2 text-sm text-primary-900"
          >
            <option value="todos">Todos</option>
            <option value="dono">Somente eu (dono)</option>
            <option value="admin">Somente gestores</option>
            <option value="motorista">Somente motoristas</option>
          </select>
        </div>

        <div>
          <label htmlFor="entidade-filter" className="mb-1 block text-xs font-medium text-primary-600">
            O que
          </label>
          <select
            id="entidade-filter"
            value={entidadeFilter}
            onChange={(e) => setEntidadeFilter(e.target.value)}
            className="rounded-md border border-surface-border bg-surface-card px-3 py-2 text-sm text-primary-900"
          >
            <option value="todos">Todos</option>
            {entidadesDisponiveis.map((e) => (
              <option key={e} value={e}>
                {ENTIDADE_LABEL[e] ?? e}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista */}
      {logsFiltrados.length === 0 ? (
        <div className="rounded-[--radius-card] border border-surface-border bg-surface-card p-8 text-center">
          <p className="text-base text-primary-500">
            {logs.length === 0
              ? 'Nenhuma alteração registrada ainda.'
              : 'Nenhuma alteração para os filtros selecionados.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {logsFiltrados.map((log) => (
            <div
              key={log.id}
              className="flex flex-col gap-2 rounded-[--radius-card] border border-surface-border bg-surface-card p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <AcaoBadge acao={log.acao} />
                  <span className="text-sm text-primary-700">
                    {ENTIDADE_LABEL[log.entidade] ?? log.entidade}
                  </span>
                  {log.entidade_descricao && (
                    <span className="text-sm font-medium text-primary-900">
                      — {log.entidade_descricao}
                    </span>
                  )}
                </div>
                <div className="text-xs text-primary-500">
                  {log.usuario_nome} ({ROLE_LABEL[log.usuario_role] ?? log.usuario_role}) ·{' '}
                  {formatarDataHora(log.created_at)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-primary-400">
        Mostrando os {logs.length} eventos mais recentes.
      </p>
    </div>
  );
}
