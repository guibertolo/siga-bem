'use client'

import { useRouter } from 'next/navigation'
import { GastoForm } from '@/components/gastos/GastoForm'
import { ComprovantesUpload } from '@/components/gastos/ComprovantesUpload'
import { updateGasto } from '@/app/(dashboard)/gastos/actions'
import type { Gasto, GastoFormData, GastoActionResult } from '@/types/gasto'
import type { CategoriaGastoOption } from '@/types/categoria-gasto'
import type { FotoComprovanteWithUrl } from '@/types/foto-comprovante'

interface EditarGastoClientProps {
  gastoId: string
  gasto: Gasto
  categorias: CategoriaGastoOption[]
  motoristas: Array<{ id: string; nome: string }>
  caminhoes: Array<{ id: string; placa: string; modelo: string }>
  motoristaFixo: string | null
  comprovantes?: FotoComprovanteWithUrl[]
  empresaId?: string
}

export function EditarGastoClient({
  gastoId,
  gasto,
  categorias,
  motoristas,
  caminhoes,
  motoristaFixo,
  comprovantes = [],
  empresaId = '',
}: EditarGastoClientProps) {
  const router = useRouter()

  async function handleSubmit(data: GastoFormData): Promise<GastoActionResult> {
    return updateGasto(gastoId, data)
  }

  function handleComprovanteChange() {
    router.refresh()
  }

  return (
    <div className="space-y-8">
      <GastoForm
        mode="edit"
        gasto={gasto}
        categorias={categorias}
        motoristas={motoristas}
        caminhoes={caminhoes}
        motoristaFixo={motoristaFixo}
        onSubmit={handleSubmit}
      />

      <div className="border-t border-surface-border pt-6">
        <ComprovantesUpload
          gastoId={gastoId}
          empresaId={empresaId}
          comprovantes={comprovantes}
          onComprovanteChange={handleComprovanteChange}
        />
      </div>
    </div>
  )
}
