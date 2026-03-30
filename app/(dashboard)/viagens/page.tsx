import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { listViagens, listMotoristasAtivos } from '@/app/(dashboard)/viagens/actions';
import { getCurrentUsuario } from '@/lib/auth/get-user-role';
import { ViagemList } from '@/components/viagens/ViagemList';

export const metadata: Metadata = {
  title: 'Viagens',
};

export default async function ViagensPage() {
  const [viagensResult, motoristasResult, currentUsuario] = await Promise.all([
    listViagens({ page: 1, pageSize: 20 }),
    listMotoristasAtivos(),
    getCurrentUsuario(),
  ]);

  if (viagensResult.error === 'Nao autenticado' || motoristasResult.error === 'Nao autenticado') {
    redirect('/login');
  }

  const viagens = viagensResult.data ?? [];
  const total = viagensResult.total;
  const motoristas = motoristasResult.data ?? [];
  const isMotorista = currentUsuario?.role === 'motorista';

  return (
    <div className="w-full max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-primary-900">
            {isMotorista ? 'Minhas Viagens' : 'Viagens'}
          </h2>
          <p className="mt-1 text-base text-primary-500">
            {isMotorista ? 'Veja suas viagens e registre gastos.' : 'Gerencie as viagens da sua frota.'}
          </p>
        </div>
        <Link
          href="/viagens/nova"
          className="inline-flex items-center gap-2 rounded-lg bg-primary-700 px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-primary-800 min-h-[48px]"
        >
          <svg className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nova Viagem
        </Link>
      </div>

      <ViagemList
        viagens={viagens}
        total={total}
        motoristas={motoristas}
        initialPage={1}
        isMotorista={isMotorista}
      />
    </div>
  );
}
