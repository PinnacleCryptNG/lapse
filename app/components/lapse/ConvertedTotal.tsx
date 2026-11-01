import { useActionQuery } from "@agent-native/core/client/hooks";
import { useEffect, useState } from "react";

import { money } from "./format";

const KEY = "lapse:display-currency";
const FALLBACK = ["USD", "NGN", "GBP", "EUR", "CAD", "AUD", "INR", "KES", "GHS", "ZAR", "JPY"];

type Totals = { currency: string; amountMinor: number }[];
type Rates = { rates: Record<string, number>; currencies: string[]; updated: string };

export function ConvertedTotal({ totals, Figure }: { totals: Totals; Figure: (p: { currency: string; minor: number }) => React.ReactNode }) {
  const [cur, setCur] = useState("USD");
  useEffect(() => {
    const saved = window.localStorage.getItem(KEY);
    if (saved) setCur(saved);
  }, []);
  const { data } = useActionQuery("exchange-rates", {} as any);
  const fx = data as Rates | undefined;
  const choose = (c: string) => {
    setCur(c);
    window.localStorage.setItem(KEY, c);
  };
  const convertible = fx && totals.every((t) => fx.rates[t.currency]) && fx.rates[cur];
  const total = convertible ? totals.reduce((sum, t) => sum + (t.amountMinor / fx!.rates[t.currency]!) * fx!.rates[cur]!, 0) : null;
  const approx = totals.some((t) => t.currency !== cur);
  return (
    <div className="lp-conv">
      <div className="lp-conv__fig">
        {total !== null ? (
          <>
            {approx && <span className="lp-conv__approx">≈</span>}
            <Figure currency={cur} minor={Math.round(total)} />
          </>
        ) : (
          totals.map((t) => <Figure key={t.currency} currency={t.currency} minor={t.amountMinor} />)
        )}
        <select className="lp-conv__pick" value={cur} aria-label="Show total in" onChange={(e) => choose(e.target.value)}>
          {(fx?.currencies ?? FALLBACK).map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      {approx && total !== null && (
        <span className="lp-save__extra">
          Billed as {totals.map((t) => money(t.amountMinor, t.currency)).join(" + ")} · converted at today&apos;s rate
        </span>
      )}
    </div>
  );
}
