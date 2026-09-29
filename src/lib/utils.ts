import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const money = (value: number | string | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value ?? 0));
export const date = (value: string | null | undefined, withTime = false) => value
  ? format(new Date(value), withTime ? "dd/MM/yyyy 'às' HH:mm" : "dd/MM/yyyy", { locale: ptBR }) : "—";
export const cn = (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(" ");
export const digits = (value: string) => value.replace(/\D/g, "");

export const examLabels: Record<string, string> = {
  scheduled: "Agendado", confirmed: "Confirmado", completed: "Realizado", no_show: "Não realizado", cancelled: "Cancelado", external: "Externo",
};
