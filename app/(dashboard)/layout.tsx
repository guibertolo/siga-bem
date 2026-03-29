import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
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
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const currentUsuario = await getCurrentUsuario();
  const showAdminLinks = currentUsuario?.role === 'dono' || currentUsuario?.role === 'admin';

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-60 bg-[#1B3A4B] text-white flex flex-col shrink-0">
        <div className="px-5 py-6 border-b border-white/10">
          <Link
            href="/dashboard"
            className="text-xl font-bold text-white no-underline"
          >
            Siga Bem
          </Link>
        </div>

        <nav className="flex-1 p-3 flex flex-col gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block px-5 py-2.5 text-sm text-slate-300 no-underline rounded-md hover:bg-white/10 transition-colors"
            >
              {link.label}
            </Link>
          ))}

          {showAdminLinks && (
            <>
              <div className="mx-2 mt-4 mb-2 text-[11px] font-semibold text-white/40 uppercase tracking-wide">
                Admin
              </div>
              {adminLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block px-5 py-2.5 text-sm text-slate-300 no-underline rounded-md hover:bg-white/10 transition-colors"
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
              className="w-full px-5 py-2.5 text-sm text-slate-300 bg-transparent border-none cursor-pointer text-left rounded-md hover:bg-white/10 transition-colors"
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
            {user.email}
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
