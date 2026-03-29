import { redirect, notFound } from 'next/navigation';
import { getCurrentUsuario } from '@/lib/auth/get-user-role';
import {
  getGasto,
  listCategorias,
  listMotoristasAtivos,
  listCaminhoesAtivos,
} from '@/app/(dashboard)/gastos/actions';
import { listComprovantes } from '@/app/(dashboard)/gastos/comprovante-actions';
import { EditarGastoClient } from '@/components/gastos/EditarGastoClient';

interface EditarGastoPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditarGastoPage({ params }: EditarGastoPageProps) {
  const { id } = await params;
  const usuario = await getCurrentUsuario();

  if (!usuario) {
    redirect('/login');
  }

  const [gastoResult, categoriasResult, motoristasResult, caminhoesResult, comprovantesResult] = await Promise.all([
    getGasto(id),
    listCategorias(),
    listMotoristasAtivos(),
    listCaminhoesAtivos(),
    listComprovantes(id),
  ]);

  if (!gastoResult.success || !gastoResult.gasto) {
    notFound();
  }

  const isMotorista = usuario.role === 'motorista';
  const motoristaFixo = isMotorista && motoristasResult.data?.length === 1
    ? motoristasResult.data[0].id
    : null;

  return (
    <div className="w-full max-w-3xl">
      <h2 className="mb-6 text-2xl font-bold text-primary-900">Editar Gasto</h2>

      <EditarGastoClient
        gastoId={id}
        gasto={gastoResult.gasto}
        categorias={categoriasResult.data ?? []}
        motoristas={motoristasResult.data ?? []}
        caminhoes={caminhoesResult.data ?? []}
        motoristaFixo={motoristaFixo}
        comprovantes={comprovantesResult.data ?? []}
        empresaId={usuario.empresa_id}
      />
    </div>
  );
}
