import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUsuario } from '@/lib/auth/get-user-role';
import { getUserEmpresas } from '@/lib/queries/empresas';
import { createClient } from '@/lib/supabase/server';
import { getViagensEmAndamento } from '@/app/(dashboard)/viagens/actions';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { MobileSidebar } from '@/components/ui/MobileSidebar';
import { BackButton } from '@/components/ui/BackButton';
import { EmpresaSwitcher } from '@/components/empresa/EmpresaSwitcher';

// Motorista: menu ultra simplificado (só o essencial)
const motoristaLinks = [
  { href: '/dashboard', label: 'Inicio' },
  { href: '/viagens', label: 'Minhas Viagens' },
];

// Dono/Admin: menu completo com acertos unificado
const donoLinks = [
  { href: '/dashboard', label: 'Inicio' },
  { href: '/empresa', label: 'Empresa' },
  { href: '/viagens', label: 'Viagens' },
  { href: '/gastos', label: 'Gastos' },
  { href: '/fechamentos', label: 'Acertos' },
];

const adminLinks = [
  { href: '/motoristas', label: 'Motoristas' },
  { href: '/caminhoes', label: 'Caminhoes' },
  { href: '/vinculos', label: 'Vinculos Mot./Cam.' },
  { href: '/usuarios', label: 'Usuarios' },
  { href: '/configuracoes/combustivel', label: 'Preco Combustivel' },
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

  // Fetch empresas and viagem count in parallel (after auth check)
  const [empresas, viagensEmAndamento] = await Promise.all([
    getUserEmpresas(),
    getViagensEmAndamento(),
  ]);

  // AC:1/AC:2 — If user has no active empresa, either auto-switch (1 empresa)
  // or redirect to selection screen (multiple empresas).
  if (!currentUsuario.empresa_id) {
    const activeEmpresas = empresas.filter((e) => e.empresa_ativa !== false);
    if (activeEmpresas.length === 1) {
      // AC:2 — Auto-switch: user has exactly 1 active empresa, set it directly
      const supabase = await createClient();
      const { error } = await supabase.rpc('fn_switch_empresa', {
        p_empresa_id: activeEmpresas[0].empresa_id,
      });
      if (!error) {
        // Redirect to same path to re-render with the now-set empresa_id
        redirect('/dashboard');
      }
    }
    // AC:1 — Multiple empresas (or auto-switch failed): show selection screen
    redirect('/selecionar-empresa');
  }

  const isMotorista = currentUsuario.role === 'motorista';
  const showAdminLinks = currentUsuario.role === 'dono' || currentUsuario.role === 'admin';
  const showBILink = currentUsuario.role === 'dono';
  const viagensAtivasCount = viagensEmAndamento.count;
  const navLinks = isMotorista ? motoristaLinks : donoLinks;

  return (
    <div className="flex min-h-screen">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-60 bg-[#1B3A4B] text-white flex-col shrink-0">
        <div className="px-5 py-5 border-b border-white/10">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 no-underline"
          >
            <img
              src="/logos/frotaviva-logo-icon.svg"
              alt=""
              width={36}
              height={36}
              className="h-9 w-9"
            />
            <span className="text-2xl font-extrabold text-white">FrotaViva</span>
          </Link>
        </div>

        <EmpresaSwitcher empresas={empresas} />

        <nav className="flex-1 p-3 flex flex-col gap-0.5">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              prefetch={true}
              className="flex items-center px-4 py-3.5 text-base font-semibold text-slate-200 no-underline rounded-lg hover:bg-white/15 transition-colors border-b border-white/5"
            >
              {link.label}
              {link.href === '/viagens' && viagensAtivasCount > 0 && (
                <span className="ml-auto bg-alert-warning-bg0 text-white text-xs font-bold rounded-full px-2 py-0.5">
                  {viagensAtivasCount}
                </span>
              )}
            </Link>
          ))}

          {showBILink && (
            <Link
              href="/bi"
              prefetch={true}
              className="block px-4 py-3.5 text-base font-semibold text-slate-200 no-underline rounded-lg hover:bg-white/15 transition-colors border-b border-white/5"
            >
              Resumo dos Gastos
            </Link>
          )}

          {showAdminLinks && (
            <>
              <div className="mx-2 mt-6 mb-3 pt-4 text-xs font-bold text-white/50 uppercase tracking-wider border-t border-white/10">
                Gerenciar
              </div>
              {adminLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  prefetch={true}
                  className="block px-4 py-3.5 text-base font-semibold text-slate-200 no-underline rounded-lg hover:bg-white/15 transition-colors border-b border-white/5"
                >
                  {link.label}
                </Link>
              ))}
            </>
          )}
        </nav>

        <div className="p-3 border-t border-white/10 flex flex-col gap-0.5">
          <Link
            href="/perfil"
            prefetch={true}
            className="block px-4 py-3.5 text-base font-semibold text-slate-200 no-underline rounded-lg hover:bg-white/15 transition-colors"
          >
            Meu Perfil
          </Link>
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="w-full px-4 py-3.5 text-base font-semibold text-slate-200 bg-transparent border-none cursor-pointer text-left rounded-lg hover:bg-alert-danger-bg0/20 hover:text-red-300 transition-colors"
            >
              Sair
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-surface-card border-b border-surface-border px-3 sm:px-4 md:px-8 py-3 sm:py-4 flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Mobile back button (hidden on desktop and on /dashboard) */}
            <BackButton />
            {/* Mobile hamburger + drawer */}
            <MobileSidebar
              navLinks={navLinks}
              adminLinks={adminLinks}
              showAdminLinks={showAdminLinks}
              showBILink={showBILink}
              empresas={empresas}
              viagensAtivasCount={viagensAtivasCount}
            />
            <span className="text-sm text-primary-700 truncate hidden sm:inline">
              {currentUsuario.email}
            </span>
          </div>
          <ThemeToggle />
        </header>
        <main className="flex-1 bg-surface-background p-4 md:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
