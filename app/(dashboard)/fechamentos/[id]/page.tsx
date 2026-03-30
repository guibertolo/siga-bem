/**
 * Fechamento detail page.
 * Story 4.1 — AC3, AC6: Detail view with status management actions
 * Story 4.2 — AC1: "Gerar PDF" button available for any status
 */

import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getFechamentoDetalhado } from '@/app/(dashboard)/fechamentos/actions';
import { getCurrentUsuario } from '@/lib/auth/get-user-role';
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

  if (result.error === 'Nao autenticado' || !usuario) {
    redirect('/login');
  }

  if (!result.data) {
    notFound();
  }

  const fechamento = result.data;
  const mot = fechamento.motorista as unknown as { nome: string } | undefined;
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
            <p className="text-sm text-text-muted">Periodo</p>
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

      {/* Financial Summary */}
      <div className="mb-6 rounded-lg border border-surface-border bg-surface-card p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-primary-900">
          Resumo Financeiro
        </h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="rounded-lg bg-alert-info-bg p-4">
            <p className="text-sm text-blue-600">Total Viagens</p>
            <p className="text-xl font-bold text-blue-900">
              {formatBRL(fechamento.total_viagens)}
            </p>
          </div>
          <div className="rounded-lg bg-red-50 p-4">
            <p className="text-sm text-red-600">Total Gastos</p>
            <p className="text-xl font-bold text-red-900">
              {formatBRL(fechamento.total_gastos)}
            </p>
          </div>
          <div
            className={`rounded-lg p-4 ${
              fechamento.saldo_motorista >= 0
                ? 'bg-green-50'
                : 'bg-red-50'
            }`}
          >
            <p
              className={`text-sm ${
                fechamento.saldo_motorista >= 0
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}
            >
              Saldo Liquido
            </p>
            <p
              className={`text-xl font-bold ${
                fechamento.saldo_motorista >= 0
                  ? 'text-green-900'
                  : 'text-red-900'
              }`}
            >
              {formatBRL(fechamento.saldo_motorista)}
            </p>
          </div>
        </div>
      </div>

      {/* Viagens Table */}
      <div className="mb-6 rounded-lg border border-surface-border bg-surface-card p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-primary-900">
          Viagens ({viagemItens.length})
        </h3>
        {viagemItens.length === 0 ? (
          <p className="text-sm italic text-text-subtle">
            Nenhuma viagem neste acerto
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-text-muted">
                  <th className="pb-2 font-medium">Data</th>
                  <th className="pb-2 font-medium">Descricao</th>
                  <th className="pb-2 text-right font-medium">Valor</th>
                </tr>
              </thead>
              <tbody>
                {viagemItens.map((item) => (
                  <tr key={item.id} className="border-b border-surface-border">
                    <td className="py-2">{formatarData(item.data)}</td>
                    <td className="py-2">{item.descricao}</td>
                    <td className="py-2 text-right font-medium">
                      {formatBRL(item.valor)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Gastos Table */}
      <div className="mb-6 rounded-lg border border-surface-border bg-surface-card p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-primary-900">
          Gastos ({gastoItens.length})
        </h3>
        {gastoItens.length === 0 ? (
          <p className="text-sm italic text-text-subtle">
            Nenhum gasto neste acerto
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-text-muted">
                  <th className="pb-2 font-medium">Data</th>
                  <th className="pb-2 font-medium">Descricao</th>
                  <th className="pb-2 text-right font-medium">Valor</th>
                </tr>
              </thead>
              <tbody>
                {gastoItens.map((item) => (
                  <tr key={item.id} className="border-b border-surface-border">
                    <td className="py-2">{formatarData(item.data)}</td>
                    <td className="py-2">{item.descricao}</td>
                    <td className="py-2 text-right font-medium">
                      {formatBRL(item.valor)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Observation */}
      {fechamento.observacao && (
        <div className="mb-6 rounded-lg border border-surface-border bg-surface-card p-6 shadow-sm">
          <h3 className="mb-2 text-lg font-semibold text-primary-900">
            Observacao
          </h3>
          <p className="text-sm text-text-muted">{fechamento.observacao}</p>
        </div>
      )}
    </div>
  );
}
