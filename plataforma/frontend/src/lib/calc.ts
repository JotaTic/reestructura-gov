/**
 * Cálculos replicados en frontend para feedback inmediato.
 * El backend es la fuente de verdad (vuelve a calcular al guardar).
 *
 * Fórmula oficial (Instructivo FP 24/04/2024):
 *   TE = [(Tmin + 4·TU + Tmax) / 6] × 1.07
 */
export const HOURS_PER_MONTH = 167;
export const FATIGUE = 1.07;

export function standardTime(tmin: number, tu: number, tmax: number): number {
  const base = (tmin + 4 * tu + tmax) / 6;
  return +(base * FATIGUE).toFixed(4);
}

export function hhMonth(frequency: number, te: number): number {
  return +(frequency * te).toFixed(4);
}

export function positionsFromHours(hours: number): number {
  if (hours <= 0) return 0;
  return Math.ceil(hours / HOURS_PER_MONTH);
}

export function num(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}
