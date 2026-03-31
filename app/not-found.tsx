import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-background px-4">
      <div className="w-full max-w-md text-center">
        <h2 className="text-4xl font-bold text-primary-900 mb-4">
          Página não encontrada
        </h2>
        <p className="text-base text-primary-700 mb-6">
          A página que você procura não existe ou foi movida.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-btn-primary px-6 py-3 text-base font-semibold text-white hover:bg-btn-primary-hover transition-colors min-h-[48px]"
        >
          Voltar ao Início
        </Link>
      </div>
    </div>
  );
}
