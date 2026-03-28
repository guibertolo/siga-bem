import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUsuario } from '@/lib/auth/get-user-role';

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const currentUsuario = await getCurrentUsuario();
  const showUsuariosLink = currentUsuario?.role === 'dono' || currentUsuario?.role === 'admin';

  return (
    <div className="min-h-screen bg-surface-background">
      <header className="border-b border-surface-border bg-surface-card px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-xl font-bold text-primary-900">
              Cegonheiros
            </Link>
            <nav className="hidden items-center gap-4 sm:flex">
              <Link
                href="/dashboard"
                className="text-sm text-primary-700 transition-colors hover:text-primary-900"
              >
                Dashboard
              </Link>
              <Link
                href="/empresa"
                className="text-sm text-primary-700 transition-colors hover:text-primary-900"
              >
                Minha Empresa
              </Link>
              <Link
                href="/viagens"
                className="text-sm text-primary-700 transition-colors hover:text-primary-900"
              >
                Viagens
              </Link>
              <Link
                href="/gastos"
                className="text-sm text-primary-700 transition-colors hover:text-primary-900"
              >
                Gastos
              </Link>
              <Link
                href="/fechamentos"
                className="text-sm text-primary-700 transition-colors hover:text-primary-900"
              >
                Fechamentos
              </Link>
              <Link
                href="/financeiro/historico"
                className="text-sm text-primary-700 transition-colors hover:text-primary-900"
              >
                Financeiro
              </Link>
              {showUsuariosLink && (
                <>
                  <Link
                    href="/motoristas"
                    className="text-sm text-primary-700 transition-colors hover:text-primary-900"
                  >
                    Motoristas
                  </Link>
                  <Link
                    href="/caminhoes"
                    className="text-sm text-primary-700 transition-colors hover:text-primary-900"
                  >
                    Caminhoes
                  </Link>
                  <Link
                    href="/vinculos"
                    className="text-sm text-primary-700 transition-colors hover:text-primary-900"
                  >
                    Vinculos
                  </Link>
                  <Link
                    href="/usuarios"
                    className="text-sm text-primary-700 transition-colors hover:text-primary-900"
                  >
                    Usuarios
                  </Link>
                  <Link
                    href="/configuracoes/combustivel"
                    className="text-sm text-primary-700 transition-colors hover:text-primary-900"
                  >
                    Combustivel
                  </Link>
                </>
              )}
            </nav>
          </div>
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="text-sm text-primary-700 transition-colors hover:text-primary-900"
            >
              Sair
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-6">{children}</main>
    </div>
  );
}
