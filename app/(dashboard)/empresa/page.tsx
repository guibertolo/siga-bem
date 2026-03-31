import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUsuario } from '@/lib/auth/get-user-role';
import { getUserEmpresas } from '@/lib/queries/empresas';
import { getEmpresa } from '@/app/(dashboard)/empresa/actions';
import { EmpresaSwitchButton } from '@/components/empresa/EmpresaSwitchButton';

export const metadata: Metadata = {
  title: 'Minhas Empresas',
};

export default async function EmpresaPage() {
  const usuario = await getCurrentUsuario();
  if (!usuario) redirect('/login');
  if (usuario.role === 'motorista') redirect('/dashboard');

  const [empresas, empresaAtiva] = await Promise.all([
    getUserEmpresas(),
    getEmpresa(),
  ]);

  if (empresas.length === 0) {
    redirect('/empresa/cadastro');
  }

  return (
    <div className="w-full max-w-4xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-primary-900">Minhas Empresas</h2>
          <p className="mt-1 text-base text-primary-500">
            {empresas.length} {empresas.length === 1 ? 'empresa cadastrada' : 'empresas cadastradas'}
          </p>
        </div>
        <Link
          href="/empresa/nova"
          className="inline-flex items-center gap-2 rounded-lg bg-btn-primary px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-btn-primary-hover min-h-[48px]"
        >
          <svg className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Novo CNPJ
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {empresas.map((emp) => {
          const isAtiva = emp.is_active;
          return (
            <div
              key={emp.empresa_id}
              className={`rounded-xl border-2 bg-surface-card p-5 shadow-sm transition-colors ${
                isAtiva
                  ? 'border-success'
                  : 'border-surface-border'
              }`}
            >
              {/* Badge ativa */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <p className="text-lg font-bold text-primary-900 truncate">
                    {emp.nome_fantasia || emp.razao_social}
                  </p>
                  {emp.nome_fantasia && (
                    <p className="text-sm text-primary-500 truncate">{emp.razao_social}</p>
                  )}
                </div>
                {isAtiva && (
                  <span className="shrink-0 ml-2 inline-flex items-center rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
                    Ativa
                  </span>
                )}
              </div>

              {/* CNPJ */}
              <p className="text-base font-mono text-primary-700 mb-3">{emp.cnpj}</p>

              {/* Role */}
              <p className="text-sm text-primary-500 mb-4">
                Seu papel: <span className="font-medium text-primary-700">{emp.role === 'dono' ? 'Proprietario' : 'Gestor'}</span>
              </p>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                {isAtiva ? (
                  <Link
                    href="/empresa/editar"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-surface-border px-4 py-2.5 text-sm font-medium text-primary-700 transition-colors hover:bg-surface-hover min-h-[44px]"
                  >
                    <svg className="h-4 w-4" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Editar
                  </Link>
                ) : (
                  <EmpresaSwitchButton empresaId={emp.empresa_id} label="Acessar" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
