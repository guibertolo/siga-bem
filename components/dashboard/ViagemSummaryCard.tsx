import { getViagensEmAndamento } from '@/app/(dashboard)/viagens/actions';

const cardStyle: React.CSSProperties = {
  borderRadius: '12px',
  border: '1px solid #E2E8F0',
  backgroundColor: '#FFFFFF',
  padding: '24px',
  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
};

export async function ViagemSummaryCard() {
  const { count, error } = await getViagensEmAndamento();

  return (
    <div style={cardStyle}>
      <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1B3A4B' }}>Viagens</h3>
      <p
        style={{
          marginTop: '8px',
          fontSize: '30px',
          fontWeight: 700,
          color: '#2C5F7C',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {error ? '\u2014' : count}
      </p>
      <p style={{ marginTop: '4px', fontSize: '14px', color: '#64748B' }}>Em andamento</p>
    </div>
  );
}
