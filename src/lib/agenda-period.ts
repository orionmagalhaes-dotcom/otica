export type AgendaPeriodKey = "all" | "today" | "last7" | "last15" | "last30" | "next7" | "custom";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function isDate(value?: string) {
  if (!value || !datePattern.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function shiftDate(value: string, days: number) {
  const parsed = new Date(`${value}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

export function todayInSaoPaulo(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function resolveAgendaPeriod(
  params: { period?: string; start?: string; end?: string },
  today = todayInSaoPaulo(),
) {
  const period = (params.period || "today") as AgendaPeriodKey;
  if (period === "custom") {
    if (isDate(params.start) && isDate(params.end) && params.start! <= params.end!) {
      return { period, start: params.start!, end: params.end!, invalid: false };
    }
    return { period, start: today, end: today, invalid: true };
  }
  if (period === "all") return { period, start: today, end: today, invalid: false };

  const days: Partial<Record<AgendaPeriodKey, number>> = { last7: 6, last15: 14, last30: 29 };
  if (period in days) return { period, start: shiftDate(today, -days[period]!), end: today, invalid: false };
  if (period === "next7") return { period, start: today, end: shiftDate(today, 6), invalid: false };
  return { period: "today" as const, start: today, end: today, invalid: false };
}

export function agendaTimestamp(date: string, endOfDay = false) {
  return `${date}T${endOfDay ? "23:59:59.999" : "00:00:00"}-03:00`;
}
