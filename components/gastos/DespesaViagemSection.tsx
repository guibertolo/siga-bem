'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createGasto } from '@/app/(dashboard)/gastos/actions';
import { ComprovantesUpload } from '@/components/gastos/ComprovantesUpload';
import { cn } from '@/lib/utils/cn';
import { maskCurrency } from '@/lib/utils/mask-currency';
import type { CategoriaGastoOption } from '@/types/categoria-gasto';
import type { GastoFormData } from '@/types/gasto';

interface DespesaViagemSectionProps {
  viagemId: string;
  empresaId: string;
  motoristaId: string;
  caminhaoId: string;
  categorias: CategoriaGastoOption[];
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Collapsible inline form for registering non-fuel expenses inside trip detail page.
 * Follows the same expand/collapse pattern as AbastecimentoSection.
 * Only rendered when viagem.status === 'em_andamento'.
 */
export function DespesaViagemSection({
  viagemId,
  empresaId,
  motoristaId,
  caminhaoId,
  categorias,
}: DespesaViagemSectionProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [createdGastoId, setCreatedGastoId] = useState<string | null>(null);
  const uploadRef = useRef<HTMLDivElement>(null);

  // Scroll to upload section when gasto is created
  useEffect(() => {
    if (createdGastoId && uploadRef.current) {
      uploadRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [createdGastoId]);

  // Form state
  const [categoriaId, setCategoriaId] = useState('');
  const [valor, setValor] = useState('');
  const [data, setData] = useState(todayISO());
  const [descricao, setDescricao] = useState('');

  // Filter out Combustivel
  const filteredCategorias = categorias.filter(
    (c) => c.nome.toLowerCase() !== 'combustivel',
  );

  function resetForm() {
    setCategoriaId('');
    setValor('');
    setData(todayISO());
    setDescricao('');
    setServerError(null);
    setSuccessMsg(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    setSuccessMsg(null);

    if (!categoriaId) {
      setServerError('Selecione uma categoria.');
      return;
    }
    if (!valor) {
      setServerError('Informe o valor.');
      return;
    }
    if (!data) {
      setServerError('Informe a data.');
      return;
    }

    startTransition(async () => {
      const formData: GastoFormData = {
        categoria_id: categoriaId,
        motorista_id: motoristaId,
        caminhao_id: caminhaoId,
        viagem_id: viagemId,
        valor,
        data,
        descricao,
      };

      const result = await createGasto(formData);

      if (!result.success) {
        const errorMsg = result.error
          ?? (result.fieldErrors
            ? Object.values(result.fieldErrors).filter(Boolean).join('. ')
            : 'Erro ao registrar despesa.');
        setServerError(errorMsg);
        return;
      }

      const gastoId = result.gasto?.id ?? null;
      setSuccessMsg('Despesa registrada! Anexe o comprovante se desejar.');
      setCreatedGastoId(gastoId);
      resetForm();
      // NÃO chamar router.refresh() aqui — resetaria o state do createdGastoId
      // O refresh acontece quando o usuário clica "Concluir"
    });
  }

  const inputClass =
    'w-full rounded-lg border border-surface-border bg-surface-card px-4 py-3 text-base outline-none transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500';

  return (
    <div className="rounded-lg border border-surface-border bg-surface-card p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium uppercase tracking-wide text-primary-500">
          Despesas
        </h3>
        <button
          type="button"
          onClick={() => {
            if (expanded) {
              resetForm();
            }
            setExpanded(!expanded);
          }}
          className={cn(
            'inline-flex items-center gap-2 rounded-lg px-4 py-3 text-base font-semibold min-h-[48px] transition-colors',
            expanded
              ? 'border border-surface-border bg-surface-muted text-primary-700 hover:bg-surface-hover'
              : 'bg-btn-primary text-white hover:bg-btn-primary-hover focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
          )}
        >
          {expanded ? (
            <>
              <svg className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Fechar
            </>
          ) : (
            <>
              <svg className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Registrar Despesa
            </>
          )}
        </button>
      </div>

      {expanded && (
        <div className="mt-6 border-t border-surface-border pt-6">
          {/* Post-creation: show upload + concluir */}
          {createdGastoId ? (
            <div ref={uploadRef} className="space-y-4">
              <div className="rounded-lg border border-success/20 bg-success/5 p-3 text-sm font-medium text-success">
                {successMsg}
              </div>

              <ComprovantesUpload
                gastoId={createdGastoId}
                empresaId={empresaId}
                comprovantes={[]}
              />

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setCreatedGastoId(null);
                    setSuccessMsg(null);
                    setExpanded(false);
                    router.refresh();
                  }}
                  className={cn(
                    'inline-flex items-center justify-center gap-2 rounded-lg bg-btn-primary px-6 py-3 text-base font-semibold text-white min-h-[48px] transition-colors',
                    'hover:bg-btn-primary-hover',
                  )}
                >
                  Concluir
                </button>
              </div>
            </div>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {serverError && (
              <div className="rounded-lg border border-danger/20 bg-alert-danger-bg p-3 text-sm text-danger">
                {serverError}
              </div>
            )}

            {/* Categoria + Data */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="despesa-categoria" className="mb-2 block text-base font-medium text-primary-900">
                  Tipo de Gasto <span className="text-danger">*</span>
                </label>
                <select
                  id="despesa-categoria"
                  value={categoriaId}
                  onChange={(e) => setCategoriaId(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Selecione o tipo</option>
                  {filteredCategorias.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="despesa-data" className="mb-2 block text-base font-medium text-primary-900">
                  Data <span className="text-danger">*</span>
                </label>
                <input
                  id="despesa-data"
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            {/* Valor */}
            <div>
              <label htmlFor="despesa-valor" className="mb-2 block text-base font-medium text-primary-900">
                Valor (R$) <span className="text-danger">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base text-primary-500">R$</span>
                <input
                  id="despesa-valor"
                  type="text"
                  inputMode="numeric"
                  placeholder="0,00"
                  value={valor}
                  onChange={(e) => setValor(maskCurrency(e.target.value))}
                  className={cn(inputClass, 'pl-10')}
                />
              </div>
            </div>

            {/* Descricao */}
            <div>
              <label htmlFor="despesa-descricao" className="mb-2 block text-base font-medium text-primary-900">
                Descrição              </label>
              <textarea
                id="despesa-descricao"
                rows={2}
                maxLength={1000}
                placeholder="Detalhes adicionais (opcional)"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                className={inputClass}
              />
            </div>

            {/* Submit */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isPending}
                className={cn(
                  'inline-flex items-center justify-center gap-2 rounded-lg bg-btn-primary px-6 py-3 text-base font-semibold text-white min-h-[48px] transition-colors',
                  'hover:bg-btn-primary-hover focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
                  isPending && 'cursor-not-allowed opacity-50',
                )}
              >
                <svg className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {isPending ? 'Salvando...' : 'Registrar'}
              </button>
            </div>
          </form>
          )}
        </div>
      )}
    </div>
  );
}
