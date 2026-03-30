import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUserEmpresas } from '@/lib/queries/empresas';
import { EmpresaSelector } from '@/components/empresa/EmpresaSelector';

export const metadata: Metadata = {
  title: 'Selecionar Empresa',
};

/**
 * Empresa selection page (Story 7.2).
 * Lives in (auth) group to avoid the dashboard layout redirect loop
 * when empresa_id is null.
 *
 * Routing logic:
 * - Not authenticated: redirect to /login
 * - 0 empresas: redirect to /empresa/cadastro
 * - 1 empresa: redirect to /dashboard (user never sees this page)
 * - N empresas: render the selector
 */
export default async function SelecionarEmpresaPage() {
  // Verify authentication (this page is outside dashboard layout)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const empresas = await getUserEmpresas();

  if (empresas.length === 0) {
    redirect('/empresa/cadastro');
  }

  if (empresas.length === 1) {
    redirect('/dashboard');
  }

  return <EmpresaSelector empresas={empresas} />;
}
