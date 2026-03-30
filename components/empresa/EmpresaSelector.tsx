'use client';

import Link from 'next/link';
import { EmpresaCard } from '@/components/empresa/EmpresaCard';
import type { UserEmpresa } from '@/types/empresa-multi';

interface EmpresaSelectorProps {
  empresas: UserEmpresa[];
}

/**
 * Full-page empresa selector component (Story 7.2).
 * Renders a list of EmpresaCards for the user to pick which empresa to operate in.
 * Mobile-first design, accessible for 60+ audience.
 */
export function EmpresaSelector({ empresas }: EmpresaSelectorProps) {
  return (
    <div className="min-h-screen bg-surface-background flex flex-col items-center px-4 py-8 md:py-12">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-extrabold text-primary-900 mb-2">
            Selecionar Empresa
          </h1>
          <p className="text-base text-primary-700">
            Escolha a empresa que deseja acessar nesta sessao.
          </p>
        </div>

        {/* Empresa cards */}
        <div className="flex flex-col gap-4 mb-8">
          {empresas.map((empresa) => (
            <EmpresaCard key={empresa.empresa_id} empresa={empresa} />
          ))}
        </div>

        {/* Nova Empresa button */}
        <div className="text-center">
          <Link
            href="/empresa/cadastro"
            className="inline-flex items-center gap-2 rounded-xl border-2 border-dashed border-primary-300 bg-transparent px-6 min-h-[48px] text-lg font-semibold text-primary-700 no-underline hover:bg-primary-100 hover:border-primary-500 transition-all"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Nova Empresa
          </Link>
        </div>
      </div>
    </div>
  );
}
