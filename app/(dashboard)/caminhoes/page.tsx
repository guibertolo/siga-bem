import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUsuario } from '@/lib/auth/get-user-role';
import { listCaminhoes } from '@/app/(dashboard)/caminhoes/actions';

export const metadata: Metadata = {
  title: 'Caminhões',
};
import { CaminhaoList } from '@/components/caminhoes/caminhao-list';

export default async function CaminhoesPage() {
  const usuario = await getCurrentUsuario();
  if (!usuario) redirect('/login');
  if (usuario.role === 'motorista') redirect('/dashboard');

  const result = await listCaminhoes();

  if (result.error === 'Não autenticado') {
    redirect('/login');
  }

  return (
    <div className="w-full max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl sm:text-3xl font-bold text-primary-900">Caminhões</h2>
        <Link
          href="/caminhoes/cadastro"
          className="inline-flex items-center gap-2 rounded-lg bg-btn-primary px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-btn-primary-hover min-h-[48px]"
        >
          <svg className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Novo Caminhão
        </Link>
      </div>

      {result.error && (
        <div className="mb-4 rounded-lg border border-danger/20 bg-alert-danger-bg p-4 text-sm text-danger">
          {result.error}
        </div>
      )}

      <CaminhaoList caminhoes={result.data ?? []} />
    </div>
  );
}
