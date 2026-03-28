import Link from 'next/link';
import { redirect } from 'next/navigation';
import { listVinculos } from '@/app/(dashboard)/vinculos/actions';
import { VinculoList } from '@/components/vinculos/VinculoList';

export default async function VinculosPage() {
  const result = await listVinculos();

  if (result.error === 'Nao autenticado') {
    redirect('/login');
  }

  if (result.error === 'Permissao insuficiente') {
    return (
      <div className="mx-auto max-w-4xl">
        <p className="text-sm text-red-600">Voce nao tem permissao para acessar esta pagina.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary-900">Vinculos Motorista-Caminhao</h2>
          <p className="mt-1 text-sm text-primary-500">
            Gerencie a vinculacao entre motoristas e caminhoes.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/vinculos/historico"
            className="rounded-lg border border-surface-border px-4 py-2 text-sm font-medium text-primary-700 transition-colors hover:bg-surface-hover"
          >
            Historico
          </Link>
          <Link
            href="/vinculos/novo"
            className="rounded-lg bg-primary-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-800"
          >
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
