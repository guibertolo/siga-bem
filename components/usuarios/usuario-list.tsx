'use client';

import { useState, useTransition } from 'react';
import type { UsuarioListItem, UsuarioRole } from '@/types/usuario';
import {
  updateUsuarioRole,
  toggleUsuarioAtivo,
} from '@/app/(dashboard)/usuarios/actions';

interface UsuarioListProps {
  usuarios: UsuarioListItem[];
  currentUsuarioId: string;
  currentRole: UsuarioRole;
}

const ROLE_LABELS: Record<UsuarioRole, string> = {
  dono: 'Dono',
  admin: 'Gestor',
  motorista: 'Motorista',
};

const ROLE_COLORS: Record<UsuarioRole, string> = {
  dono: 'bg-badge-warning-bg text-badge-warning-fg',
  admin: 'bg-info/20 text-info',
  motorista: 'bg-alert-success-bg text-success',
};

export default function UsuarioList({
  usuarios,
  currentUsuarioId,
  currentRole,
}: UsuarioListProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleRoleChange(usuarioId: string, newRole: UsuarioRole) {
    setError(null);
    startTransition(async () => {
      const result = await updateUsuarioRole({
        usuario_id: usuarioId,
        role: newRole,
      });
      if (result.error) {
        setError(result.error);
      }
    });
  }

  function handleToggleAtivo(usuarioId: string, currentAtivo: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await toggleUsuarioAtivo({
        usuario_id: usuarioId,
        ativo: !currentAtivo,
      });
      if (result.error) {
        setError(result.error);
      }
    });
  }

  const isDono = currentRole === 'dono';

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-md border border-danger/20 bg-alert-danger-bg p-3 text-sm text-danger">
          {error}
        </div>
      )}

      {/* Mobile card view */}
      <div className="space-y-3 md:hidden">
        {usuarios.map((usuario) => {
          const isSelf = usuario.id === currentUsuarioId;
          const isTargetDono = usuario.role === 'dono';

          return (
            <div key={usuario.id} className="rounded-lg border border-surface-border bg-surface-card p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="min-w-0 flex-1">
                  <div className="text-base font-medium text-primary-900 truncate">
                    {usuario.nome}
                    {isSelf && <span className="ml-1 text-sm text-primary-500">(voce)</span>}
                  </div>
                  <div className="text-sm text-primary-500 truncate">{usuario.email}</div>
                </div>
                <span
                  className={`shrink-0 ml-2 inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${
                    usuario.ativo
                      ? 'bg-alert-success-bg text-success'
                      : 'bg-alert-danger-bg text-badge-danger-fg'
                  }`}
                >
                  {usuario.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                {isDono && !isSelf && !isTargetDono ? (
                  <select
                    value={usuario.role}
                    onChange={(e) => handleRoleChange(usuario.id, e.target.value as UsuarioRole)}
                    disabled={isPending}
                    className="rounded-md border border-surface-border bg-surface-card px-3 py-2 text-base min-h-[48px]"
                  >
                    <option value="admin">Gestor</option>
                    <option value="motorista">Motorista</option>
                  </select>
                ) : (
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${ROLE_COLORS[usuario.role]}`}>
                    {ROLE_LABELS[usuario.role]}
                  </span>
                )}
                <span className="text-sm text-text-muted">
                  Desde {new Date(usuario.created_at).toLocaleDateString('pt-BR')}
                </span>
              </div>
              {!isSelf && !isTargetDono && (
                <div className="mt-2 pt-2 border-t border-surface-border">
                  <button
                    onClick={() => handleToggleAtivo(usuario.id, usuario.ativo)}
                    disabled={isPending}
                    className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors min-h-[48px] ${
                      usuario.ativo
                        ? 'text-danger hover:bg-alert-danger-bg'
                        : 'text-success hover:bg-alert-success-bg'
                    } disabled:opacity-50`}
                  >
                    {usuario.ativo ? 'Desativar' : 'Reativar'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop table view */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-surface-border">
              <th className="px-4 py-3.5 text-base font-medium text-primary-500">Nome</th>
              <th className="px-4 py-3.5 text-base font-medium text-primary-500">Email</th>
              <th className="px-4 py-3.5 text-base font-medium text-primary-500">Role</th>
              <th className="px-4 py-3.5 text-base font-medium text-primary-500">
                Situação
              </th>
              <th className="px-4 py-3.5 text-base font-medium text-primary-500">
                Cadastro
              </th>
              <th className="px-4 py-3.5 text-base font-medium text-primary-500">Ações</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((usuario) => {
              const isSelf = usuario.id === currentUsuarioId;
              const isTargetDono = usuario.role === 'dono';

              return (
                <tr
                  key={usuario.id}
                  className="border-b border-surface-border last:border-0"
                >
                  <td className="px-4 py-3.5 text-base font-medium text-primary-900">
                    {usuario.nome}
                    {isSelf && (
                      <span className="ml-2 text-sm text-primary-500">
                        (voce)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-base text-primary-700">
                    {usuario.email}
                  </td>
                  <td className="px-4 py-3.5">
                    {isDono && !isSelf && !isTargetDono ? (
                      <select
                        value={usuario.role}
                        onChange={(e) =>
                          handleRoleChange(
                            usuario.id,
                            e.target.value as UsuarioRole,
                          )
                        }
                        disabled={isPending}
                        className="rounded-md border border-surface-border bg-surface-card px-3 py-2 text-base min-h-[40px]"
                      >
                        <option value="admin">Gestor</option>
                        <option value="motorista">Motorista</option>
                      </select>
                    ) : (
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${ROLE_COLORS[usuario.role]}`}
                      >
                        {ROLE_LABELS[usuario.role]}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${
                        usuario.ativo
                          ? 'bg-alert-success-bg text-success'
                          : 'bg-alert-danger-bg text-badge-danger-fg'
                      }`}
                    >
                      {usuario.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-base text-primary-500">
                    {new Date(usuario.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3.5">
                    {!isSelf && !isTargetDono && (
                      <button
                        onClick={() =>
                          handleToggleAtivo(usuario.id, usuario.ativo)
                        }
                        disabled={isPending}
                        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors min-h-[40px] ${
                          usuario.ativo
                            ? 'text-danger hover:bg-alert-danger-bg'
                            : 'text-success hover:bg-alert-success-bg'
                        } disabled:opacity-50`}
                      >
                        {usuario.ativo && (
                          <svg className="h-4 w-4" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                        {usuario.ativo ? 'Desativar' : 'Reativar'}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {usuarios.length === 0 && (
        <div className="py-8 text-center">
          <p className="text-base text-primary-500">
            Nenhum usuário encontrado.
          </p>
          <p className="mt-1 text-sm text-text-muted">
            Convide usuarios para gerenciar o sistema.
          </p>
        </div>
      )}
    </div>
  );
}
