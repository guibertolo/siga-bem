import Link from 'next/link';
import { redirect } from 'next/navigation';
import { listVinculos } from '@/app/(dashboard)/vinculos/actions';
import { VinculoList } from '@/components/vinculos/VinculoList';

export default async function HistoricoVinculosPage() {
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
      <div className="mb-6">
        <Link
          href="/vinculos"
          className="text-sm text-primary-500 transition-colors hover:text-primary-700"
        >
          &larr; Voltar para vinculos
        </Link>
        <h2 className="mt-2 text-2xl font-bold text-primary-900">Historico de Vinculos</h2>
        <p className="mt-1 text-sm text-primary-500">
          Historico completo de todas as vinculacoes entre motoristas e caminhoes.
        </p>
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
