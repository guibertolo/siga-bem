import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { MotoristaForm } from '@/components/motoristas/MotoristaForm';
import { createMotorista, createMotoristaComConta } from '@/app/(dashboard)/motoristas/actions';
import { getEmpresa } from '@/app/(dashboard)/empresa/actions';
import type { MotoristaFormData, MotoristaActionResult, MotoristaComContaFormData, MotoristaComContaActionResult } from '@/types/motorista';

export default async function CadastroMotoristaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch empresa ativa for InfoBox (Story 8.2)
  const empresaResult = await getEmpresa();
  const empresaInfo = empresaResult.success && empresaResult.empresa
    ? {
        nome: empresaResult.empresa.nome_fantasia || empresaResult.empresa.razao_social,
        cnpj: empresaResult.empresa.cnpj,
      }
    : null;

  async function handleCreate(data: MotoristaFormData): Promise<MotoristaActionResult> {
    'use server';
    const result = await createMotorista(data);
    if (result.success) {
      redirect('/motoristas');
    }
    return result;
  }

  async function handleCreateComConta(data: MotoristaComContaFormData): Promise<MotoristaComContaActionResult> {
    'use server';
    return await createMotoristaComConta(data);
  }

  return (
    <div className="w-full max-w-3xl">
      <div className="mb-6">
        <Link
          href="/motoristas"
          className="inline-flex items-center gap-2 rounded-lg border border-surface-border px-5 py-3 text-base font-semibold text-primary-700 transition-colors hover:bg-surface-hover min-h-[48px]"
        >
          <svg className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Voltar
        </Link>
        <h2 className="mt-4 text-2xl sm:text-3xl font-bold text-primary-900">Cadastrar Motorista</h2>
        <p className="mt-1 text-base text-primary-500">
          Preencha os dados do motorista para cadastra-lo na plataforma.
        </p>
      </div>

      <div className="rounded-xl border border-surface-border bg-surface-card p-6 shadow-sm">
        <MotoristaForm
          mode="create"
          empresaInfo={empresaInfo}
          onSubmit={handleCreate}
          onSubmitComConta={handleCreateComConta}
        />
      </div>
    </div>
  );
}
