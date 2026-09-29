import Link from "next/link";
import { Metric, PageHeader } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { date, money } from "@/lib/utils";

function rangePreset(name: string) {
  const now = new Date();
  let start = new Date(now.getFullYear(), now.getMonth(), 1);
  if (name === "day") start = now;
  if (name === "semester") start = new Date(now.getFullYear(), now.getMonth() < 6 ? 0 : 6, 1);
  if (name === "year") start = new Date(now.getFullYear(), 0, 1);
  return { inicio: start.toISOString().slice(0, 10), fim: now.toISOString().slice(0, 10) };
}

export default async function Reports({ searchParams }: { searchParams: Promise<{ inicio?: string; fim?: string }> }) {
  const sp = await searchParams; const def = rangePreset("month");
  const inicio = sp.inicio || def.inicio, fim = sp.fim || def.fim;
  const start = `${inicio}T00:00:00`, end = `${fim}T23:59:59.999`; const s = await createClient();
  const [{ data: sales }, { data: finance }, { data: exams }, { data: moves }] = await Promise.all([
    s.from("sales").select("id,total,status,completed_at,sale_items(quantity,unit_cost,product_id,products(name))").gte("completed_at", start).lte("completed_at", end),
    s.from("financial_entries").select("type,status,amount,occurred_on").gte("occurred_on", inicio).lte("occurred_on", fim),
    s.from("exams").select("status,customer_id,scheduled_at,completed_at").or(`and(scheduled_at.gte.${start},scheduled_at.lte.${end}),and(completed_at.gte.${start},completed_at.lte.${end})`),
    s.from("stock_movements").select("movement_type,quantity_delta,product_id,products(name)").gte("created_at", start).lte("created_at", end),
  ]);
  const completed = (sales ?? []).filter((x: any) => x.status === "completed");
  const revenue = completed.reduce((n: number, x: any) => n + Number(x.total), 0);
  const cost = completed.reduce((n: number, x: any) => n + (x.sale_items ?? []).reduce((a: number, i: any) => a + Number(i.quantity) * Number(i.unit_cost), 0), 0);
  const incomes = (finance ?? []).filter((x: any) => x.type === "income" && x.status === "paid").reduce((n: number, x: any) => n + Number(x.amount), 0);
  const expenses = (finance ?? []).filter((x: any) => x.type === "expense" && x.status === "paid").reduce((n: number, x: any) => n + Number(x.amount), 0);
  const productMap = new Map<string, { name: string; quantity: number }>();
  completed.forEach((v: any) => v.sale_items?.forEach((i: any) => { const old = productMap.get(i.product_id) || { name: i.products?.name || "Produto", quantity: 0 }; old.quantity += Number(i.quantity); productMap.set(i.product_id, old); }));
  const products = [...productMap.values()].sort((a, b) => b.quantity - a.quantity); const examRows = exams ?? []; const customers = new Set(examRows.map((e: any) => e.customer_id));
  return <div className="page"><PageHeader title="Relatórios" description={`Resultados de ${date(inicio)} a ${date(fim)}`} />
    <div className="flex flex-wrap gap-2 mb-4">{[["Hoje", "day"], ["Mês", "month"], ["Semestre", "semester"], ["Ano", "year"]].map(([label, p]) => { const r = rangePreset(p); return <Link className="btn btn-secondary" key={p} href={`/relatorios?inicio=${r.inicio}&fim=${r.fim}`}>{label}</Link>; })}</div>
    <form className="search-row"><div className="field"><label>Início</label><input name="inicio" type="date" defaultValue={inicio} /></div><div className="field"><label>Fim</label><input name="fim" type="date" defaultValue={fim} /></div><button className="btn btn-primary self-end">Gerar relatório</button></form>
    <section className="grid-cards"><Metric label="Vendas" value={completed.length} note={money(revenue)} /><Metric label="Lucro bruto" value={money(revenue - cost)} note={`Custo: ${money(cost)}`} /><Metric label="Saldo financeiro" value={money(incomes - expenses)} note={`${money(incomes)} receitas`} /><Metric label="Exames realizados" value={examRows.filter((x: any) => x.status === "completed").length} note={`${examRows.filter((x: any) => x.status === "no_show").length} não realizados`} /><Metric label="Clientes atendidos" value={customers.size} note={`${examRows.length} exames no período`} /></section>
    <div className="split mt-5"><section className="panel"><div className="panel-header"><h2 className="section-title">Produtos vendidos</h2></div>{products.length ? <div className="table-wrap"><table><thead><tr><th>Produto</th><th>Quantidade</th></tr></thead><tbody>{products.map(x => <tr key={x.name}><td>{x.name}</td><td>{x.quantity}</td></tr>)}</tbody></table></div> : <div className="empty">Nenhum produto vendido.</div>}</section>
      <section className="panel"><div className="panel-header"><h2 className="section-title">Visão operacional</h2></div><div className="panel-body data-list"><div className="flex justify-between"><span>Exames agendados</span><strong>{examRows.filter((x: any) => x.status === "scheduled" || x.status === "confirmed").length}</strong></div><div className="flex justify-between"><span>Exames cancelados</span><strong>{examRows.filter((x: any) => x.status === "cancelled").length}</strong></div><div className="flex justify-between"><span>Movimentações de estoque</span><strong>{moves?.length || 0}</strong></div><div className="flex justify-between"><span>Despesas</span><strong>{money(expenses)}</strong></div></div></section></div>
  </div>;
}
