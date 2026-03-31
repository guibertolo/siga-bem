'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { atualizarPerfil } from '@/app/(dashboard)/perfil/actions';
import type { UsuarioRole } from '@/types/usuario';

const roleLabel: Record<UsuarioRole, string> = {
  dono: 'Proprietario',
  motorista: 'Motorista',
  admin: 'Gestor',
};

interface DadosPerfilProps {
  nome: string;
  email: string;
  telefone: string | null;
  role: UsuarioRole;
  empresaNome: string | null;
}

export function DadosPerfil({ nome, email, telefone, role, empresaNome }: DadosPerfilProps) {
  const router = useRouter();
  const isMotorista = role === 'motorista';
  const canEdit = !isMotorista;

  const [nomeValue, setNomeValue] = useState(nome);
  const [telefoneValue, setTelefoneValue] = useState(telefone ?? '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function handleSave() {
    setLoading(true);
    setMessage(null);

    const formData = new FormData();
    formData.set('nome', nomeValue);
    formData.set('telefone', telefoneValue);

    const result = await atualizarPerfil(formData);

    if (result.error) {
      setMessage({ type: 'error', text: result.error });
    } else {
      setMessage({ type: 'success', text: 'Dados atualizados com sucesso!' });
      router.refresh();
    }

    setLoading(false);
  }

  const inputReadonlyClasses =
    'w-full h-12 rounded-default border border-surface-border px-4 text-base text-primary-900 bg-surface-muted cursor-not-allowed';
  const inputEditableClasses =
    'w-full h-12 rounded-default border border-surface-border px-4 text-base text-primary-900 bg-surface-input outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors';

  return (
    <div className="bg-surface-card rounded-card p-6 shadow-sm">
      <h2 className="text-lg font-bold text-primary-900 mb-6">Meus Dados</h2>

      <div className="grid gap-4">
        {/* Nome */}
        <div>
          <label htmlFor="perfil-nome" className="block text-sm font-medium text-primary-700 mb-1">
            Nome
          </label>
          {canEdit ? (
            <input
              id="perfil-nome"
              type="text"
              value={nomeValue}
              onChange={(e) => setNomeValue(e.target.value)}
              className={inputEditableClasses}
            />
          ) : (
            <p className={inputReadonlyClasses + ' flex items-center'}>{nome}</p>
          )}
        </div>

        {/* Email — always readonly */}
        <div>
          <label htmlFor="perfil-email" className="block text-sm font-medium text-primary-700 mb-1">
            Email
          </label>
          <p className={inputReadonlyClasses + ' flex items-center'}>{email}</p>
        </div>

        {/* Telefone */}
        <div>
          <label htmlFor="perfil-telefone" className="block text-sm font-medium text-primary-700 mb-1">
            Telefone
          </label>
          {canEdit ? (
            <input
              id="perfil-telefone"
              type="text"
              value={telefoneValue}
              onChange={(e) => setTelefoneValue(e.target.value)}
              placeholder="(00) 00000-0000"
              className={inputEditableClasses}
            />
          ) : (
            <p className={inputReadonlyClasses + ' flex items-center'}>
              {telefone || 'Nao informado'}
            </p>
          )}
        </div>

        {/* Role */}
        <div>
          <label className="block text-sm font-medium text-primary-700 mb-1">Funcao</label>
          <span className="inline-block px-3 py-1.5 rounded-full text-sm font-semibold bg-primary-100 text-primary-700">
            {roleLabel[role]}
          </span>
        </div>

        {/* Empresa */}
        {empresaNome && (
          <div>
            <label className="block text-sm font-medium text-primary-700 mb-1">Empresa</label>
            <p className={inputReadonlyClasses + ' flex items-center'}>{empresaNome}</p>
          </div>
        )}
      </div>

      {/* Messages */}
      {message && (
        <div
          className={`mt-4 rounded-default p-3 text-sm ${
            message.type === 'success'
              ? 'bg-alert-success-bg text-success'
              : 'bg-alert-danger-bg text-danger'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Save button for dono/admin */}
      {canEdit && (
        <button
          type="button"
          onClick={handleSave}
          disabled={loading}
          className="mt-6 flex items-center justify-center gap-2 px-6 h-12 rounded-default bg-btn-primary text-white text-base font-semibold border-none cursor-pointer hover:bg-btn-primary-hover focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors disabled:bg-surface-border disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            'Salvando...'
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              Salvar Alteracoes
            </>
          )}
        </button>
      )}
    </div>
  );
}
