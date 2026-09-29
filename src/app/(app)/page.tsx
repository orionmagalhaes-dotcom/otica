import { AlertTriangle, CalendarDays, CircleDollarSign, Clock3, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { Metric, PageHeader, StatusBadge } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { date, examLabels, money } from "@/lib/utils";
import type { Exam, Product } from "@/lib/database.types";

export default async function DashboardPage() {
  const supabase = await createClient();
  const now = new Date(); const end = new Date(); end.setDate(end.getDate() + 7);
  const [{ data: summary }, { data: exams }, { data: products }] = await Promise.all([
    supabase.from("dashboard_summary").select("*").single(),
    supabase.from("exams").select("id,status,scheduled_at,customers(id,full_name,phone)").in("status", ["scheduled","confirmed"]).gte("scheduled_at", now.toISOString()).lte("scheduled_at", end.toISOString()).order("scheduled_at").limit(6),
    supabase.from("products").select("id,name,sku,stock_quantity,minimum_stock").eq("active", true).order("stock_quantity").limit(20),
  ]);
  const s = (summary ?? {}) as Record<string, number>;
  const upcoming = (exams ?? []) as unknown as Exam[];
  const lowStock = ((products ?? []) as unknown as Product[]).filter(p => Number(p.stock_quantity) <= Number(p.minimum_stock)).slice(0,6);
  return <div className="page">
    <PageHeader title="Visão de hoje" description={new Intl.DateTimeFormat("pt-BR", { weekday:"long", day:"numeric", month:"long" }).format(now)} action={<Link className="btn btn-primary" href="/vendas/nova">Nova venda</Link>} />
    <section className="grid-cards" aria-label="Indicadores principais">
      <Metric label="Vendas hoje" value={s.sales_today ?? 0} note="Concluídas" icon={ShoppingBag}/>
      <Metric label="Faturamento" value={money(s.revenue_today)} note="Hoje" icon={CircleDollarSign}/>
      <Metric label="Exames" value={s.exams_today ?? 0} note="Hoje" icon={CalendarDays}/>
      <Metric label="Estoque baixo" value={s.low_stock_count ?? 0} note="Itens para revisar" icon={AlertTriangle}/>
      <Metric label="Saldo do mês" value={money(s.month_balance)} note="Receitas menos despesas" />
    </section>
    <div className="split" style={{marginTop:18}}>
      <section className="panel"><div className="panel-header"><h2 className="section-title">Próximos exames</h2><Link href="/agenda">Ver exames</Link></div>
        {upcoming.length ? <div className="data-list" style={{padding:12}}>{upcoming.map(exam => <Link className="data-card" href={`/exames/${exam.id}`} key={exam.id}><div className="flex items-center justify-between gap-3"><span className="data-card-title">{exam.customers?.full_name}</span><StatusBadge tone={exam.status === "confirmed" ? "success" : "default"}>{examLabels[exam.status]}</StatusBadge></div><div className="data-card-meta"><span><Clock3 size={14} className="inline mr-1"/>{date(exam.scheduled_at,true)}</span><span>{exam.customers?.phone || "Sem telefone"}</span></div></Link>)}</div> : <div className="empty">Nenhum exame próximo.</div>}
      </section>
      <section className="panel"><div className="panel-header"><h2 className="section-title">Reposição necessária</h2><Link href="/produtos?filtro=baixo">Ver estoque</Link></div>
        {lowStock.length ? <div className="data-list" style={{padding:12}}>{lowStock.map(product => <Link className="data-card" href={`/produtos/${product.id}`} key={product.id}><span className="data-card-title">{product.name}</span><div className="flex justify-between"><span className="data-card-meta">{product.sku || "Sem SKU"}</span><StatusBadge tone="warning">{product.stock_quantity} em estoque</StatusBadge></div></Link>)}</div> : <div className="empty">Estoque em níveis adequados.</div>}
      </section>
    </div>
  </div>;
}
