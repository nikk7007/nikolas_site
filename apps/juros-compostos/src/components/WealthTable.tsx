import { useState } from "react";
import type { MonthPoint } from "../lib/finance";
import { fmtBRL } from "../lib/format";

interface WealthTableProps {
  data: MonthPoint[];
}

interface YearGroup {
  year: number;
  partial: boolean;
  end: MonthPoint;
  months: MonthPoint[];
}

/** Tabela por ano; clicar numa linha abre os 12 meses dela. */
export function WealthTable({ data }: WealthTableProps) {
  const [open, setOpen] = useState<ReadonlySet<number>>(new Set());
  const last = data[data.length - 1];

  const years: YearGroup[] = [];
  for (let y = 1; (y - 1) * 12 < last.month; y++) {
    const months = data.filter((p) => p.month > (y - 1) * 12 && p.month <= y * 12);
    years.push({
      year: y,
      partial: months[months.length - 1].month < y * 12,
      end: months[months.length - 1],
      months,
    });
  }

  const toggle = (year: number) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  };

  return (
    <div className="table-scroll">
      <table className="calc-table">
        <thead>
          <tr>
            <th scope="col">Ano</th>
            <th scope="col">Investido</th>
            <th scope="col">Juros/mês</th>
            <th scope="col">Total</th>
          </tr>
        </thead>
        <tbody>
          {years.map((y) => {
            const isOpen = open.has(y.year);
            return [
              <tr
                key={y.year}
                className="yr-row"
                onClick={() => toggle(y.year)}
              >
                <th scope="row">
                  <button
                    type="button"
                    className="yr-toggle"
                    aria-expanded={isOpen}
                    aria-label={`Ano ${y.year}: ver os meses`}
                  >
                    <span className={`chev${isOpen ? " open" : ""}`} aria-hidden="true">
                      ▸
                    </span>
                    {y.partial ? `${y.year}º ano (parcial)` : y.year}
                  </button>
                </th>
                <td>{fmtBRL(y.end.invested)}</td>
                <td>{fmtBRL(y.end.monthInterest)}</td>
                <td className="strong">{fmtBRL(y.end.total)}</td>
              </tr>,
              ...(isOpen
                ? y.months.map((m) => (
                    <tr key={`m${m.month}`} className="mo-row">
                      <th scope="row">Mês {m.month}</th>
                      <td>{fmtBRL(m.invested)}</td>
                      <td>{fmtBRL(m.monthInterest)}</td>
                      <td>{fmtBRL(m.total)}</td>
                    </tr>
                  ))
                : []),
            ];
          })}
        </tbody>
      </table>
    </div>
  );
}
