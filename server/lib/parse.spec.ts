import { describe, expect, it } from "vitest";

import {
  addCadence,
  cadenceFromGap,
  detectRecurring,
  emailToCandidate,
  findAmounts,
  normalizeMerchant,
  parseCsv,
  parseDate,
  parseEmails,
  parseStatement,
} from "./parse";

describe("parseDate", () => {
  it("reads DD/MM/YYYY, ISO and long-form dates", () => {
    expect(parseDate("03/10/2026")).toBe("2026-10-03");
    expect(parseDate("2026-10-03")).toBe("2026-10-03");
    expect(parseDate("3 Oct 2026")).toBe("2026-10-03");
    expect(parseDate("October 3, 2026")).toBe("2026-10-03");
    expect(parseDate("31/02/2026")).toBeNull();
  });
});

describe("findAmounts", () => {
  it("reads ISO codes and symbols", () => {
    const cases: Array<[string, number, string]> = [
      ["NGN 7,000.00", 700000, "NGN"],
      ["₦1,500", 150000, "NGN"],
      ["£11.99", 1199, "GBP"],
      ["$13.99", 1399, "USD"],
      ["€26,99", 2699, "EUR"],
      ["₹499", 49900, "INR"],
      ["KSh 499", 49900, "KES"],
      ["R$ 29.90", 2990, "BRL"],
      ["R 89.00", 8900, "ZAR"],
      ["11.99 GBP", 1199, "GBP"],
    ];
    for (const [text, minor, cur] of cases) {
      const [a] = findAmounts(text);
      expect(a, text).toMatchObject({ amountMinor: minor, currency: cur });
    }
  });
});

describe("parseStatement", () => {
  it("parses mixed statement lines and skips junk", () => {
    const { charges, skipped } = parseStatement(
      [
        "03 Oct 2026  NFLX*DIGITAL LAGOS        NGN 7,000.00",
        "2026-10-05 SPOTIFY P2A3B4 LONDON £11.99",
        "05/10/2026 UBER *ONE NAIROBI KSh 499",
        "Opening balance",
      ].join("\n"),
    );
    expect(charges).toHaveLength(3);
    expect(charges[0]).toEqual({
      date: "2026-10-03",
      description: "NFLX*DIGITAL LAGOS",
      amountMinor: 700000,
      currency: "NGN",
    });
    expect(charges[2]!.currency).toBe("KES");
    expect(skipped).toEqual(["Opening balance"]);
  });
});

describe("parseCsv", () => {
  it("sniffs headers with comma separators", () => {
    const { charges } = parseCsv(
      'Posted Date,Narration,Amount,Currency\n2026-09-03,"NFLX*DIGITAL LAGOS","7,000.00",NGN\n2026-09-04,CANVA* 1234,12.99,USD',
    );
    expect(charges).toHaveLength(2);
    expect(charges[0]!.amountMinor).toBe(700000);
  });

  it("handles semicolons and reordered columns", () => {
    const { charges } = parseCsv("currency;amount;description;date\nEUR;26,99;ADOBE *CREATIVE CLD;03/09/2026");
    expect(charges[0]).toEqual({
      date: "2026-09-03",
      description: "ADOBE *CREATIVE CLD",
      amountMinor: 2699,
      currency: "EUR",
    });
  });
});

describe("parseEmails", () => {
  it("extracts a trial end and an annual renewal", () => {
    const found = parseEmails(
      "Your 7-day free trial of FocusFlow Pro ends on 4 Nov 2026. After that you'll be charged $59.99/year.\n---\nYour annual plan for PixelVault Cloud renews on 2026-11-11 for €47.88",
    );
    expect(found).toHaveLength(2);
    expect(found[0]).toMatchObject({
      merchant: "FocusFlow Pro",
      amountMinor: 5999,
      currency: "USD",
      date: "2026-11-04",
      kind: "trial",
      cadence: "yearly",
    });
    expect(found[1]).toMatchObject({
      merchant: "PixelVault Cloud",
      amountMinor: 4788,
      currency: "EUR",
      date: "2026-11-11",
      kind: "subscription",
      cadence: "yearly",
    });
    expect(emailToCandidate(found[0]!).trialEnds).toBe("2026-11-04");
  });
});

describe("normalizeMerchant", () => {
  it("maps aliases and strips noise", () => {
    expect(normalizeMerchant("NFLX*DIGITAL LAGOS").merchant).toBe("Netflix");
    expect(normalizeMerchant("BOLT*RIDE 8812 LAGOS").merchant).toBe("Bolt");
    expect(normalizeMerchant("PAYPAL *FOCUSFLOW 402935").merchant).toBe("Focusflow");
    expect(normalizeMerchant("FITPULSE GYM APP MUMBAI IN").merchant).toBe("Fitpulse Gym App");
  });
});

describe("cadence", () => {
  it("buckets median gaps", () => {
    expect(cadenceFromGap(7)).toBe("weekly");
    expect(cadenceFromGap(31)).toBe("monthly");
    expect(cadenceFromGap(91)).toBe("quarterly");
    expect(cadenceFromGap(365)).toBe("yearly");
    expect(cadenceFromGap(45)).toBe("unknown");
  });

  it("adds calendar months with day clamping", () => {
    expect(addCadence("2026-01-31", "monthly")).toBe("2026-02-28");
    expect(addCadence("2026-10-03", "yearly")).toBe("2027-10-03");
  });
});

describe("detectRecurring", () => {
  const today = "2026-10-20";
  const c = (date: string, description: string, amount: number, currency: string) => ({
    date,
    description,
    amountMinor: Math.round(amount * 100),
    currency,
  });

  const { candidates, ignored } = detectRecurring(
    [
      c("2026-08-03", "NFLX*DIGITAL LAGOS", 7000, "NGN"),
      c("2026-09-03", "NFLX*DIGITAL LAGOS", 7000, "NGN"),
      c("2026-10-03", "NFLX*DIGITAL LAGOS", 7000, "NGN"),
      c("2026-08-05", "SPOTIFY UK", 11.99, "GBP"),
      c("2026-09-05", "SPOTIFY UK", 11.99, "GBP"),
      c("2026-10-05", "SPOTIFY UK", 11.99, "GBP"),
      c("2026-08-12", "SPOTIFY USA", 11.99, "USD"),
      c("2026-09-12", "SPOTIFY USA", 11.99, "USD"),
      c("2026-10-12", "SPOTIFY USA", 11.99, "USD"),
      c("2026-08-09", "CANVA* 104", 12.99, "USD"),
      c("2026-09-09", "CANVA* 104", 12.99, "USD"),
      c("2026-10-09", "CANVA* 104", 15.0, "USD"),
      c("2026-10-14", "FITPULSE GYM APP", 499, "INR"),
      c("2026-09-01", "SHOPRITE IKEJA", 23450, "NGN"),
      c("2026-10-11", "JUMIA*ORDER 77812", 18900, "NGN"),
    ],
    { today },
  );
  const by = (m: string, cur?: string) =>
    candidates.find((x) => x.merchant === m && (!cur || x.currency === cur))!;

  it("finds monthly subscriptions with next charge = last + cadence", () => {
    const n = by("Netflix");
    expect(n.cadence).toBe("monthly");
    expect(n.nextChargeDate).toBe("2026-11-03");
    expect(n.confidence).toBeGreaterThanOrEqual(80);
    expect(n.status).toBe("detected");
  });

  it("flags the same merchant in two currencies", () => {
    expect(by("Spotify", "GBP").note).toContain("Possible duplicate");
    expect(by("Spotify", "USD").note).toContain("GBP");
  });

  it("flags a price rise over 5%", () => {
    const canva = by("Canva");
    expect(canva.amountMinor).toBe(1500);
    expect(canva.note).toMatch(/Price rise: USD 12\.99 → 15\.00 \(\+15%\)/);
  });

  it("keeps a single subscription-like charge as unsure with a question", () => {
    const gym = by("Fitpulse Gym App");
    expect(gym.confidence).toBeLessThan(60);
    expect(gym.status).toBe("unsure");
    expect(gym.note).toMatch(/\?$/);
  });

  it("ignores one-off noise", () => {
    expect(ignored.map((i) => i.merchant).sort()).toEqual(["Jumia", "Shoprite"]);
  });
});
