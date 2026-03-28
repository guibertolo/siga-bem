import { redirect } from 'next/navigation';
import Link from 'next/link';
import { listMotoristasAtivos, listCaminhoesPorMotorista, createViagem } from '@/app/(dashboard)/viagens/actions';
import { ViagemForm } from '@/components/viagens/ViagemForm';

export default async function NovaViagemPage() {
  const [motoristasResult, caminhoesResult] = await Promise.all([
    listMotoristasAtivos(),
    listCaminhoesPorMotorista(),
  ]);

  if (motoristasResult.error === 'Nao autenticado') {
    redirect('/login');
  }

  const motoristas = motoristasResult.data ?? [];
  const caminhoes = caminhoesResult.data ?? [];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <Link
          href="/viagens"
          className="text-sm text-primary-500 transition-colors hover:text-primary-700"
        >
          &larr; Voltar para Viagens
        </Link>
        <h2 className="mt-2 text-2xl font-bold text-primary-900">Nova Viagem</h2>
        <p className="mt-1 text-sm text-primary-500">
          Cadastre uma nova viagem para sua frota.
        </p>
      </div>

      <div className="rounded-lg border border-surface-border bg-surface-card p-6">
        <ViagemForm
          mode="create"
          motoristas={motoristas}
          caminhoes={caminhoes}
          onSubmit={createViagem}
        />
      </div>
    </div>
  );
}
