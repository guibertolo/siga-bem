import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

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

  return (
    <div className="min-h-screen bg-surface-background">
      <header className="border-b border-surface-border bg-surface-card px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <h1 className="text-xl font-bold text-primary-900">Cegonheiros</h1>
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="text-sm text-primary-700 transition-colors hover:text-primary-900"
            >
              Sair
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-6">{children}</main>
    </div>
  );
}
