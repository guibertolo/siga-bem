'use client';

import { formatBRL } from '@/lib/utils/currency';
import { VIAGEM_STATUS_LABELS, VIAGEM_STATUS_COLORS } from '@/types/viagem';
import type { ViagemStatus } from '@/types/database';
import type { RelatorioMotoristaResult } from '@/types/relatorios';

function formatDate(isoString: string | null): string {
  if (!isoString) return '-';
  const date = new Date(isoString);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

function formatDateTime(isoString: string | null): string {
  if (!isoString) return '-';
  const date = new Date(isoString);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatKm(km: number | null): string {
  if (km == null) return '-';
  return `${km.toLocaleString('pt-BR')} km`;
}

interface RelatorioMotoristaViewProps {
  data: RelatorioMotoristaResult;
}

export function RelatorioMotoristaView({ data }: RelatorioMotoristaViewProps) {
  const { header, viagens, caminhoes_usados, dias_trabalhados, dias_ociosos, ranking_frota } = data;

  return (
    <div className="w-full max-w-3xl print:max-w-none">
      {/* ----------------------------------------------------------------- */}
      {/* Botoes de acao (ocultados na impressao)                           */}
      {/* ----------------------------------------------------------------- */}
      <div className="botoes-acao mb-6 flex gap-3 print:hidden">
        <button
          type="button"
          disabled
          className="inline-flex items-center gap-2 rounded-lg border border-surface-border bg-surface-card px-4 py-2 text-sm font-medium text-primary-500 opacity-60 min-h-[48px] cursor-not-allowed"
          title="Disponivel em breve"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Baixar PDF
        </button>
        <button
          type="button"
          disabled
          className="inline-flex items-center gap-2 rounded-lg border border-surface-border bg-surface-card px-4 py-2 text-sm font-medium text-primary-500 opacity-60 min-h-[48px] cursor-not-allowed"
          title="Disponivel em breve"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Baixar Excel
        </button>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Header com resumo                                                 */}
      {/* ----------------------------------------------------------------- */}
      <div className="relatorio-header-fixo sticky top-0 z-10 rounded-xl border border-surface-border bg-surface-card p-4 shadow-sm mb-6 print:static print:shadow-none print:border-0 print:rounded-none print:mb-4">
        <p className="text-xs text-primary-500 print:hidden">Relatorio de Motorista</p>
        <p className="hidden print:block text-sm text-primary-500 mb-2">{header.empresa_nome}</p>
        <h2 className="text-xl font-bold text-primary-900 mt-1">{header.motorista_nome}</h2>
        <p className="text-sm text-primary-500 mt-0.5">
          CPF: {header.motorista_cpf} &middot; Periodo: {formatDate(header.periodo_inicio)} a {formatDate(header.periodo_fim)}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg bg-surface-hover p-3 text-center">
            <p className="text-2xl font-bold text-primary-900">{header.total_viagens}</p>
            <p className="text-xs text-primary-500">Viagens</p>
          </div>
          <div className="rounded-lg bg-surface-hover p-3 text-center">
            <p className="text-2xl font-bold text-primary-900">{formatKm(header.total_km_calculado)}</p>
            <p className="text-xs text-primary-500">KM total</p>
          </div>
          <div className="rounded-lg bg-surface-hover p-3 text-center">
            <p className="text-2xl font-bold text-primary-900">{formatBRL(header.total_valor_bruto_centavos)}</p>
            <p className="text-xs text-primary-500">Valor bruto</p>
          </div>
          <div className="rounded-lg bg-surface-hover p-3 text-center">
            <p className="text-2xl font-bold text-success">{formatBRL(header.total_pagamento_centavos)}</p>
            <p className="text-xs text-primary-500">Pagamento motorista</p>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Cards secundarios: caminhoes, dias, ranking                       */}
      {/* ----------------------------------------------------------------- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
        {/* Caminhoes usados */}
        <div className="rounded-xl border border-surface-border bg-surface-card p-4">
          <h3 className="text-sm font-semibold text-primary-900 mb-2">Caminhoes usados</h3>
          {caminhoes_usados.length === 0 ? (
            <p className="text-sm text-primary-500">Nenhum</p>
          ) : (
            <ul className="space-y-1">
              {caminhoes_usados.map((c) => (
                <li key={c.placa} className="text-sm text-primary-700">
                  <span className="font-medium">{c.placa}</span> - {c.modelo}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Dias */}
        <div className="rounded-xl border border-surface-border bg-surface-card p-4">
          <h3 className="text-sm font-semibold text-primary-900 mb-2">Dias no período</h3>
          <div className="flex gap-4">
            <div>
              <p className="text-2xl font-bold text-primary-900">{dias_trabalhados}</p>
              <p className="text-xs text-primary-500">Trabalhados</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary-400">{dias_ociosos}</p>
              <p className="text-xs text-primary-500">Ociosos</p>
            </div>
          </div>
        </div>

        {/* Ranking */}
        <div className="rounded-xl border border-surface-border bg-surface-card p-4">
          <h3 className="text-sm font-semibold text-primary-900 mb-2">Ranking na frota</h3>
          {ranking_frota.posicao > 0 ? (
            <p className="text-sm text-primary-700">
              <span className="text-2xl font-bold text-primary-900">{ranking_frota.posicao}o</span>
              <span className="text-primary-500"> / {ranking_frota.total_motoristas} motoristas</span>
            </p>
          ) : (
            <p className="text-sm text-primary-500">Sem viagens concluídas no período</p>
          )}
          <p className="text-xs text-primary-400 mt-1">Por valor bruto (concluídas)</p>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Lista de viagens                                                  */}
      {/* ----------------------------------------------------------------- */}
      <h3 className="text-lg font-semibold text-primary-900 mb-3">
        Viagens ({viagens.length})
      </h3>

      {viagens.length === 0 ? (
        <div className="rounded-xl border border-surface-border bg-surface-card p-6 text-center">
          <p className="text-sm text-primary-500">Nenhuma viagem no período selecionado.</p>
        </div>
      ) : (
        <div className="space-y-3 print:space-y-0">
          {/* Print: tabela densa */}
          <table className="hidden print:table w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-surface-border">
                <th className="py-1 text-left">Data saída</th>
                <th className="py-1 text-left">Origem</th>
                <th className="py-1 text-left">Destino</th>
                <th className="py-1 text-right">KM</th>
                <th className="py-1 text-right">Valor</th>
                <th className="py-1 text-right">%</th>
                <th className="py-1 text-right">Pagto.</th>
                <th className="py-1 text-left">Status</th>
                <th className="py-1 text-left">Caminhao</th>
              </tr>
            </thead>
            <tbody>
              {viagens.map((v) => (
                <tr key={v.id} className="border-b border-surface-border/50">
                  <td className="py-1">{formatDate(v.data_saida)}</td>
                  <td className="py-1">{v.origem}</td>
                  <td className="py-1">{v.destino}</td>
                  <td className="py-1 text-right">{v.km_calculado != null ? v.km_calculado.toLocaleString('pt-BR') : '-'}</td>
                  <td className="py-1 text-right">{formatBRL(v.valor_total_centavos)}</td>
                  <td className="py-1 text-right">{v.percentual_pagamento}%</td>
                  <td className="py-1 text-right">{formatBRL(v.pagamento_centavos)}</td>
                  <td className="py-1">{VIAGEM_STATUS_LABELS[v.status as ViagemStatus] ?? v.status}</td>
                  <td className="py-1">{v.caminhao_placa}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile: cards empilhados */}
          {viagens.map((v) => (
            <div
              key={v.id}
              className="viagem-card rounded-xl border border-surface-border bg-surface-card p-4 print:hidden"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-base font-semibold text-primary-900">
                    {v.origem} &rarr; {v.destino}
                  </p>
                  <p className="text-sm text-primary-500 mt-0.5">
                    {formatDateTime(v.data_saida)}
                    {v.data_chegada_real ? ` - ${formatDateTime(v.data_chegada_real)}` : ''}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${VIAGEM_STATUS_COLORS[v.status as ViagemStatus] ?? 'bg-gray-100 text-gray-800'}`}>
                  {VIAGEM_STATUS_LABELS[v.status as ViagemStatus] ?? v.status}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                <div>
                  <p className="text-xs text-primary-500">KM</p>
                  <p className="font-medium text-primary-900">{formatKm(v.km_calculado)}</p>
                </div>
                <div>
                  <p className="text-xs text-primary-500">Valor</p>
                  <p className="font-medium text-primary-900">{formatBRL(v.valor_total_centavos)}</p>
                </div>
                <div>
                  <p className="text-xs text-primary-500">Pagamento ({v.percentual_pagamento}%)</p>
                  <p className="font-medium text-success">{formatBRL(v.pagamento_centavos)}</p>
                </div>
                <div>
                  <p className="text-xs text-primary-500">Caminhao</p>
                  <p className="font-medium text-primary-900">{v.caminhao_placa} - {v.caminhao_modelo}</p>
                </div>
              </div>

              {/* Comprovantes miniatura */}
              {v.comprovantes.length > 0 && (
                <div className="mt-3 flex gap-2 overflow-x-auto">
                  {v.comprovantes.map((comp, idx) => (
                    comp.url_signed ? (
                      <a
                        key={comp.storage_path}
                        href={comp.url_signed}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={comp.url_signed}
                          alt={`Comprovante ${idx + 1}`}
                          className="h-16 w-16 rounded-lg border border-surface-border object-cover"
                        />
                      </a>
                    ) : (
                      <div
                        key={comp.storage_path}
                        className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-surface-border bg-surface-hover text-xs text-primary-400"
                      >
                        Foto
                      </div>
                    )
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
