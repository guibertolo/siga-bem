import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { listCombustivelPrecos, getMediaPorRegiao } from '@/app/(dashboard)/configuracoes/combustivel/actions';

export const metadata: Metadata = {
  title: 'Combustivel',
};
import { CombustivelPrecoList } from '@/components/configuracoes/CombustivelPrecoList';
import { MediaCombustivelRegiao } from '@/components/configuracoes/MediaCombustivelRegiao';
import { getUserRole } from '@/lib/auth/get-user-role';

export default async function CombustivelConfigPage() {
  const result = await listCombustivelPrecos();

  if (result.error === 'Nao autenticado') {
    redirect('/login');
  }

  const precos = result.data ?? [];

  const role = await getUserRole();
  const isDono = role === 'dono';

  let mediaData: Awaited<ReturnType<typeof getMediaPorRegiao>>['data'] = null;
  if (isDono) {
    const mediaResult = await getMediaPorRegiao();
    mediaData = mediaResult.data;
  }

  return (
    <div className="w-full max-w-4xl">
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

      {isDono && mediaData !== null && (
        <div className="mt-10">
          <h3 className="mb-1 text-xl font-bold text-primary-900">
            Media Real por Regiao
          </h3>
          <p className="mb-4 text-sm text-primary-500">
            Precos medios calculados a partir dos abastecimentos registrados pelos
            motoristas nas viagens.
          </p>
          <MediaCombustivelRegiao data={mediaData} />
        </div>
      )}
    </div>
  );
}
