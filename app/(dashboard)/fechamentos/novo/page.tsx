import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUsuario } from '@/lib/auth/get-user-role';
import { listMotoristasParaFechamento } from '@/app/(dashboard)/fechamentos/actions';
import { FechamentoForm } from '@/components/fechamentos/FechamentoForm';

export default async function NovoFechamentoPage() {
  const usuario = await getCurrentUsuario();

  if (!usuario) {
    redirect('/login');
  }

  // Only dono/admin can create fechamentos
  if (usuario.role === 'motorista') {
    redirect('/fechamentos');
  }

  const motoristasResult = await listMotoristasParaFechamento();

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <Link
          href="/fechamentos"
          className="inline-flex items-center gap-2 rounded-lg border border-surface-border px-5 py-3 text-base font-semibold text-primary-700 transition-colors hover:bg-surface-hover min-h-[48px]"
        >
          <svg className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Voltar
        </Link>
        <h2 className="mt-4 text-2xl sm:text-3xl font-bold text-primary-900">Novo Fechamento</h2>
      </div>

      {motoristasResult.error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Erro ao carregar motoristas: {motoristasResult.error}
        </div>
      )}

      <FechamentoForm motoristas={motoristasResult.data ?? []} />
    </div>
  );
}
