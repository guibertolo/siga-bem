import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { formatBRL } from '@/lib/utils/currency';

const cardStyle: React.CSSProperties = {
  display: 'block',
  borderRadius: '12px',
  border: '1px solid #E2E8F0',
  backgroundColor: '#FFFFFF',
  padding: '24px',
  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  textDecoration: 'none',
  color: 'inherit',
};

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
    <Link href="/fechamentos?status=aberto" style={cardStyle}>
      <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1B3A4B' }}>Fechamentos Pendentes</h3>
      <p
        style={{
          marginTop: '8px',
          fontSize: '30px',
          fontWeight: 700,
          color: '#2C5F7C',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {count}
      </p>
      <p style={{ marginTop: '4px', fontSize: '14px', color: '#64748B' }}>
        {count > 0 ? `Total: ${formatBRL(totalCentavos)}` : 'Nenhum fechamento aberto'}
      </p>
    </Link>
  );
}
