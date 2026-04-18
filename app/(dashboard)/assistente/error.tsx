'use client';

export default function AssistenteError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-md">
        <h2 className="text-xl font-bold text-[var(--c-text-primary)] mb-2">
          Algo deu errado
        </h2>
        <p className="text-base text-[var(--c-text-secondary)] mb-6">
          Nao foi possivel carregar o Assistente. Tente novamente.
        </p>
        <button
          onClick={reset}
          className="px-6 py-3 text-base font-semibold bg-[var(--c-primary-600)] text-white rounded-lg hover:bg-[var(--c-primary-700)] transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
