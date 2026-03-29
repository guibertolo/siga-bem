import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { EmpresaForm } from '@/components/empresa/EmpresaForm';
import { createEmpresa } from '@/app/(dashboard)/empresa/actions';
import type { EmpresaFormData } from '@/types/empresa';

export default async function CadastroEmpresaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Check if user already has an empresa
  const { data: usuario } = await supabase
    .from('usuario')
    .select('empresa_id')
    .eq('auth_id', user.id)
    .maybeSingle();

  if (usuario?.empresa_id) {
    redirect('/empresa');
  }

  async function handleCreate(data: EmpresaFormData) {
    'use server';
    return createEmpresa(data);
  }

  return (
    <div className="w-full max-w-3xl">
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-lg border border-surface-border px-5 py-3 text-base font-semibold text-primary-700 transition-colors hover:bg-surface-hover min-h-[48px]"
        >
          <svg className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Voltar
        </Link>
        <h2 className="mt-4 text-2xl sm:text-3xl font-bold text-primary-900">Cadastrar Empresa</h2>
        <p className="mt-1 text-base text-primary-500">
          Preencha os dados da sua empresa para comecar a usar a plataforma.
        </p>
      </div>

      <div className="rounded-xl border border-surface-border bg-surface-card p-6 shadow-sm">
        <EmpresaForm mode="create" onSubmit={handleCreate} />
      </div>
    </div>
  );
}
