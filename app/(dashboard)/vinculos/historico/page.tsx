import Link from 'next/link';
import { redirect } from 'next/navigation';
import { listVinculos } from '@/app/(dashboard)/vinculos/actions';
import { VinculoList } from '@/components/vinculos/VinculoList';

export default async function HistoricoVinculosPage() {
  const result = await listVinculos();

  if (result.error === 'Não autenticado') {
    redirect('/login');
  }

  if (result.error === 'Permissão insuficiente') {
    return (
      <div className="w-full max-w-4xl">
        <p className="text-sm text-danger">Você não tem permissão para acessar esta página.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl">
      <div className="mb-6">
        <Link
          href="/vinculos"
          className="text-sm text-primary-500 transition-colors hover:text-primary-700"
        >
          &larr; Voltar para vínculos
        </Link>
        <h2 className="mt-2 text-2xl font-bold text-primary-900">Histórico de Vínculos</h2>
        <p className="mt-1 text-sm text-primary-500">
          Histórico completo de todas as vinculações entre motoristas e caminhões.
        </p>
      </div>

      {result.error && (
        <div className="mb-4 rounded-lg border border-danger/20 bg-alert-danger-bg p-4 text-sm text-danger">
          {result.error}
        </div>
      )}

      <VinculoList vinculos={result.data ?? []} />
    </div>
  );
}
