import { futureValue } from "../lib/finance";
import type { MetaGrid } from "../lib/nice";
import { fmtBRL, fmtBRLCompact } from "../lib/format";

export interface Scenario {
  aporte: number;
  anos: number;
}

interface MetaMatrixProps {
  grid: MetaGrid;
  meta: number;
  inicial: number;
  im: number;
  selected: Scenario | null;
  onSelect: (s: Scenario) => void;
}

/** Matriz aporte × tempo; células que batem a meta ganham o acento areia. */
export function MetaMatrix({ grid, meta, inicial, im, selected, onSelect }: MetaMatrixProps) {
  return (
    <div className="table-scroll">
      <table className="calc-table matrix">
        <caption className="sr-only">
          Patrimônio projetado por aporte mensal e tempo; células destacadas atingem a meta
        </caption>
        <thead>
          <tr>
            <th scope="col">Aporte / mês</th>
            {grid.cols.map((anos) => (
              <th scope="col" key={anos}>
                {anos} {anos === 1 ? "ano" : "anos"}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.rows.map((aporte) => (
            <tr key={aporte}>
              <th scope="row">{aporte === 0 ? "Sem aporte" : fmtBRL(aporte)}</th>
              {grid.cols.map((anos) => {
                const fv = futureValue(inicial, aporte, im, anos * 12);
                const hits = Number.isFinite(fv) && fv >= meta;
                const isSel = selected?.aporte === aporte && selected?.anos === anos;
                return (
                  <td key={anos}>
                    <button
                      type="button"
                      className={`cell${hits ? " hits" : ""}${isSel ? " sel" : ""}`}
                      aria-pressed={isSel}
                      aria-label={`${
                        aporte === 0 ? "Sem aporte" : `${fmtBRL(aporte)} por mês`
                      } durante ${anos} ${anos === 1 ? "ano" : "anos"}: ${fmtBRL(fv)}${
                        hits ? " — atinge a meta" : ""
                      }`}
                      onClick={() => onSelect({ aporte, anos })}
                    >
                      {fmtBRLCompact(fv)}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
