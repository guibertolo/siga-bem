import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUsuario } from '@/lib/auth/get-user-role';

const sidebarLinkStyle: React.CSSProperties = {
  display: 'block',
  padding: '10px 20px',
  fontSize: '14px',
  color: '#CBD5E1',
  textDecoration: 'none',
  borderRadius: '6px',
  transition: 'background-color 0.15s',
};

const navLinks = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/empresa', label: 'Empresa' },
  { href: '/viagens', label: 'Viagens' },
  { href: '/gastos', label: 'Gastos' },
  { href: '/fechamentos', label: 'Fechamentos' },
  { href: '/financeiro/historico', label: 'Financeiro' },
];

const adminLinks = [
  { href: '/motoristas', label: 'Motoristas' },
  { href: '/caminhoes', label: 'Caminhoes' },
  { href: '/vinculos', label: 'Vinculos' },
  { href: '/usuarios', label: 'Usuarios' },
  { href: '/configuracoes/combustivel', label: 'Combustivel' },
];

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const currentUsuario = await getCurrentUsuario();
  const showAdminLinks = currentUsuario?.role === 'dono' || currentUsuario?.role === 'admin';

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside
        style={{
          width: '240px',
          backgroundColor: '#1B3A4B',
          color: '#FFFFFF',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            padding: '24px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <Link
            href="/dashboard"
            style={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#FFFFFF',
              textDecoration: 'none',
            }}
          >
            Siga Bem
          </Link>
        </div>

        <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} style={sidebarLinkStyle}>
              {link.label}
            </Link>
          ))}

          {showAdminLinks && (
            <>
              <div
                style={{
                  margin: '16px 8px 8px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.4)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Admin
              </div>
              {adminLinks.map((link) => (
                <Link key={link.href} href={link.href} style={sidebarLinkStyle}>
                  {link.label}
                </Link>
              ))}
            </>
          )}
        </nav>

        <div style={{ padding: '16px 12px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              style={{
                width: '100%',
                padding: '10px 20px',
                fontSize: '14px',
                color: '#CBD5E1',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                borderRadius: '6px',
              }}
            >
              Sair
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <header
          style={{
            backgroundColor: '#FFFFFF',
            borderBottom: '1px solid #CBD5E1',
            padding: '16px 32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: '14px', color: '#2C5F7C' }}>
            {user.email}
          </span>
        </header>
        <main style={{ flex: 1, backgroundColor: '#F8FAFC', padding: '32px' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
