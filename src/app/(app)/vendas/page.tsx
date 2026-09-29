import Link from "next/link";
import { CalendarCheck, Plus, Search } from "lucide-react";
import { AddLink, EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { resolveAgendaPeriod, type AgendaPeriodKey } from "@/lib/agenda-period";
import { date, money } from "@/lib/utils";
import type { Sale } from "@/lib/database.types";

const labels={completed:"Concluída",draft:"Não concluída",cancelled:"Cancelada"};
type SalesSearch = { period?: string; start?: string; end?: string; q?: string };
const quickPeriods: Array<{ key: Exclude<AgendaPeriodKey, "next7" | "custom">; label: string }> = [
  { key: "today", label: "Hoje" },
  { key: "last7", label: "Últimos 7 dias" },
  { key: "last15", label: "Últimos 15 dias" },
  { key: "last30", label: "Últimos 30 dias" },
];

export default async function Sales({ searchParams }: { searchParams: Promise<SalesSearch> }) {
  const params = await searchParams;
  const range = resolveAgendaPeriod(params);
  const term = (params.q || "").trim();
  const hasSelectedPeriod = Boolean(params.period);
  const s = await createClient();
  let customerIds: string[] | undefined;
  if (term) {
    const safe = term.replace(/[%_,]/g, "");
    const { data } = await s.from("customers").select("id").or(`full_name.ilike.%${safe}%,cpf.ilike.%${safe}%,phone.ilike.%${safe}%,email.ilike.%${safe}%,city.ilike.%${safe}%,state.ilike.%${safe}%,address_line.ilike.%${safe}%`).limit(1000);
    customerIds = (data ?? []).map((customer: { id: string }) => String(customer.id));
  }
  let salesQuery = s.from("sales").select("id,number,status,total,completed_at,created_at,customers(full_name),employees(full_name)").order("created_at", { ascending: false }).limit(100);
  if (hasSelectedPeriod) {
    salesQuery = salesQuery.gte("created_at", `${range.start}T00:00:00`).lte("created_at", `${range.end}T23:59:59`);
  }
  if (term) salesQuery = salesQuery.in("customer_id", customerIds?.length ? customerIds : ["00000000-0000-0000-0000-000000000000"]);
  const { data, error } = await salesQuery;
  const list = (data ?? []) as unknown as Sale[];
  function salesHref(period: AgendaPeriodKey | undefined = hasSelectedPeriod ? range.period : undefined) {
    const query = new URLSearchParams();
    if (period) {
      query.set("period", period);
      if (period === "custom") { query.set("start", range.start); query.set("end", range.end); }
    }
    if (term) query.set("q", term);
    const text = query.toString();
    return `/vendas${text ? `?${text}` : ""}`;
  }

  return <div className="page">
    <PageHeader title="Vendas" description="Vendas concluídas e oportunidades para acompanhamento" action={<AddLink href="/vendas/nova"><Plus size={18} />Nova venda</AddLink>} />
    <nav className="period-filter" aria-label="Período das vendas">
      {quickPeriods.map(({ key, label }) => { const active = hasSelectedPeriod && range.period === key; return <Link key={key} href={salesHref(active ? undefined : key)} className={active ? "active" : ""}>{label}</Link>; })}
    </nav>
    <form className="search-row" aria-label="Buscar vendas por cliente">
      {hasSelectedPeriod && <><input type="hidden" name="period" value={range.period} /><input type="hidden" name="start" value={range.start} /><input type="hidden" name="end" value={range.end} /></>}
      <div className="search-box"><Search size={19} /><input name="q" defaultValue={term} placeholder="Buscar cliente por nome, cidade, telefone, CPF ou e-mail" aria-label="Buscar cliente" /></div>
      <button className="btn btn-secondary" type="submit">Buscar cliente</button>
    </form>
    <form className="panel panel-body agenda-range" aria-label="Selecionar intervalo personalizado">
      <input type="hidden" name="period" value="custom" /><input type="hidden" name="q" value={term} />
      <div className="field"><label htmlFor="start">Data inicial</label><input id="start" type="date" name="start" defaultValue={range.start} required /></div>
      <div className="field"><label htmlFor="end">Data final</label><input id="end" type="date" name="end" defaultValue={range.end} required /></div>
      <button className={hasSelectedPeriod && range.period === "custom" ? "btn btn-primary" : "btn btn-secondary"} type="submit"><CalendarCheck size={17} />Aplicar intervalo</button>
    </form>
    {range.invalid && <div className="notice notice-error" role="alert">A data inicial deve ser anterior ou igual à data final.</div>}
    {error ? <div className="panel empty">Erro ao carregar vendas.</div> : list.length ? <div className="data-list">{list.map((sale) => <Link className="data-card" href={`/vendas/${sale.id}`} key={sale.id}><div className="flex justify-between"><strong>{sale.status === "draft" ? "Oportunidade" : "Venda"} #{sale.number}</strong><StatusBadge tone={sale.status === "completed" ? "success" : sale.status === "draft" ? "warning" : "danger"}>{labels[sale.status]}</StatusBadge></div><div className="data-card-meta"><span>{sale.customers?.full_name || "Consumidor não identificado"}</span><span>{sale.employees?.full_name}</span><span>{date(sale.completed_at || sale.created_at, true)}</span><strong>{money(sale.total)}</strong></div></Link>)}</div> : <div className="panel"><EmptyState title={term ? "Nenhuma venda para este cliente" : "Nenhuma venda no período"} description={term ? "A busca considera todos os períodos." : "Selecione outro intervalo ou registre uma nova venda."} /></div>}
  </div>;
}
