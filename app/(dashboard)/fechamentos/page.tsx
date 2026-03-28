import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { getCurrentUsuario } from '@/lib/auth/get-user-role';
import {
  listFechamentos,
  listMotoristasParaFechamento,
} from '@/app/(dashboard)/fechamentos/actions';
import { FechamentoList } from '@/components/fechamentos/FechamentoList';
import { FechamentoFilters } from '@/components/fechamentos/FechamentoFilters';
import type { FechamentoStatus } from '@/types/database';

const PAGE_SIZE = 20;

interface FechamentosPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function FechamentosPage({ searchParams }: FechamentosPageProps) {
  const usuario = await getCurrentUsuario();

  if (!usuario) {
    redirect('/login');
  }

  const params = await searchParams;

  const motoristaId = typeof params.motorista_id === 'string' ? params.motorista_id : undefined;
  const status = typeof params.status === 'string' ? params.status as FechamentoStatus : undefined;
  const page = typeof params.page === 'string' ? Math.max(1, parseInt(params.page, 10) || 1) : 1;

  const canCreate = usuario.role === 'dono' || usuario.role === 'admin';
  const showMotoristaFilter = usuario.role !== 'motorista';

  const [result, motoristasResult] = await Promise.all([
    listFechamentos({ motorista_id: motoristaId, status, page, pageSize: PAGE_SIZE }),
    canCreate ? listMotoristasParaFechamento() : Promise.resolve({ data: [], error: null }),
  ]);

  if (result.error) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {result.error}
        </div>
      </div>
    );
  }

  const fechamentos = result.data ?? [];
  const totalPages = Math.ceil(result.total / PAGE_SIZE);

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-primary-900">Fechamentos</h2>
        {canCreate && (
          <Link
            href="/fechamentos/novo"
            className="rounded-lg bg-primary-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-800"
          >
            Novo Fechamento
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="mb-4">
        <Suspense fallback={<div className="h-16 animate-pulse rounded-lg bg-gray-100" />}>
          <FechamentoFilters
            motoristas={motoristasResult.data ?? []}
            showMotoristaFilter={showMotoristaFilter}
          />
        </Suspense>
      </div>

      {/* Table or empty */}
      {fechamentos.length === 0 ? (
        <div className="rounded-lg border border-surface-border bg-surface-card p-8 text-center">
          <p className="text-primary-500">Nenhum fechamento encontrado.</p>
          {canCreate && (
            <Link
              href="/fechamentos/novo"
              className="mt-4 inline-block rounded-lg bg-primary-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-800"
            >
              Criar Primeiro Fechamento
            </Link>
          )}
        </div>
      ) : (
        <>
          <FechamentoList fechamentos={fechamentos} />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              {page > 1 && (
                <Link
                  href={buildUrl(params, page - 1)}
                  className="rounded-lg border border-surface-border px-3 py-1.5 text-sm text-primary-700 hover:bg-gray-50"
                >
                  Anterior
                </Link>
              )}
              <span className="text-sm text-primary-500">
                Pagina {page} de {totalPages}
              </span>
              {page < totalPages && (
                <Link
                  href={buildUrl(params, page + 1)}
                  className="rounded-lg border border-surface-border px-3 py-1.5 text-sm text-primary-700 hover:bg-gray-50"
                >
                  Proxima
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function buildUrl(
  params: Record<string, string | string[] | undefined>,
  page: number,
): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key !== 'page' && value) {
      sp.set(key, Array.isArray(value) ? value[0] ?? '' : value);
    }
  }
  sp.set('page', String(page));
  return `/fechamentos?${sp.toString()}`;
}
