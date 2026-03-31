import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createVinculo, getActiveMotoristas, getActiveCaminhoes } from '@/app/(dashboard)/vinculos/actions';
import { VinculoForm } from '@/components/vinculos/VinculoForm';

export default async function NovoVinculoPage() {
  const [motoristasResult, caminhoesResult] = await Promise.all([
    getActiveMotoristas(),
    getActiveCaminhoes(),
  ]);

  if (motoristasResult.error === 'Não autenticado' || caminhoesResult.error === 'Não autenticado') {
    redirect('/login');
  }

  if (motoristasResult.error === 'Permissão insuficiente' || caminhoesResult.error === 'Permissão insuficiente') {
    return (
      <div className="w-full max-w-4xl">
        <p className="text-sm text-danger">Você não tem permissão para acessar esta página.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl">
      <div className="mb-6">
        <Link
          href="/vinculos"
          className="inline-flex items-center gap-2 rounded-lg border border-surface-border px-5 py-3 text-base font-semibold text-primary-700 transition-colors hover:bg-surface-hover min-h-[48px]"
        >
          <svg className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Voltar
        </Link>
        <h2 className="mt-4 text-2xl sm:text-3xl font-bold text-primary-900">Novo Vinculo</h2>
        <p className="mt-1 text-base text-primary-500">
          Vincule um motorista a um caminhao. Um caminhao pode ter mais de um motorista
          vinculado (turnos, revezamento).
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
