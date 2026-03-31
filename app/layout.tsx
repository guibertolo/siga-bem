import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import '@/app/globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    default: 'FrotaViva - Gestão de Frotas de Cegonha',
    template: '%s | FrotaViva',
  },
  description:
    'FrotaViva - Plataforma de gestão inteligente para transportadoras de veículos (cegonheiros). Controle viagens, gastos, combustível e fechamentos.',
  keywords: [
    'gestão de frotas',
    'cegonheiro',
    'transporte de veículos',
    'caminhão cegonha',
    'controle de gastos',
    'fechamento financeiro',
  ],
  authors: [{ name: 'FrotaViva' }],
  openGraph: {
    title: 'FrotaViva - Sua frota no controle',
    description: 'Gestão inteligente para transportadoras de veículos',
    type: 'website',
    locale: 'pt_BR',
    siteName: 'FrotaViva',
  },
  robots: {
    index: true,
    follow: true,
  },
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/logos/frotaviva-favicon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/icons/icon-192.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#1B3A4B',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={inter.variable} suppressHydrationWarning>
      <head>
        <link
          rel="preload"
          href="/logos/frotaviva-logo-full.svg"
          as="image"
          type="image/svg+xml"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var theme = localStorage.getItem('frotaviva-theme') || 'system';
                // Migrate legacy key once
                var legacy = localStorage.getItem('siga-bem-theme');
                if (legacy && !localStorage.getItem('frotaviva-theme')) {
                  localStorage.setItem('frotaviva-theme', legacy);
                  localStorage.removeItem('siga-bem-theme');
                  theme = legacy;
                }
                var isDark = theme === 'dark' ||
                  (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                if (isDark) document.documentElement.classList.add('dark');
                if (theme === 'light') document.documentElement.classList.add('light');
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-surface-background font-sans text-primary-900 antialiased overflow-x-hidden">
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
