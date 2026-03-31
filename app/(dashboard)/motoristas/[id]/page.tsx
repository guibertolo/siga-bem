import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getMotorista } from '@/app/(dashboard)/motoristas/actions';
import { MotoristaCurrentCaminhao } from '@/components/motoristas/MotoristaCurrentCaminhao';

interface MotoristaDetailPageProps {
  params: Promise<{ id: string }>;
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

export default async function MotoristaDetailPage({ params }: MotoristaDetailPageProps) {
  const { id } = await params;

  const result = await getMotorista(id);

  if (!result.success) {
    if (result.error === 'Usuário não autenticado') {
      redirect('/login');
    }
    notFound();
  }

  const motorista = result.motorista!;

  return (
    <div className="w-full max-w-3xl">
      <div className="mb-6">
        <Link
          href="/motoristas"
          className="text-sm text-primary-500 transition-colors hover:text-primary-700"
        >
          &larr; Voltar para motoristas
        </Link>
        <div className="mt-2 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-primary-900">{motorista.nome}</h2>
            <p className="mt-1 text-sm text-primary-500">Detalhes do motorista</p>
          </div>
          <Link
            href={`/motoristas/${id}/editar`}
            className="inline-flex items-center gap-2 rounded-lg bg-btn-primary px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-btn-primary-hover focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 min-h-[48px]"
          >
            <svg className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Editar Cadastro
          </Link>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Dados do Motorista */}
        <div className="rounded-lg border border-surface-border bg-surface-card p-4">
          <h3 className="mb-3 text-sm font-semibold text-primary-900">Dados Pessoais</h3>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-primary-500">CPF</dt>
              <dd className="font-medium text-primary-900">{motorista.cpf}</dd>
            </div>
            <div>
              <dt className="text-primary-500">Telefone</dt>
              <dd className="font-medium text-primary-900">{motorista.telefone ?? 'Não informado'}</dd>
            </div>
            <div>
              <dt className="text-primary-500">CNH</dt>
              <dd className="font-medium text-primary-900">
                {motorista.cnh_numero} — Cat. {motorista.cnh_categoria}
              </dd>
            </div>
            <div>
              <dt className="text-primary-500">Validade CNH</dt>
              <dd className="font-medium text-primary-900">{formatDate(motorista.cnh_validade)}</dd>
            </div>
            <div>
              <dt className="text-primary-500">Status</dt>
              <dd>
                <span
                  className={
                    motorista.status === 'ativo'
                      ? 'text-success font-medium'
                      : 'text-text-muted font-medium'
                  }
                >
                  {motorista.status === 'ativo' ? 'Ativo' : 'Inativo'}
                </span>
              </dd>
            </div>
            {motorista.observacao && (
              <div>
                <dt className="text-primary-500">Observação</dt>
                <dd className="text-primary-700">{motorista.observacao}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Vinculo Atual (AC5) */}
        <MotoristaCurrentCaminhao motoristaId={id} />
      </div>
    </div>
  );
}
