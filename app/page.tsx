import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-primary-900">Cegonheiros</h1>
          <p className="text-lg text-primary-700">
            Gestao inteligente de frotas de cegonheiros
          </p>
        </div>

        <div className="space-y-4">
          <Link
            href="/login"
            className="block w-full rounded-[--radius-default] bg-primary-700 px-6 py-3 text-center font-semibold text-white transition-colors hover:bg-primary-900"
          >
            Entrar
          </Link>
        </div>
      </div>
    </main>
  );
}
