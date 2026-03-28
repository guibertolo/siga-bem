import { redirect } from 'next/navigation';
import Link from 'next/link';
import { listCombustivelPrecos } from '@/app/(dashboard)/configuracoes/combustivel/actions';
import { CombustivelPrecoList } from '@/components/configuracoes/CombustivelPrecoList';

export default async function CombustivelConfigPage() {
  const result = await listCombustivelPrecos();

  if (result.error === 'Nao autenticado') {
    redirect('/login');
  }

  const precos = result.data ?? [];

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="text-sm text-primary-500 transition-colors hover:text-primary-700"
        >
          &larr; Voltar ao Dashboard
        </Link>
        <h2 className="mt-2 text-2xl font-bold text-primary-900">
          Precos de Combustivel
        </h2>
        <p className="mt-1 text-sm text-primary-500">
          Configure os precos de referencia do diesel por regiao. Estes valores sao usados
          no calculo de estimativa de custo das viagens.
        </p>
      </div>

      <CombustivelPrecoList precos={precos} />
    </div>
  );
}
