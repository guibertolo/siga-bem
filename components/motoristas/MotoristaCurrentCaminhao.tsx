import Link from 'next/link';
import { getVinculoAtivoByMotorista } from '@/app/(dashboard)/vinculos/actions';

interface MotoristaCurrentCaminhaoProps {
  motoristaId: string;
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

export async function MotoristaCurrentCaminhao({ motoristaId }: MotoristaCurrentCaminhaoProps) {
  const { data: vinculo } = await getVinculoAtivoByMotorista(motoristaId);

  return (
    <div className="rounded-lg border border-surface-border bg-surface-card p-4">
      <h3 className="mb-3 text-sm font-semibold text-primary-900">Caminhao Atual</h3>

      {vinculo ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-primary-900">
                {vinculo.caminhao_placa}
              </p>
              <p className="text-xs text-primary-500">{vinculo.caminhao_modelo}</p>
            </div>
            <span className="inline-flex items-center rounded-full bg-alert-success-bg px-2.5 py-0.5 text-xs font-medium text-success">
              Ativo
            </span>
          </div>
          <p className="text-xs text-primary-500">
            Desde {formatDate(vinculo.data_inicio)}
          </p>
          <Link
            href={`/vinculos/historico?motorista=${motoristaId}`}
            className="inline-block text-xs text-primary-600 transition-colors hover:text-primary-800"
          >
            Ver historico completo &rarr;
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-primary-500">Nenhum caminhao vinculado.</p>
          <Link
            href="/vinculos/novo"
            className="inline-block text-xs text-primary-600 transition-colors hover:text-primary-800"
          >
            Criar vinculo &rarr;
          </Link>
        </div>
      )}
    </div>
  );
}
