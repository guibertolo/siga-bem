/**
 * Period range calculation utilities for fechamento.
 * Story 4.1 — AC1: auto-calculate date ranges for semanal/mensal.
 */

/**
 * Calculate the date range for a full month.
 *
 * @param ano - Year (e.g., 2026)
 * @param mes - Month 1-12 (e.g., 3 for March)
 * @returns { inicio: 'YYYY-MM-DD', fim: 'YYYY-MM-DD' }
 */
export function calcularRangeMensal(
  ano: number,
  mes: number,
): { inicio: string; fim: string } {
  const inicio = new Date(ano, mes - 1, 1);
  const fim = new Date(ano, mes, 0); // last day of month
  return {
    inicio: formatDateISO(inicio),
    fim: formatDateISO(fim),
  };
}

/**
 * Calculate the date range for the ISO week containing a reference date.
 * Week starts on Monday, ends on Sunday.
 *
 * @param dataReferencia - Any date within the desired week
 * @returns { inicio: 'YYYY-MM-DD', fim: 'YYYY-MM-DD' }
 */
export function calcularRangeSemanal(
  dataReferencia: Date,
): { inicio: string; fim: string } {
  const d = new Date(dataReferencia);
  const day = d.getDay();
  // getDay: 0=Sunday, 1=Monday, ..., 6=Saturday
  // Offset to Monday: if Sunday (0), go back 6 days; else go back (day - 1)
  const diffToMonday = day === 0 ? 6 : day - 1;
  const inicio = new Date(d);
  inicio.setDate(d.getDate() - diffToMonday);
  const fim = new Date(inicio);
  fim.setDate(inicio.getDate() + 6);
  return {
    inicio: formatDateISO(inicio),
    fim: formatDateISO(fim),
  };
}

/**
 * Get list of month options for a select (current year +/- 1 year).
 */
export function getMonthOptions(): Array<{
  label: string;
  ano: number;
  mes: number;
}> {
  const now = new Date();
  const options: Array<{ label: string; ano: number; mes: number }> = [];
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];

  // From 6 months ago to current month
  for (let offset = -6; offset <= 0; offset++) {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    options.push({
      label: `${monthNames[d.getMonth()]} ${d.getFullYear()}`,
      ano: d.getFullYear(),
      mes: d.getMonth() + 1,
    });
  }

  return options;
}

function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
