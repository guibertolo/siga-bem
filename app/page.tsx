import Link from 'next/link';
import Image from 'next/image';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-surface-background px-6 py-12">
      <div className="w-full max-w-[480px] flex flex-col items-center text-center">
        {/* Logo */}
        <Image
          src="/logos/siga-bem-logo-full.svg"
          alt="Siga Bem - Gestao de Frotas"
          width={320}
          height={120}
          className="w-[200px] h-auto sm:w-[320px] mb-6"
          priority
        />

        {/* Tagline */}
        <p className="text-lg sm:text-xl font-medium text-primary-700 mb-4">
          Sua frota no controle
        </p>

        {/* Separador verde cegonha */}
        <div className="w-16 h-1 bg-accent-green rounded-full mb-8 sm:mb-12" />

        {/* CTA */}
        <Link
          href="/login"
          className="flex items-center justify-center w-full max-w-[320px] h-14 bg-primary-700 text-white text-lg font-semibold rounded-default no-underline hover:bg-primary-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
        >
          Entrar
        </Link>
      </div>
    </main>
  );
}
