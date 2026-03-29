import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { listMotoristas } from '@/app/(dashboard)/motoristas/actions';

export const metadata: Metadata = {
  title: 'Motoristas',
};
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
    <div className="w-full max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-primary-900">Motoristas</h2>
          <p className="mt-1 text-base text-primary-500">
            Gerencie os motoristas da sua empresa.
          </p>
        </div>
        <Link
          href="/motoristas/cadastro"
          className="inline-flex items-center gap-2 rounded-lg bg-primary-700 px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-primary-800 min-h-[48px]"
        >
          <svg className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Novo Motorista
        </Link>
      </div>

      <MotoristaList motoristas={motoristas} />
    </div>
  );
}
