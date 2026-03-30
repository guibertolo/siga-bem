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
    if (result.error === 'Usuario nao autenticado') {
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
        <h2 className="mt-2 text-2xl font-bold text-primary-900">{motorista.nome}</h2>
        <p className="mt-1 text-sm text-primary-500">Detalhes do motorista</p>
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
              <dd className="font-medium text-primary-900">{motorista.telefone ?? 'Nao informado'}</dd>
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
                      ? 'text-green-700 font-medium'
                      : 'text-text-muted font-medium'
                  }
                >
                  {motorista.status === 'ativo' ? 'Ativo' : 'Inativo'}
                </span>
              </dd>
            </div>
            {motorista.observacao && (
              <div>
                <dt className="text-primary-500">Observacao</dt>
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
