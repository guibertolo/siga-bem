import { redirect } from 'next/navigation';
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
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-primary-900">Cadastrar Empresa</h2>
        <p className="mt-1 text-sm text-primary-500">
          Preencha os dados da sua empresa para comecar a usar a plataforma.
        </p>
      </div>

      <div className="rounded-xl border border-surface-border bg-surface-card p-6 shadow-sm">
        <EmpresaForm mode="create" onSubmit={handleCreate} />
      </div>
    </div>
  );
}
