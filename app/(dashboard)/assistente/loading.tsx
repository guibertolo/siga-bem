export default function AssistenteLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-[var(--c-primary-600)] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="mt-4 text-base text-[var(--c-text-secondary)]">
          Carregando Assistente...
        </p>
      </div>
    </div>
  );
}
