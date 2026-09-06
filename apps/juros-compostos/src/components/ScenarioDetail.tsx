import { useEffect, useMemo, useRef } from "react";
import { monthsToMeta, simulate } from "../lib/finance";
import { fmtBRL, fmtMonths } from "../lib/format";
import { useReducedMotion } from "../lib/useReducedMotion";
import { GrowthChart } from "./GrowthChart";
import type { Scenario } from "./MetaMatrix";

interface ScenarioDetailProps {
  scenario: Scenario;
  meta: number;
  inicial: number;
  im: number;
}

/** Painel inline com a evolução do cenário clicado na matriz. */
export function ScenarioDetail({ scenario, meta, inicial, im }: ScenarioDetailProps) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  const data = useMemo(
    () => simulate(inicial, scenario.aporte, im, scenario.anos * 12),
    [inicial, scenario.aporte, im, scenario.anos],
  );
  const last = data[data.length - 1];
  const atinge = monthsToMeta(meta, inicial, scenario.aporte, im);
  const bate = Number.isFinite(atinge) && atinge <= scenario.anos * 12;

  useEffect(() => {
    ref.current?.scrollIntoView({
      behavior: reduced ? "auto" : "smooth",
      block: "nearest",
    });
  }, [scenario.aporte, scenario.anos, reduced]);

  return (
    <div className="scenario" ref={ref}>
      <p className="scenario-head">
        {scenario.aporte === 0 ? (
          <>Sem aporte, só o valor inicial rendendo, </>
        ) : (
          <>Aportando <b>{fmtBRL(scenario.aporte)}/mês</b>, </>
        )}
        em <b>{scenario.anos} {scenario.anos === 1 ? "ano" : "anos"}</b> você chega a{" "}
        <b>{fmtBRL(last.total)}</b>.
      </p>
      <p className="scenario-sub">
        {bate
          ? `Meta de ${fmtBRL(meta)} atingida em ${fmtMonths(atinge)}.`
          : `A meta de ${fmtBRL(meta)} não é atingida nesse cenário.`}
      </p>
      <GrowthChart data={data} metaLine={meta} />
    </div>
  );
}
