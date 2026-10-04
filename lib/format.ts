import { format, formatDistanceToNowStrict, parseISO } from "date-fns";

const fmtCache = new Map<string, Intl.NumberFormat>();

export function money(n: number, currency = "INR", compact = false): string {
  const key = `${currency}-${compact}`;
  let f = fmtCache.get(key);
  if (!f) {
    f = new Intl.NumberFormat(currency === "INR" ? "en-IN" : undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: compact || Math.abs(n) >= 1000 ? 0 : 2,
      notation: compact ? "compact" : "standard",
    });
    fmtCache.set(key, f);
  }
  return f.format(n || 0);
}

export const fmtDate = (d: string, pattern = "d MMM yyyy") => (d ? format(parseISO(d), pattern) : "");
export const fmtShort = (d: string) => fmtDate(d, "d MMM");
export const ago = (ms: number) => formatDistanceToNowStrict(ms, { addSuffix: true });

export function greeting(h = new Date().getHours()) {
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export const cn = (...xs: (string | false | null | undefined)[]) => xs.filter(Boolean).join(" ");
