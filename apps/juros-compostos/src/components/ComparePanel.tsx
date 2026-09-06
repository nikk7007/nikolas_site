import { useMemo } from "react";
import type { RatePeriod } from "../lib/finance";
import { monthlyRate, simulate } from "../lib/finance";
import { CHART_COLORS as C } from "../lib/chart";
import { fmtBRL } from "../lib/format";
import { CurrencyField, RateField, TermField } from "./fields";
import { CompareChart, type ComparePoint } from "./CompareChart";

interface ScenarioInput {
  inicial: number;
  aporte: number;
}

export interface CompareState {
  taxa: number;
  taxaPeriodo: RatePeriod;
  anos: number;
  a: ScenarioInput;
  b: ScenarioInput;
}

interface ComparePanelProps {
  state: CompareState;
  onChange: (s: CompareState) => void;
}

export function ComparePanel({ state, onChange }: ComparePanelProps) {
  const im = monthlyRate(state.taxa, state.taxaPeriodo);
  const months = state.anos * 12;

  const data = useMemo<ComparePoint[]>(() => {
    const da = simulate(state.a.inicial, state.a.aporte, im, months);
    const db = simulate(state.b.inicial, state.b.aporte, im, months);
    return da.map((p, i) => ({ month: p.month, a: p.total, b: db[i].total }));
  }, [state.a.inicial, state.a.aporte, state.b.inicial, state.b.aporte, im, months]);

  const last = data[data.length - 1];
  const ok = Number.isFinite(last.a) && Number.isFinite(last.b);
  const diff = last.a - last.b;

  return (
    <div>
      <div className="calc-form">
        <RateField
          id="comp-taxa"
          taxa={state.taxa}
          periodo={state.taxaPeriodo}
          onChange={(taxa, taxaPeriodo) => onChange({ ...state, taxa, taxaPeriodo })}
        />
        <TermField
          id="comp-anos"
          value={state.anos}
          onChange={(v) => onChange({ ...state, anos: v })}
        />
      </div>

      <div className="comp-grid">
        <fieldset className="comp-group">
          <legend>
            <i style={{ background: C.slateSoft }} aria-hidden="true" /> Cenário A
          </legend>
          <div className="comp-fields">
            <CurrencyField
              id="comp-a-inicial"
              label="Valor inicial"
              value={state.a.inicial}
              onChange={(v) => onChange({ ...state, a: { ...state.a, inicial: v } })}
            />
            <CurrencyField
              id="comp-a-aporte"
              label="Aporte mensal"
              value={state.a.aporte}
              onChange={(v) => onChange({ ...state, a: { ...state.a, aporte: v } })}
            />
          </div>
        </fieldset>
        <fieldset className="comp-group">
          <legend>
            <i style={{ background: C.sand }} aria-hidden="true" /> Cenário B
          </legend>
          <div className="comp-fields">
            <CurrencyField
              id="comp-b-inicial"
              label="Valor inicial"
              value={state.b.inicial}
              onChange={(v) => onChange({ ...state, b: { ...state.b, inicial: v } })}
            />
            <CurrencyField
              id="comp-b-aporte"
              label="Aporte mensal"
              value={state.b.aporte}
              onChange={(v) => onChange({ ...state, b: { ...state.b, aporte: v } })}
            />
          </div>
        </fieldset>
      </div>

      <div className="stats">
        <div className="stat">
          <span className="stat-label">Cenário A no fim</span>
          <span className="stat-value">{ok ? fmtBRL(last.a) : "—"}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Cenário B no fim</span>
          <span className="stat-value">{ok ? fmtBRL(last.b) : "—"}</span>
        </div>
        <div className="stat">
          <span className="stat-label">
            {diff === 0 ? "Diferença" : diff > 0 ? "A na frente" : "B na frente"}
          </span>
          <span className="stat-value strong">{ok ? fmtBRL(Math.abs(diff)) : "—"}</span>
        </div>
      </div>

      {ok && <CompareChart data={data} />}
      <p className="calc-footnote">
        Mesma taxa e prazo pros dois cenários; aportes contam no fim de cada mês.
        Valores nominais, sem inflação ou impostos.
      </p>
    </div>
  );
}
