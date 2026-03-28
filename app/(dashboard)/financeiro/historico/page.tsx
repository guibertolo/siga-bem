import { Suspense } from 'react';
import Link from 'next/link';
import { getCurrentUsuario } from '@/lib/auth/get-user-role';
import { redirect } from 'next/navigation';
import {
  getFechamentosHistorico,
  getResumoFinanceiro,
  fetchFechamentoFilterOptions,
} from '@/app/(dashboard)/financeiro/historico/actions';
import { HistoricoFechamentos } from '@/components/financeiro/HistoricoFechamentos';
import { HistoricoFiltros } from '@/components/financeiro/HistoricoFiltros';
import { ResumoFinanceiro } from '@/components/financeiro/ResumoFinanceiro';
import type { FechamentoHistoricoFiltros } from '@/types/fechamento';

interface HistoricoPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function HistoricoPage({ searchParams }: HistoricoPageProps) {
  const params = await searchParams;
  const usuario = await getCurrentUsuario();

  if (!usuario) {
    redirect('/login');
  }

  const isMotorista = usuario.role === 'motorista';
  const isAdmin = usuario.role === 'dono' || usuario.role === 'admin';

  // Parse URL search params into typed filters
  const filtros: FechamentoHistoricoFiltros = {
    motorista_ids: typeof params.motoristaIds === 'string' && params.motoristaIds
      ? params.motoristaIds.split(',').filter(Boolean)
      : undefined,
    tipo: (params.tipo as FechamentoHistoricoFiltros['tipo']) ?? 'todos',
    status: (params.status as FechamentoHistoricoFiltros['status']) ?? 'todos',
    periodo_inicio: typeof params.periodoInicio === 'string' ? params.periodoInicio : undefined,
    periodo_fim: typeof params.periodoFim === 'string' ? params.periodoFim : undefined,
    busca: typeof params.busca === 'string' ? params.busca : undefined,
    pagina: typeof params.page === 'string' ? Math.max(1, parseInt(params.page, 10) || 1) : 1,
    pageSize: 20,
  };

  // Fetch data in parallel
  const [fechamentosResult, resumoResult, filterOptionsResult] = await Promise.all([
    getFechamentosHistorico(filtros),
    isAdmin ? getResumoFinanceiro() : Promise.resolve({ data: undefined }),
    isAdmin ? fetchFechamentoFilterOptions() : Promise.resolve({ data: undefined }),
  ]);

  const fechamentos = fechamentosResult.data?.fechamentos ?? [];
  const totalCount = fechamentosResult.data?.totalCount ?? 0;
  const resumo = resumoResult.data;
  const filterOptions = filterOptionsResult.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary-900">
            Historico de Fechamentos
          </h1>
          <p className="mt-1 text-sm text-primary-500">
            {isMotorista
              ? 'Consulte seus fechamentos financeiros'
              : 'Consulte e gerencie todos os fechamentos da empresa'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <Link
              href="/fechamentos/novo"
              className="rounded-md bg-primary-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-800"
            >
              Novo Fechamento
            </Link>
          )}
        </div>
      </div>

      {/* Summary cards (admin/dono only) */}
      {isAdmin && resumo && (
        <ResumoFinanceiro resumo={resumo} />
      )}

      {/* Filters */}
      <Suspense fallback={<div className="h-24 animate-pulse rounded-lg bg-gray-100" />}>
        <HistoricoFiltros
          showMotoristaFilter={isAdmin}
          filterOptions={filterOptions}
          currentFiltros={filtros}
        />
      </Suspense>

      {/* Error display */}
      {fechamentosResult.error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {fechamentosResult.error}
        </div>
      )}

      {/* Table + Pagination */}
      <HistoricoFechamentos
        fechamentos={fechamentos}
        totalCount={totalCount}
        currentPage={filtros.pagina}
        pageSize={filtros.pageSize}
        isAdmin={isAdmin}
        filtros={filtros}
      />
    </div>
  );
}
