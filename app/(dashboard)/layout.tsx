import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUsuario, getAuthUser } from '@/lib/auth/get-user-role';
import { getUserEmpresas } from '@/lib/queries/empresas';
import { getMultiEmpresaContext } from '@/lib/queries/multi-empresa';
import { createClient } from '@/lib/supabase/server';
import { getViagensEmAndamento } from '@/app/(dashboard)/viagens/actions';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { BackButton } from '@/components/ui/BackButton';
import { MultiEmpresaBanner } from '@/components/empresa/MultiEmpresaBanner';
import { checkMustChangePassword } from '@/lib/auth/check-must-change-password';
import dynamic from 'next/dynamic';

// Dynamic imports — code-split heavy client components out of the layout chunk
const MobileSidebar = dynamic(
  () => import('@/components/ui/MobileSidebar').then((m) => m.MobileSidebar),
);
const EmpresaSwitcher = dynamic(
  () => import('@/components/empresa/EmpresaSwitcher').then((m) => m.EmpresaSwitcher),
);
const OnboardingTutorial = dynamic(
  () => import('@/components/onboarding/OnboardingTutorial').then((m) => m.OnboardingTutorial),
);

// Motorista: menu ultra simplificado (só o essencial)
const motoristaLinks = [
  { href: '/dashboard', label: 'Início', onboardingId: 'dashboard' },
  { href: '/viagens', label: 'Minhas Viagens', onboardingId: 'viagens' },
];

// Dono/Admin: menu completo com acertos unificado
const donoLinks = [
  { href: '/dashboard', label: 'Início', onboardingId: 'dashboard' },
  { href: '/empresa', label: 'Empresa', onboardingId: 'empresa' },
  { href: '/viagens', label: 'Viagens', onboardingId: 'viagens' },
  { href: '/gastos', label: 'Gastos', onboardingId: 'gastos' },
  { href: '/fechamentos', label: 'Acertos', onboardingId: 'fechamentos' },
];

const adminLinks = [
  { href: '/motoristas', label: 'Motoristas', onboardingId: 'motoristas' },
  { href: '/caminhoes', label: 'Caminhões', onboardingId: 'caminhoes' },
  { href: '/vinculos', label: 'Vínculos Mot./Cam.', onboardingId: 'vinculos' },
  { href: '/usuarios', label: 'Usuários', onboardingId: 'usuarios' },
  { href: '/configuracoes/combustivel', label: 'Preço Combustível', onboardingId: 'combustivel' },
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

  // Story 8.6 — Force password change on first login (skip test accounts)
  await checkMustChangePassword();

  // Fetch empresas, viagem count, and multi-empresa context in parallel (after auth check)
  const [empresas, viagensEmAndamento, multiCtx] = await Promise.all([
    getUserEmpresas(),
    getViagensEmAndamento(),
    getMultiEmpresaContext(),
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

  // Onboarding tutorial — persistent, resumes from where user left off
  // Uses cached getAuthUser() — shares same fetch as getCurrentUsuario, no extra round trip
  const authUser = await getAuthUser();
  const isTestAccount = authUser?.email?.endsWith('@frotaviva.com.br') ?? false;
  const onboardingCompleted = authUser?.user_metadata?.onboarding_completed === true;
  const onboardingRedo = authUser?.user_metadata?.onboarding_redo === true;
  const onboardingStep = typeof authUser?.user_metadata?.onboarding_step === 'number'
    ? authUser.user_metadata.onboarding_step
    : 0;
  const showOnboarding = onboardingRedo || (!isTestAccount && !onboardingCompleted);
  const onboardingRole = isMotorista ? 'motorista' as const : 'dono' as const;

  // Tutorial renderiza inline via OnboardingTutorial component

  return (
    <div className="flex min-h-screen">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-60 bg-[#1B3A4B] text-white flex-col shrink-0">
        <div className="px-5 py-5 border-b border-white/10">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 no-underline"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- SVG logo, next/image adds no benefit */}
            <img
              src="/logos/frotaviva-logo-icon.svg"
              alt=""
              width={48}
              height={48}
              className="h-12 w-12"
            />
            <span className="text-2xl font-extrabold text-white">FrotaViva</span>
          </Link>
        </div>

        <EmpresaSwitcher empresas={empresas} selectedEmpresaIds={multiCtx.isMultiEmpresa ? multiCtx.empresaIds : undefined} />

        <nav className="flex-1 p-3 flex flex-col gap-0.5">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              prefetch={true}
              data-onboarding-id={link.onboardingId}
              className="flex items-center px-4 py-3.5 text-base font-semibold text-white/80 no-underline rounded-lg hover:bg-white/15 transition-colors border-b border-white/5"
            >
              {link.label}
              {link.href === '/viagens' && viagensAtivasCount > 0 && (
                <span className="ml-auto bg-warning text-white text-xs font-bold rounded-full px-2 py-0.5">
                  {viagensAtivasCount}
                </span>
              )}
            </Link>
          ))}

          {showBILink && (
            <Link
              href="/bi"
              prefetch={true}
              data-onboarding-id="bi"
              className="block px-4 py-3.5 text-base font-semibold text-white/80 no-underline rounded-lg hover:bg-white/15 transition-colors border-b border-white/5"
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
                  data-onboarding-id={link.onboardingId}
                  className="block px-4 py-3.5 text-base font-semibold text-white/80 no-underline rounded-lg hover:bg-white/15 transition-colors border-b border-white/5"
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
            className="block px-4 py-3.5 text-base font-semibold text-white/80 no-underline rounded-lg hover:bg-white/15 transition-colors"
          >
            Meu Perfil
          </Link>
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="w-full px-4 py-3.5 text-base font-semibold text-white/80 bg-transparent border-none cursor-pointer text-left rounded-lg hover:bg-danger/20 hover:text-danger transition-colors"
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
              selectedEmpresaIds={multiCtx.isMultiEmpresa ? multiCtx.empresaIds : undefined}
            />
            <span className="text-sm text-primary-700 truncate hidden sm:inline">
              {currentUsuario.email}
            </span>
          </div>
          <ThemeToggle />
        </header>
        {multiCtx.isMultiEmpresa && (
          <MultiEmpresaBanner count={multiCtx.empresaIds.length} />
        )}
        <main className={`flex-1 bg-surface-background p-4 md:p-8 overflow-auto ${showOnboarding && onboardingStep > 0 ? 'pt-24' : ''}`}>
          {children}
        </main>
      </div>

      {/* Onboarding tutorial — persistent, resumes from last step */}
      {showOnboarding && (
        <OnboardingTutorial role={onboardingRole} currentStep={onboardingStep} />
      )}
    </div>
  );
}
