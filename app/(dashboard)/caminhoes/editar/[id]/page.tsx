import { redirect, notFound } from 'next/navigation';
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
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-primary-900">Editar Caminhao</h2>
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
