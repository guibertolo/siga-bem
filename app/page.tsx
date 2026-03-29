import Link from 'next/link';

export default function HomePage() {
  return (
    <main
      style={{
        display: 'flex',
        minHeight: '100vh',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F8FAFC',
        padding: '48px 24px',
      }}
    >
      <div style={{ width: '100%', maxWidth: '480px', textAlign: 'center' }}>
        <h1
          style={{
            fontSize: '48px',
            fontWeight: 800,
            color: '#1B3A4B',
            letterSpacing: '-1px',
            lineHeight: 1.1,
            marginBottom: '12px',
          }}
        >
          Siga Bem
        </h1>
        <p
          style={{
            fontSize: '20px',
            fontWeight: 500,
            color: '#2C5F7C',
            marginBottom: '48px',
            whiteSpace: 'nowrap',
          }}
        >
          Sua frota no controle
        </p>

        <Link
          href="/login"
          style={{
            display: 'inline-block',
            width: '100%',
            maxWidth: '320px',
            padding: '16px 32px',
            backgroundColor: '#2C5F7C',
            color: '#FFFFFF',
            fontSize: '18px',
            fontWeight: 600,
            borderRadius: '8px',
            textDecoration: 'none',
            textAlign: 'center',
          }}
        >
          Entrar
        </Link>
      </div>
    </main>
  );
}
