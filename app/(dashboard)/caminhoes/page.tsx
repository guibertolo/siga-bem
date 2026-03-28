import Link from 'next/link';
import { redirect } from 'next/navigation';
import { listCaminhoes } from '@/app/(dashboard)/caminhoes/actions';
import { CaminhaoList } from '@/components/caminhoes/caminhao-list';

export default async function CaminhoesPage() {
  const result = await listCaminhoes();

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
        <h2 className="text-2xl font-bold text-primary-900">Caminhoes</h2>
        <Link
          href="/caminhoes/cadastro"
          className="rounded-lg bg-primary-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-800"
        >
          Novo Caminhao
        </Link>
      </div>

      {result.error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {result.error}
        </div>
      )}

      <CaminhaoList caminhoes={result.data ?? []} />
    </div>
  );
}
