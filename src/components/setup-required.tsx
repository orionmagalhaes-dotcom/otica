import { Database, Server } from "lucide-react";

export function SetupRequired() {
  return <main className="login-page">
    <section className="login-card" style={{ width: "min(100%, 560px)" }}>
      <div className="login-brand"><span><Server size={24}/></span><div>Ótica Central<small>Ambiente local</small></div></div>
      <div>
        <h1>Aplicação pronta para configurar</h1>
        <p>O servidor local está funcionando. A conexão com o banco será habilitada quando as credenciais do Supabase forem adicionadas.</p>
      </div>
      <div className="panel panel-body">
        <div className="flex items-start gap-3">
          <Database size={22} style={{ color: "var(--brand)", flex: "none" }}/>
          <div><strong>Supabase ainda não conectado</strong><p className="page-subtitle">Nenhum dado fictício está sendo exibido ou gravado neste modo.</p></div>
        </div>
      </div>
      <div>
        <p className="text-sm">Quando formos conectar, basta criar o arquivo <code>.env.local</code> com:</p>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-gray-950 p-4 text-xs text-gray-100">NEXT_PUBLIC_SUPABASE_URL=...{"\n"}NEXT_PUBLIC_SUPABASE_ANON_KEY=...</pre>
      </div>
    </section>
  </main>;
}
