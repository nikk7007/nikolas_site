// "Bons números" pra matriz do modo meta: escolhe aportes redondos (linhas)
// e horizontes de tempo (colunas) que garantem a fronteira da meta cruzando
// a matriz — sempre há cenários que batem a meta e cenários que não.

import { monthsToMeta, requiredAporte } from "./finance";

const NICE = [1, 1.5, 2, 3, 5, 7.5, 10];
const HORIZONS = [1, 2, 3, 5, 8, 10, 15, 20, 25, 30];
const MAX_COLS = 6;

/** Arredonda pro valor mais próximo da escada 1–1,5–2–3–5–7,5 × 10^k. */
export function niceRound(x: number): number {
  if (!(x > 0)) return 0;
  const k = Math.floor(Math.log10(x));
  const base = Math.pow(10, k);
  const m = x / base;
  let best = NICE[0];
  for (const n of NICE) {
    if (Math.abs(m - n) < Math.abs(m - best)) best = n;
  }
  return best * base;
}

function niceStepUp(x: number): number {
  const k = Math.floor(Math.log10(x));
  const base = Math.pow(10, k);
  const m = x / base + 1e-9;
  for (const n of NICE) if (n > m) return n * base;
  return 10 * base;
}

export interface MetaGrid {
  /** Aportes mensais (linhas), crescentes. */
  rows: number[];
  /** Horizontes em anos (colunas), crescentes. */
  cols: number[];
  /** Só o valor inicial já chega na meta (sem aporte) — nº de meses, se sim. */
  zeroAporteMonths: number | null;
}

export function buildGrid(meta: number, p0: number, im: number): MetaGrid | null {
  const aFast = requiredAporte(meta, p0, im, 3 * 12); // bate a meta em 3 anos
  if (!Number.isFinite(aFast) || aFast <= 0) return null; // inicial resolve sozinho em ≤ 3 anos

  const aSlow25 = requiredAporte(meta, p0, im, 25 * 12);
  const zeroAporteMonths =
    aSlow25 <= 0 ? monthsToMeta(meta, p0, 0, im) : null;
  const aSlow = Math.max(aSlow25, aFast / 50, 50);

  // 6 pontos em escala log entre aSlow e aFast, arredondados na escada.
  const set = new Set<number>();
  for (let i = 0; i < 6; i++) {
    set.add(niceRound(aSlow * Math.pow(aFast / Math.max(aSlow, 1), i / 5)));
  }
  let rows = [...set].filter((v) => v > 0).sort((a, b) => a - b);
  while (rows.length < 5) rows.push(niceStepUp(rows[rows.length - 1]));
  if (zeroAporteMonths !== null) rows = [0, ...rows.slice(0, 5)];

  // Colunas: do tempo do maior aporte até o do menor (limitado a 30 anos).
  const tFast = monthsToMeta(meta, p0, rows[rows.length - 1], im) / 12;
  const tSlowRow = rows.find((r) => r > 0) ?? rows[0];
  const tSlow = monthsToMeta(meta, p0, tSlowRow, im) / 12;

  let lo = 0;
  for (let i = 0; i < HORIZONS.length; i++) if (HORIZONS[i] <= tFast) lo = i;
  let hi = HORIZONS.length - 1;
  for (let i = HORIZONS.length - 1; i >= 0; i--) {
    if (HORIZONS[i] >= Math.min(tSlow, 30)) hi = i;
  }
  if (hi < lo) hi = lo;

  let cols = HORIZONS.slice(lo, hi + 1);
  while (cols.length > MAX_COLS) {
    // afina por dentro, preservando as pontas
    cols = cols.filter((_, i) => i === 0 || i === cols.length - 1 || i % 2 === 1);
  }
  return { rows, cols, zeroAporteMonths };
}
