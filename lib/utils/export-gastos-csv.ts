/**
 * CSV export utility for gastos.
 * Story 2.3 — AC9: Exportacao CSV para dono/admin.
 *
 * Values are formatted in BRL (centavos / 100) for human readability.
 */

interface GastoCsvRow {
  data: string;
  categoria_nome: string;
  motorista_nome: string;
  caminhao_placa: string | null;
  valor: number; // centavos
  descricao: string | null;
}

/**
 * Generate a CSV string from gastos data.
 * Uses semicolon delimiter for Brazilian Excel compatibility.
 */
export function generateGastosCsv(gastos: GastoCsvRow[]): string {
  const header = 'Data;Categoria;Motorista;Caminhao;Valor (R$);Descricao';

  const rows = gastos.map((g) => {
    const data = formatDateBr(g.data);
    const categoria = escapeCsvField(g.categoria_nome);
    const motorista = escapeCsvField(g.motorista_nome);
    const caminhao = g.caminhao_placa ?? '';
    const valor = (g.valor / 100).toFixed(2).replace('.', ',');
    const descricao = escapeCsvField(g.descricao ?? '');

    return `${data};${categoria};${motorista};${caminhao};${valor};${descricao}`;
  });

  // BOM for UTF-8 recognition in Excel
  return `\uFEFF${header}\n${rows.join('\n')}`;
}

function formatDateBr(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

function escapeCsvField(value: string): string {
  if (value.includes(';') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
