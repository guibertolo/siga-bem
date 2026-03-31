import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { listViagens, listMotoristasAtivos } from '@/app/(dashboard)/viagens/actions';
import { getCurrentUsuario } from '@/lib/auth/get-user-role';
import { getMultiEmpresaContext } from '@/lib/queries/multi-empresa';
import { queryMultiEmpresa, flattenMultiResults } from '@/lib/queries/multi-empresa-query';
import { listViagensForEmpresa } from '@/app/(dashboard)/viagens/multi-actions';
import { ViagemList } from '@/components/viagens/ViagemList';
import type { ViagemListItem } from '@/types/viagem';

export const metadata: Metadata = {
  title: 'Viagens',
};

export default async function ViagensPage() {
  const [currentUsuario, multiCtx] = await Promise.all([
    getCurrentUsuario(),
    getMultiEmpresaContext(),
  ]);

  const isMultiEmpresa = multiCtx.isMultiEmpresa;
  const isMotorista = currentUsuario?.role === 'motorista';

  let viagens: ViagemListItem[] = [];
  let total = 0;

  if (isMultiEmpresa) {
    // Multi-empresa: use admin client with explicit empresa_id filter
    const results = await queryMultiEmpresa((admin, eid) =>
      listViagensForEmpresa(admin, eid),
    );

    const flattened = flattenMultiResults(
      results.map((r) => ({
        empresaId: r.empresaId,
        empresaName: r.empresaName,
        data: r.data.data,
      })),
    );

    // Sort by data_saida descending
    flattened.sort((a, b) =>
      new Date(b.data_saida).getTime() - new Date(a.data_saida).getTime(),
    );

    viagens = flattened;
    total = flattened.length;
  } else {
    const viagensResult = await listViagens({ page: 1, pageSize: 20 });
    if (viagensResult.error === 'Nao autenticado') {
      redirect('/login');
    }
    viagens = viagensResult.data ?? [];
    total = viagensResult.total;
  }

  const motoristasResult = await listMotoristasAtivos();
  if (motoristasResult.error === 'Nao autenticado') {
    redirect('/login');
  }
  const motoristas = motoristasResult.data ?? [];

  return (
    <div className="w-full max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-primary-900">
            {isMotorista ? 'Minhas Viagens' : 'Viagens'}
          </h2>
          <p className="mt-1 text-base text-primary-500">
            {isMotorista
              ? 'Veja suas viagens e registre gastos.'
              : isMultiEmpresa
                ? `Visualizando viagens de ${multiCtx.empresaIds.length} empresas.`
                : 'Gerencie as viagens da sua frota.'}
          </p>
        </div>
        <Link
          href="/viagens/nova"
          className="inline-flex items-center gap-2 rounded-lg bg-btn-primary px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-btn-primary-hover min-h-[48px]"
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
        isMultiEmpresa={isMultiEmpresa}
      />
    </div>
  );
}
