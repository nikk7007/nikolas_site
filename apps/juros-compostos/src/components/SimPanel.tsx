import { useMemo } from "react";
import type { RatePeriod } from "../lib/finance";
import { monthlyRate, simulate } from "../lib/finance";
import { fmtBRL } from "../lib/format";
import { CurrencyField, RateField, TermField } from "./fields";
import { GrowthChart } from "./GrowthChart";
import { WealthTable } from "./WealthTable";

export interface SimState {
  inicial: number;
  aporte: number;
  taxa: number;
  taxaPeriodo: RatePeriod;
  anos: number;
}

interface SimPanelProps {
  state: SimState;
  onChange: (s: SimState) => void;
}

export function SimPanel({ state, onChange }: SimPanelProps) {
  const im = monthlyRate(state.taxa, state.taxaPeriodo);
  const data = useMemo(
    () => simulate(state.inicial, state.aporte, im, state.anos * 12),
    [state.inicial, state.aporte, im, state.anos],
  );
  const last = data[data.length - 1];
  const ok = Number.isFinite(last.total);

  return (
    <div>
      <div className="calc-form">
        <CurrencyField
          id="sim-inicial"
          label="Valor inicial"
          value={state.inicial}
          onChange={(v) => onChange({ ...state, inicial: v })}
        />
        <CurrencyField
          id="sim-aporte"
          label="Aporte mensal"
          value={state.aporte}
          onChange={(v) => onChange({ ...state, aporte: v })}
        />
        <RateField
          id="sim-taxa"
          taxa={state.taxa}
          periodo={state.taxaPeriodo}
          onChange={(taxa, taxaPeriodo) => onChange({ ...state, taxa, taxaPeriodo })}
        />
        <TermField
          id="sim-anos"
          value={state.anos}
          onChange={(v) => onChange({ ...state, anos: v })}
        />
      </div>

      <div className="stats">
        <div className="stat">
          <span className="stat-label">Total aportado</span>
          <span className="stat-value">{ok ? fmtBRL(last.invested) : "—"}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Juros acumulados</span>
          <span className="stat-value">{ok ? fmtBRL(last.interest) : "—"}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Patrimônio final</span>
          <span className="stat-value strong">{ok ? fmtBRL(last.total) : "—"}</span>
        </div>
      </div>

      {ok && <GrowthChart data={data} />}
      {ok && <WealthTable data={data} />}
      <p className="calc-footnote">
        Aportes contam no fim de cada mês; taxa constante ao longo do período.
        Valores nominais, sem inflação ou impostos.
      </p>
    </div>
  );
}
