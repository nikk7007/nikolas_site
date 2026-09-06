import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART_COLORS as C, sampleMonths, yearTicks } from "../lib/chart";
import { fmtBRL, fmtBRLCompact, fmtMonths } from "../lib/format";
import { useReducedMotion } from "../lib/useReducedMotion";

export interface ComparePoint {
  month: number;
  a: number;
  b: number;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ payload: ComparePoint }>;
}

function CompareTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="chart-tip">
      <p className="chart-tip-title">{p.month === 0 ? "Início" : fmtMonths(p.month)}</p>
      <p><i style={{ background: C.slateSoft }} /> Cenário A: <b>{fmtBRL(p.a)}</b></p>
      <p><i style={{ background: C.sand }} /> Cenário B: <b>{fmtBRL(p.b)}</b></p>
      <p className="chart-tip-total">Diferença: <b>{fmtBRL(Math.abs(p.a - p.b))}</b></p>
    </div>
  );
}

/** Duas linhas de patrimônio total, cenário A (ardósia) × B (areia). */
export function CompareChart({ data }: { data: ComparePoint[] }) {
  const reduced = useReducedMotion();
  const sampled = useMemo(() => sampleMonths(data), [data]);
  const ticks = useMemo(() => yearTicks(sampled[sampled.length - 1].month), [sampled]);

  return (
    <div className="chart-box">
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={sampled} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <CartesianGrid stroke={C.grid} vertical={false} />
          <XAxis
            dataKey="month"
            ticks={ticks}
            tickFormatter={(m: number) => `${m / 12}a`}
            tick={{ fill: C.slateSoft, fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: C.grid }}
          />
          <YAxis
            tickFormatter={(v: number) => fmtBRLCompact(v)}
            tick={{ fill: C.slateSoft, fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={78}
          />
          <Tooltip content={<CompareTooltip />} cursor={{ stroke: C.slateSoft, strokeDasharray: "3 3" }} />
          <Line
            type="monotone"
            dataKey="a"
            name="Cenário A"
            stroke={C.slateSoft}
            strokeWidth={2}
            dot={false}
            isAnimationActive={!reduced}
          />
          <Line
            type="monotone"
            dataKey="b"
            name="Cenário B"
            stroke={C.sand}
            strokeWidth={2}
            dot={false}
            isAnimationActive={!reduced}
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="chart-legend" aria-hidden="true">
        <span><i style={{ background: C.slateSoft }} /> Cenário A</span>
        <span><i style={{ background: C.sand }} /> Cenário B</span>
      </div>
    </div>
  );
}
