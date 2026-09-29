import { Eye } from "lucide-react";
import { login } from "./actions";
import { ThemeToggle } from "@/components/theme-toggle";
import "./login.css";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return <main className="login-page"><section className="login-card">
    <div className="login-card-top"><div className="login-brand"><span><Eye size={24}/></span><div>Ótica Central<small>Gestão integrada</small></div></div><ThemeToggle compact/></div>
    <div><h1>Bem-vindo</h1><p>Entre com seu nome de usuário e senha.</p></div>
    {!configured && <div className="login-error" role="status">Ambiente local ativo. A autenticação será habilitada depois que conectarmos o Supabase.</div>}
    {configured && error && <div className="login-error" role="alert">{error === "inactive" ? "Este acesso está inativo. Fale com um administrador." : "E-mail ou senha incorretos."}</div>}
    <form action={login} className="login-form">
      <div className="field"><label htmlFor="username">Nome de usuário</label><input id="username" name="username" type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} required /></div>
      <div className="field"><label htmlFor="password">Senha</label><input id="password" name="password" type="password" autoComplete="current-password" minLength={8} required /></div>
      <button className="btn btn-primary" type="submit" disabled={!configured}>{configured ? "Entrar" : "Aguardando configuração"}</button>
    </form>
    <p className="login-help">Problemas para entrar? Solicite ao administrador a revisão do seu acesso.</p>
  </section></main>;
}
