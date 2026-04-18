/**
 * Assistente FrotaViva — natural language period parser.
 *
 * Story 9.2 (AC-1). Converts pt-BR expressions like "este mes", "mes passado",
 * "ultima semana", "marco", "ultimos 30 dias" into ISO date ranges
 * (YYYY-MM-DD) anchored to America/Sao_Paulo timezone.
 *
 * Invalid or empty expressions fall back to the last 30 days.
 */

export interface ParsedPeriod {
  startDate: string;
  endDate: string;
  label: string;
}

const MONTH_NAMES_PT: Record<string, number> = {
  janeiro: 0,
  jan: 0,
  fevereiro: 1,
  fev: 1,
  marco: 2,
  'marco ': 2,
  mar: 2,
  abril: 3,
  abr: 3,
  maio: 4,
  mai: 4,
  junho: 5,
  jun: 5,
  julho: 6,
  jul: 6,
  agosto: 7,
  ago: 7,
  setembro: 8,
  set: 8,
  outubro: 9,
  out: 9,
  novembro: 10,
  nov: 10,
  dezembro: 11,
  dez: 11,
};

/**
 * Returns the current date in America/Sao_Paulo as {year, month, day}.
 * Uses Intl.DateTimeFormat with the sv-SE locale (ISO-like output).
 */
function nowInSaoPaulo(): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const [year, month, day] = parts.split('-').map((n) => Number(n));
  return { year, month: month - 1, day };
}

function toIso(year: number, month0: number, day: number): string {
  const y = String(year).padStart(4, '0');
  const m = String(month0 + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function daysInMonth(year: number, month0: number): number {
  return new Date(year, month0 + 1, 0).getDate();
}

function normalize(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function subtractDays(
  year: number,
  month0: number,
  day: number,
  days: number,
): { year: number; month: number; day: number } {
  const d = new Date(Date.UTC(year, month0, day));
  d.setUTCDate(d.getUTCDate() - days);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth(),
    day: d.getUTCDate(),
  };
}

function defaultLast30Days(now = nowInSaoPaulo()): ParsedPeriod {
  const start = subtractDays(now.year, now.month, now.day, 29);
  return {
    startDate: toIso(start.year, start.month, start.day),
    endDate: toIso(now.year, now.month, now.day),
    label: 'ultimos 30 dias',
  };
}

/**
 * Parse a pt-BR period expression into an ISO date range.
 *
 * Supported:
 * - "hoje", "ontem"
 * - "esta semana", "ultima semana", "ultimos 7 dias"
 * - "este mes", "mes passado", "ultimos 30 dias"
 * - Month names: "janeiro" ... "dezembro" (current year)
 * - "ultimos N dias" for any positive integer N
 *
 * Unknown or empty input returns last 30 days.
 */
export function parsePeriod(expression: string): ParsedPeriod {
  if (!expression || typeof expression !== 'string') {
    return defaultLast30Days();
  }

  const now = nowInSaoPaulo();
  const text = normalize(expression);

  if (text === 'hoje') {
    const iso = toIso(now.year, now.month, now.day);
    return { startDate: iso, endDate: iso, label: 'hoje' };
  }

  if (text === 'ontem') {
    const y = subtractDays(now.year, now.month, now.day, 1);
    const iso = toIso(y.year, y.month, y.day);
    return { startDate: iso, endDate: iso, label: 'ontem' };
  }

  if (text === 'este mes' || text === 'mes atual') {
    return {
      startDate: toIso(now.year, now.month, 1),
      endDate: toIso(now.year, now.month, now.day),
      label: 'este mes',
    };
  }

  if (text === 'mes passado' || text === 'mes anterior') {
    const prevMonth0 = now.month === 0 ? 11 : now.month - 1;
    const prevYear = now.month === 0 ? now.year - 1 : now.year;
    return {
      startDate: toIso(prevYear, prevMonth0, 1),
      endDate: toIso(prevYear, prevMonth0, daysInMonth(prevYear, prevMonth0)),
      label: 'mes passado',
    };
  }

  if (text === 'esta semana' || text === 'semana atual') {
    // Week starts Monday. Sao Paulo uses Monday-first by cultural convention.
    const today = new Date(Date.UTC(now.year, now.month, now.day));
    const dayOfWeek = today.getUTCDay(); // 0=Sun, 1=Mon, ...
    const daysSinceMonday = (dayOfWeek + 6) % 7;
    const start = subtractDays(now.year, now.month, now.day, daysSinceMonday);
    return {
      startDate: toIso(start.year, start.month, start.day),
      endDate: toIso(now.year, now.month, now.day),
      label: 'esta semana',
    };
  }

  if (
    text === 'ultima semana' ||
    text === 'semana passada' ||
    text === 'ultimos 7 dias'
  ) {
    const start = subtractDays(now.year, now.month, now.day, 6);
    return {
      startDate: toIso(start.year, start.month, start.day),
      endDate: toIso(now.year, now.month, now.day),
      label: 'ultimos 7 dias',
    };
  }

  if (text === 'ultimos 30 dias' || text === 'ultimo mes') {
    return defaultLast30Days(now);
  }

  // "ultimos N dias" generic
  const ultimosMatch = text.match(/^ultimos\s+(\d+)\s+dias$/);
  if (ultimosMatch) {
    const n = Number(ultimosMatch[1]);
    if (n > 0 && n <= 3650) {
      const start = subtractDays(now.year, now.month, now.day, n - 1);
      return {
        startDate: toIso(start.year, start.month, start.day),
        endDate: toIso(now.year, now.month, now.day),
        label: `ultimos ${n} dias`,
      };
    }
  }

  // "ultimos N meses" / "ultimo N meses" / "N meses atras"
  const ultimosMesesMatch = text.match(/^ultimos?\s+(\d+)\s+mes(?:es)?$/);
  if (ultimosMesesMatch) {
    const n = Number(ultimosMesesMatch[1]);
    if (n > 0 && n <= 24) {
      let startMonth = now.month - n;
      let startYear = now.year;
      while (startMonth < 0) {
        startMonth += 12;
        startYear -= 1;
      }
      return {
        startDate: toIso(startYear, startMonth, 1),
        endDate: toIso(now.year, now.month, now.day),
        label: `ultimos ${n} meses`,
      };
    }
  }

  // "este ano" / "ano atual"
  if (text === 'este ano' || text === 'ano atual') {
    return {
      startDate: toIso(now.year, 0, 1),
      endDate: toIso(now.year, now.month, now.day),
      label: 'este ano',
    };
  }

  // "ano passado"
  if (text === 'ano passado') {
    return {
      startDate: toIso(now.year - 1, 0, 1),
      endDate: toIso(now.year - 1, 11, 31),
      label: 'ano passado',
    };
  }

  // Month name (current year)
  const directMonth = MONTH_NAMES_PT[text];
  if (directMonth !== undefined) {
    return {
      startDate: toIso(now.year, directMonth, 1),
      endDate: toIso(now.year, directMonth, daysInMonth(now.year, directMonth)),
      label: text,
    };
  }

  // Month name with explicit year: "marco de 2025" or "marco 2025"
  const monthYearMatch = text.match(/^([a-z]+)(?:\s+de)?\s+(\d{4})$/);
  if (monthYearMatch) {
    const [, monthWord, yearStr] = monthYearMatch;
    const month0 = MONTH_NAMES_PT[monthWord];
    const year = Number(yearStr);
    if (month0 !== undefined && year >= 2000 && year <= 2100) {
      return {
        startDate: toIso(year, month0, 1),
        endDate: toIso(year, month0, daysInMonth(year, month0)),
        label: `${monthWord} de ${year}`,
      };
    }
  }

  return defaultLast30Days(now);
}
