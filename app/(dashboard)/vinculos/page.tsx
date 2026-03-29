import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { listVinculos } from '@/app/(dashboard)/vinculos/actions';

export const metadata: Metadata = {
  title: 'Vinculos',
};
import { VinculoList } from '@/components/vinculos/VinculoList';

export default async function VinculosPage() {
  const result = await listVinculos();

  if (result.error === 'Nao autenticado') {
    redirect('/login');
  }

  if (result.error === 'Permissao insuficiente') {
    return (
      <div className="w-full max-w-4xl">
        <p className="text-sm text-red-600">Voce nao tem permissao para acessar esta pagina.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-primary-900">Vinculos Motorista-Caminhao</h2>
          <p className="mt-1 text-base text-primary-500">
            Gerencie a vinculacao entre motoristas e caminhoes.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/vinculos/historico"
            className="inline-flex items-center gap-2 rounded-lg border border-surface-border px-5 py-3 text-base font-semibold text-primary-700 transition-colors hover:bg-surface-hover min-h-[48px]"
          >
            Historico
          </Link>
          <Link
            href="/vinculos/novo"
            className="inline-flex items-center gap-2 rounded-lg bg-primary-700 px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-primary-800 min-h-[48px]"
          >
            <svg className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Novo Vinculo
          </Link>
        </div>
      </div>

      {result.error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {result.error}
        </div>
      )}

      <VinculoList vinculos={result.data ?? []} />
    </div>
  );
}
