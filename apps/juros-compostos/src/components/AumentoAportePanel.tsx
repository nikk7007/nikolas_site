import { useMemo } from "react";
import type { RatePeriod } from "../lib/finance";
import { monthlyRate, simulateStaged } from "../lib/finance";
import { fmtBRL } from "../lib/format";
import { CurrencyField, RateField, TermField } from "./fields";
import { GrowthChart } from "./GrowthChart";
import { WealthTable } from "./WealthTable";

export interface AporteStage {
  id: string;
  aporte: number;
  meses: number;
}

export interface AumentoAporteState {
  inicial: number;
  taxa: number;
  taxaPeriodo: RatePeriod;
  stages: AporteStage[];
}

interface AumentoAportePanelProps {
  state: AumentoAporteState;
  onChange: (s: AumentoAporteState) => void;
}

export function AumentoAportePanel({ state, onChange }: AumentoAportePanelProps) {
  const im = monthlyRate(state.taxa, state.taxaPeriodo);
  const data = useMemo(
    () =>
      simulateStaged(
        state.inicial,
        im,
        state.stages.map((s) => ({ aporte: s.aporte, months: s.meses })),
      ),
    [state.inicial, im, state.stages],
  );
  const last = data[data.length - 1];
  const ok = Number.isFinite(last.total);

  const updateStage = (id: string, patch: Partial<AporteStage>) =>
    onChange({
      ...state,
      stages: state.stages.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    });

  const addStage = () => {
    const prev = state.stages[state.stages.length - 1];
    onChange({
      ...state,
      stages: [...state.stages, { id: crypto.randomUUID(), aporte: prev?.aporte ?? 500, meses: 12 }],
    });
  };

  const removeStage = (id: string) => {
    if (state.stages.length <= 1) return;
    onChange({ ...state, stages: state.stages.filter((s) => s.id !== id) });
  };

  return (
    <div>
      <div className="calc-form">
        <CurrencyField
          id="aum-inicial"
          label="Valor inicial"
          value={state.inicial}
          onChange={(v) => onChange({ ...state, inicial: v })}
        />
        <RateField
          id="aum-taxa"
          taxa={state.taxa}
          periodo={state.taxaPeriodo}
          onChange={(taxa, taxaPeriodo) => onChange({ ...state, taxa, taxaPeriodo })}
        />
      </div>

      <div className="stage-list">
        {state.stages.map((stage, i) => (
          <fieldset className="comp-group" key={stage.id}>
            <legend>Estágio {i + 1}</legend>
            <div className="comp-fields">
              <CurrencyField
                id={`aum-aporte-${stage.id}`}
                label="Aporte mensal"
                value={stage.aporte}
                onChange={(v) => updateStage(stage.id, { aporte: v })}
              />
              <TermField
                id={`aum-meses-${stage.id}`}
                label="Duração (meses)"
                value={stage.meses}
                onChange={(v) => updateStage(stage.id, { meses: v })}
              />
            </div>
            <button
              type="button"
              className="stage-remove"
              disabled={state.stages.length <= 1}
              onClick={() => removeStage(stage.id)}
            >
              Remover estágio
            </button>
          </fieldset>
        ))}
      </div>

      <button type="button" className="stage-add" onClick={addStage}>
        + Adicionar estágio
      </button>

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
        Cada estágio começa de onde o anterior parou; aportes contam no fim de cada mês.
        Valores nominais, sem inflação ou impostos.
      </p>
    </div>
  );
}
