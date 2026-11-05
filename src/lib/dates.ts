/** Dates are local calendar days as YYYY-MM-DD strings. */

export function todayKey(now: Date = new Date()): string {
  return dateKey(now);
}

export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function parseKey(key: string): Date {
  return new Date(`${key}T12:00:00`);
}

export function isDateKey(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && dateKey(parseKey(value)) === value;
}

export function addDays(key: string, n: number): string {
  const d = parseKey(key);
  d.setDate(d.getDate() + n);
  return dateKey(d);
}

export function isWeekend(key: string): boolean {
  const day = parseKey(key).getDay();
  return day === 0 || day === 6;
}

const fmt = (key: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-GB", options).format(parseKey(key));

/** "Thu 5 Nov" */
export function shortDate(key: string): string {
  return fmt(key, { weekday: "short", day: "numeric", month: "short" });
}

/** "Thu" */
export function weekday(key: string): string {
  return fmt(key, { weekday: "short" });
}

/** "Thursday" */
export function longWeekday(key: string): string {
  return fmt(key, { weekday: "long" });
}

export function dayOfMonth(key: string): number {
  return parseKey(key).getDate();
}
