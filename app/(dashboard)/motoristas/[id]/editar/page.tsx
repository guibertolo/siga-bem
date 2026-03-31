import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getMotorista } from '@/app/(dashboard)/motoristas/actions';
import { EditarMotoristaClient } from '@/components/motoristas/editar-motorista-client';

interface EditarMotoristaPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditarMotoristaPage({ params }: EditarMotoristaPageProps) {
  const { id } = await params;

  const result = await getMotorista(id);

  if (!result.success) {
    if (result.error === 'Usuário não autenticado') {
      redirect('/login');
    }
    notFound();
  }

  return (
    <div className="w-full max-w-3xl">
      <div className="mb-6">
        <Link
          href={`/motoristas/${id}`}
          className="inline-flex items-center gap-2 rounded-lg border border-surface-border px-5 py-3 text-base font-semibold text-primary-700 transition-colors hover:bg-surface-hover min-h-[48px]"
        >
          <svg className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Voltar
        </Link>
        <h2 className="mt-4 text-2xl sm:text-3xl font-bold text-primary-900">Editar Motorista</h2>
        <p className="mt-1 text-base text-primary-500">
          Altere os dados do motorista.
        </p>
      </div>

      <div className="rounded-xl border border-surface-border bg-surface-card p-6 shadow-sm">
        <EditarMotoristaClient motorista={result.motorista!} />
      </div>
    </div>
  );
}
