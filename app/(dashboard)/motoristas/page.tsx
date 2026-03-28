import { redirect } from 'next/navigation';
import Link from 'next/link';
import { listMotoristas } from '@/app/(dashboard)/motoristas/actions';
import { MotoristaList } from '@/components/motoristas/MotoristaList';

export default async function MotoristasPage() {
  const result = await listMotoristas();

  if (!result.success) {
    if (result.error === 'Usuario nao autenticado') {
      redirect('/login');
    }
  }

  const motoristas = result.motoristas ?? [];

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary-900">Motoristas</h2>
          <p className="mt-1 text-sm text-primary-500">
            Gerencie os motoristas da sua empresa.
          </p>
        </div>
        <Link
          href="/motoristas/cadastro"
          className="rounded-lg bg-primary-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-800"
        >
          Novo Motorista
        </Link>
      </div>

      <MotoristaList motoristas={motoristas} />
    </div>
  );
}
