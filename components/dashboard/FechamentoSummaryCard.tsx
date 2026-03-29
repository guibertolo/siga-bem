import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { formatBRL } from '@/lib/utils/currency';

/**
 * Dashboard card showing pending fechamentos count and total value.
 * Story 4.1 — T7: Card "Fechamentos Pendentes" no dashboard principal.
 */
export async function FechamentoSummaryCard() {
  const supabase = await createClient();

  const [countResult, valueResult] = await Promise.all([
    supabase
      .from('fechamento')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'aberto'),
    supabase
      .from('fechamento')
      .select('saldo_motorista')
      .eq('status', 'aberto'),
  ]);

  const count = countResult.count ?? 0;
  const totalCentavos = (valueResult.data ?? []).reduce(
    (sum: number, f: { saldo_motorista: number }) => sum + f.saldo_motorista,
    0,
  );

  return (
    <Link
      href="/fechamentos?status=aberto"
      className="block rounded-card border border-slate-200 bg-surface-card p-6 shadow-sm no-underline text-inherit hover:border-primary-500 transition-colors"
    >
      <h3 className="text-lg font-semibold text-primary-900">Fechamentos Pendentes</h3>
      <p className="mt-2 text-3xl font-bold text-primary-700 tabular-nums">
        {count}
      </p>
      <p className="mt-1 text-sm text-slate-500">
        {count > 0 ? `Total: ${formatBRL(totalCentavos)}` : 'Nenhum fechamento aberto'}
      </p>
    </Link>
  );
}
