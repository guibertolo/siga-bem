'use client';

import { useTransition } from 'react';
import Link from 'next/link';
import { toggleCaminhaoAtivo } from '@/app/(dashboard)/caminhoes/actions';
import { maskPlaca } from '@/lib/utils/validate-placa';
import { cn } from '@/lib/utils/cn';

interface CaminhaoListItem {
  id: string;
  placa: string;
  modelo: string;
  marca: string | null;
  tipo_cegonha: string;
  capacidade_veiculos: number;
  km_atual: number;
  ativo: boolean;
}

interface CaminhaoListProps {
  caminhoes: CaminhaoListItem[];
}

export function CaminhaoList({ caminhoes }: CaminhaoListProps) {
  if (caminhoes.length === 0) {
    return (
      <div className="rounded-xl border border-surface-border bg-surface-card p-8 text-center">
        <p className="text-sm text-primary-500">Nenhum caminhao cadastrado.</p>
        <Link
          href="/caminhoes/cadastro"
          className="mt-4 inline-block rounded-lg bg-primary-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-800"
        >
          Cadastrar Primeiro Caminhao
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-surface-border bg-surface-card shadow-sm">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-surface-border bg-gray-50">
            <th className="px-4 py-3 font-medium text-primary-700">Placa</th>
            <th className="px-4 py-3 font-medium text-primary-700">Modelo</th>
            <th className="px-4 py-3 font-medium text-primary-700">Marca</th>
            <th className="px-4 py-3 font-medium text-primary-700">Tipo</th>
            <th className="px-4 py-3 font-medium text-primary-700 text-center">Capacidade</th>
            <th className="px-4 py-3 font-medium text-primary-700 text-right">Km Atual</th>
            <th className="px-4 py-3 font-medium text-primary-700 text-center">Status</th>
            <th className="px-4 py-3 font-medium text-primary-700 text-center">Acoes</th>
          </tr>
        </thead>
        <tbody>
          {caminhoes.map((caminhao) => (
            <CaminhaoRow key={caminhao.id} caminhao={caminhao} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CaminhaoRow({ caminhao }: { caminhao: CaminhaoListItem }) {
  const [isPending, startTransition] = useTransition();

  function handleToggleAtivo() {
    startTransition(async () => {
      await toggleCaminhaoAtivo(caminhao.id, !caminhao.ativo);
    });
  }

  const tipoLabel = caminhao.tipo_cegonha === 'aberta' ? 'Aberta' : 'Fechada';

  return (
    <tr className={cn(
      'border-b border-surface-border transition-colors hover:bg-gray-50',
      !caminhao.ativo && 'opacity-60',
    )}>
      <td className="px-4 py-3 font-mono font-medium text-primary-900">
        {maskPlaca(caminhao.placa)}
      </td>
      <td className="px-4 py-3 text-primary-900">{caminhao.modelo}</td>
      <td className="px-4 py-3 text-primary-700">{caminhao.marca || '—'}</td>
      <td className="px-4 py-3 text-primary-700">{tipoLabel}</td>
      <td className="px-4 py-3 text-center text-primary-700">{caminhao.capacidade_veiculos}</td>
      <td className="px-4 py-3 text-right text-primary-700">
        {caminhao.km_atual.toLocaleString('pt-BR')} km
      </td>
      <td className="px-4 py-3 text-center">
        <span className={cn(
          'inline-block rounded-full px-2 py-0.5 text-xs font-medium',
          caminhao.ativo
            ? 'bg-green-100 text-green-800'
            : 'bg-red-100 text-red-800',
        )}>
          {caminhao.ativo ? 'Ativo' : 'Inativo'}
        </span>
      </td>
      <td className="px-4 py-3 text-center">
        <div className="flex items-center justify-center gap-2">
          <Link
            href={`/caminhoes/editar/${caminhao.id}`}
            className="text-xs text-primary-700 underline transition-colors hover:text-primary-900"
          >
            Editar
          </Link>
          <button
            type="button"
            onClick={handleToggleAtivo}
            disabled={isPending}
            className={cn(
              'text-xs underline transition-colors',
              caminhao.ativo
                ? 'text-red-600 hover:text-red-800'
                : 'text-green-600 hover:text-green-800',
              isPending && 'cursor-not-allowed opacity-50',
            )}
          >
            {isPending ? '...' : caminhao.ativo ? 'Desativar' : 'Reativar'}
          </button>
        </div>
      </td>
    </tr>
  );
}
