/**
 * Calculation helpers for viagem (trip) values.
 *
 * All monetary values in centavos (integers).
 */

/**
 * Calculate the motorista payment amount from total value and percentage.
 *
 * @param valorTotalCentavos - Total trip value in centavos
 * @param percentual - Payment percentage (e.g., 25.50 for 25.5%)
 * @returns Payment amount in centavos (rounded)
 */
export function calcularValorMotorista(
  valorTotalCentavos: number,
  percentual: number,
): number {
  return Math.round((valorTotalCentavos * percentual) / 100);
}

/**
 * Calculate distance traveled from km_saida and km_chegada.
 *
 * @param kmSaida - Odometer at departure
 * @param kmChegada - Odometer at arrival
 * @returns Distance in km, or null if either value is missing
 */
export function calcularDistancia(
  kmSaida?: number | null,
  kmChegada?: number | null,
): number | null {
  if (kmSaida == null || kmChegada == null) return null;
  return kmChegada - kmSaida;
}

// ---------------------------------------------------------------------------
// Gap calculation (Story 20.1)
// ---------------------------------------------------------------------------

/**
 * Minimal viagem shape needed for gap calculation.
 * Viagens must be sorted by data_saida ascending.
 */
export interface ViagemParaGap {
  id: string;
  km_saida: number | null;
  km_chegada: number | null;
}

export interface GapItem {
  gap_km: number;
  de_viagem_id: string;
  para_viagem_id: string;
  outlier: boolean;
}

export interface GapStats {
  media: number;
  stddev: number;
  n: number;
}

export interface KmRealCaminhao {
  trip_km: number;
  gap_km: number;
  gap_km_sem_outliers: number;
  total_km: number;
  taxa_vazio_pct: number;
}

/**
 * Calculate mean and standard deviation for an array of numbers.
 * Returns { media: 0, stddev: 0, n: 0 } for empty arrays.
 */
export function calcularGapStats(valores: number[]): GapStats {
  const n = valores.length;
  if (n === 0) return { media: 0, stddev: 0, n: 0 };

  const media = valores.reduce((sum, v) => sum + v, 0) / n;

  if (n < 2) return { media, stddev: 0, n };

  const variance = valores.reduce((sum, v) => sum + (v - media) ** 2, 0) / (n - 1);
  const stddev = Math.sqrt(variance);

  return { media, stddev, n };
}

/**
 * Calculate gaps between consecutive trips of the same truck.
 *
 * Input must be sorted by data_saida ascending. Viagens without
 * km_saida or km_chegada are skipped (legacy data without odometer).
 *
 * Outlier detection uses dynamic thresholds (no hardcoded values):
 * - N >= 5 gaps: outlier if gap > mean + 2*stddev
 * - 2 <= N < 5: outlier if gap > 50% of average trip km
 * - N < 2: no outlier detection (insufficient data)
 */
export function calcularGaps(viagens: ViagemParaGap[]): GapItem[] {
  // Filter to viagens with valid odometer readings
  const valid = viagens.filter(
    (v): v is ViagemParaGap & { km_saida: number; km_chegada: number } =>
      v.km_saida != null && v.km_chegada != null && v.km_chegada >= v.km_saida,
  );

  if (valid.length < 2) return [];

  // First pass: compute raw gaps
  const rawGaps: Array<{ gap_km: number; de_viagem_id: string; para_viagem_id: string }> = [];
  for (let i = 0; i < valid.length - 1; i++) {
    const gap = valid[i + 1].km_saida - valid[i].km_chegada;
    rawGaps.push({
      gap_km: Math.max(0, gap),
      de_viagem_id: valid[i].id,
      para_viagem_id: valid[i + 1].id,
    });
  }

  // Compute threshold for outlier detection
  const gapValues = rawGaps.map((g) => g.gap_km);
  const stats = calcularGapStats(gapValues);

  let isOutlier: (gap: number) => boolean;

  if (stats.n >= 5) {
    // Statistical: mean + 2*stddev
    const threshold = stats.media + 2 * stats.stddev;
    isOutlier = (gap) => gap > threshold;
  } else if (stats.n >= 2) {
    // Proportional: 50% of average trip km
    const tripKms = valid.map((v) => v.km_chegada - v.km_saida);
    const avgTripKm = tripKms.reduce((s, k) => s + k, 0) / tripKms.length;
    const threshold = avgTripKm * 0.5;
    isOutlier = (gap) => gap > threshold;
  } else {
    isOutlier = () => false;
  }

  return rawGaps.map((g) => ({
    ...g,
    outlier: isOutlier(g.gap_km),
  }));
}

/**
 * Calculate real km for a truck including gaps between trips.
 *
 * - trip_km: sum of km_chegada - km_saida per trip
 * - gap_km: sum of all gaps (including outliers)
 * - gap_km_sem_outliers: sum excluding outlier gaps (for reliable metrics)
 * - total_km: trip_km + gap_km_sem_outliers (reliable total)
 * - taxa_vazio_pct: gap_km_sem_outliers / total_km * 100
 */
export function calcularKmRealCaminhao(viagens: ViagemParaGap[]): KmRealCaminhao {
  const valid = viagens.filter(
    (v) => v.km_saida != null && v.km_chegada != null && v.km_chegada >= v.km_saida,
  );

  const tripKm = valid.reduce(
    (sum, v) => sum + ((v.km_chegada ?? 0) - (v.km_saida ?? 0)),
    0,
  );

  const gaps = calcularGaps(viagens);
  const gapKm = gaps.reduce((sum, g) => sum + g.gap_km, 0);
  const gapKmSemOutliers = gaps
    .filter((g) => !g.outlier)
    .reduce((sum, g) => sum + g.gap_km, 0);

  const totalKm = tripKm + gapKmSemOutliers;
  const taxaVazioPct = totalKm > 0
    ? Math.round((gapKmSemOutliers / totalKm) * 10000) / 100
    : 0;

  return {
    trip_km: tripKm,
    gap_km: gapKm,
    gap_km_sem_outliers: gapKmSemOutliers,
    total_km: totalKm,
    taxa_vazio_pct: taxaVazioPct,
  };
}
