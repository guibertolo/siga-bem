import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getEmpresa } from '@/app/(dashboard)/empresa/actions';

export const metadata: Metadata = {
  title: 'Minha Empresa',
};

export default async function EmpresaPage() {
  const result = await getEmpresa();

  if (!result.success) {
    if (result.error === 'EMPRESA_NOT_FOUND') {
      redirect('/empresa/cadastro');
    }
    redirect('/login');
  }

  const empresa = result.empresa!;

  return (
    <div className="w-full max-w-3xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl sm:text-3xl font-bold text-primary-900">Minha Empresa</h2>
        <Link
          href="/empresa/editar"
          className="inline-flex items-center gap-2 rounded-lg bg-primary-700 px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-primary-800 min-h-[48px]"
        >
          <svg className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Editar
        </Link>
      </div>

      <div className="rounded-xl border border-surface-border bg-surface-card p-6 sm:p-8 shadow-sm">
        <dl className="divide-y divide-surface-border">
          <DataRow label="CNPJ" value={empresa.cnpj} />
          <DataRow label="Razao Social" value={empresa.razao_social} />
          <DataRow label="Nome Fantasia" value={empresa.nome_fantasia} />
          <DataRow label="Endereco" value={empresa.endereco} />
          <DataRow label="Cidade" value={empresa.cidade} />
          <DataRow label="Estado" value={empresa.estado} />
          <DataRow label="CEP" value={empresa.cep} />
          <DataRow label="Telefone" value={empresa.telefone} />
          <DataRow label="Email" value={empresa.email} />
          <DataRow label="Plano" value={empresa.plano} />
          <DataRow label="Status" value={empresa.ativa ? 'Ativa' : 'Inativa'} />
        </dl>
      </div>

      {/* Cadastrar outro CNPJ */}
      <div className="mt-6">
        <Link
          href="/empresa/nova"
          className="inline-flex items-center gap-2 rounded-lg border-2 border-dashed border-primary-300 px-5 py-3 text-base font-semibold text-primary-700 transition-colors hover:bg-primary-50 hover:border-primary-500 min-h-[48px]"
        >
          <svg className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Cadastrar Outro CNPJ
        </Link>
      </div>
    </div>
  );
}

function DataRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex flex-col sm:grid sm:grid-cols-[140px_1fr] items-start gap-1 sm:gap-4 py-3 sm:py-4">
      <dt className="text-base font-medium text-primary-500">{label}</dt>
      <dd className="text-base text-primary-900 break-words">{value || '—'}</dd>
    </div>
  );
}
