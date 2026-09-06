import { IMaskInput } from "react-imask";
import type { RatePeriod } from "../lib/finance";
import { monthlyRate, annualRate } from "../lib/finance";
import { fmtNum, fmtPct } from "../lib/format";

// Inputs não-controlados: o iMask formata enquanto digita (pt-BR) e o
// onAccept devolve o número puro pro estado. Nada externo escreve neles,
// então não há value controlado — só o defaultValue formatado no mount.

const MONEY_MAX = 1e12;

function accepted(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

interface CurrencyFieldProps {
  id: string;
  label: string;
  value: number;
  max?: number;
  onChange: (v: number) => void;
}

/** Input de dinheiro com máscara pt-BR (1.234,56). */
export function CurrencyField({ id, label, value, max = MONEY_MAX, onChange }: CurrencyFieldProps) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="field-money">
        <span aria-hidden="true">R$</span>
        <IMaskInput
          mask={Number}
          scale={2}
          thousandsSeparator="."
          radix=","
          mapToRadix={["."]}
          normalizeZeros
          min={0}
          max={max}
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          defaultValue={fmtNum(value)}
          unmask
          onAccept={(v) => onChange(Math.min(accepted(v), max))}
        />
      </div>
    </div>
  );
}

interface RateFieldProps {
  id: string;
  taxa: number;
  periodo: RatePeriod;
  onChange: (taxa: number, periodo: RatePeriod) => void;
}

/** Taxa de juros com alternância % a.a. / % a.m. e nota da taxa equivalente. */
export function RateField({ id, taxa, periodo, onChange }: RateFieldProps) {
  const im = monthlyRate(taxa, periodo);
  const equiv =
    periodo === "aa"
      ? `≈ ${fmtPct(im * 100)} a.m.`
      : `≈ ${fmtPct(annualRate(im) * 100)} a.a.`;

  return (
    <div className="field">
      <label htmlFor={id}>Taxa de juros</label>
      <div className="field-rate">
        <IMaskInput
          mask={Number}
          scale={2}
          thousandsSeparator="."
          radix=","
          mapToRadix={["."]}
          normalizeZeros
          min={0}
          max={500}
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          defaultValue={fmtNum(taxa)}
          unmask
          onAccept={(v) => onChange(accepted(v), periodo)}
        />
        <div className="rate-toggle" role="group" aria-label="Período da taxa">
          <button
            type="button"
            aria-pressed={periodo === "aa"}
            onClick={() => onChange(taxa, "aa")}
          >
            a.a.
          </button>
          <button
            type="button"
            aria-pressed={periodo === "am"}
            onClick={() => onChange(taxa, "am")}
          >
            a.m.
          </button>
        </div>
      </div>
      <p className="field-note">{taxa > 0 ? equiv : " "}</p>
    </div>
  );
}

interface TermFieldProps {
  id: string;
  value: number;
  onChange: (v: number) => void;
}

/** Prazo em anos, 1–50. */
export function TermField({ id, value, onChange }: TermFieldProps) {
  return (
    <div className="field">
      <label htmlFor={id}>Prazo (anos)</label>
      <IMaskInput
        mask={Number}
        scale={0}
        min={0}
        max={50}
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        defaultValue={String(value)}
        unmask
        onAccept={(v) => onChange(Math.min(Math.max(Math.round(accepted(v)), 1), 50))}
      />
    </div>
  );
}
