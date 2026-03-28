import { redirect } from 'next/navigation';
import { getCurrentUsuario } from '@/lib/auth/get-user-role';
import { listUsuarios } from '@/app/(dashboard)/usuarios/actions';
import UsuariosClientPage from '@/app/(dashboard)/usuarios/client-page';

export default async function UsuariosPage() {
  const currentUsuario = await getCurrentUsuario();

  if (!currentUsuario) {
    redirect('/login');
  }

  // Only dono and admin can access this page
  if (currentUsuario.role === 'motorista') {
    redirect('/dashboard');
  }

  const { data: usuarios, error } = await listUsuarios();

  return (
    <UsuariosClientPage
      usuarios={usuarios ?? []}
      currentUsuarioId={currentUsuario.id}
      currentRole={currentUsuario.role}
      error={error}
    />
  );
}
