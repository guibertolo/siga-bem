import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUsuario } from '@/lib/auth/get-user-role';
import { gerarRelatorioMotorista } from '@/app/(dashboard)/relatorios/motorista/actions';
import { RelatorioMotoristaView } from '@/components/relatorios/RelatorioMotoristaView';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ inicio?: string; fim?: string }>;
}

export default async function RelatorioMotoristaPage({
  params,
  searchParams,
}: PageProps) {
  const [{ id }, search, usuario] = await Promise.all([
    params,
    searchParams,
    getCurrentUsuario(),
  ]);

  if (!usuario) {
    redirect('/login');
  }

  const inicio = search.inicio;
  const fim = search.fim;

  if (!inicio || !fim) {
    return (
      <div className="w-full max-w-3xl">
        <Link
          href="/relatorios"
          className="text-sm text-primary-500 transition-colors hover:text-primary-700"
        >
          &larr; Voltar para Relatorios
        </Link>
        <div className="mt-6 rounded-xl border border-surface-border bg-surface-card p-6 text-center">
          <p className="text-sm text-primary-500">
            Selecione um periodo para gerar o relatorio.
          </p>
          <Link
            href="/relatorios"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 min-h-[48px]"
          >
            Selecionar periodo
          </Link>
        </div>
      </div>
    );
  }

  const result = await gerarRelatorioMotorista(id, inicio, fim);

  if (!result.success) {
    if (result.status === 401) {
      redirect('/login');
    }
    if (result.status === 403 || result.status === 404) {
      notFound();
    }
    return (
      <div className="w-full max-w-3xl">
        <Link
          href="/relatorios"
          className="text-sm text-primary-500 transition-colors hover:text-primary-700"
        >
          &larr; Voltar para Relatorios
        </Link>
        <div className="mt-6 rounded-xl border border-surface-border bg-surface-card p-6 text-center">
          <p className="text-sm text-danger">{result.error ?? 'Erro ao gerar relatorio'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl">
      <div className="mb-6 print:hidden">
        <Link
          href="/relatorios"
          className="text-sm text-primary-500 transition-colors hover:text-primary-700"
        >
          &larr; Voltar para Relatorios
        </Link>
      </div>

      <RelatorioMotoristaView
        data={result.data!}
        pdfUrl={`/relatorios/motorista/${id}/pdf?inicio=${encodeURIComponent(inicio)}&fim=${encodeURIComponent(fim)}`}
        xlsxUrl={`/relatorios/motorista/${id}/xlsx?inicio=${encodeURIComponent(inicio)}&fim=${encodeURIComponent(fim)}`}
      />
    </div>
  );
}
