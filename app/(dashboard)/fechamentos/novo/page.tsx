import { redirect } from 'next/navigation';
import { getCurrentUsuario } from '@/lib/auth/get-user-role';
import { listMotoristasParaFechamento } from '@/app/(dashboard)/fechamentos/actions';
import { FechamentoForm } from '@/components/fechamentos/FechamentoForm';

export default async function NovoFechamentoPage() {
  const usuario = await getCurrentUsuario();

  if (!usuario) {
    redirect('/login');
  }

  // Only dono/admin can create fechamentos
  if (usuario.role === 'motorista') {
    redirect('/fechamentos');
  }

  const motoristasResult = await listMotoristasParaFechamento();

  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="mb-6 text-2xl font-bold text-primary-900">Novo Fechamento</h2>

      {motoristasResult.error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Erro ao carregar motoristas: {motoristasResult.error}
        </div>
      )}

      <FechamentoForm motoristas={motoristasResult.data ?? []} />
    </div>
  );
}
