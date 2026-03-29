import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-surface-background px-6 py-12">
      <div className="w-full max-w-[480px] text-center">
        <h1 className="text-5xl font-extrabold text-primary-900 tracking-tight leading-tight mb-3">
          Siga Bem
        </h1>
        <p className="text-xl font-medium text-primary-700 mb-12 whitespace-nowrap">
          Sua frota no controle
        </p>

        <Link
          href="/login"
          className="inline-block w-full max-w-xs px-8 py-4 bg-primary-700 text-white text-lg font-semibold rounded-default text-center no-underline hover:bg-primary-900 transition-colors"
        >
          Entrar
        </Link>
      </div>
    </main>
  );
}
