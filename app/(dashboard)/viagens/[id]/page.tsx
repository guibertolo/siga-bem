import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getViagem } from '@/app/(dashboard)/viagens/actions';
import { listVeiculosViagem } from '@/app/(dashboard)/viagens/[id]/veiculos/actions';
import { getPrecoDieselAtual } from '@/app/(dashboard)/configuracoes/combustivel/actions';
import { getCurrentUsuario } from '@/lib/auth/get-user-role';
import { formatBRL } from '@/lib/utils/currency';
import { calcularValorMotorista, calcularDistancia } from '@/lib/utils/viagem-calc';
import { calcularEstimativa } from '@/lib/utils/precificacao';
import { calcularConsumoMedio } from '@/lib/utils/consumo-calc';
import { VIAGEM_STATUS_LABELS, VIAGEM_STATUS_COLORS } from '@/types/viagem';
import { ViagemStatusActions } from '@/components/viagens/ViagemStatusActions';
import { ViagemDeleteButton } from '@/components/viagens/ViagemDeleteButton';
import { ViagemInvalidarButton } from '@/components/viagens/ViagemInvalidarButton';
import { VeiculosSection } from '@/components/viagens/VeiculosSection';
import { AbastecimentoSection } from '@/components/abastecimento/AbastecimentoSection';
import { AbastecimentoList } from '@/components/abastecimento/AbastecimentoList';
import { getAbastecimentosForViagem, getGastosPorViagem } from '@/app/(dashboard)/viagens/[id]/actions';
import { listCategorias } from '@/app/(dashboard)/gastos/actions';
import { GastosViagemSection } from '@/components/gastos/GastosViagemSection';
import { DespesaViagemSection } from '@/components/gastos/DespesaViagemSection';
import type { ViagemStatus } from '@/types/database';

function formatDateTime(isoString: string | null): string {
  if (!isoString) return '-';
  const date = new Date(isoString);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default async function ViagemDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [result, usuario] = await Promise.all([
    getViagem(id),
    getCurrentUsuario(),
  ]);

  if (!usuario) {
    redirect('/login');
  }

  if (!result.success) {
    if (result.error === 'Não autenticado') {
      redirect('/login');
    }
    notFound();
  }

  const viagem = result.viagem!;
  const [veiculosResult, abastecimentosResult, gastosResult, categoriasResult] = await Promise.all([
    listVeiculosViagem(id),
    getAbastecimentosForViagem(id),
    getGastosPorViagem(id),
    listCategorias(),
  ]);
  const veiculos = veiculosResult.data ?? [];
  const abastecimentos = abastecimentosResult.data;
  const gastosViagem = gastosResult.data;
  const gastosTotalCentavos = gastosResult.totalCentavos;
  const categorias = categoriasResult.data ?? [];
  const valorMotorista = calcularValorMotorista(viagem.valor_total, viagem.percentual_pagamento);
  const distancia = calcularDistancia(viagem.km_saida, viagem.km_chegada);

  // Story 3.4: edit button visible only when core fields are editable
  // Core fields editable IF AND ONLY IF:
  //   role === 'dono' OR (editavel_motorista === true AND status === 'planejada')
  const camposEditaveis =
    usuario.role === 'dono' ||
    (viagem.editavel_motorista === true && viagem.status === 'planejada');
  // For dono/admin: show edit for planejada/em_andamento; for motorista: only when campos are editable
  const isEditable =
    usuario.role === 'dono' || usuario.role === 'admin'
      ? viagem.status === 'planejada' || viagem.status === 'em_andamento'
      : camposEditaveis;
  const isReadonly = viagem.status === 'concluida' || viagem.status === 'cancelada';
  const capacidade = viagem.caminhao?.capacidade_veiculos ?? 11;

  // Story 3.3 (AC3, AC4): Calculate cost estimation with current diesel price
  let estimativa = null;
  if (viagem.km_estimado && viagem.km_estimado > 0) {
    const [consumoResult, precoResult] = await Promise.all([
      calcularConsumoMedio(viagem.caminhao_id, null),
      getPrecoDieselAtual(),
    ]);

    estimativa = calcularEstimativa(
      viagem.km_estimado,
      consumoResult.kmL,
      precoResult.precoCentavos,
      viagem.valor_total,
      consumoResult.fonte,
      precoResult.fonte,
    );
  }

  return (
    <div className="w-full max-w-3xl">
      <div className="mb-6">
        <Link
          href="/viagens"
          className="text-sm text-primary-500 transition-colors hover:text-primary-700"
        >
          &larr; Voltar para Viagens
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <h2 className="text-2xl font-bold text-primary-900">
            {viagem.origem} &rarr; {viagem.destino}
          </h2>
          <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${VIAGEM_STATUS_COLORS[viagem.status as ViagemStatus]}`}>
            {VIAGEM_STATUS_LABELS[viagem.status as ViagemStatus]}
          </span>
          {/* Motorista: show earnings badge next to status */}
          {usuario.role === 'motorista' && valorMotorista > 0 && (
            <span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
              Seu ganho: {formatBRL(valorMotorista)}
            </span>
          )}
        </div>
        {/* Dono/Admin: quick link to create closing for this motorista */}
        {(usuario.role === 'dono' || usuario.role === 'admin') && (
          <div className="mt-2">
            <Link
              href={`/fechamentos/novo?motorista_id=${viagem.motorista_id}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-surface-border px-4 py-2 text-sm font-medium text-primary-700 transition-colors hover:bg-surface-hover min-h-[48px]"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Fazer Acerto
            </Link>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {/* Details Card */}
        <div className="rounded-lg border border-surface-border bg-surface-card p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-primary-500">Motorista</p>
              <p className="mt-1 text-sm font-medium text-primary-900">
                {viagem.motorista?.nome ?? '-'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-primary-500">Caminhão</p>
              <p className="mt-1 text-sm font-medium text-primary-900">
                {viagem.caminhao ? `${viagem.caminhao.placa} - ${viagem.caminhao.modelo}` : '-'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-primary-500">Saida</p>
              <p className="mt-1 text-sm text-primary-700">{formatDateTime(viagem.data_saida)}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-primary-500">Chegada Prevista</p>
              <p className="mt-1 text-sm text-primary-700">{formatDateTime(viagem.data_chegada_prevista)}</p>
            </div>
            {viagem.data_chegada_real && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-primary-500">Chegada Real</p>
                <p className="mt-1 text-sm text-primary-700">{formatDateTime(viagem.data_chegada_real)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Financial Card */}
        <div className="rounded-lg border border-surface-border bg-surface-card p-6">
          <h3 className="mb-4 text-sm font-medium uppercase tracking-wide text-primary-500">Valores</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-primary-500">Valor Total</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-primary-900">
                {formatBRL(viagem.valor_total)}
              </p>
            </div>
            <div>
              <p className="text-xs text-primary-500">Percentual Motorista</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-primary-900">
                {viagem.percentual_pagamento}%
              </p>
            </div>
            <div>
              <p className="text-xs text-primary-500">Valor Motorista</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-success">
                {formatBRL(valorMotorista)}
              </p>
            </div>
          </div>
        </div>

        {/* Estimativa de Custo (Story 3.3 - AC3, AC4) */}
        {estimativa && (
          <div className="rounded-lg border border-surface-border bg-alert-info-bg p-6">
            <h3 className="mb-4 text-sm font-medium uppercase tracking-wide text-primary-700">
              Estimativa de Custo
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <p className="text-xs text-primary-500">Distancia</p>
                <p className="mt-1 text-sm font-medium tabular-nums text-primary-900">
                  {estimativa.km_estimado.toLocaleString('pt-BR')} km
                </p>
              </div>
              <div>
                <p className="text-xs text-primary-500">
                  Consumo medio ({estimativa.consumo_fonte === 'historico' ? 'historico' : 'padrao'})
                </p>
                <p className="mt-1 text-sm font-medium tabular-nums text-primary-900">
                  {estimativa.consumo_medio_km_l.toFixed(1).replace('.', ',')} km/l
                </p>
                {estimativa.consumo_fonte === 'padrao' && (
                  <p className="text-xs text-warning">Dados insuficientes</p>
                )}
              </div>
              <div>
                <p className="text-xs text-primary-500">
                  Preço diesel ({estimativa.preco_diesel_fonte === 'tabela' ? 'tabela' : 'padrao'})
                </p>
                <p className="mt-1 text-sm font-medium tabular-nums text-primary-900">
                  {formatBRL(estimativa.preco_diesel_centavos)}/l
                </p>
              </div>
              <div>
                <p className="text-xs text-primary-500">Custo estimado combustivel</p>
                <p className="mt-1 text-lg font-bold tabular-nums text-danger">
                  {formatBRL(estimativa.custo_combustivel_centavos)}
                </p>
              </div>
              {viagem.valor_total > 0 && (
                <>
                  <div>
                    <p className="text-xs text-primary-500">Margem bruta estimada</p>
                    <p className={`mt-1 text-lg font-bold tabular-nums ${estimativa.margem_bruta_centavos < 0 ? 'text-danger' : 'text-success'}`}>
                      {formatBRL(estimativa.margem_bruta_centavos)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-primary-500">Percentual de margem</p>
                    <p className={`mt-1 text-lg font-bold tabular-nums ${estimativa.margem_bruta_centavos < 0 ? 'text-danger' : 'text-success'}`}>
                      {estimativa.margem_percentual.toFixed(1).replace('.', ',')}%
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* KM Card */}
        {(viagem.km_saida != null || viagem.km_chegada != null) && (
          <div className="rounded-lg border border-surface-border bg-surface-card p-6">
            <h3 className="mb-4 text-sm font-medium uppercase tracking-wide text-primary-500">Quilometragem</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-primary-500">KM Saida</p>
                <p className="mt-1 text-sm tabular-nums text-primary-900">
                  {viagem.km_saida != null ? viagem.km_saida.toLocaleString('pt-BR') : '-'}
                </p>
              </div>
              <div>
                <p className="text-xs text-primary-500">KM Chegada</p>
                <p className="mt-1 text-sm tabular-nums text-primary-900">
                  {viagem.km_chegada != null ? viagem.km_chegada.toLocaleString('pt-BR') : '-'}
                </p>
              </div>
              {distancia != null && (
                <div>
                  <p className="text-xs text-primary-500">Distancia Percorrida</p>
                  <p className="mt-1 text-sm font-bold tabular-nums text-primary-900">
                    {distancia.toLocaleString('pt-BR')} km
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Observacao for editable viagens */}
        {isEditable && viagem.observacao && (
          <div className="rounded-lg border border-surface-border bg-surface-card p-6">
            <h3 className="mb-2 text-sm font-medium uppercase tracking-wide text-primary-500">Observação</h3>
            <p className="text-sm text-primary-700">{viagem.observacao}</p>
          </div>
        )}

        {/* Veiculos Transportados (Story 3.2) */}
        <VeiculosSection
          viagemId={viagem.id}
          veiculos={veiculos}
          capacidade={capacidade}
          readonly={isReadonly}
        />

        {/* Quick actions — Abastecimento + Despesa */}
        {viagem.status === 'em_andamento' && (
          <>
            <DespesaViagemSection
              viagemId={viagem.id}
              empresaId={viagem.empresa_id}
              motoristaId={viagem.motorista_id}
              caminhaoId={viagem.caminhao_id}
              categorias={categorias}
            />

            <AbastecimentoSection
              viagemId={viagem.id}
              empresaId={viagem.empresa_id}
              origem={viagem.origem}
              destino={viagem.destino}
              motoristaNome={viagem.motorista?.nome ?? 'Motorista'}
              caminhaoPlaca={viagem.caminhao ? `${viagem.caminhao.placa} - ${viagem.caminhao.modelo}` : '-'}
              kmSaida={viagem.km_saida}
            />
          </>
        )}

        {/* Abastecimento List — Story 5.3 (visible for ALL statuses, including concluida) */}
        <AbastecimentoList abastecimentos={abastecimentos} isDono={usuario.role === 'dono'} />

        {/* Despesas desta Viagem — non-fuel gastos linked to this trip */}
        <GastosViagemSection
          gastos={gastosViagem}
          totalCentavos={gastosTotalCentavos}
          isDono={usuario.role === 'dono'}
        />

        {/* Status actions */}
        <div className="rounded-lg border border-surface-border bg-surface-card p-6">
          <h3 className="mb-4 text-sm font-medium uppercase tracking-wide text-primary-500">Ações</h3>
          <ViagemStatusActions
            viagemId={viagem.id}
            currentStatus={viagem.status as ViagemStatus}
            observacao={viagem.observacao}
          />
          {isEditable && (
            <div className="mt-4">
              <Link
                href={`/viagens/${viagem.id}/editar`}
                className="rounded-lg border border-surface-border px-4 py-2 text-sm font-medium text-primary-700 transition-colors hover:bg-surface-muted"
              >
                Editar Viagem
              </Link>
            </div>
          )}
          {/* Delete button: only dono/admin, only planejada */}
          {(usuario.role === 'dono' || usuario.role === 'admin') && viagem.status === 'planejada' && (
            <div className="mt-4">
              <ViagemDeleteButton viagemId={viagem.id} />
            </div>
          )}
          {/* Invalidar button: dono/admin, any status except cancelada */}
          {(usuario.role === 'dono' || usuario.role === 'admin') && viagem.status !== 'cancelada' && (
            <div className="mt-4">
              <ViagemInvalidarButton viagemId={viagem.id} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
