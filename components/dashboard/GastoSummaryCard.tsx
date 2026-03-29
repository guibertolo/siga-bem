import { formatBRL } from '@/lib/utils/currency';
import { getGastosMesAtual } from '@/app/(dashboard)/gastos/actions';

const cardStyle: React.CSSProperties = {
  borderRadius: '12px',
  border: '1px solid #E2E8F0',
  backgroundColor: '#FFFFFF',
  padding: '24px',
  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
};

/**
 * Dashboard card showing total gastos for the current month.
 * Server component — fetches data directly.
 * Values computed in centavos, displayed in BRL.
 */
export async function GastoSummaryCard() {
  const { total } = await getGastosMesAtual();

  return (
    <div style={cardStyle}>
      <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1B3A4B' }}>Gastos</h3>
      <p
        style={{
          marginTop: '8px',
          fontSize: '30px',
          fontWeight: 700,
          color: '#2C5F7C',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {formatBRL(total)}
      </p>
      <p style={{ marginTop: '4px', fontSize: '14px', color: '#64748B' }}>Este mes</p>
    </div>
  );
}
