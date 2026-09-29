import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { AddLink, EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { createClient } from "@/lib/supabase/server";
import { money } from "@/lib/utils";
import type { Product } from "@/lib/database.types";

export default async function Products({ searchParams }: { searchParams: Promise<{ q?: string; filtro?: string }> }) {
  const { q = "", filtro } = await searchParams;
  const s = await createClient();
  let query = s.from("products").select("*,product_categories(name)").eq("active", true).order("name").limit(150);
  if (q) query = query.or(`name.ilike.%${q.replace(/[%_,]/g, "")}%,sku.ilike.%${q.replace(/[%_,]/g, "")}%`);
  const { data, error } = await query;
  let list = (data ?? []) as unknown as Product[];
  if (filtro === "baixo") list = list.filter((p) => Number(p.stock_quantity) <= Number(p.minimum_stock));
  const categories = Array.from(new Set(list.map((product) => product.product_categories?.name || "Sem categoria"))).sort((a, b) => a.localeCompare(b, "pt-BR"));

  return <div className="page">
    <RealtimeRefresh table="products" />
    <PageHeader title="Produtos e serviços" description="Catálogo organizado por categoria" action={<AddLink href="/produtos/novo"><Plus size={18} />Novo produto ou serviço</AddLink>} />
    <form className="search-row"><div className="search-box"><Search size={19} /><input name="q" defaultValue={q} placeholder="Buscar por nome ou SKU" /></div><button className="btn btn-secondary">Buscar</button></form>
    {error ? <div className="panel empty">Erro ao carregar o catálogo.</div> : list.length ? <div className="grid gap-5">{categories.map((category) => <section className="panel" key={category}><div className="panel-header"><h2 className="section-title">{category}</h2><span className="text-sm text-gray-500">{list.filter((product) => (product.product_categories?.name || "Sem categoria") === category).length} item(ns)</span></div><div className="data-list">{list.filter((product) => (product.product_categories?.name || "Sem categoria") === category).map((product) => { const low = Number(product.stock_quantity) <= Number(product.minimum_stock); return <Link href={`/produtos/${product.id}`} className="data-card" key={product.id}><div className="flex justify-between gap-3"><strong>{product.name}</strong><StatusBadge tone={low ? "warning" : "success"}>{product.stock_quantity} em estoque</StatusBadge></div><div className="data-card-meta"><span>{product.sku || "Sem SKU"}</span><span>{money(product.sale_price)}</span></div></Link>; })}</div></section>)}</div> : <div className="panel"><EmptyState title="Nenhum item encontrado" description="Cadastre o primeiro produto ou serviço." /></div>}
  </div>;
}
