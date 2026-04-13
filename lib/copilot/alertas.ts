/**
 * Assistente FrotaViva — alertas proativos.
 *
 * Queries diretas no Supabase (sem LLM, zero custo de API).
 * Exibidos no empty state do chat pra o dono ver o que precisa
 * de atencao sem ter que perguntar.
 */

import { createClient } from '@/lib/supabase/server';
import { getMultiEmpresaContext } from '@/lib/queries/multi-empresa';

export interface Alerta {
  tipo: 'critico' | 'atencao' | 'info';
  icone: string;
  titulo: string;
  detalhe: string;
  pergunta: string; // pergunta sugerida pro chat
}

function todayIso(): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function getAlertasProativos(): Promise<Alerta[]> {
  const alertas: Alerta[] = [];

  try {
    const supabase = await createClient();
    const multiCtx = await getMultiEmpresaContext();
    const empresaIds = multiCtx.empresaIds;

    if (empresaIds.length === 0) return alertas;

    const hoje = todayIso();
    const em30dias = addDays(hoje, 30);
    // 1. CNH vencida (critico)
    const { data: cnhVencidas } = await supabase
      .from('motorista')
      .select('nome, cnh_validade')
      .eq('status', 'ativo')
      .in('empresa_id', empresaIds)
      .not('cnh_validade', 'is', null)
      .lt('cnh_validade', hoje);

    if (cnhVencidas && cnhVencidas.length > 0) {
      alertas.push({
        tipo: 'critico',
        icone: '!',
        titulo: `${cnhVencidas.length} motorista${cnhVencidas.length > 1 ? 's' : ''} com CNH vencida`,
        detalhe: cnhVencidas.map((m) => m.nome).join(', '),
        pergunta: 'Quais motoristas estao com CNH vencida?',
      });
    }

    // 2. CNH vencendo em 30 dias (atencao)
    const { data: cnhVencendo } = await supabase
      .from('motorista')
      .select('nome, cnh_validade')
      .eq('status', 'ativo')
      .in('empresa_id', empresaIds)
      .not('cnh_validade', 'is', null)
      .gte('cnh_validade', hoje)
      .lte('cnh_validade', em30dias);

    if (cnhVencendo && cnhVencendo.length > 0) {
      alertas.push({
        tipo: 'atencao',
        icone: '!',
        titulo: `${cnhVencendo.length} CNH vencendo nos proximos 30 dias`,
        detalhe: cnhVencendo.map((m) => m.nome).join(', '),
        pergunta: 'Quais motoristas estao com CNH vencendo?',
      });
    }

    // 3. Caminhoes parados (sem viagem concluida nos ultimos 7 dias)
    const { data: caminhoes } = await supabase
      .from('caminhao')
      .select('id, placa, modelo')
      .in('empresa_id', empresaIds);

    if (caminhoes && caminhoes.length > 0) {
      const seteDiasAtras = addDays(hoje, -7);
      const { data: viagensRecentes } = await supabase
        .from('viagem')
        .select('caminhao_id')
        .in('empresa_id', empresaIds)
        .gte('data_saida', seteDiasAtras)
        .in('status', ['em_andamento', 'concluida']);

      const caminhoesAtivos = new Set(
        (viagensRecentes ?? []).map((v: { caminhao_id: string }) => v.caminhao_id),
      );
      const parados = caminhoes.filter((c) => !caminhoesAtivos.has(c.id));

      if (parados.length > 0) {
        alertas.push({
          tipo: 'atencao',
          icone: '!',
          titulo: `${parados.length} caminhao${parados.length > 1 ? 'es' : ''} parado${parados.length > 1 ? 's' : ''} ha mais de 7 dias`,
          detalhe: parados.map((c) => `${c.placa} (${c.modelo})`).join(', '),
          pergunta: 'Tem caminhao parado?',
        });
    }
    }

    // 4. Gasto de combustivel acima da media (motorista gastando 20%+ acima)
    const mesPassadoInicio = (() => {
      const d = new Date(hoje + 'T00:00:00Z');
      d.setUTCMonth(d.getUTCMonth() - 1);
      d.setUTCDate(1);
      return d.toISOString().slice(0, 10);
    })();
    const mesPassadoFim = (() => {
      const d = new Date(hoje + 'T00:00:00Z');
      d.setUTCDate(0); // ultimo dia do mes anterior
      return d.toISOString().slice(0, 10);
    })();

    const { data: categorias } = await supabase
      .from('categoria_gasto')
      .select('id, nome')
      .ilike('nome', '%combust%')
      .limit(1);

    if (categorias && categorias.length > 0) {
      const catId = categorias[0].id;

      const { data: gastosComb } = await supabase
        .from('gasto')
        .select('motorista_id, valor')
        .eq('categoria_id', catId)
        .in('empresa_id', empresaIds)
        .gte('data', mesPassadoInicio)
        .lte('data', mesPassadoFim);

      if (gastosComb && gastosComb.length > 0) {
        const porMotorista = new Map<string, number>();
        for (const g of gastosComb) {
          porMotorista.set(g.motorista_id, (porMotorista.get(g.motorista_id) ?? 0) + g.valor);
        }

        if (porMotorista.size >= 2) {
          const valores = Array.from(porMotorista.values());
          const media = valores.reduce((a, b) => a + b, 0) / valores.length;

          const { data: motoristasData } = await supabase
            .from('motorista')
            .select('id, nome')
            .in('empresa_id', empresaIds);

          const motLookup = new Map<string, string>();
          for (const m of (motoristasData ?? [])) motLookup.set(m.id, m.nome);

          const acima = Array.from(porMotorista.entries())
            .filter(([, val]) => val > media * 1.2)
            .map(([id, val]) => ({
              nome: motLookup.get(id) ?? 'desconhecido',
              pct: Math.round(((val - media) / media) * 100),
            }));

          if (acima.length > 0) {
            alertas.push({
              tipo: 'atencao',
              icone: '!',
              titulo: `${acima.length} motorista${acima.length > 1 ? 's' : ''} gastando combustivel acima da media`,
              detalhe: acima.map((m) => `${m.nome} (${m.pct}% acima)`).join(', '),
              pergunta: 'Qual motorista mais gastao do mes passado?',
            });
          }
        }
      }
    }

    return alertas;
  } catch (error) {
    console.error('[copilot] alertas failed:', error instanceof Error ? error.message : error);
    return alertas; // Retorna o que conseguiu, nunca quebra a pagina
  }
}
