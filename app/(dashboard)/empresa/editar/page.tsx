import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getEmpresa, updateEmpresa } from '@/app/(dashboard)/empresa/actions';
import { EmpresaForm } from '@/components/empresa/EmpresaForm';
import type { EmpresaFormData } from '@/types/empresa';

export default async function EditarEmpresaPage() {
  const result = await getEmpresa();

  if (!result.success) {
    if (result.error === 'EMPRESA_NOT_FOUND') {
      redirect('/empresa/cadastro');
    }
    redirect('/login');
  }

  const empresa = result.empresa!;

  async function handleUpdate(data: EmpresaFormData) {
    'use server';
    const { cnpj: _, ...updateData } = data;
    void _;
    return updateEmpresa(empresa.id, updateData);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <Link
          href="/empresa"
          className="inline-flex items-center gap-2 rounded-lg border border-surface-border px-5 py-3 text-base font-semibold text-primary-700 transition-colors hover:bg-surface-hover min-h-[48px]"
        >
          <svg className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Voltar
        </Link>
        <h2 className="mt-4 text-2xl sm:text-3xl font-bold text-primary-900">Editar Empresa</h2>
        <p className="mt-1 text-base text-primary-500">
          Atualize os dados da sua empresa. O CNPJ nao pode ser alterado.
        </p>
      </div>

      <div className="rounded-xl border border-surface-border bg-surface-card p-6 shadow-sm overflow-hidden">
        <EmpresaForm mode="edit" empresa={empresa} onSubmit={handleUpdate} />
      </div>
    </div>
  );
}
