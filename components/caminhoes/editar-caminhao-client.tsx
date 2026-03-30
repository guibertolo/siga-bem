'use client';

import { useRouter } from 'next/navigation';
import { CaminhaoForm } from '@/components/caminhoes/CaminhaoForm';
import { updateCaminhao } from '@/app/(dashboard)/caminhoes/actions';
import type { Caminhao, CaminhaoFormData, CaminhaoActionResult } from '@/types/caminhao';

interface EditarCaminhaoClientProps {
  caminhao: Caminhao;
}

export function EditarCaminhaoClient({ caminhao }: EditarCaminhaoClientProps) {
  const router = useRouter();

  async function handleSubmit(data: CaminhaoFormData): Promise<CaminhaoActionResult> {
    const result = await updateCaminhao(caminhao.id, data);
    if (result.success) {
      router.push(`/caminhoes/${caminhao.id}`);
    }
    return result;
  }

  return (
    <CaminhaoForm
      caminhao={caminhao}
      mode="edit"
      onSubmit={handleSubmit}
    />
  );
}
