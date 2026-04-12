'use client';

import { useState, useTransition } from 'react';
import type { UsuarioListItem, UsuarioRole } from '@/types/usuario';
import UsuarioList from '@/components/usuarios/usuario-list';
import { inviteUsuario } from '@/app/(dashboard)/usuarios/actions';

interface UsuariosClientPageProps {
  usuarios: UsuarioListItem[];
  currentUsuarioId: string;
  currentRole: UsuarioRole;
  error: string | null;
}

export default function UsuariosClientPage({
  usuarios,
  currentUsuarioId,
  currentRole,
  error,
}: UsuariosClientPageProps) {
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  function handleInviteSubmit(formData: FormData) {
    setInviteError(null);
    setInviteSuccess(false);

    const email = formData.get('email') as string;
    const nome = formData.get('nome') as string;
    const role = formData.get('role') as 'admin' | 'motorista';

    startTransition(async () => {
      const result = await inviteUsuario({ email, nome, role });
      if (result.error) {
        setInviteError(result.error);
      } else {
        setInviteSuccess(true);
        setTimeout(() => {
          setIsInviteOpen(false);
          setInviteSuccess(false);
        }, 2000);
      }
    });
  }

  function handleCancelInvite() {
    setIsInviteOpen(false);
    setInviteError(null);
    setInviteSuccess(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-primary-900">Usuarios</h2>
        {!isInviteOpen && (
          <button
            onClick={() => setIsInviteOpen(true)}
            className="rounded-md bg-btn-primary px-4 py-2 text-sm font-medium text-white hover:bg-btn-primary-hover"
          >
            Convidar Usuario
          </button>
        )}
      </div>

      {/* Inline invite form (expand/collapse) */}
      {isInviteOpen && (
        <div className="rounded-[--radius-card] border border-surface-border bg-surface-card p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-primary-900">
            Convidar Usuario
          </h3>
          <p className="mt-1 text-sm text-primary-500">
            O usuario recebera um email com link para criar sua conta.
          </p>

          {inviteError && (
            <div className="mt-3 rounded-md border border-danger/20 bg-alert-danger-bg p-3 text-sm text-danger">
              {inviteError}
            </div>
          )}

          {inviteSuccess && (
            <div className="mt-3 rounded-md border border-success/20 bg-alert-success-bg p-3 text-sm text-success">
              Convite enviado com sucesso!
            </div>
          )}

          <form action={handleInviteSubmit} className="mt-4 space-y-4">
            <div>
              <label
                htmlFor="invite-nome"
                className="block text-sm font-medium text-primary-700"
              >
                Nome
              </label>
              <input
                id="invite-nome"
                name="nome"
                type="text"
                required
                className="mt-1 w-full rounded-md border border-surface-border bg-surface-background px-3 py-2 text-sm text-primary-900 placeholder:text-text-muted focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="Nome completo"
              />
            </div>

            <div>
              <label
                htmlFor="invite-email"
                className="block text-sm font-medium text-primary-700"
              >
                Email
              </label>
              <input
                id="invite-email"
                name="email"
                type="email"
                required
                className="mt-1 w-full rounded-md border border-surface-border bg-surface-background px-3 py-2 text-sm text-primary-900 placeholder:text-text-muted focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="email@exemplo.com"
              />
            </div>

            <div>
              <label
                htmlFor="invite-role"
                className="block text-sm font-medium text-primary-700"
              >
                Role
              </label>
              <select
                id="invite-role"
                name="role"
                required
                className="mt-1 w-full rounded-md border border-surface-border bg-surface-background px-3 py-2 text-sm text-primary-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                {currentRole === 'dono' && (
                  <option value="admin">Gestor</option>
                )}
                <option value="motorista">Motorista</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleCancelInvite}
                className="rounded-md px-4 py-2 text-sm font-medium text-primary-700 hover:bg-surface-background"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="rounded-md bg-btn-primary px-4 py-2 text-sm font-medium text-white hover:bg-btn-primary-hover disabled:opacity-50"
              >
                {isPending ? 'Enviando...' : 'Enviar Convite'}
              </button>
            </div>
          </form>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-danger/20 bg-alert-danger-bg p-4 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="rounded-[--radius-card] border border-surface-border bg-surface-card shadow-sm">
        <UsuarioList
          usuarios={usuarios}
          currentUsuarioId={currentUsuarioId}
          currentRole={currentRole}
        />
      </div>
    </div>
  );
}
