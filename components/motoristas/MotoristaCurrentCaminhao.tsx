import Link from 'next/link';
import { getVinculoAtivoByMotorista, getActiveCaminhoes } from '@/app/(dashboard)/vinculos/actions';
import { getUserRole } from '@/lib/auth/get-user-role';
import { VincularCaminhaoInlineForm } from '@/components/vinculos/VincularCaminhaoInlineForm';

interface MotoristaCurrentCaminhaoProps {
  motoristaId: string;
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

export async function MotoristaCurrentCaminhao({ motoristaId }: MotoristaCurrentCaminhaoProps) {
  const [{ data: vinculos }, role] = await Promise.all([
    getVinculoAtivoByMotorista(motoristaId),
    getUserRole(),
  ]);

  const canManageVinculos = role === 'dono' || role === 'admin';

  let caminhoes: { id: string; placa: string; modelo: string }[] = [];
  if (canManageVinculos) {
    const result = await getActiveCaminhoes();
    caminhoes = result.data ?? [];
  }

  return (
    <div className="rounded-lg border border-surface-border bg-surface-card p-4">
      <h3 className="mb-3 text-sm font-semibold text-primary-900">
        {vinculos.length > 1 ? 'Caminhoes Atuais' : 'Caminhao Atual'}
      </h3>

      {vinculos.length > 0 ? (
        <div className="space-y-3">
          {vinculos.map((vinculo) => (
            <div key={vinculo.id} className="space-y-1">
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
            </div>
          ))}
          <Link
            href={`/vinculos/historico?motorista=${motoristaId}`}
            className="inline-block text-xs text-primary-500 transition-colors hover:text-primary-800"
          >
            Ver historico completo &rarr;
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-primary-500">Nenhum caminhao vinculado.</p>
          {!canManageVinculos && (
            <Link
              href="/vinculos/novo"
              className="inline-block text-xs text-primary-500 transition-colors hover:text-primary-800"
            >
              Criar vinculo &rarr;
            </Link>
          )}
        </div>
      )}

      {canManageVinculos && (
        <VincularCaminhaoInlineForm
          motoristaId={motoristaId}
          caminhoes={caminhoes}
        />
      )}
    </div>
  );
}
