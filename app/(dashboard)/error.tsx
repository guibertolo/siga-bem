'use client';

export default function DashboardError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <h2 className="text-2xl font-bold text-primary-900 mb-4">
          Algo deu errado
        </h2>
        <p className="text-base text-primary-700 mb-6">
          Houve um problema ao carregar esta pagina. Tente novamente.
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-btn-primary px-6 py-3 text-base font-semibold text-white hover:bg-btn-primary-hover transition-colors min-h-[48px]"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
