import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import {
  getViagem,
  updateViagem,
  listMotoristasAtivos,
  listCaminhoesPorMotorista,
} from '@/app/(dashboard)/viagens/actions';
import { ViagemForm } from '@/components/viagens/ViagemForm';
import type { ViagemFormData } from '@/types/viagem';

export default async function EditarViagemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [viagemResult, motoristasResult] = await Promise.all([
    getViagem(id),
    listMotoristasAtivos(),
  ]);

  if (!viagemResult.success) {
    if (viagemResult.error === 'Nao autenticado') {
      redirect('/login');
    }
    notFound();
  }

  const viagem = viagemResult.viagem!;

  // Check if editable (AC6)
  if (viagem.status !== 'planejada' && viagem.status !== 'em_andamento') {
    redirect(`/viagens/${id}`);
  }

  // Load caminhoes for the current motorista
  const caminhoesResult = await listCaminhoesPorMotorista(viagem.motorista_id);

  const motoristas = motoristasResult.data ?? [];
  const caminhoes = caminhoesResult.data ?? [];

  async function handleUpdate(formData: ViagemFormData) {
    'use server';
    return updateViagem(id, formData);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <Link
          href={`/viagens/${id}`}
          className="text-sm text-primary-500 transition-colors hover:text-primary-700"
        >
          &larr; Voltar para Detalhes
        </Link>
        <h2 className="mt-2 text-2xl font-bold text-primary-900">Editar Viagem</h2>
        <p className="mt-1 text-sm text-primary-500">
          {viagem.origem} &rarr; {viagem.destino}
        </p>
      </div>

      <div className="rounded-lg border border-surface-border bg-surface-card p-6">
        <ViagemForm
          mode="edit"
          viagem={viagem}
          motoristas={motoristas}
          caminhoes={caminhoes}
          onSubmit={handleUpdate}
        />
      </div>
    </div>
  );
}
