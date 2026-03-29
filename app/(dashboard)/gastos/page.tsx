import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import {
  listGastosFiltered,
  fetchFilterOptions,
} from '@/app/(dashboard)/gastos/actions';
import { getCurrentUsuario } from '@/lib/auth/get-user-role';
import { GastoFilters } from '@/components/gastos/GastoFilters';
import { GastoTable } from '@/components/gastos/GastoTable';
import { GastoPagination } from '@/components/gastos/GastoPagination';
import { GastoSummary } from '@/components/gastos/GastoSummary';
import { GastoExportButton } from '@/components/gastos/GastoExportButton';
import type { GastoFilters as GastoFiltersType } from '@/types/gasto';

const PAGE_SIZE = 20;

interface GastosPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function GastosPage({ searchParams }: GastosPageProps) {
  const usuario = await getCurrentUsuario();

  if (!usuario) {
    redirect('/login');
  }

  const params = await searchParams;

  // Parse filters from URL searchParams
  const filters: GastoFiltersType = {
    motoristaIds: parseCommaSeparated(params.motoristaIds),
    caminhaoIds: parseCommaSeparated(params.caminhaoIds),
    categoriaIds: parseCommaSeparated(params.categoriaIds),
    startDate: parseString(params.startDate),
    endDate: parseString(params.endDate),
    page: parsePageNumber(params.page),
    pageSize: PAGE_SIZE,
  };

  // Fetch data in parallel
  const [resultGastos, resultOptions] = await Promise.all([
    listGastosFiltered(filters),
    fetchFilterOptions(),
  ]);

  if (resultGastos.error) {
    return (
      <div className="w-full max-w-6xl">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {resultGastos.error}
        </div>
      </div>
    );
  }

  const data = resultGastos.data!;
  const filterOptions = resultOptions.data ?? {
    motoristas: [],
    caminhoes: [],
    categorias: [],
  };

  const showMotoristaFilter = usuario.role !== 'motorista';
  const canExport = usuario.role === 'dono' || usuario.role === 'admin';

  return (
    <div className="w-full max-w-6xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl sm:text-3xl font-bold text-primary-900">Gastos</h2>
        <div className="flex items-center gap-3">
          {canExport && (
            <Suspense fallback={null}>
              <GastoExportButton filters={filters} />
            </Suspense>
          )}
          <Link
            href="/gastos/novo"
            className="inline-flex items-center gap-2 rounded-lg bg-primary-700 px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-primary-800 min-h-[48px]"
          >
            <svg className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Novo Gasto
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4">
        <Suspense fallback={<div className="h-24 animate-pulse rounded-lg bg-gray-100" />}>
          <GastoFilters
            options={filterOptions}
            showMotoristaFilter={showMotoristaFilter}
          />
        </Suspense>
      </div>

      {/* Summary */}
      <div className="mb-4">
        <GastoSummary
          totalCount={data.totalCount}
          totalValueCentavos={data.totalValueCentavos}
          subtotaisByCategoria={data.subtotaisByCategoria}
        />
      </div>

      {/* Table or empty state */}
      {data.gastos.length === 0 ? (
        <div className="rounded-lg border border-surface-border bg-surface-card p-8 text-center">
          <p className="text-primary-500">
            Nenhum gasto encontrado para os filtros aplicados.
          </p>
          <Link
            href="/gastos/novo"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary-700 px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-primary-800 min-h-[48px]"
          >
            <svg className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Registrar Novo Gasto
          </Link>
        </div>
      ) : (
        <>
          <GastoTable gastos={data.gastos} />
          <GastoPagination
            currentPage={filters.page}
            totalCount={data.totalCount}
            pageSize={PAGE_SIZE}
          />
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// URL param parsing helpers
// ---------------------------------------------------------------------------

function parseCommaSeparated(
  value: string | string[] | undefined,
): string[] {
  if (!value) return [];
  const str = Array.isArray(value) ? value[0] : value;
  if (!str) return [];
  return str.split(',').filter(Boolean);
}

function parseString(
  value: string | string[] | undefined,
): string | undefined {
  if (!value) return undefined;
  const str = Array.isArray(value) ? value[0] : value;
  return str || undefined;
}

function parsePageNumber(
  value: string | string[] | undefined,
): number {
  if (!value) return 1;
  const str = Array.isArray(value) ? value[0] : value;
  const num = parseInt(str ?? '1', 10);
  return isNaN(num) || num < 1 ? 1 : num;
}
