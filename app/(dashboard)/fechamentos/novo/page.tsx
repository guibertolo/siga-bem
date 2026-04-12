import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUsuario } from '@/lib/auth/get-user-role';
import { getMultiEmpresaContext } from '@/lib/queries/multi-empresa';
import { getUserEmpresas } from '@/lib/queries/empresas';
import { listMotoristasParaFechamento, getViagensPendentesAcerto } from '@/app/(dashboard)/fechamentos/actions';
import { FechamentoForm } from '@/components/fechamentos/FechamentoForm';
import { EmpresaSelectForCreate } from '@/components/empresa/EmpresaSelectForCreate';

export default async function NovoFechamentoPage({
  searchParams,
}: {
  searchParams: Promise<{ motorista_id?: string; data_inicio?: string; data_fim?: string; auto_periodo?: string }>;
}) {
  const [usuario, multiCtx] = await Promise.all([
    getCurrentUsuario(),
    getMultiEmpresaContext(),
  ]);

  if (!usuario) {
    redirect('/login');
  }

  const empresas = multiCtx.isMultiEmpresa ? await getUserEmpresas() : [];

  // Only dono/admin can create fechamentos
  if (usuario.role === 'motorista') {
    redirect('/fechamentos');
  }

  const { motorista_id: motoristaIdParam, data_inicio, data_fim, auto_periodo } = await searchParams;
  const motoristasResult = await listMotoristasParaFechamento();

  // When auto_periodo=true and motorista_id is provided, fetch pending viagens
  // and calculate the period from oldest to newest data_saida
  let autoPeriodoInicio: string | undefined;
  let autoPeriodoFim: string | undefined;
  let viagensPendentes: Array<{ id: string; origem: string; destino: string; data_saida: string; valor_total: number }> | undefined;

  if (auto_periodo === 'true' && motoristaIdParam) {
    const pendentesResult = await getViagensPendentesAcerto();
    if (pendentesResult.data && pendentesResult.data.length > 0) {
      // Filter viagens for this specific motorista
      const viagensDoMotorista = pendentesResult.data.filter(
        (v) => v.motorista_id === motoristaIdParam,
      );

      if (viagensDoMotorista.length > 0) {
        // Extract YYYY-MM-DD dates and sort
        const datas = viagensDoMotorista.map((v) => v.data_saida.split('T')[0]).sort();
        autoPeriodoInicio = datas[0];
        autoPeriodoFim = datas[datas.length - 1];

        viagensPendentes = viagensDoMotorista
          .sort((a, b) => a.data_saida.localeCompare(b.data_saida))
          .map((v) => ({
            id: v.id,
            origem: v.origem,
            destino: v.destino,
            data_saida: v.data_saida.split('T')[0],
            valor_total: v.valor_total,
          }));
      }
    }
  }

  return (
    <div className="w-full max-w-3xl">
      <div className="mb-6">
        <Link
          href="/fechamentos"
          className="inline-flex items-center gap-2 rounded-lg border border-surface-border px-5 py-3 text-base font-semibold text-primary-700 transition-colors hover:bg-surface-hover min-h-[48px]"
        >
          <svg className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Voltar
        </Link>
        <h2 className="mt-4 text-2xl sm:text-3xl font-bold text-primary-900">Novo Acerto de Contas</h2>
      </div>

      {multiCtx.isMultiEmpresa && multiCtx.activeEmpresaId && (
        <EmpresaSelectForCreate
          empresas={empresas}
          activeEmpresaId={multiCtx.activeEmpresaId}
        />
      )}

      {motoristasResult.error && (
        <div className="mb-4 rounded-lg border border-danger/20 bg-alert-danger-bg p-4 text-sm text-danger">
          Erro ao carregar motoristas: {motoristasResult.error}
        </div>
      )}

      <FechamentoForm
        motoristas={motoristasResult.data ?? []}
        initialMotoristaId={motoristaIdParam}
        initialDataInicio={data_inicio}
        initialDataFim={data_fim}
        autoPeriodo={auto_periodo === 'true'}
        autoPeriodoInicio={autoPeriodoInicio}
        autoPeriodoFim={autoPeriodoFim}
        viagensPendentes={viagensPendentes}
      />
    </div>
  );
}
