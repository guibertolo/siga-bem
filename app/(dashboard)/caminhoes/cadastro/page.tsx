'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
    <div className="w-full max-w-2xl">
      <div className="mb-6">
        <Link
          href="/caminhoes"
          className="inline-flex items-center gap-2 rounded-lg border border-surface-border px-5 py-3 text-base font-semibold text-primary-700 transition-colors hover:bg-surface-hover min-h-[48px]"
        >
          <svg className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Voltar
        </Link>
        <h2 className="mt-4 text-2xl sm:text-3xl font-bold text-primary-900">Cadastrar Caminhao</h2>
        <p className="mt-1 text-base text-primary-500">
          Preencha os dados do caminhao cegonheiro.
        </p>
      </div>

      <div className="rounded-xl border border-surface-border bg-surface-card p-6 shadow-sm overflow-hidden">
        <CaminhaoForm mode="create" onSubmit={handleSubmit} />
      </div>
    </div>
  );
}
