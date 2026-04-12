'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { parseBrlInputToCentavos } from '@/lib/utils/currency';
import { maskCurrency } from '@/lib/utils/mask-currency';
import { criarAcertoAvulso } from '@/app/(dashboard)/fechamentos/actions';

interface AcertoAvulsoFormProps {
  motoristas: Array<{ id: string; nome: string }>;
}

export function AcertoAvulsoForm({ motoristas }: AcertoAvulsoFormProps) {
  const [isPending, startTransition] = useTransition();

  const [motoristaId, setMotoristaId] = useState('');
  const [valorMasked, setValorMasked] = useState('');
  const [descricao, setDescricao] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [successData, setSuccessData] = useState<{ fechamentoId: string } | null>(null);

  const motoristaNome = motoristas.find((m) => m.id === motoristaId)?.nome ?? '';
  const valorCentavos = parseBrlInputToCentavos(valorMasked);

  function handleValorChange(e: React.ChangeEvent<HTMLInputElement>) {
    const masked = maskCurrency(e.target.value);
    setValorMasked(masked);
  }

  function handleRevisar() {
    setError(null);

    if (!motoristaId) {
      setError('Selecione um motorista');
      return;
    }

    if (!valorCentavos || valorCentavos <= 0) {
      setError('Informe um valor maior que zero');
      return;
    }

    if (descricao.trim().length < 3) {
      setError('Descrição deve ter pelo menos 3 caracteres');
      return;
    }

    if (descricao.trim().length > 200) {
      setError('Descrição deve ter no máximo 200 caracteres');
      return;
    }

    setShowPreview(true);
  }

  function handleCancelarPreview() {
    setShowPreview(false);
  }

  function handleConfirmar() {
    if (!valorCentavos) return;

    setError(null);

    startTransition(async () => {
      const result = await criarAcertoAvulso({
        motorista_id: motoristaId,
        valor: valorCentavos,
        descricao: descricao.trim(),
      });

      if (!result.success) {
        setError(result.error ?? 'Erro ao criar lançamento avulso');
        setShowPreview(false);
        return;
      }

      setSuccessData({ fechamentoId: result.fechamentoId! });
    });
  }

  // Success state
  if (successData) {
    return (
      <div className="space-y-4 rounded-lg border border-success/20 bg-alert-success-bg p-6">
        <div className="flex items-center gap-3">
          <svg className="h-6 w-6 text-success" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-lg font-semibold text-success">Lançamento avulso criado</p>
        </div>
        <p className="text-base text-primary-700">
          R$ {valorMasked} lançado para {motoristaNome}.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href={`/fechamentos/${successData.fechamentoId}`}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-btn-primary px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-btn-primary-hover min-h-[48px]"
          >
            Ver Acerto
          </Link>
          <Link
            href="/fechamentos"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-surface-border px-5 py-3 text-base font-semibold text-primary-700 transition-colors hover:bg-surface-hover min-h-[48px]"
          >
            Voltar para Acertos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-danger/20 bg-alert-danger-bg p-4 text-base text-danger">
          {error}
        </div>
      )}

      {!showPreview && (
        <div className="space-y-4 rounded-lg border border-surface-border bg-surface-card p-6">
          <h3 className="text-lg font-semibold text-primary-900">Dados do Lançamento</h3>

          {/* Motorista */}
          <div>
            <label htmlFor="motorista-avulso" className="mb-2 block text-base font-medium text-primary-700">
              Motorista *
            </label>
            <select
              id="motorista-avulso"
              value={motoristaId}
              onChange={(e) => setMotoristaId(e.target.value)}
              className="w-full rounded-lg border border-surface-border bg-surface-card px-4 py-3 text-base text-primary-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 min-h-[48px]"
            >
              <option value="">Selecione um motorista</option>
              {motoristas.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Valor */}
          <div>
            <label htmlFor="valor-avulso" className="mb-2 block text-base font-medium text-primary-700">
              Valor (R$) *
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-base text-primary-500">
                R$
              </span>
              <input
                id="valor-avulso"
                type="text"
                inputMode="numeric"
                value={valorMasked}
                onChange={handleValorChange}
                placeholder="0,00"
                className="w-full rounded-lg border border-surface-border bg-surface-card py-3 pl-12 pr-4 text-base tabular-nums text-primary-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 min-h-[48px]"
              />
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label htmlFor="descricao-avulso" className="mb-2 block text-base font-medium text-primary-700">
              Descrição *
            </label>
            <input
              id="descricao-avulso"
              type="text"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              maxLength={200}
              placeholder="Ex: Adiantamento, bonificação, ajuste..."
              className="w-full rounded-lg border border-surface-border bg-surface-card px-4 py-3 text-base text-primary-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 min-h-[48px]"
            />
            <p className="mt-1 text-sm text-primary-500">
              {descricao.length}/200 caracteres
            </p>
          </div>

          <button
            type="button"
            onClick={handleRevisar}
            disabled={isPending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-btn-primary px-4 py-3 text-base font-semibold text-white min-h-[48px] transition-colors hover:bg-btn-primary-hover disabled:opacity-50"
          >
            Revisar Lançamento
          </button>
        </div>
      )}

      {showPreview && (
        <div className="space-y-4 rounded-lg border border-surface-border bg-surface-card p-6">
          <h3 className="text-lg font-semibold text-primary-900">Confirmar Lançamento</h3>

          <p className="text-base text-primary-700">
            Você vai lançar <strong className="text-primary-900">R$ {valorMasked}</strong> para{' '}
            <strong className="text-primary-900">{motoristaNome}</strong> com descrição{' '}
            &ldquo;<span className="text-primary-900">{descricao.trim()}</span>&rdquo;.
          </p>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleCancelarPreview}
              disabled={isPending}
              className="flex-1 rounded-lg border border-surface-border bg-surface-card px-4 py-3 text-base font-medium text-primary-700 min-h-[48px] transition-colors hover:bg-surface-muted disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmar}
              disabled={isPending}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-success px-4 py-3 text-base font-semibold text-white min-h-[48px] transition-colors hover:bg-success/90 disabled:opacity-50"
            >
              <svg className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {isPending ? 'Confirmando...' : 'Confirmar Lançamento'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
