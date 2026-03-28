import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getEmpresa } from '@/app/(dashboard)/empresa/actions';

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
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-primary-900">Minha Empresa</h2>
        <Link
          href="/empresa/editar"
          className="rounded-lg bg-primary-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-800"
        >
          Editar
        </Link>
      </div>

      <div className="rounded-xl border border-surface-border bg-surface-card p-6 shadow-sm">
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
    </div>
  );
}

function DataRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between py-3">
      <dt className="text-sm font-medium text-primary-500">{label}</dt>
      <dd className="text-sm text-primary-900">{value || '—'}</dd>
    </div>
  );
}
