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
    if (result.error === 'Nao autenticado') {
      redirect('/login');
    }
    notFound();
  }

  const caminhao = result.caminhao!;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <Link
          href="/caminhoes"
          className="text-sm text-primary-500 transition-colors hover:text-primary-700"
        >
          &larr; Voltar para caminhoes
        </Link>
        <h2 className="mt-2 text-2xl font-bold text-primary-900">
          {caminhao.placa} — {caminhao.modelo}
        </h2>
        <p className="mt-1 text-sm text-primary-500">Detalhes do caminhao</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Dados do Caminhao */}
        <div className="rounded-lg border border-surface-border bg-surface-card p-4">
          <h3 className="mb-3 text-sm font-semibold text-primary-900">Dados do Veiculo</h3>
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
              <dd className="font-medium text-primary-900">{caminhao.capacidade_veiculos} veiculos</dd>
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
                      ? 'text-green-700 font-medium'
                      : 'text-gray-500 font-medium'
                  }
                >
                  {caminhao.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </dd>
            </div>
            {caminhao.observacao && (
              <div>
                <dt className="text-primary-500">Observacao</dt>
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
