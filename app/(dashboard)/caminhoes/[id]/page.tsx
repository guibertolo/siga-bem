import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getCaminhao } from '@/app/(dashboard)/caminhoes/actions';
import { CaminhaoCurrentMotorista } from '@/components/frota/CaminhaoCurrentMotorista';

interface CaminhaoDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function CaminhaoDetailPage({ params }: CaminhaoDetailPageProps) {
  const { id } = await params;

  const result = await getCaminhao(id);

  if (!result.success) {
    if (result.error === 'Não autenticado') {
      redirect('/login');
    }
    notFound();
  }

  const caminhao = result.caminhao!;

  return (
    <div className="w-full max-w-3xl">
      <div className="mb-6">
        <Link
          href="/caminhoes"
          className="text-sm text-primary-500 transition-colors hover:text-primary-700"
        >
          &larr; Voltar para caminhoes
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-primary-900">
              {caminhao.placa} — {caminhao.modelo}
            </h2>
            <p className="mt-1 text-sm text-primary-500">Detalhes do caminhao</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/relatorios?tipo=caminhao&id=${id}`}
              className="inline-flex items-center gap-2 rounded-lg border border-surface-border bg-surface-card px-4 py-3 text-base font-semibold text-primary-700 transition-colors hover:bg-surface-hover min-h-[48px]"
            >
              <svg className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Ver relatorio
            </Link>
            <Link
              href={`/caminhoes/editar/${id}`}
              className="inline-flex items-center gap-2 rounded-lg bg-btn-primary px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-btn-primary-hover min-h-[48px]"
            >
              <svg className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Editar Cadastro
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Dados do Caminhao */}
        <div className="rounded-lg border border-surface-border bg-surface-card p-4">
          <h3 className="mb-3 text-sm font-semibold text-primary-900">Dados do Veículo</h3>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-primary-500">Placa</dt>
              <dd className="font-medium text-primary-900">{caminhao.placa}</dd>
            </div>
            <div>
              <dt className="text-primary-500">Modelo</dt>
              <dd className="font-medium text-primary-900">{caminhao.modelo}</dd>
            </div>
            {caminhao.marca && (
              <div>
                <dt className="text-primary-500">Marca</dt>
                <dd className="font-medium text-primary-900">{caminhao.marca}</dd>
              </div>
            )}
            {caminhao.ano && (
              <div>
                <dt className="text-primary-500">Ano</dt>
                <dd className="font-medium text-primary-900">{caminhao.ano}</dd>
              </div>
            )}
            <div>
              <dt className="text-primary-500">Tipo Cegonha</dt>
              <dd className="font-medium text-primary-900">
                {caminhao.tipo_cegonha === 'aberta' ? 'Aberta' : 'Fechada'}
              </dd>
            </div>
            <div>
              <dt className="text-primary-500">Capacidade</dt>
              <dd className="font-medium text-primary-900">{caminhao.capacidade_veiculos} veículos</dd>
            </div>
            <div>
              <dt className="text-primary-500">Km Atual</dt>
              <dd className="font-medium text-primary-900">{caminhao.km_atual.toLocaleString('pt-BR')} km</dd>
            </div>
            <div>
              <dt className="text-primary-500">Status</dt>
              <dd>
                <span
                  className={
                    caminhao.ativo
                      ? 'text-success font-medium'
                      : 'text-text-muted font-medium'
                  }
                >
                  {caminhao.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </dd>
            </div>
            {caminhao.observacao && (
              <div>
                <dt className="text-primary-500">Observação</dt>
                <dd className="text-primary-700">{caminhao.observacao}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Vinculo Atual (AC6) */}
        <CaminhaoCurrentMotorista caminhaoId={id} />
      </div>
    </div>
  );
}
