'use client';

import { useTransition } from 'react';
import Link from 'next/link';
import { toggleCaminhaoAtivo } from '@/app/(dashboard)/caminhoes/actions';
import { maskPlaca } from '@/lib/utils/validate-placa';
import { cn } from '@/lib/utils/cn';
import { OverflowMenu } from '@/components/ui/OverflowMenu';

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
        <p className="text-base text-primary-500">Nenhum caminhao cadastrado.</p>
        <p className="mt-1 text-sm text-text-muted">Adicione seu primeiro caminhao para comecar a gerenciar a frota.</p>
        <Link
          href="/caminhoes/cadastro"
          className="mt-4 inline-block rounded-lg bg-btn-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-btn-primary-hover"
        >
          Cadastrar Primeiro Caminhao
        </Link>
      </div>
    );
  }

  return (
    <>
    {/* Mobile card view */}
    <div className="space-y-3 md:hidden">
      {caminhoes.map((caminhao) => (
        <MobileCaminhaoCard key={caminhao.id} caminhao={caminhao} />
      ))}
    </div>

    {/* Desktop table view */}
    <div className="hidden md:block overflow-x-auto rounded-xl border border-surface-border bg-surface-card shadow-sm">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-surface-border bg-surface-muted">
            <th className="px-4 py-3.5 text-base font-medium text-primary-700">Placa</th>
            <th className="px-4 py-3.5 text-base font-medium text-primary-700">Modelo</th>
            <th className="px-4 py-3.5 text-base font-medium text-primary-700">Marca</th>
            <th className="px-4 py-3.5 text-base font-medium text-primary-700">Tipo</th>
            <th className="px-4 py-3.5 text-base font-medium text-primary-700 text-center">Capacidade</th>
            <th className="px-4 py-3.5 text-base font-medium text-primary-700 text-right">Km Atual</th>
            <th className="px-4 py-3.5 text-base font-medium text-primary-700 text-center">Situacao</th>
            <th className="px-4 py-3.5 text-base font-medium text-primary-700 text-center">Acoes</th>
          </tr>
        </thead>
        <tbody>
          {caminhoes.map((caminhao) => (
            <CaminhaoRow key={caminhao.id} caminhao={caminhao} />
          ))}
        </tbody>
      </table>
    </div>
    </>
  );
}

function MobileCaminhaoCard({ caminhao }: { caminhao: CaminhaoListItem }) {
  const [isPending, startTransition] = useTransition();
  const tipoLabel = caminhao.tipo_cegonha === 'aberta' ? 'Aberta' : 'Fechada';

  function handleToggleAtivo() {
    startTransition(async () => {
      await toggleCaminhaoAtivo(caminhao.id, !caminhao.ativo);
    });
  }

  return (
    <div className={cn(
      'rounded-xl border border-surface-border bg-surface-card p-4 shadow-sm',
      !caminhao.ativo && 'opacity-60',
    )}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-base font-mono font-medium text-primary-900">{maskPlaca(caminhao.placa)}</p>
          <p className="text-sm text-primary-700">{caminhao.modelo} {caminhao.marca ? `- ${caminhao.marca}` : ''}</p>
        </div>
        <span className={cn(
          'inline-block rounded-full px-3 py-1 text-xs font-semibold',
          caminhao.ativo ? 'bg-alert-success-bg text-success' : 'bg-alert-danger-bg text-red-800',
        )}>
          {caminhao.ativo ? 'Ativo' : 'Inativo'}
        </span>
      </div>
      <div className="text-sm text-primary-700 space-y-0.5">
        <p>{tipoLabel} - {caminhao.capacidade_veiculos} veiculos</p>
        <p>{caminhao.km_atual.toLocaleString('pt-BR')} km</p>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Link
          href={`/caminhoes/${caminhao.id}`}
          className="inline-flex items-center gap-1.5 rounded-md bg-btn-primary px-3 py-2 text-sm font-semibold text-white no-underline transition-colors hover:bg-btn-primary-hover min-h-[40px]"
        >
          Ver Detalhes
        </Link>
        <button
          type="button"
          onClick={handleToggleAtivo}
          disabled={isPending}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors min-h-[40px]',
            caminhao.ativo ? 'text-danger hover:bg-alert-danger-bg' : 'text-success hover:bg-alert-success-bg',
            isPending && 'cursor-not-allowed opacity-50',
          )}
        >
          {isPending ? '...' : caminhao.ativo ? 'Desativar' : 'Reativar'}
        </button>
      </div>
    </div>
  );
}

function CaminhaoRow({ caminhao }: { caminhao: CaminhaoListItem }) {
  const [, startTransition] = useTransition();

  function handleToggleAtivo() {
    startTransition(async () => {
      await toggleCaminhaoAtivo(caminhao.id, !caminhao.ativo);
    });
  }

  const tipoLabel = caminhao.tipo_cegonha === 'aberta' ? 'Aberta' : 'Fechada';

  return (
    <tr className={cn(
      'border-b border-surface-border transition-colors hover:bg-surface-muted',
      !caminhao.ativo && 'opacity-60',
    )}>
      <td className="px-4 py-3.5 text-base font-mono font-medium text-primary-900">
        {maskPlaca(caminhao.placa)}
      </td>
      <td className="px-4 py-3.5 text-base text-primary-900">{caminhao.modelo}</td>
      <td className="px-4 py-3.5 text-base text-primary-700">{caminhao.marca || '—'}</td>
      <td className="px-4 py-3.5 text-base text-primary-700">{tipoLabel}</td>
      <td className="px-4 py-3.5 text-base text-center text-primary-700">{caminhao.capacidade_veiculos}</td>
      <td className="px-4 py-3.5 text-base text-right text-primary-700">
        {caminhao.km_atual.toLocaleString('pt-BR')} km
      </td>
      <td className="px-4 py-3.5 text-center">
        <span className={cn(
          'inline-block rounded-full px-3 py-1 text-sm font-semibold',
          caminhao.ativo
            ? 'bg-alert-success-bg text-success'
            : 'bg-alert-danger-bg text-red-800',
        )}>
          {caminhao.ativo ? 'Ativo' : 'Inativo'}
        </span>
      </td>
      <td className="px-4 py-3.5 text-center">
        <div className="flex items-center justify-center gap-1">
          <Link
            href={`/caminhoes/${caminhao.id}`}
            className="inline-flex items-center gap-1.5 rounded-md bg-btn-primary px-3 py-2 text-sm font-semibold text-white no-underline transition-colors hover:bg-btn-primary-hover min-h-[40px]"
          >
            Ver
          </Link>
          <OverflowMenu
            items={[
              {
                label: caminhao.ativo ? 'Desativar' : 'Reativar',
                variant: caminhao.ativo ? 'danger' : 'default',
                onClick: handleToggleAtivo,
                icon: caminhao.ativo ? (
                  <svg className="h-4 w-4" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                ) : undefined,
              },
            ]}
          />
        </div>
      </td>
    </tr>
  );
}
