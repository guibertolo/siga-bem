'use client';

import { useState, useTransition, useCallback } from 'react';
import { SimuladorViagem } from '@/components/bi/SimuladorViagem';
import { HistoricoRotas } from '@/components/bi/HistoricoRotas';
import { getHistoricoRotasSimilares } from '@/app/(dashboard)/bi/actions';
import type { BIFilterOptions, BIHistoricoRotasResult } from '@/types/bi';

interface BiPrevisaoMargensProps {
  caminhoes: BIFilterOptions['caminhoes'];
}

export function BiPrevisaoMargens({ caminhoes }: BiPrevisaoMargensProps) {
  const [isPending, startTransition] = useTransition();
  const [historicoData, setHistoricoData] =
    useState<BIHistoricoRotasResult | null>(null);
  const [historicoError, setHistoricoError] = useState<string | null>(null);
  const [historicoSearched, setHistoricoSearched] = useState(false);

  const handleOrigemDestinoChange = useCallback(
    (origem: string, destino: string) => {
      if (!origem.trim() && !destino.trim()) return;

      setHistoricoSearched(true);
      setHistoricoError(null);
      startTransition(async () => {
        const res = await getHistoricoRotasSimilares({ origem, destino });
        if (res.error) {
          setHistoricoError(res.error);
          setHistoricoData(null);
        } else {
          setHistoricoData(res.data);
        }
      });
    },
    [],
  );

  return (
    <div className="space-y-6">
      <SimuladorViagem
        caminhoes={caminhoes}
        onOrigemDestinoChange={handleOrigemDestinoChange}
      />

      <HistoricoRotas
        data={historicoData}
        isLoading={isPending}
        searched={historicoSearched}
        error={historicoError}
      />
    </div>
  );
}
