import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Trocar Senha',
};

export default function TrocarSenhaLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
