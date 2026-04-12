/**
 * Fechamento detail page.
 * Story 4.1 — AC3, AC6: Detail view with status management actions
 * Story 4.2 — AC1: "Gerar PDF" button available for any status
 */

import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getFechamentoDetalhado } from '@/app/(dashboard)/fechamentos/actions';
import { getCurrentUsuario } from '@/lib/auth/get-user-role';
import { singleRelation } from '@/lib/utils/supabase-types';
import { formatBRL } from '@/lib/utils/currency';
import { formatarData } from '@/lib/utils/format-date';
import {
  FECHAMENTO_STATUS_LABELS,
  FECHAMENTO_STATUS_COLORS,
  FECHAMENTO_TIPO_LABELS,
} from '@/types/fechamento';
import type { FechamentoStatus, FechamentoTipo } from '@/types/database';
import { GerarPDFButton } from '@/components/fechamentos/GerarPDFButton';
import { FechamentoStatusActions } from '@/components/fechamentos/FechamentoStatusActions';

export default async function FechamentoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [result, usuario] = await Promise.all([
    getFechamentoDetalhado(id),
    getCurrentUsuario(),
  ]);

  if (result.error === 'Não autenticado' || !usuario) {
    redirect('/login');
  }

  if (!result.data) {
    notFound();
  }

  const fechamento = result.data;
  const mot = singleRelation<{ nome: string }>(fechamento.motorista);
  const status = fechamento.status as FechamentoStatus;
  const tipo = fechamento.tipo as FechamentoTipo;

  const viagemItens = fechamento.itens.filter((i) => i.tipo === 'viagem');
  const gastoItens = fechamento.itens.filter((i) => i.tipo === 'gasto');
  const canManage = usuario.role === 'dono' || usuario.role === 'admin';

  return (
    <div className="w-full max-w-4xl">
      {/* Navigation */}
      <div className="mb-6">
        <Link
          href="/fechamentos"
          className="text-sm text-primary-500 transition-colors hover:text-primary-700"
        >
          &larr; Voltar para Acertos
        </Link>
      </div>

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-primary-900">
            Acerto de Contas {FECHAMENTO_TIPO_LABELS[tipo]}
          </h2>
          <span
            className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${FECHAMENTO_STATUS_COLORS[status]}`}
          >
            {FECHAMENTO_STATUS_LABELS[status]}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* AC1: PDF button available for any status */}
          <GerarPDFButton fechamentoId={id} />
        </div>
      </div>

      {/* Info Card */}
      <div className="mb-6 rounded-lg border border-surface-border bg-surface-card p-6 shadow-sm">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-text-muted">Motorista</p>
            <p className="font-medium text-primary-900">
              {mot?.nome ?? 'Desconhecido'}
            </p>
          </div>
          <div>
            <p className="text-sm text-text-muted">Período</p>
            <p className="font-medium text-primary-900">
              {formatarData(fechamento.periodo_inicio)} a{' '}
              {formatarData(fechamento.periodo_fim)}
            </p>
          </div>
          <div>
            <p className="text-sm text-text-muted">Tipo</p>
            <p className="font-medium text-primary-900">
              {FECHAMENTO_TIPO_LABELS[tipo]}
            </p>
          </div>
          <div>
            <p className="text-sm text-text-muted">ID</p>
            <p className="font-mono text-sm text-text-muted">
              {fechamento.id.slice(0, 8).toUpperCase()}
            </p>
          </div>
        </div>

        {fechamento.fechado_em && (
          <p className="mt-3 text-xs text-text-muted">
            Fechado em: {formatarData(fechamento.fechado_em.split('T')[0])}
          </p>
        )}
        {fechamento.pago_em && (
          <p className="mt-1 text-xs text-text-muted">
            Pago em: {formatarData(fechamento.pago_em.split('T')[0])}
          </p>
        )}
      </div>

      {/* AC6: Status management actions */}
      {canManage && (
        <div className="mb-6">
          <FechamentoStatusActions
            fechamentoId={fechamento.id}
            currentStatus={status}
          />
        </div>
      )}

      {/* Resumo Financeiro — linguagem simples para o dono */}
      <div className="mb-6 rounded-lg border border-surface-border bg-surface-card p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-primary-900">
          Resumo do Acerto
        </h3>

        {/* Explicacao linha a linha */}
        <div className="space-y-3 text-base">
          <div className="flex items-center justify-between rounded-lg bg-alert-info-bg p-4">
            <span className="text-primary-700">
              Valor total dos fretes ({viagemItens.length} {viagemItens.length === 1 ? 'viagem' : 'viagens'})
            </span>
            <span className="text-xl font-bold tabular-nums text-badge-info-fg">
              {formatBRL(fechamento.total_viagens)}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-alert-danger-bg p-4">
            <span className="text-primary-700">
              Despesas descontadas ({gastoItens.length} {gastoItens.length === 1 ? 'gasto' : 'gastos'})
            </span>
            <span className="text-xl font-bold tabular-nums text-badge-danger-fg">
              - {formatBRL(fechamento.total_gastos)}
            </span>
          </div>
          <div
            className={`flex items-center justify-between rounded-lg p-4 border-2 ${
              fechamento.saldo_motorista >= 0
                ? 'border-success bg-alert-success-bg'
                : 'border-danger bg-alert-danger-bg'
            }`}
          >
            <span className="text-lg font-semibold text-primary-900">
              Valor a pagar ao motorista
            </span>
            <span
              className={`text-2xl font-bold tabular-nums ${
                fechamento.saldo_motorista >= 0
                  ? 'text-badge-success-fg'
                  : 'text-badge-danger-fg'
              }`}
            >
              {formatBRL(fechamento.saldo_motorista)}
            </span>
          </div>
        </div>
      </div>

      {/* Viagens do Acerto */}
      <div className="mb-6 rounded-lg border border-surface-border bg-surface-card p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-primary-900">
          Viagens deste Acerto ({viagemItens.length})
        </h3>
        {viagemItens.length === 0 ? (
          <p className="text-base text-text-subtle">
            Nenhuma viagem neste acerto.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-base">
              <thead>
                <tr className="border-b text-left text-text-muted">
                  <th className="pb-2 font-medium">Data</th>
                  <th className="pb-2 font-medium">Rota</th>
                  <th className="pb-2 text-right font-medium">Valor do Motorista</th>
                  <th className="pb-2 text-right font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {viagemItens.map((item) => (
                  <tr key={item.id} className="border-b border-surface-border">
                    <td className="py-3 tabular-nums">{formatarData(item.data)}</td>
                    <td className="py-3">{item.descricao}</td>
                    <td className="py-3 text-right font-medium tabular-nums text-success">
                      {formatBRL(item.valor)}
                    </td>
                    <td className="py-3 text-right">
                      <Link
                        href={`/viagens/${item.referencia_id}`}
                        className="inline-flex items-center gap-1 text-sm font-medium text-primary-700 transition-colors hover:text-primary-900 min-h-[40px]"
                      >
                        Ver Viagem
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Despesas do Acerto */}
      <div className="mb-6 rounded-lg border border-surface-border bg-surface-card p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-primary-900">
          Despesas deste Acerto ({gastoItens.length})
        </h3>
        {gastoItens.length === 0 ? (
          <p className="text-base text-text-subtle">
            Nenhuma despesa neste acerto.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-base">
              <thead>
                <tr className="border-b text-left text-text-muted">
                  <th className="pb-2 font-medium">Data</th>
                  <th className="pb-2 font-medium">O que foi gasto</th>
                  <th className="pb-2 text-right font-medium">Valor</th>
                </tr>
              </thead>
              <tbody>
                {gastoItens.map((item) => (
                  <tr key={item.id} className="border-b border-surface-border">
                    <td className="py-3 tabular-nums">{formatarData(item.data)}</td>
                    <td className="py-3">{item.descricao}</td>
                    <td className="py-3 text-right font-medium tabular-nums text-danger">
                      {formatBRL(item.valor)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Anotacao */}
      {fechamento.observacao && (
        <div className="mb-6 rounded-lg border border-surface-border bg-surface-card p-6 shadow-sm">
          <h3 className="mb-2 text-lg font-semibold text-primary-900">
            Anotacao
          </h3>
          <p className="text-base text-text-muted">{fechamento.observacao}</p>
        </div>
      )}
    </div>
  );
}
