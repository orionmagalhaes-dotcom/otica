import { Plus, Search } from "lucide-react";
import Link from "next/link";
import { AddLink, EmptyState, PageHeader } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { date } from "@/lib/utils";
import type { Customer } from "@/lib/database.types";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams; const supabase = await createClient();
  let query = supabase.from("customers").select("id,full_name,cpf,phone,email,created_at,active").eq("active",true).order("full_name").limit(100);
  if (q.trim()) query = query.ilike("search_text", `%${q.trim().toLowerCase().replace(/[%_,]/g, "")}%`);
  const { data, error } = await query; const customers = (data ?? []) as unknown as Customer[];
  return <div className="page"><PageHeader title="Clientes" description="Cadastro e histórico de relacionamento" action={<AddLink href="/clientes/novo"><Plus size={18}/>Novo cliente</AddLink>}/>
    <form className="search-row"><div className="search-box"><Search size={19}/><input name="q" defaultValue={q} placeholder="Buscar por nome, CPF, telefone ou e-mail" aria-label="Buscar clientes"/></div><button className="btn btn-secondary">Buscar</button></form>
    {error ? <div className="panel empty"><strong>Não foi possível carregar</strong>Tente novamente em instantes.</div> : customers.length ? <div className="data-list">{customers.map(c => <Link className="data-card" href={`/clientes/${c.id}`} key={c.id}><div className="data-card-title">{c.full_name}</div><div className="data-card-meta"><span>{c.cpf || "CPF não informado"}</span><span>{c.phone || "Telefone não informado"}</span><span>Cliente desde {date(c.created_at)}</span></div></Link>)}</div> : <div className="panel"><EmptyState title={q ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"} description={q ? "Revise a busca ou cadastre um novo cliente." : "Comece cadastrando o primeiro cliente."} action={<AddLink href="/clientes/novo">Cadastrar cliente</AddLink>}/></div>}
  </div>;
}
