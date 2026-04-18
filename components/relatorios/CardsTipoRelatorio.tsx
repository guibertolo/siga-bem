'use client';

/**
 * Two large cards for selecting report type: "Por Motorista" or "Por Caminhao".
 * Story 23.4 — AC3
 */

interface CardsTipoRelatorioProps {
  onSelect: (tipo: 'motorista' | 'caminhao') => void;
}

export function CardsTipoRelatorio({ onSelect }: CardsTipoRelatorioProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <button
        type="button"
        onClick={() => onSelect('motorista')}
        className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-surface-border bg-surface-card p-6 min-h-[120px] text-center transition-colors hover:border-primary-500 hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 cursor-pointer"
      >
        {/* Motorista icon */}
        <svg
          className="h-12 w-12 text-primary-600"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
          />
        </svg>
        <div>
          <span className="block text-lg font-bold text-primary-900">Por Motorista</span>
          <span className="block text-sm text-primary-500 mt-1">
            Veja viagens e gastos de cada motorista
          </span>
        </div>
      </button>

      <button
        type="button"
        onClick={() => onSelect('caminhao')}
        className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-surface-border bg-surface-card p-6 min-h-[120px] text-center transition-colors hover:border-primary-500 hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 cursor-pointer"
      >
        {/* Truck icon */}
        <svg
          className="h-12 w-12 text-primary-600"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"
          />
        </svg>
        <div>
          <span className="block text-lg font-bold text-primary-900">Por Caminhao</span>
          <span className="block text-sm text-primary-500 mt-1">
            Veja viagens e gastos de cada caminhao
          </span>
        </div>
      </button>
    </div>
  );
}
