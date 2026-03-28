import { redirect } from 'next/navigation';
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
        <h2 className="text-2xl font-bold text-primary-900">Editar Empresa</h2>
        <p className="mt-1 text-sm text-primary-500">
          Atualize os dados da sua empresa. O CNPJ nao pode ser alterado.
        </p>
      </div>

      <div className="rounded-xl border border-surface-border bg-surface-card p-6 shadow-sm">
        <EmpresaForm mode="edit" empresa={empresa} onSubmit={handleUpdate} />
      </div>
    </div>
  );
}
