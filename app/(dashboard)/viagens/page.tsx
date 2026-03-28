import { redirect } from 'next/navigation';
import Link from 'next/link';
import { listViagens, listMotoristasAtivos } from '@/app/(dashboard)/viagens/actions';
import { ViagemList } from '@/components/viagens/ViagemList';

export default async function ViagensPage() {
  const [viagensResult, motoristasResult] = await Promise.all([
    listViagens({ page: 1, pageSize: 20 }),
    listMotoristasAtivos(),
  ]);

  if (viagensResult.error === 'Nao autenticado' || motoristasResult.error === 'Nao autenticado') {
    redirect('/login');
  }

  const viagens = viagensResult.data ?? [];
  const total = viagensResult.total;
  const motoristas = motoristasResult.data ?? [];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary-900">Viagens</h2>
          <p className="mt-1 text-sm text-primary-500">
            Gerencie as viagens da sua frota.
          </p>
        </div>
        <Link
          href="/viagens/nova"
          className="rounded-lg bg-primary-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-800"
        >
          Nova Viagem
        </Link>
      </div>

      <ViagemList
        viagens={viagens}
        total={total}
        motoristas={motoristas}
        initialPage={1}
      />
    </div>
  );
}
