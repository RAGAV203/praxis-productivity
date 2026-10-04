import { addMonths, differenceInCalendarMonths, format, parseISO } from "date-fns";

/** Standard reducing-balance EMI. `annualRate` in percent. */
export function emi(principal: number, annualRate: number, months: number): number {
  if (months <= 0) return 0;
  const r = annualRate / 12 / 100;
  if (r === 0) return principal / months;
  const f = Math.pow(1 + r, months);
  return (principal * r * f) / (f - 1);
}

export interface AmortRow {
  n: number;
  month: string;
  emi: number;
  interest: number;
  principal: number;
  balance: number;
}

export function amortization(principal: number, annualRate: number, months: number, startDate: string): AmortRow[] {
  const pay = emi(principal, annualRate, months);
  const r = annualRate / 12 / 100;
  const rows: AmortRow[] = [];
  let bal = principal;
  const start = parseISO(startDate);
  for (let n = 1; n <= months && bal > 0.005; n++) {
    const interest = bal * r;
    const princ = Math.min(pay - interest, bal);
    bal = Math.max(0, bal - princ);
    rows.push({ n, month: format(addMonths(start, n - 1), "MMM yyyy"), emi: princ + interest, interest, principal: princ, balance: bal });
  }
  return rows;
}

/** Progress of a loan as of `today`. */
export function loanStatus(principal: number, annualRate: number, months: number, startDate: string, today: string) {
  const rows = amortization(principal, annualRate, months, startDate);
  const paidCount = Math.min(rows.length, Math.max(0, differenceInCalendarMonths(parseISO(today), parseISO(startDate)) + 1));
  const paid = rows.slice(0, paidCount);
  return {
    emi: emi(principal, annualRate, months),
    paidCount,
    remainingMonths: rows.length - paidCount,
    balance: paidCount ? paid[paidCount - 1].balance : principal,
    interestPaid: paid.reduce((s, r) => s + r.interest, 0),
    totalInterest: rows.reduce((s, r) => s + r.interest, 0),
    payoff: rows.length ? rows[rows.length - 1].month : "-",
  };
}

/** Monthly amount needed to reach a savings target by a deadline. */
export function monthlyNeeded(target: number, saved: number, today: string, deadline?: string): number | null {
  if (!deadline) return null;
  const months = Math.max(1, differenceInCalendarMonths(parseISO(deadline), parseISO(today)));
  return Math.max(0, (target - saved) / months);
}

export function sumBy<T>(items: T[], f: (t: T) => number) {
  return items.reduce((s, x) => s + (f(x) || 0), 0);
}

/** Yearly cost of a recurring charge. */
export function yearlyCost(amount: number, freq: string, interval: number) {
  const per = { daily: 365, weekly: 52, monthly: 12, yearly: 1, none: 0 }[freq] ?? 0;
  return (amount * per) / Math.max(1, interval);
}
