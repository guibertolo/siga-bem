import { redirect } from 'next/navigation';
import { getCurrentUsuario } from '@/lib/auth/get-user-role';
import {
  listCategorias,
  listMotoristasAtivos,
  listCaminhoesAtivos,
  createGasto,
} from '@/app/(dashboard)/gastos/actions';
import { GastoForm } from '@/components/gastos/GastoForm';

export default async function NovoGastoPage() {
  const usuario = await getCurrentUsuario();

  if (!usuario) {
    redirect('/login');
  }

  const [categoriasResult, motoristasResult, caminhoesResult] = await Promise.all([
    listCategorias(),
    listMotoristasAtivos(),
    listCaminhoesAtivos(),
  ]);

  // Determine if motorista role -> pre-fill and lock motorista_id
  const isMotorista = usuario.role === 'motorista';
  const motoristaFixo = isMotorista && motoristasResult.data?.length === 1
    ? motoristasResult.data[0].id
    : null;

  return (
    <div className="mx-auto max-w-2xl">
      <h2 className="mb-6 text-2xl font-bold text-primary-900">Novo Gasto</h2>

      {categoriasResult.error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Erro ao carregar categorias: {categoriasResult.error}
        </div>
      )}

      <GastoForm
        mode="create"
        categorias={categoriasResult.data ?? []}
        motoristas={motoristasResult.data ?? []}
        caminhoes={caminhoesResult.data ?? []}
        motoristaFixo={motoristaFixo}
        onSubmit={createGasto}
      />
    </div>
  );
}
