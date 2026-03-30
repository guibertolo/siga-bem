import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUsuario } from '@/lib/auth/get-user-role';
import { getDashboardVinculos, getActiveMotoristas } from '@/app/(dashboard)/vinculos/actions';
import { VinculoSummaryBar } from '@/components/vinculos/VinculoSummaryBar';
import { VinculoDashboard } from '@/components/vinculos/VinculoDashboard';

export const metadata: Metadata = {
  title: 'Vinculos',
};

export default async function VinculosPage() {
  const usuario = await getCurrentUsuario();
  if (!usuario) redirect('/login');
  if (usuario.role === 'motorista') redirect('/dashboard');

  const [dashboardResult, motoristasResult] = await Promise.all([
    getDashboardVinculos(),
    getActiveMotoristas(),
  ]);

  if (dashboardResult.error === 'Nao autenticado') {
    redirect('/login');
  }

  return (
    <div className="w-full max-w-5xl">
      <div className="mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-primary-900">
          Vinculos da Frota
        </h2>
        <p className="mt-1 text-base text-primary-500">
          Visao geral de motoristas e caminhoes vinculados
        </p>
      </div>

      {dashboardResult.error && (
        <div className="mb-4 rounded-lg border border-danger/20 bg-alert-danger-bg p-4 text-base text-danger">
          {dashboardResult.error}
        </div>
      )}

      <div className="mb-6">
        <VinculoSummaryBar
          totalVinculados={dashboardResult.contadores.totalVinculados}
          totalSemMotorista={dashboardResult.contadores.totalSemMotorista}
          totalEncerrados={dashboardResult.contadores.totalEncerrados}
        />
      </div>

      <VinculoDashboard
        caminhoesCom={dashboardResult.caminhoesCom}
        caminhoesSem={dashboardResult.caminhoesSem}
        historico={dashboardResult.historico}
        totalEncerrados={dashboardResult.contadores.totalEncerrados}
        motoristas={motoristasResult.data ?? []}
      />
    </div>
  );
}
