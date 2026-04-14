'use client';

import { formatBRL } from '@/lib/utils/currency';
import { getDocBadgeInfo } from '@/lib/utils/doc-vencimento-badge';
import { VIAGEM_STATUS_LABELS, VIAGEM_STATUS_COLORS } from '@/types/viagem';
import type { ViagemStatus } from '@/types/database';
import type { RelatorioCaminhaoResult } from '@/types/relatorios';

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

/**
 * Formata custo por km de centavos para R$/km com 2 casas decimais.
 * custo_por_km_centavos = centavos por km. Ex: 150 = R$ 1,50/km.
 */
function formatCustoKm(centavos: number | null): string {
  if (centavos == null) return '-';
  return `R$ ${(centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/km`;
}

function formatMargem(margem: number | null): { text: string; className: string } {
  if (margem == null) return { text: '-', className: 'text-primary-500' };
  const sinal = margem >= 0 ? '+' : '';
  const cor = margem >= 0 ? 'text-green-600' : 'text-red-600';
  return { text: `${sinal}${margem.toFixed(1)}%`, className: cor };
}

interface RelatorioCaminhaoViewProps {
  data: RelatorioCaminhaoResult;
  pdfUrl?: string;
  xlsxUrl?: string;
}

/**
 * Vista do relatorio por caminhao.
 * Story 23.6 — espelha estrutura de cards do RelatorioMotoristaView (23.5).
 * Includes IPVA/CRLV documentation badges (Story 18.1).
 */
export function RelatorioCaminhaoView({ data, pdfUrl, xlsxUrl }: RelatorioCaminhaoViewProps) {
  const {
    header,
    viagens,
    motoristas_que_rodaram,
    custos_diretos,
    comparativo_frota,
    dias_em_rota,
    dias_parado,
  } = data;

  const margem = formatMargem(header.margem_percentual);

  return (
    <div className="w-full max-w-3xl print:max-w-none">
      {/* ----------------------------------------------------------------- */}
      {/* Botoes de acao (ocultados na impressao)                           */}
      {/* ----------------------------------------------------------------- */}
      <div className="botoes-acao mb-6 flex gap-3 print:hidden">
        {pdfUrl ? (
          <a
            href={pdfUrl}
            download
            className="inline-flex items-center gap-2 rounded-lg border border-surface-border bg-surface-card px-4 py-2 text-sm font-medium text-primary-500 transition-colors hover:bg-surface-hover min-h-[48px]"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Baixar PDF
          </a>
        ) : (
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
        )}
        {xlsxUrl ? (
          <a
            href={xlsxUrl}
            download
            className="inline-flex items-center gap-2 rounded-lg border border-surface-border bg-surface-card px-4 py-2 text-sm font-medium text-primary-500 transition-colors hover:bg-surface-hover min-h-[48px]"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Baixar Excel
          </a>
        ) : (
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
        )}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Header com resumo KPIs                                            */}
      {/* ----------------------------------------------------------------- */}
      <div className="relatorio-header-fixo sticky top-0 z-10 rounded-xl border border-surface-border bg-surface-card p-4 shadow-sm mb-6 print:static print:shadow-none print:border-0 print:rounded-none print:mb-4">
        <p className="text-xs text-primary-500 print:hidden">Relatorio de Caminhao</p>
        <p className="hidden print:block text-sm text-primary-500 mb-2">{header.empresa_nome}</p>
        <h2 className="text-xl font-bold text-primary-900 mt-1">
          {header.caminhao_placa} - {header.caminhao_modelo}
        </h2>
        <p className="text-sm text-primary-500 mt-0.5">
          Periodo: {formatDate(header.periodo_inicio)} a {formatDate(header.periodo_fim)}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg bg-surface-hover p-3 text-center">
            <p className="text-2xl font-bold text-primary-900">{header.total_viagens}</p>
            <p className="text-xs text-primary-500">Viagens</p>
          </div>
          <div className="rounded-lg bg-surface-hover p-3 text-center">
            <p className="text-2xl font-bold text-primary-900">{formatKm(header.km_total_calculado)}</p>
            <p className="text-xs text-primary-500">KM total</p>
          </div>
          <div className="rounded-lg bg-surface-hover p-3 text-center">
            <p className="text-2xl font-bold text-primary-900">{formatBRL(header.receita_total_centavos)}</p>
            <p className="text-xs text-primary-500">Receita</p>
          </div>
          <div className="rounded-lg bg-surface-hover p-3 text-center">
            <p className={`text-2xl font-bold ${margem.className}`}>{margem.text}</p>
            <p className="text-xs text-primary-500">Margem</p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-surface-hover p-3 text-center">
            <p className="text-lg font-bold text-primary-900">{formatBRL(header.custo_total_centavos)}</p>
            <p className="text-xs text-primary-500">Custo total</p>
          </div>
          <div className="rounded-lg bg-surface-hover p-3 text-center">
            <p className="text-lg font-bold text-primary-900">{formatCustoKm(header.custo_por_km_centavos)}</p>
            <p className="text-xs text-primary-500">Custo/km</p>
          </div>
          <div className="rounded-lg bg-surface-hover p-3 text-center col-span-2 sm:col-span-1">
            <p className="text-lg font-bold text-success">{formatBRL(header.margem_absoluta_centavos)}</p>
            <p className="text-xs text-primary-500">Margem absoluta</p>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Cards secundarios: custos, dias, comparativo, motoristas          */}
      {/* ----------------------------------------------------------------- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
        {/* Custos diretos */}
        <div className="rounded-xl border border-surface-border bg-surface-card p-4">
          <h3 className="text-sm font-semibold text-primary-900 mb-3">Custos diretos</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-primary-500">Combustível</span>
              <span className="text-sm font-medium text-primary-900">{formatBRL(custos_diretos.combustivel_centavos)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-primary-500">Manutenção</span>
              <span className="text-sm font-medium text-primary-900">{formatBRL(custos_diretos.manutencao_centavos)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-primary-500">Pedagio</span>
              <span className="text-sm font-medium text-primary-900">{formatBRL(custos_diretos.pedagio_centavos)}</span>
            </div>
            <div className="border-t border-surface-border pt-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-primary-900">Total</span>
              <span className="text-sm font-bold text-primary-900">{formatBRL(header.custo_total_centavos)}</span>
            </div>
          </div>
        </div>

        {/* Dias */}
        <div className="rounded-xl border border-surface-border bg-surface-card p-4">
          <h3 className="text-sm font-semibold text-primary-900 mb-2">Dias no período</h3>
          <div className="flex gap-4">
            <div>
              <p className="text-2xl font-bold text-primary-900">{dias_em_rota}</p>
              <p className="text-xs text-primary-500">Em rota</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary-400">{dias_parado}</p>
              <p className="text-xs text-primary-500">Parado</p>
            </div>
          </div>
        </div>

        {/* Comparativo na frota */}
        <div className="rounded-xl border border-surface-border bg-surface-card p-4">
          <h3 className="text-sm font-semibold text-primary-900 mb-2">Ranking na frota</h3>
          {comparativo_frota.posicao_receita > 0 ? (
            <div className="space-y-2">
              <div>
                <p className="text-sm text-primary-700">
                  <span className="text-2xl font-bold text-primary-900">{comparativo_frota.posicao_receita}o</span>
                  <span className="text-primary-500"> / {comparativo_frota.total_caminhoes} em receita</span>
                </p>
              </div>
              <div>
                <p className="text-sm text-primary-700">
                  <span className="text-2xl font-bold text-primary-900">{comparativo_frota.posicao_margem}o</span>
                  <span className="text-primary-500"> / {comparativo_frota.total_caminhoes} em margem</span>
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-primary-500">Sem viagens no período</p>
          )}
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Card de documentacao: CRLV + IPVA                                */}
      {/* ----------------------------------------------------------------- */}
      <div className="rounded-xl border border-surface-border bg-surface-card p-4 mb-6">
        <h3 className="text-sm font-semibold text-primary-900 mb-3">Documentacao</h3>
        <div className="space-y-3">
          {/* CRLV badge */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-primary-500">CRLV</span>
            {header.doc_vencimento ? (
              (() => {
                const badge = getDocBadgeInfo(header.doc_vencimento);
                return badge ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-primary-500">
                      Vence: {formatDate(header.doc_vencimento)}
                    </span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.bgClass} ${badge.fgClass}`}>
                      {badge.label}
                    </span>
                  </div>
                ) : null;
              })()
            ) : (
              <span className="text-sm text-primary-400">CRLV nao informado</span>
            )}
          </div>

          {/* IPVA badge */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-primary-500">IPVA</span>
            {header.ipva_ano_referencia ? (
              <div className="flex items-center gap-2">
                {header.ipva_valor_centavos != null && (
                  <span className="text-sm text-primary-500">
                    {formatBRL(header.ipva_valor_centavos)} ({header.ipva_ano_referencia})
                  </span>
                )}
                {header.ipva_valor_centavos == null && (
                  <span className="text-sm text-primary-500">
                    {header.ipva_ano_referencia}
                  </span>
                )}
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  header.ipva_pago
                    ? 'bg-badge-success-bg text-badge-success-fg'
                    : 'bg-badge-warning-bg text-badge-warning-fg'
                }`}>
                  {header.ipva_pago ? 'Pago' : 'Pendente'}
                </span>
              </div>
            ) : (
              <span className="text-sm text-primary-400">IPVA nao informado</span>
            )}
          </div>
        </div>
      </div>

      {/* Motoristas que rodaram */}
      {motoristas_que_rodaram.length > 0 && (
        <div className="rounded-xl border border-surface-border bg-surface-card p-4 mb-6">
          <h3 className="text-sm font-semibold text-primary-900 mb-3">
            Motoristas que rodaram ({motoristas_que_rodaram.length})
          </h3>
          <div className="space-y-2">
            {motoristas_que_rodaram.map((mot) => (
              <div key={mot.cpf_mascarado} className="flex items-center justify-between text-sm">
                <div>
                  <span className="font-medium text-primary-900">{mot.nome}</span>
                  <span className="text-primary-400 ml-2">{mot.cpf_mascarado}</span>
                </div>
                <div className="text-right text-primary-500">
                  {mot.total_viagens} viagens &middot; {formatKm(mot.km_total_calculado)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
                <th className="py-1 text-left">Motorista</th>
                <th className="py-1 text-left">Status</th>
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
                  <td className="py-1">{v.motorista_nome}</td>
                  <td className="py-1">{VIAGEM_STATUS_LABELS[v.status as ViagemStatus] ?? v.status}</td>
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

              <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                <div>
                  <p className="text-xs text-primary-500">KM</p>
                  <p className="font-medium text-primary-900">{formatKm(v.km_calculado)}</p>
                </div>
                <div>
                  <p className="text-xs text-primary-500">Valor</p>
                  <p className="font-medium text-primary-900">{formatBRL(v.valor_total_centavos)}</p>
                </div>
                <div>
                  <p className="text-xs text-primary-500">Motorista</p>
                  <p className="font-medium text-primary-900">{v.motorista_nome}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
