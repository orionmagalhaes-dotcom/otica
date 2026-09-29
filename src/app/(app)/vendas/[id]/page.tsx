import Link from "next/link";
import { notFound } from "next/navigation";
import { CancelSaleForm } from "@/components/cancel-sale-form";
import { PageHeader, StatusBadge } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { date, money } from "@/lib/utils";

export default async function SaleDetail({ params, searchParams }: { params: Promise<{id:string}>; searchParams: Promise<{error?:string}> }) {
  const [{id},{error}] = await Promise.all([params,searchParams]); const s = await createClient();
  const [{data:sale},{data:items},{data:payments}] = await Promise.all([
    s.from("sales").select("*,customers(id,full_name),employees(full_name)").eq("id",id).single(),
    s.from("sale_items").select("*,products(name,sku)").eq("sale_id",id),
    s.from("sale_payments").select("*,payment_methods(name)").eq("sale_id",id),
  ]);
  if (!sale) notFound();
  return <div className="page"><PageHeader title={`Venda #${sale.number}`} description={date(sale.completed_at||sale.created_at,true)} action={<StatusBadge tone={sale.status==="completed"?"success":"danger"}>{sale.status==="completed"?"Concluída":"Cancelada"}</StatusBadge>}/>
    {error&&<div className="login-error mb-4">{error}</div>}<div className="split"><section className="panel"><div className="panel-header"><h2 className="section-title">Itens</h2></div><div className="table-wrap"><table><thead><tr><th>Produto</th><th>Qtd.</th><th>Preço</th><th>Desconto</th><th>Total</th></tr></thead><tbody>{items?.map((i:any)=><tr key={i.id}><td>{i.products?.name}</td><td>{i.quantity}</td><td>{money(i.unit_price)}</td><td>{money(i.discount)}</td><td>{money(i.line_total)}</td></tr>)}</tbody></table></div><div className="panel-body border-t border-gray-200"><div className="flex justify-between"><span>Subtotal</span><strong>{money(sale.subtotal)}</strong></div><div className="flex justify-between mt-2"><span>Desconto geral</span><strong>{money(sale.discount)}</strong></div><div className="flex justify-between text-xl mt-4"><strong>Total</strong><strong>{money(sale.total)}</strong></div></div></section>
    <aside className="grid gap-4"><section className="panel panel-body"><h2 className="section-title mb-4">Atendimento</h2><div className="data-list"><div><span className="metric-label">Cliente</span><p>{sale.customers?<Link href={`/clientes/${sale.customers.id}`}>{sale.customers.full_name}</Link>:"Consumidor não identificado"}</p></div><div><span className="metric-label">Responsável</span><p>{sale.employees?.full_name}</p></div></div></section><section className="panel panel-body"><h2 className="section-title mb-4">Pagamento</h2>{payments?.map((p:any)=><div className="flex justify-between py-2" key={p.id}><span>{p.payment_methods?.name}</span><strong>{money(p.amount)}</strong></div>)}</section>{sale.status==="completed"&&<section className="panel panel-body"><h2 className="section-title mb-3">Cancelar venda</h2><p className="text-sm text-gray-500 mb-3">O estoque será devolvido e um estorno financeiro será registrado.</p><CancelSaleForm id={id}/></section>}</aside></div>
  </div>;
}
