import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUsuario } from '@/lib/auth/get-user-role';
import { getMultiEmpresaContext } from '@/lib/queries/multi-empresa';
import { getUserEmpresas } from '@/lib/queries/empresas';
import {
  listCategorias,
  listMotoristasAtivos,
  listCaminhoesAtivos,
  listViagensAtivas,
  createGasto,
} from '@/app/(dashboard)/gastos/actions';
import { GastoForm } from '@/components/gastos/GastoForm';
import { EmpresaSelectForCreate } from '@/components/empresa/EmpresaSelectForCreate';

interface NovoGastoPageProps {
  searchParams: Promise<{ viagemId?: string }>;
}

export default async function NovoGastoPage({ searchParams }: NovoGastoPageProps) {
  const [usuario, multiCtx] = await Promise.all([
    getCurrentUsuario(),
    getMultiEmpresaContext(),
  ]);

  if (!usuario) {
    redirect('/login');
  }

  const empresas = multiCtx.isMultiEmpresa ? await getUserEmpresas() : [];
  const { viagemId } = await searchParams;

  const [categoriasResult, motoristasResult, caminhoesResult, viagensResult] = await Promise.all([
    listCategorias(),
    listMotoristasAtivos(),
    listCaminhoesAtivos(),
    listViagensAtivas(),
  ]);

  // Determine if motorista role -> pre-fill and lock motorista_id
  const isMotorista = usuario.role === 'motorista';
  const motoristaFixo = isMotorista
    ? (motoristasResult.data?.[0]?.id ?? null)
    : (motoristasResult.data?.length === 1 ? motoristasResult.data[0].id : null);

  return (
    <div className="w-full max-w-3xl">
      <div className="mb-6">
        <Link
          href={viagemId ? `/viagens/${viagemId}` : '/gastos'}
          className="inline-flex items-center gap-2 rounded-lg border border-surface-border px-5 py-3 text-base font-semibold text-primary-700 transition-colors hover:bg-surface-hover min-h-[48px]"
        >
          <svg className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Voltar
        </Link>
        <h2 className="mt-4 text-2xl sm:text-3xl font-bold text-primary-900">Novo Gasto</h2>
      </div>

      {multiCtx.isMultiEmpresa && multiCtx.activeEmpresaId && (
        <EmpresaSelectForCreate
          empresas={empresas}
          activeEmpresaId={multiCtx.activeEmpresaId}
        />
      )}

      {categoriasResult.error && (
        <div className="mb-4 rounded-lg border border-danger/20 bg-alert-danger-bg p-4 text-sm text-danger">
          Erro ao carregar categorias: {categoriasResult.error}
        </div>
      )}

      <GastoForm
        mode="create"
        categorias={categoriasResult.data ?? []}
        motoristas={motoristasResult.data ?? []}
        caminhoes={caminhoesResult.data ?? []}
        viagens={viagensResult.data ?? []}
        viagemIdInicial={viagemId ?? null}
        motoristaFixo={motoristaFixo}
        empresaId={multiCtx.activeEmpresaId ?? usuario.empresa_id}
        onSubmit={createGasto}
      />
    </div>
  );
}
