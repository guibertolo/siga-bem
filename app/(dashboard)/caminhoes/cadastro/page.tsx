'use client';

import { useRouter } from 'next/navigation';
import { CaminhaoForm } from '@/components/caminhoes/CaminhaoForm';
import { createCaminhao } from '@/app/(dashboard)/caminhoes/actions';
import type { CaminhaoFormData, CaminhaoActionResult } from '@/types/caminhao';

export default function CadastroCaminhaoPage() {
  const router = useRouter();

  async function handleSubmit(data: CaminhaoFormData): Promise<CaminhaoActionResult> {
    const result = await createCaminhao(data);
    if (result.success) {
      router.push('/caminhoes');
    }
    return result;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-primary-900">Cadastrar Caminhao</h2>
        <p className="mt-1 text-sm text-primary-500">
          Preencha os dados do caminhao cegonheiro.
        </p>
      </div>

      <div className="rounded-xl border border-surface-border bg-surface-card p-6 shadow-sm">
        <CaminhaoForm mode="create" onSubmit={handleSubmit} />
      </div>
    </div>
  );
}
