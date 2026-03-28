import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createVinculo, getActiveMotoristas, getActiveCaminhoes } from '@/app/(dashboard)/vinculos/actions';
import { VinculoForm } from '@/components/vinculos/VinculoForm';

export default async function NovoVinculoPage() {
  const [motoristasResult, caminhoesResult] = await Promise.all([
    getActiveMotoristas(),
    getActiveCaminhoes(),
  ]);

  if (motoristasResult.error === 'Nao autenticado' || caminhoesResult.error === 'Nao autenticado') {
    redirect('/login');
  }

  if (motoristasResult.error === 'Permissao insuficiente' || caminhoesResult.error === 'Permissao insuficiente') {
    return (
      <div className="mx-auto max-w-4xl">
        <p className="text-sm text-red-600">Voce nao tem permissao para acessar esta pagina.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <Link
          href="/vinculos"
          className="text-sm text-primary-500 transition-colors hover:text-primary-700"
        >
          &larr; Voltar para vinculos
        </Link>
        <h2 className="mt-2 text-2xl font-bold text-primary-900">Novo Vinculo</h2>
        <p className="mt-1 text-sm text-primary-500">
          Vincule um motorista a um caminhao. Se o caminhao ja tiver um vinculo ativo,
          ele sera encerrado automaticamente.
        </p>
      </div>

      <div className="rounded-lg border border-surface-border bg-surface-card p-6">
        <VinculoForm
          motoristas={motoristasResult.data ?? []}
          caminhoes={caminhoesResult.data ?? []}
          onSubmit={createVinculo}
        />
      </div>
    </div>
  );
}
