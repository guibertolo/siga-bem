import { getMultiEmpresaContext } from '@/lib/queries/multi-empresa';
import { getUserEmpresas } from '@/lib/queries/empresas';
import { CadastroCaminhaoClient } from '@/components/caminhoes/CadastroCaminhaoClient';

export default async function CadastroCaminhaoPage() {
  const multiCtx = await getMultiEmpresaContext();
  const empresas = multiCtx.isMultiEmpresa ? await getUserEmpresas() : [];

  return (
    <div className="w-full max-w-3xl">
      <CadastroCaminhaoClient
        multiEmpresa={
          multiCtx.isMultiEmpresa && multiCtx.activeEmpresaId
            ? { empresas, activeEmpresaId: multiCtx.activeEmpresaId }
            : null
        }
      />
    </div>
  );
}
