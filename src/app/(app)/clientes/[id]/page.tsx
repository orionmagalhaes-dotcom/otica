import { CalendarPlus, Pencil, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader, StatusBadge } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { date, examLabels, money } from "@/lib/utils";
import type { Customer, Exam, Sale } from "@/lib/database.types";
export default async function CustomerPage({ params }: { params: Promise<{id:string}> }) {
 const {id}=await params; const supabase=await createClient(); const [{data:customer},{data:exams},{data:sales}]=await Promise.all([
  supabase.from("customers").select("*").eq("id",id).single(), supabase.from("exams").select("*").eq("customer_id",id).order("created_at",{ascending:false}), supabase.from("sales").select("id,number,status,total,completed_at,created_at").eq("customer_id",id).order("created_at",{ascending:false})]);
 if(!customer) notFound(); const c=customer as unknown as Customer; const examList=(exams??[]) as unknown as Exam[]; const saleList=(sales??[]) as unknown as Sale[];
 return <div className="page"><PageHeader title={c.full_name} description={[c.cpf,c.phone,c.email].filter(Boolean).join(" · ") || "Dados de contato não informados"} action={<Link className="btn btn-secondary" href={`/clientes/${id}/editar`}><Pencil size={17}/>Editar</Link>}/>
  <div className="flex flex-wrap gap-2 mb-5"><Link className="btn btn-primary" href={`/exames/novo?cliente=${id}`}><CalendarPlus size={17}/>Agendar exame</Link><Link className="btn btn-secondary" href={`/vendas/nova?cliente=${id}`}><ShoppingBag size={17}/>Nova venda</Link></div>
  <div className="split"><section className="panel"><div className="panel-header"><h2 className="section-title">Exames e atendimentos</h2></div>{examList.length?<div className="data-list p-3">{examList.map(e=><Link className="data-card" href={`/exames/${e.id}`} key={e.id}><div className="flex justify-between"><strong>{e.status==='external'?'Exame externo':'Exame de vista'}</strong><StatusBadge tone={e.status==='completed'?'success':e.status==='cancelled'||e.status==='no_show'?'danger':'default'}>{examLabels[e.status]}</StatusBadge></div><span className="data-card-meta">{date(e.scheduled_at||e.created_at,true)}</span></Link>)}</div>:<div className="empty">Nenhum exame no histórico.</div>}</section>
  <section className="panel"><div className="panel-header"><h2 className="section-title">Compras</h2></div>{saleList.length?<div className="data-list p-3">{saleList.map(s=><Link className="data-card" href={`/vendas/${s.id}`} key={s.id}><div className="flex justify-between"><strong>Venda #{s.number}</strong><StatusBadge tone={s.status==='completed'?'success':'danger'}>{s.status==='completed'?'Concluída':'Cancelada'}</StatusBadge></div><div className="data-card-meta"><span>{date(s.completed_at||s.created_at,true)}</span><strong>{money(s.total)}</strong></div></Link>)}</div>:<div className="empty">Nenhuma compra registrada.</div>}</section></div>
 </div>;
}
