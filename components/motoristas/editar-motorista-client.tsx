'use client';

import { useRouter } from 'next/navigation';
import { MotoristaForm } from '@/components/motoristas/MotoristaForm';
import { updateMotorista } from '@/app/(dashboard)/motoristas/actions';
import type { Motorista, MotoristaFormData, MotoristaActionResult } from '@/types/motorista';

interface EditarMotoristaClientProps {
  motorista: Motorista;
}

export function EditarMotoristaClient({ motorista }: EditarMotoristaClientProps) {
  const router = useRouter();

  async function handleSubmit(data: MotoristaFormData): Promise<MotoristaActionResult> {
    // Strip CPF — updateMotorista does not accept it (immutable field)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { cpf, ...updateData } = data;
    const result = await updateMotorista(motorista.id, updateData);
    if (result.success) {
      router.push(`/motoristas/${motorista.id}`);
    }
    return result;
  }

  return (
    <MotoristaForm
      motorista={motorista}
      mode="edit"
      onSubmit={handleSubmit}
    />
  );
}
