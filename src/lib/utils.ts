export const money = (value: number | string | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value ?? 0));
export const date = (value: string | null | undefined, withTime = false) => {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  const datePart = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" }).format(parsed);
  if (!withTime) return datePart;
  const timePart = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", hour12: false }).format(parsed);
  return `${datePart} às ${timePart}`;
};
export const cn = (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(" ");
export const digits = (value: string) => value.replace(/\D/g, "");

export const examLabels: Record<string, string> = {
  scheduled: "Agendado", confirmed: "Confirmado", completed: "Realizado", no_show: "Não realizado", cancelled: "Cancelado", external: "Externo",
};
