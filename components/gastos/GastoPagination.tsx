'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';

interface GastoPaginationProps {
  currentPage: number;
  totalCount: number;
  pageSize: number;
}

export function GastoPagination({
  currentPage,
  totalCount,
  pageSize,
}: GastoPaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const totalPages = Math.ceil(totalCount / pageSize);
  const from = (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, totalCount);

  if (totalCount <= pageSize) return null;

  function goToPage(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (page === 1) {
      params.delete('page');
    } else {
      params.set('page', String(page));
    }
    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  }

  return (
    <div className="flex items-center justify-between border-t border-surface-border bg-surface-card px-4 py-3">
      <p className="text-sm text-primary-500">
        Mostrando <span className="font-medium text-primary-900">{from}</span>
        {' - '}
        <span className="font-medium text-primary-900">{to}</span> de{' '}
        <span className="font-medium text-primary-900">{totalCount}</span>{' '}
        registros
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage <= 1 || isPending}
          className="rounded-md border border-surface-border px-3 py-1 text-sm text-primary-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Anterior
        </button>

        {generatePageNumbers(currentPage, totalPages).map((pageNum, idx) =>
          pageNum === null ? (
            <span key={`ellipsis-${idx}`} className="px-1 text-primary-400">
              ...
            </span>
          ) : (
            <button
              key={pageNum}
              type="button"
              onClick={() => goToPage(pageNum)}
              disabled={isPending}
              className={`rounded-md px-3 py-1 text-sm transition-colors ${
                pageNum === currentPage
                  ? 'bg-primary-700 text-white'
                  : 'border border-surface-border text-primary-700 hover:bg-gray-50'
              }`}
            >
              {pageNum}
            </button>
          ),
        )}

        <button
          type="button"
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage >= totalPages || isPending}
          className="rounded-md border border-surface-border px-3 py-1 text-sm text-primary-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Proximo
        </button>
      </div>
    </div>
  );
}

/**
 * Generate page numbers with ellipsis for large page counts.
 * Returns array of page numbers or null (for ellipsis).
 */
function generatePageNumbers(
  current: number,
  total: number,
): Array<number | null> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: Array<number | null> = [];

  // Always show first page
  pages.push(1);

  if (current > 3) {
    pages.push(null); // ellipsis
  }

  // Pages around current
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) {
    pages.push(null); // ellipsis
  }

  // Always show last page
  pages.push(total);

  return pages;
}
