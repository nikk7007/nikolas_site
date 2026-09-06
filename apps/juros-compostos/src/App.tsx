import { useState } from "react";
import { SimPanel, type SimState } from "./components/SimPanel";
import { MetaPanel, type MetaState } from "./components/MetaPanel";
import { ComparePanel, type CompareState } from "./components/ComparePanel";
import type { Scenario } from "./components/MetaMatrix";

type Mode = "sim" | "meta" | "comp";

export default function App() {
  const [mode, setMode] = useState<Mode>("sim");
  const [sim, setSim] = useState<SimState>({
    inicial: 1000,
    aporte: 500,
    taxa: 10,
    taxaPeriodo: "aa",
    anos: 10,
  });
  const [meta, setMeta] = useState<MetaState>({
    alvo: 100000,
    inicial: 0,
    taxa: 10,
    taxaPeriodo: "aa",
  });
  const [selected, setSelected] = useState<Scenario | null>(null);
  const [comp, setComp] = useState<CompareState>({
    taxa: 10,
    taxaPeriodo: "aa",
    anos: 10,
    a: { inicial: 0, aporte: 1000 },
    b: { inicial: 20000, aporte: 500 },
  });

  return (
    <div className="calc">
      <div className="calc-tabs" role="tablist" aria-label="Modo da calculadora">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "sim"}
          onClick={() => setMode("sim")}
        >
          Simular aportes
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "meta"}
          onClick={() => setMode("meta")}
        >
          Quero chegar a…
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "comp"}
          onClick={() => setMode("comp")}
        >
          Comparar
        </button>
      </div>

      {mode === "sim" && <SimPanel state={sim} onChange={setSim} />}
      {mode === "meta" && (
        <MetaPanel
          state={meta}
          selected={selected}
          onChange={setMeta}
          onSelect={setSelected}
        />
      )}
      {mode === "comp" && <ComparePanel state={comp} onChange={setComp} />}
    </div>
  );
}
