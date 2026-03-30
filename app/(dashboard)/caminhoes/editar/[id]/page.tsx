import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getCaminhao } from '@/app/(dashboard)/caminhoes/actions';
import { EditarCaminhaoClient } from '@/components/caminhoes/editar-caminhao-client';

interface EditarCaminhaoPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditarCaminhaoPage({ params }: EditarCaminhaoPageProps) {
  const { id } = await params;

  const result = await getCaminhao(id);

  if (!result.success) {
    if (result.error === 'Nao autenticado') {
      redirect('/login');
    }
    notFound();
  }

  return (
    <div className="w-full max-w-3xl">
      <div className="mb-6">
        <Link
          href={`/caminhoes/${id}`}
          className="inline-flex items-center gap-2 rounded-lg border border-surface-border px-5 py-3 text-base font-semibold text-primary-700 transition-colors hover:bg-surface-hover min-h-[48px]"
        >
          <svg className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Voltar
        </Link>
        <h2 className="mt-4 text-2xl font-bold text-primary-900">Editar Caminhao</h2>
        <p className="mt-1 text-sm text-primary-500">
          Altere os dados do caminhao.
        </p>
      </div>

      <div className="rounded-xl border border-surface-border bg-surface-card p-6 shadow-sm">
        <EditarCaminhaoClient caminhao={result.caminhao!} />
      </div>
    </div>
  );
}
