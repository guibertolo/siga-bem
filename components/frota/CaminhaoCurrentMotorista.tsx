import Link from 'next/link';
import { getVinculoAtivoByCaminhao } from '@/app/(dashboard)/vinculos/actions';

interface CaminhaoCurrentMotoristaProps {
  caminhaoId: string;
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

export async function CaminhaoCurrentMotorista({ caminhaoId }: CaminhaoCurrentMotoristaProps) {
  const { data: vinculos } = await getVinculoAtivoByCaminhao(caminhaoId);

  return (
    <div className="rounded-lg border border-surface-border bg-surface-card p-4">
      <h3 className="mb-3 text-sm font-semibold text-primary-900">
        {vinculos.length > 1 ? 'Motoristas Atuais' : 'Motorista Atual'}
      </h3>

      {vinculos.length > 0 ? (
        <div className="space-y-3">
          {vinculos.map((vinculo) => (
            <div key={vinculo.id} className="space-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-primary-900">
                    {vinculo.motorista_nome}
                  </p>
                  <p className="text-xs text-primary-500">{vinculo.motorista_cpf}</p>
                </div>
                <span className="inline-flex items-center rounded-full bg-alert-success-bg px-2.5 py-0.5 text-xs font-medium text-success">
                  Ativo
                </span>
              </div>
              <p className="text-xs text-primary-500">
                Desde {formatDate(vinculo.data_inicio)}
              </p>
            </div>
          ))}
          <Link
            href={`/vinculos/historico?caminhao=${caminhaoId}`}
            className="inline-block text-xs text-primary-500 transition-colors hover:text-primary-800"
          >
            Ver historico completo &rarr;
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-primary-500">Nenhum motorista vinculado.</p>
          <Link
            href="/vinculos/novo"
            className="inline-block text-xs text-primary-500 transition-colors hover:text-primary-800"
          >
            Criar vinculo &rarr;
          </Link>
        </div>
      )}
    </div>
  );
}
