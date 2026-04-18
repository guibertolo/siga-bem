import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUsuario } from '@/lib/auth/get-user-role';
import { listAuditLog } from '@/app/(dashboard)/auditoria/actions';
import AuditoriaClientPage from '@/app/(dashboard)/auditoria/client-page';

export const metadata: Metadata = {
  title: 'Auditoria',
};

export default async function AuditoriaPage() {
  const usuario = await getCurrentUsuario();

  if (!usuario) {
    redirect('/login');
  }

  // Apenas dono ve a auditoria completa (RLS ja enforce no banco)
  // Admin e motorista veem apenas proprios logs (via RLS), nao precisam dessa pagina
  if (usuario.role !== 'dono') {
    redirect('/dashboard');
  }

  const { data: logs, error } = await listAuditLog({ limit: 200 });

  return <AuditoriaClientPage logs={logs ?? []} error={error} />;
}
