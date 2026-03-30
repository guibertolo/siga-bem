'use client';

import { useState } from 'react';
import type { UsuarioListItem, UsuarioRole } from '@/types/usuario';
import UsuarioList from '@/components/usuarios/usuario-list';
import InviteModal from '@/components/usuarios/invite-modal';

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-primary-900">Usuarios</h2>
        <button
          onClick={() => setIsInviteOpen(true)}
          className="rounded-md bg-primary-700 px-4 py-2 text-sm font-medium text-white hover:bg-primary-800"
        >
          Convidar Usuario
        </button>
      </div>

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

      <InviteModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        currentRole={currentRole}
      />
    </div>
  );
}
