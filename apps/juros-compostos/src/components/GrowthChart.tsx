import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonthPoint } from "../lib/finance";
import { CHART_COLORS, sampleMonths, yearTicks } from "../lib/chart";
import { fmtBRL, fmtBRLCompact, fmtMonths } from "../lib/format";
import { useReducedMotion } from "../lib/useReducedMotion";

const { slate: SLATE, slateSoft: SLATE_SOFT, sand: SAND, grid: GRID } = CHART_COLORS;

interface GrowthChartProps {
  data: MonthPoint[];
  /** Linha de referência da meta (modo meta). */
  metaLine?: number;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ payload: MonthPoint }>;
}

function ChartTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="chart-tip">
      <p className="chart-tip-title">{p.month === 0 ? "Início" : fmtMonths(p.month)}</p>
      <p><i style={{ background: SLATE }} /> Aportado: <b>{fmtBRL(p.invested)}</b></p>
      <p><i style={{ background: SAND }} /> Juros: <b>{fmtBRL(p.interest)}</b></p>
      <p className="chart-tip-total">Patrimônio: <b>{fmtBRL(p.total)}</b></p>
    </div>
  );
}

/** Área empilhada: total aportado (ardósia) + juros acumulados (areia). */
export function GrowthChart({ data, metaLine }: GrowthChartProps) {
  const reduced = useReducedMotion();

  const sampled = useMemo(() => sampleMonths(data), [data]);
  const ticks = useMemo(() => yearTicks(sampled[sampled.length - 1].month), [sampled]);

  return (
    <div className="chart-box">
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={sampled} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis
            dataKey="month"
            ticks={ticks}
            tickFormatter={(m: number) => `${m / 12}a`}
            tick={{ fill: SLATE_SOFT, fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: GRID }}
          />
          <YAxis
            tickFormatter={(v: number) => fmtBRLCompact(v)}
            tick={{ fill: SLATE_SOFT, fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={78}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: SLATE_SOFT, strokeDasharray: "3 3" }} />
          <Area
            type="monotone"
            dataKey="invested"
            name="Total aportado"
            stackId="1"
            stroke={SLATE_SOFT}
            strokeWidth={1.5}
            fill={SLATE}
            fillOpacity={0.55}
            isAnimationActive={!reduced}
          />
          <Area
            type="monotone"
            dataKey="interest"
            name="Juros acumulados"
            stackId="1"
            stroke={SAND}
            strokeWidth={1.5}
            fill={SAND}
            fillOpacity={0.35}
            isAnimationActive={!reduced}
          />
          {metaLine !== undefined && (
            <ReferenceLine
              y={metaLine}
              stroke={SAND}
              strokeDasharray="6 4"
              label={{ value: "meta", fill: SAND, fontSize: 12, position: "insideTopRight" }}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
      <div className="chart-legend" aria-hidden="true">
        <span><i style={{ background: SLATE, borderColor: SLATE_SOFT }} /> Total aportado</span>
        <span><i style={{ background: `${SAND}59`, borderColor: SAND }} /> Juros acumulados</span>
      </div>
    </div>
  );
}
