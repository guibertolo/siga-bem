import { redirect } from 'next/navigation';
import { getCurrentUsuario } from '@/lib/auth/get-user-role';
import { getAlertasProativos } from '@/lib/copilot/alertas';
import ChatUI from '@/app/(dashboard)/assistente/chat-ui';

export default async function AssistentePage() {
  const usuario = await getCurrentUsuario();

  if (!usuario) {
    redirect('/login');
  }

  if (usuario.role === 'motorista') {
    redirect('/dashboard');
  }

  const alertas = await getAlertasProativos();

  return <ChatUI alertas={alertas} />;
}
