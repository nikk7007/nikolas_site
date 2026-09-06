// Matemática de juros compostos com aporte mensal.
// Convenção: aporte entra no FIM de cada mês (anuidade ordinária), taxa constante.

export type RatePeriod = "aa" | "am";

/** Converte a taxa digitada (em %) pra taxa mensal decimal. */
export function monthlyRate(taxaPct: number, periodo: RatePeriod): number {
  const t = taxaPct / 100;
  return periodo === "aa" ? Math.pow(1 + t, 1 / 12) - 1 : t;
}

/** Taxa anual decimal equivalente à taxa mensal decimal. */
export function annualRate(im: number): number {
  return Math.pow(1 + im, 12) - 1;
}

/** Valor futuro de p0 + aporte mensal após n meses. */
export function futureValue(p0: number, aporte: number, im: number, months: number): number {
  if (im === 0) return p0 + aporte * months;
  const f = Math.pow(1 + im, months);
  return p0 * f + aporte * ((f - 1) / im);
}

export interface MonthPoint {
  month: number;
  invested: number;
  /** Juros acumulados desde o início. */
  interest: number;
  /** Juros creditados só neste mês. */
  monthInterest: number;
  total: number;
}

/** Evolução mês a mês (inclui o mês 0 = ponto de partida). */
export function simulate(p0: number, aporte: number, im: number, months: number): MonthPoint[] {
  const out: MonthPoint[] = [{ month: 0, invested: p0, interest: 0, monthInterest: 0, total: p0 }];
  let total = p0;
  for (let m = 1; m <= months; m++) {
    const gain = total * im;
    total += gain + aporte;
    const invested = p0 + aporte * m;
    out.push({ month: m, invested, interest: total - invested, monthInterest: gain, total });
  }
  return out;
}

/** Aporte mensal necessário pra sair de p0 e chegar em meta após n meses (≥ 0). */
export function requiredAporte(meta: number, p0: number, im: number, months: number): number {
  if (months <= 0) return Infinity;
  if (im === 0) return Math.max(0, (meta - p0) / months);
  const f = Math.pow(1 + im, months);
  return Math.max(0, ((meta - p0 * f) * im) / (f - 1));
}

/** Meses até atingir a meta (0 se já atingida; Infinity se inatingível). */
export function monthsToMeta(meta: number, p0: number, aporte: number, im: number): number {
  if (p0 >= meta) return 0;
  if (im === 0) return aporte > 0 ? Math.ceil((meta - p0) / aporte) : Infinity;
  if (aporte <= 0 && p0 <= 0) return Infinity;
  const n = Math.log((meta * im + aporte) / (p0 * im + aporte)) / Math.log(1 + im);
  return Number.isFinite(n) && n > 0 ? Math.ceil(n) : Infinity;
}
