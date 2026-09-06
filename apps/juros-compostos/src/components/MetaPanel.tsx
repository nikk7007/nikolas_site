import { useMemo } from "react";
import type { RatePeriod } from "../lib/finance";
import { monthlyRate } from "../lib/finance";
import { buildGrid } from "../lib/nice";
import { fmtBRL, fmtMonths } from "../lib/format";
import { CurrencyField, RateField } from "./fields";
import { MetaMatrix, type Scenario } from "./MetaMatrix";
import { ScenarioDetail } from "./ScenarioDetail";

export interface MetaState {
  alvo: number;
  inicial: number;
  taxa: number;
  taxaPeriodo: RatePeriod;
}

interface MetaPanelProps {
  state: MetaState;
  selected: Scenario | null;
  onChange: (s: MetaState) => void;
  onSelect: (s: Scenario | null) => void;
}

export function MetaPanel({ state, selected, onChange, onSelect }: MetaPanelProps) {
  const im = monthlyRate(state.taxa, state.taxaPeriodo);

  const jaBateu = state.alvo > 0 && state.inicial >= state.alvo;
  const grid = useMemo(
    () => (state.alvo > 0 && !jaBateu ? buildGrid(state.alvo, state.inicial, im) : null),
    [state.alvo, state.inicial, im, jaBateu],
  );

  // Cenário selecionado só vale enquanto existir na matriz atual.
  const validSelected =
    selected && grid && grid.rows.includes(selected.aporte) && grid.cols.includes(selected.anos)
      ? selected
      : null;

  return (
    <div>
      <div className="calc-form">
        <CurrencyField
          id="meta-alvo"
          label="Quero chegar a"
          value={state.alvo}
          onChange={(v) => {
            onChange({ ...state, alvo: v });
            onSelect(null);
          }}
        />
        <CurrencyField
          id="meta-inicial"
          label="Já tenho"
          value={state.inicial}
          onChange={(v) => {
            onChange({ ...state, inicial: v });
            onSelect(null);
          }}
        />
        <RateField
          id="meta-taxa"
          taxa={state.taxa}
          periodo={state.taxaPeriodo}
          onChange={(taxa, taxaPeriodo) => {
            onChange({ ...state, taxa, taxaPeriodo });
            onSelect(null);
          }}
        />
      </div>

      {state.alvo <= 0 && (
        <p className="calc-empty">Diga quanto você quer juntar e a matriz aparece aqui.</p>
      )}

      {jaBateu && (
        <p className="calc-empty">
          Você já tem {fmtBRL(state.inicial)}: meta de {fmtBRL(state.alvo)} batida.
          Aumente a meta pra planejar o próximo passo.
        </p>
      )}

      {!jaBateu && state.alvo > 0 && !grid && (
        <p className="calc-empty">
          Só o rendimento dos seus {fmtBRL(state.inicial)} já chega a {fmtBRL(state.alvo)} em
          menos de 3 anos, sem precisar de aporte.
        </p>
      )}

      {grid && (
        <>
          <p className="matrix-hint">
            Cada célula mostra o patrimônio projetado. As destacadas atingem a meta:
            toque numa pra ver a evolução.
          </p>
          {grid.zeroAporteMonths !== null && (
            <p className="matrix-hint">
              Só o rendimento do valor inicial já chega lá em{" "}
              {fmtMonths(grid.zeroAporteMonths)}.
            </p>
          )}
          <MetaMatrix
            grid={grid}
            meta={state.alvo}
            inicial={state.inicial}
            im={im}
            selected={validSelected}
            onSelect={onSelect}
          />
          {validSelected && (
            <ScenarioDetail
              scenario={validSelected}
              meta={state.alvo}
              inicial={state.inicial}
              im={im}
            />
          )}
          <p className="calc-footnote">
            Aportes contam no fim de cada mês; taxa constante ao longo do período.
            Valores nominais, sem inflação ou impostos.
          </p>
        </>
      )}
    </div>
  );
}
