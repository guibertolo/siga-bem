import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUsuario } from '@/lib/auth/get-user-role';
import { createClient } from '@/lib/supabase/server';
import { formatBRL } from '@/lib/utils/currency';
import { InvalidarViagemForm } from '@/components/viagens/InvalidarViagemForm';

interface InvalidarPageProps {
  params: Promise<{ id: string }>;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export default async function InvalidarViagemPage({ params }: InvalidarPageProps) {
  const { id } = await params;
  const usuario = await getCurrentUsuario();

  if (!usuario) redirect('/login');
  if (usuario.role === 'motorista') redirect('/viagens');

  const supabase = await createClient();
  const { data: viagem } = await supabase
    .from('viagem')
    .select('id, origem, destino, status, data_saida, valor_total, motorista ( nome )')
    .eq('id', id)
    .single();

  if (!viagem || viagem.status === 'cancelada') notFound();

  const mot = viagem.motorista as unknown as { nome: string } | null;

  return (
    <div className="w-full min-w-0 max-w-lg mx-auto">
      <div className="mb-6">
        <Link
          href="/viagens"
          className="inline-flex items-center gap-2 text-sm text-primary-500 transition-colors hover:text-primary-700 min-h-[48px]"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Voltar para viagens
        </Link>
      </div>

      <h2 className="text-xl sm:text-2xl font-bold text-danger mb-4">Invalidar Viagem</h2>

      <div className="rounded-lg border border-danger/20 bg-alert-danger-bg p-4 mb-6">
        <p className="text-base font-semibold text-primary-900">
          {viagem.origem} &rarr; {viagem.destino}
        </p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-primary-500">
          <span>Motorista: <span className="font-medium text-primary-700">{mot?.nome ?? 'Desconhecido'}</span></span>
          <span>Data: <span className="font-medium text-primary-700">{formatDate(viagem.data_saida)}</span></span>
          <span>Valor: <span className="font-medium text-primary-700">{formatBRL(viagem.valor_total)}</span></span>
        </div>
        <p className="mt-2 text-sm text-danger font-medium">
          Situacao atual: {viagem.status}
        </p>
      </div>

      <InvalidarViagemForm viagemId={id} />
    </div>
  );
}
