import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUsuario } from '@/lib/auth/get-user-role';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

const navLinks = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/empresa', label: 'Empresa' },
  { href: '/viagens', label: 'Viagens' },
  { href: '/gastos', label: 'Gastos' },
  { href: '/fechamentos', label: 'Fechamentos' },
  { href: '/financeiro/historico', label: 'Financeiro' },
];

const adminLinks = [
  { href: '/motoristas', label: 'Motoristas' },
  { href: '/caminhoes', label: 'Caminhoes' },
  { href: '/vinculos', label: 'Vinculos' },
  { href: '/usuarios', label: 'Usuarios' },
  { href: '/configuracoes/combustivel', label: 'Combustivel' },
];

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // getCurrentUsuario already calls supabase.auth.getUser() internally,
  // and is wrapped with React.cache() so it deduplicates within this request.
  // No need for a separate getUser() call here.
  const currentUsuario = await getCurrentUsuario();

  if (!currentUsuario) {
    redirect('/login');
  }

  const showAdminLinks = currentUsuario.role === 'dono' || currentUsuario.role === 'admin';
  const showBILink = currentUsuario.role === 'dono';

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-60 bg-[#1B3A4B] text-white flex flex-col shrink-0">
        <div className="px-5 py-7 border-b border-white/10">
          <Link
            href="/dashboard"
            className="text-2xl font-extrabold text-white no-underline"
          >
            Siga Bem
          </Link>
        </div>

        <nav className="flex-1 p-3 flex flex-col gap-0.5">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block px-4 py-3.5 text-base font-semibold text-slate-200 no-underline rounded-lg hover:bg-white/15 transition-colors border-b border-white/5"
            >
              {link.label}
            </Link>
          ))}

          {showBILink && (
            <Link
              href="/bi"
              className="block px-4 py-3.5 text-base font-semibold text-slate-200 no-underline rounded-lg hover:bg-white/15 transition-colors border-b border-white/5"
            >
              BI Financeiro
            </Link>
          )}

          {showAdminLinks && (
            <>
              <div className="mx-2 mt-6 mb-3 pt-4 text-xs font-bold text-white/50 uppercase tracking-wider border-t border-white/10">
                Admin
              </div>
              {adminLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block px-4 py-3.5 text-base font-semibold text-slate-200 no-underline rounded-lg hover:bg-white/15 transition-colors border-b border-white/5"
                >
                  {link.label}
                </Link>
              ))}
            </>
          )}
        </nav>

        <div className="p-3 border-t border-white/10">
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="w-full px-4 py-3.5 text-base font-semibold text-slate-200 bg-transparent border-none cursor-pointer text-left rounded-lg hover:bg-red-500/20 hover:text-red-300 transition-colors"
            >
              Sair
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-surface-card border-b border-surface-border px-8 py-4 flex items-center justify-between">
          <span className="text-sm text-primary-700">
            {currentUsuario.email}
          </span>
          <ThemeToggle />
        </header>
        <main className="flex-1 bg-surface-background p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
