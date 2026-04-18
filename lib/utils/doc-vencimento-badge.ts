/**
 * Document expiration badge logic for caminhao CRLV.
 *
 * 3-level alert system:
 * - Verde (ok): doc_vencimento > hoje + 30 dias
 * - Amarelo (vencendo): entre hoje e hoje + 30 dias
 * - Vermelho (vencido): doc_vencimento < hoje
 * - null: sem data cadastrada (sem alerta)
 */

export type DocBadgeLevel = 'ok' | 'vencendo' | 'vencido';

export interface DocBadgeInfo {
  level: DocBadgeLevel;
  label: string;
  bgClass: string;
  fgClass: string;
}

/**
 * Calculates the badge level for a document expiration date.
 *
 * @param docVencimento - ISO date string (YYYY-MM-DD) or null
 * @param today - Reference date (defaults to now, injectable for tests)
 * @returns Badge info or null if no date
 */
export function getDocBadgeInfo(
  docVencimento: string | null,
  today?: Date,
): DocBadgeInfo | null {
  if (!docVencimento) return null;

  const ref = today ?? new Date();
  const todayStart = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const vencimento = new Date(docVencimento + 'T00:00:00');

  if (isNaN(vencimento.getTime())) return null;

  const diffMs = vencimento.getTime() - todayStart.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      level: 'vencido',
      label: 'Vencido',
      bgClass: 'bg-badge-danger-bg',
      fgClass: 'text-badge-danger-fg',
    };
  }

  if (diffDays <= 30) {
    return {
      level: 'vencendo',
      label: `Vence em ${diffDays}d`,
      bgClass: 'bg-badge-warning-bg',
      fgClass: 'text-badge-warning-fg',
    };
  }

  return {
    level: 'ok',
    label: 'Em dia',
    bgClass: 'bg-badge-success-bg',
    fgClass: 'text-badge-success-fg',
  };
}
