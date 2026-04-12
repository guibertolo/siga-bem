'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { EmpresaSwitcher } from '@/components/empresa/EmpresaSwitcher';
import type { UserEmpresa } from '@/types/empresa-multi';

interface NavLink {
  href: string;
  label: string;
  onboardingId?: string;
}

interface MobileSidebarProps {
  navLinks: NavLink[];
  adminLinks: NavLink[];
  showAdminLinks: boolean;
  showBILink: boolean;
  empresas: UserEmpresa[];
  viagensAtivasCount?: number;
  selectedEmpresaIds?: string[];
}

export function MobileSidebar({
  navLinks,
  adminLinks,
  showAdminLinks,
  showBILink,
  empresas,
  viagensAtivasCount = 0,
  selectedEmpresaIds,
}: MobileSidebarProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close sidebar on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      {/* Hamburger button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center rounded-md p-2 text-primary-700 hover:bg-surface-hover transition-colors md:hidden"
        aria-label="Abrir menu"
      >
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-56 bg-[#1B3A4B] text-white transform transition-transform duration-200 ease-in-out md:hidden ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 no-underline"
            onClick={() => setOpen(false)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- SVG logo, next/image adds no benefit */}
            <img
              src="/logos/frotaviva-logo-icon.svg"
              alt=""
              width={44}
              height={44}
              className="h-11 w-11"
            />
            <span className="text-xl font-extrabold text-white">FrotaViva</span>
          </Link>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-md p-1 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Fechar menu"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <EmpresaSwitcher empresas={empresas} selectedEmpresaIds={selectedEmpresaIds} />

        <nav className="flex-1 p-3 flex flex-col gap-0.5 overflow-y-auto max-h-[calc(100vh-230px)]">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              prefetch={true}
              onClick={() => setOpen(false)}
              data-onboarding-id={link.onboardingId}
              className={`flex items-center px-4 py-3 text-base font-semibold no-underline rounded-lg transition-colors border-b border-white/5 ${
                pathname === link.href || pathname.startsWith(link.href + '/')
                  ? 'bg-white/20 text-white'
                  : 'text-slate-200 hover:bg-white/15'
              }`}
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
              onClick={() => setOpen(false)}
              data-onboarding-id="bi"
              className={`block px-4 py-3 text-base font-semibold no-underline rounded-lg transition-colors border-b border-white/5 ${
                pathname === '/bi'
                  ? 'bg-white/20 text-white'
                  : 'text-slate-200 hover:bg-white/15'
              }`}
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
                  onClick={() => setOpen(false)}
                  data-onboarding-id={link.onboardingId}
                  className={`block px-4 py-3 text-base font-semibold no-underline rounded-lg transition-colors border-b border-white/5 ${
                    pathname === link.href || pathname.startsWith(link.href + '/')
                      ? 'bg-white/20 text-white'
                      : 'text-slate-200 hover:bg-white/15'
                  }`}
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
            onClick={() => setOpen(false)}
            className={`block px-4 py-3 text-base font-semibold no-underline rounded-lg transition-colors ${
              pathname === '/perfil'
                ? 'bg-white/20 text-white'
                : 'text-slate-200 hover:bg-white/15'
            }`}
          >
            Meu Perfil
          </Link>
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="w-full px-4 py-3 text-base font-semibold text-slate-200 bg-transparent border-none cursor-pointer text-left rounded-lg hover:bg-danger/20 hover:text-red-300 transition-colors"
            >
              Sair
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
