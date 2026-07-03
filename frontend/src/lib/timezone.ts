import { formatInTimeZone } from "date-fns-tz";

const IST = "Asia/Kolkata";

/** Format a timestamptz/ISO string for display in IST. */
export function formatIST(isoString: string, pattern = "dd MMM yyyy, hh:mm a"): string {
  return formatInTimeZone(new Date(isoString), IST, pattern);
}

/** Format a date-only (YYYY-MM-DD) value for display — no TZ conversion needed since it's a calendar date, not an instant. */
export function formatDateOnly(dateString: string, pattern = "dd MMM yyyy"): string {
  // Append T00:00:00 to avoid the browser interpreting the bare date
  // as UTC midnight and shifting it back a day in IST display.
  return formatInTimeZone(`${dateString}T00:00:00`, IST, pattern);
}

/** Today's date in IST as YYYY-MM-DD, for max-date validation on the entry form. */
export function todayIST(): string {
  return formatInTimeZone(new Date(), IST, "yyyy-MM-dd");
}

/** Current month start/end in IST as YYYY-MM-DD, used as default report filter bounds. */
export function currentMonthRangeIST(): { start: string; end: string } {
  const now = new Date();
  const istNow = formatInTimeZone(now, IST, "yyyy-MM-dd");
  const [year, month] = istNow.split("-");
  const start = `${year}-${month}-01`;
  const lastDay = new Date(Number(year), Number(month), 0).getDate();
  const end = `${year}-${month}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}
