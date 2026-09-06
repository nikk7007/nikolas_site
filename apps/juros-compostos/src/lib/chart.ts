// Helpers compartilhados pelos gráficos.

/** Mensal até 2 anos; acima disso, amostra semestral/anual + ponto final. */
export function sampleMonths<T extends { month: number }>(data: T[]): T[] {
  const last = data[data.length - 1];
  if (last.month <= 24) return data;
  const step = last.month <= 120 ? 6 : 12;
  return data.filter((p) => p.month % step === 0 || p.month === last.month);
}

/** Ticks do eixo X em meses cheios de ano, espaçados conforme o prazo. */
export function yearTicks(lastMonth: number): number[] {
  const anos = Math.ceil(lastMonth / 12);
  const step = anos <= 10 ? 1 : anos <= 20 ? 2 : 5;
  const ticks: number[] = [];
  for (let a = 0; a <= anos; a += step) ticks.push(a * 12);
  return ticks;
}

export const CHART_COLORS = {
  slate: "#2e4057",
  slateSoft: "#7c93ac",
  sand: "#d8cbb8",
  grid: "rgba(124, 147, 172, 0.15)",
};
