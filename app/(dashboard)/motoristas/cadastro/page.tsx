import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { MotoristaForm } from '@/components/motoristas/MotoristaForm';
import { createMotorista } from '@/app/(dashboard)/motoristas/actions';
import type { MotoristaFormData, MotoristaActionResult } from '@/types/motorista';

export default async function CadastroMotoristaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  async function handleCreate(data: MotoristaFormData): Promise<MotoristaActionResult> {
    'use server';
    const result = await createMotorista(data);
    if (result.success) {
      redirect('/motoristas');
    }
    return result;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-primary-900">Cadastrar Motorista</h2>
        <p className="mt-1 text-sm text-primary-500">
          Preencha os dados do motorista para cadastra-lo na plataforma.
        </p>
      </div>

      <div className="rounded-xl border border-surface-border bg-surface-card p-6 shadow-sm">
        <MotoristaForm mode="create" onSubmit={handleCreate} />
      </div>
    </div>
  );
}
