import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUsuario } from '@/lib/auth/get-user-role';
import { createClient } from '@/lib/supabase/server';
import { DadosPerfil } from '@/components/perfil/DadosPerfil';
import { TrocaSenhaForm } from '@/components/perfil/TrocaSenhaForm';

export const metadata: Metadata = {
  title: 'Meu Perfil',
};

export default async function PerfilPage() {
  const usuario = await getCurrentUsuario();

  if (!usuario) {
    redirect('/login');
  }

  // Fetch empresa name if user has an active empresa
  let empresaNome: string | null = null;
  if (usuario.empresa_id) {
    const supabase = await createClient();
    const { data: empresa } = await supabase
      .from('empresa')
      .select('nome_fantasia, razao_social')
      .eq('id', usuario.empresa_id)
      .single();

    empresaNome = empresa?.nome_fantasia || empresa?.razao_social || null;
  }

  return (
    <div className="w-full max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-primary-900">Meu Perfil</h1>

      <DadosPerfil
        nome={usuario.nome}
        email={usuario.email}
        telefone={usuario.telefone}
        role={usuario.role}
        empresaNome={empresaNome}
      />

      <TrocaSenhaForm />
    </div>
  );
}
