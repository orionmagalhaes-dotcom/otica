"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CalendarDays, ChartNoAxesCombined, CircleDollarSign, ClipboardList, ContactRound, Eye, House, KeyRound, LogOut, Menu, Package, ShoppingBag, Users, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/client";

const navigation = [
  { href: "/", label: "Início", icon: House }, { href: "/clientes", label: "Clientes", icon: ContactRound },
  { href: "/agenda", label: "Agenda", icon: CalendarDays }, { href: "/exames", label: "Exames", icon: Eye },
  { href: "/produtos", label: "Produtos", icon: Package }, { href: "/vendas", label: "Vendas", icon: ShoppingBag },
  { href: "/financeiro", label: "Financeiro", icon: CircleDollarSign, manager: true }, { href: "/funcionarios", label: "Funcionários", icon: Users, manager: true },
  { href: "/relatorios", label: "Relatórios", icon: ChartNoAxesCombined, manager: true }, { href: "/auditoria", label: "Auditoria", icon: ClipboardList, manager: true },
  { href: "/acessos", label: "Acessos", icon: KeyRound, admin: true },
];

export function AppShell({ children, profile }: { children: React.ReactNode; profile: Profile }) {
  const pathname = usePathname(); const router = useRouter(); const [open, setOpen] = useState(false);
  const visible = navigation.filter((item) => (!item.manager || profile.role !== "employee") && (!item.admin || profile.role === "admin"));
  async function logout() { await createClient().auth.signOut(); router.push("/login"); router.refresh(); }
  const links = visible.map(({ href, label, icon: Icon }) => {
    const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
    return <Link key={href} href={href} onClick={() => setOpen(false)} className={cn("nav-link", active && "active")} aria-current={active ? "page" : undefined}><Icon size={19} /><span>{label}</span></Link>;
  });
  return <div className="app-shell">
    <header className="mobile-header"><button className="mobile-menu" onClick={() => setOpen(true)} aria-label="Abrir menu"><Menu /></button><Link href="/" className="mobile-brand">Ótica Central</Link><div className="avatar">{profile.full_name.slice(0,1)}</div></header>
    <aside className={cn("sidebar", open && "open")}>
      <div className="sidebar-top"><Link href="/" className="brand"><span className="brand-mark">O</span><span>Ótica Central<small>Gestão</small></span></Link><button className="close-menu" onClick={() => setOpen(false)} aria-label="Fechar menu"><X /></button></div>
      <nav aria-label="Navegação principal">{links}</nav>
      <div className="sidebar-user"><div className="avatar">{profile.full_name.slice(0,1)}</div><div><strong>{profile.full_name}</strong><span>{profile.role === "admin" ? "Administrador" : profile.role === "manager" ? "Gerente" : "Funcionário"}</span></div><button onClick={logout} aria-label="Sair"><LogOut size={18}/></button></div>
    </aside>
    {open && <button className="backdrop" onClick={() => setOpen(false)} aria-label="Fechar menu"/>}
    <main>{children}</main>
    <nav className="bottom-nav" aria-label="Navegação rápida">{visible.slice(0, 5).map(({href,label,icon:Icon}) => <Link key={href} href={href} className={cn((href === "/" ? pathname === "/" : pathname.startsWith(href)) && "active")}><Icon size={21}/><span>{label}</span></Link>)}</nav>
  </div>;
}
