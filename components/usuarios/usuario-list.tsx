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
  admin: 'Admin',
  motorista: 'Motorista',
};

const ROLE_COLORS: Record<UsuarioRole, string> = {
  dono: 'bg-amber-100 text-amber-800',
  admin: 'bg-blue-100 text-blue-800',
  motorista: 'bg-green-100 text-green-800',
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
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-surface-border">
              <th className="px-4 py-3 font-medium text-primary-500">Nome</th>
              <th className="px-4 py-3 font-medium text-primary-500">Email</th>
              <th className="px-4 py-3 font-medium text-primary-500">Role</th>
              <th className="px-4 py-3 font-medium text-primary-500">
                Status
              </th>
              <th className="px-4 py-3 font-medium text-primary-500">
                Cadastro
              </th>
              <th className="px-4 py-3 font-medium text-primary-500">Acoes</th>
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
                  <td className="px-4 py-3 font-medium text-primary-900">
                    {usuario.nome}
                    {isSelf && (
                      <span className="ml-2 text-xs text-primary-500">
                        (voce)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-primary-700">
                    {usuario.email}
                  </td>
                  <td className="px-4 py-3">
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
                        className="rounded-md border border-surface-border bg-surface-card px-2 py-1 text-sm"
                      >
                        <option value="admin">Admin</option>
                        <option value="motorista">Motorista</option>
                      </select>
                    ) : (
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_COLORS[usuario.role]}`}
                      >
                        {ROLE_LABELS[usuario.role]}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        usuario.ativo
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {usuario.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-primary-500">
                    {new Date(usuario.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3">
                    {!isSelf && !isTargetDono && (
                      <button
                        onClick={() =>
                          handleToggleAtivo(usuario.id, usuario.ativo)
                        }
                        disabled={isPending}
                        className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                          usuario.ativo
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        } disabled:opacity-50`}
                      >
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
        <p className="py-8 text-center text-sm text-primary-500">
          Nenhum usuario encontrado.
        </p>
      )}
    </div>
  );
}
