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
    <div className="w-full max-w-3xl">
      <div className="mb-6">
        <Link
          href="/viagens"
          className="inline-flex items-center gap-2 rounded-lg border border-surface-border px-5 py-3 text-base font-semibold text-primary-700 transition-colors hover:bg-surface-hover min-h-[48px]"
        >
          <svg className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Voltar
        </Link>
        <h2 className="mt-4 text-2xl sm:text-3xl font-bold text-primary-900">Nova Viagem</h2>
        <p className="mt-1 text-base text-primary-500">
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
