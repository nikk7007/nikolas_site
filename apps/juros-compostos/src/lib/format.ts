// Formatação e parsing pt-BR.

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

const brlCompactFmt = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

const num = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

const pctFmt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

export function fmtBRL(v: number): string {
  return Number.isFinite(v) ? brl.format(v) : "—";
}

export function fmtBRLCompact(v: number): string {
  return Number.isFinite(v) ? brlCompactFmt.format(v) : "—";
}

/** Número pt-BR sem símbolo de moeda (pros inputs). */
export function fmtNum(v: number): string {
  return Number.isFinite(v) ? num.format(v) : "";
}

export function fmtPct(v: number): string {
  return `${pctFmt.format(v)}%`;
}

/** Parseia "1.234,56" → 1234.56. NaN se vazio/inválido. */
export function parseNum(s: string): number {
  const clean = s.replace(/[^\d,]/g, "").replace(/\./g, "").replace(",", ".");
  if (clean === "" || clean === ".") return NaN;
  return Number(clean);
}

/** "27 meses" → "2 anos e 3 meses". */
export function fmtMonths(m: number): string {
  if (!Number.isFinite(m)) return "—";
  const anos = Math.floor(m / 12);
  const meses = m % 12;
  const a = anos === 1 ? "1 ano" : `${anos} anos`;
  const me = meses === 1 ? "1 mês" : `${meses} meses`;
  if (anos === 0) return me;
  if (meses === 0) return a;
  return `${a} e ${me}`;
}
