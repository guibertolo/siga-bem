'use client';

import { useState, useTransition } from 'react';
import { inviteUsuario } from '@/app/(dashboard)/usuarios/actions';
import type { UsuarioRole } from '@/types/usuario';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRole: UsuarioRole;
}

export default function InviteModal({ isOpen, onClose, currentRole }: InviteModalProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(false);

    const email = formData.get('email') as string;
    const nome = formData.get('nome') as string;
    const role = formData.get('role') as 'admin' | 'motorista';

    startTransition(async () => {
      const result = await inviteUsuario({ email, nome, role });
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        setTimeout(() => {
          onClose();
          setSuccess(false);
        }, 2000);
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-[--radius-card] border border-surface-border bg-surface-card p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-primary-900">
          Convidar Usuario
        </h3>
        <p className="mt-1 text-sm text-primary-500">
          O usuario recebera um email com link para criar sua conta.
        </p>

        {error && (
          <div className="mt-3 rounded-md border border-danger/20 bg-alert-danger-bg p-3 text-sm text-danger">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-3 rounded-md border border-success/20 bg-alert-success-bg p-3 text-sm text-success">
            Convite enviado com sucesso!
          </div>
        )}

        <form action={handleSubmit} className="mt-4 space-y-4">
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
              onClick={onClose}
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
    </div>
  );
}
