import Link from "next/link";
import { CalendarCheck, Check, Plus, Search } from "lucide-react";
import { completeExam } from "@/app/(app)/exames/actions";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { AddLink, EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { agendaTimestamp, resolveAgendaPeriod, type AgendaPeriodKey } from "@/lib/agenda-period";
import { createClient } from "@/lib/supabase/server";
import { date, examLabels } from "@/lib/utils";
import type { Exam } from "@/lib/database.types";

type Search = { period?: string; start?: string; end?: string; q?: string; saved?: string; error?: string };
const quickPeriods: Array<{ key: AgendaPeriodKey; label: string }> = [
  { key: "today", label: "Hoje" },
  { key: "last7", label: "Últimos 7 dias" },
  { key: "last15", label: "Últimos 15 dias" },
  { key: "last30", label: "Últimos 30 dias" },
  { key: "next7", label: "Próximos 7 dias" },
];

export default async function Agenda({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const range = resolveAgendaPeriod(params);
  const supabase = await createClient();
  const customerTerm = (params.q || "").trim();
  let customerIds: string[] | undefined;
  if (customerTerm) {
    const safe = customerTerm.replace(/[%_,]/g, "");
    const { data } = await supabase.from("customers").select("id").or(`full_name.ilike.%${safe}%,cpf.ilike.%${safe}%,phone.ilike.%${safe}%,email.ilike.%${safe}%,city.ilike.%${safe}%,state.ilike.%${safe}%,address_line.ilike.%${safe}%`).limit(1000);
    customerIds = (data ?? []).map((customer: { id: string }) => String(customer.id));
  }
  let examsQuery = supabase
    .from("exams")
    .select("id,status,scheduled_at,completed_at,duration_minutes,professional_name,customers(id,full_name,phone)")
    .gte("scheduled_at", agendaTimestamp(range.start))
    .lte("scheduled_at", agendaTimestamp(range.end, true))
    .neq("status", "external")
    .order("scheduled_at")
    .limit(500);
  if (customerTerm) examsQuery = examsQuery.in("customer_id", customerIds?.length ? customerIds : ["00000000-0000-0000-0000-000000000000"]);
  const { data: rows, error } = await examsQuery;
  const list = (rows ?? []) as unknown as Exam[];
  const returnTo = `/agenda?period=${range.period}&start=${range.start}&end=${range.end}`;
  const grouped = list.reduce<Record<string, Exam[]>>((days, exam) => {
    const key = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(exam.scheduled_at!));
    (days[key] ??= []).push(exam);
    return days;
  }, {});

  return <div className="page">
    <RealtimeRefresh table="exams" />
    <PageHeader title="Exames" description="Exames agendados, confirmados e concluídos" action={<AddLink href="/exames/novo"><Plus size={18}/>Novo exame</AddLink>} />

    <nav className="period-filter" aria-label="Período dos exames">
      {quickPeriods.map(({ key, label }) => <Link key={key} href={`/agenda?period=${key}${customerTerm ? `&q=${encodeURIComponent(customerTerm)}` : ""}`} className={range.period === key ? "active" : ""}>{label}</Link>)}
    </nav>

    <form className="search-row" aria-label="Buscar exames por cliente">
      <input type="hidden" name="period" value={range.period} />
      <input type="hidden" name="start" value={range.start} />
      <input type="hidden" name="end" value={range.end} />
      <div className="search-box"><Search size={19} /><input name="q" defaultValue={customerTerm} placeholder="Buscar cliente por nome, cidade, telefone, CPF ou e-mail" aria-label="Buscar cliente" /></div>
      <button className="btn btn-secondary" type="submit">Buscar cliente</button>
    </form>

    <form className="panel panel-body agenda-range" aria-label="Selecionar intervalo personalizado">
      <input type="hidden" name="period" value="custom" /><input type="hidden" name="q" value={customerTerm} />
      <div className="field"><label htmlFor="start">Data inicial</label><input id="start" type="date" name="start" defaultValue={range.start} required /></div>
      <div className="field"><label htmlFor="end">Data final</label><input id="end" type="date" name="end" defaultValue={range.end} required /></div>
      <button className="btn btn-secondary" type="submit"><CalendarCheck size={17}/>Aplicar intervalo</button>
    </form>

    {range.invalid && <div className="notice notice-error" role="alert">A data inicial deve ser anterior ou igual à data final.</div>}
    {params.saved === "completed" && <div className="notice notice-success" role="status">Consulta marcada como concluída.</div>}
    {params.error && <div className="notice notice-error" role="alert">Não foi possível concluir a consulta. Ela pode já ter sido atualizada.</div>}

    {error ? <div className="panel empty">Não foi possível carregar os exames.</div> : list.length ?
      <div className="agenda-days">{Object.entries(grouped).map(([day, exams]) => <section key={day} className="agenda-day">
        <h2>{date(`${day}T12:00:00-03:00`)}</h2>
        <div className="data-list">{exams.map(exam => <article className="data-card agenda-card" key={exam.id}>
          <div className="flex justify-between gap-3">
            <div><strong className="text-lg">{date(exam.scheduled_at, true).slice(-5)}</strong><Link className="ml-3 data-card-title" href={`/exames/${exam.id}`}>{exam.customers?.full_name}</Link></div>
            <StatusBadge tone={exam.status === "completed" ? "success" : exam.status === "cancelled" || exam.status === "no_show" ? "danger" : "default"}>{examLabels[exam.status]}</StatusBadge>
          </div>
          <div className="data-card-meta"><span>{exam.duration_minutes} min</span><span>{exam.professional_name || "Profissional não informado"}</span><span>{exam.customers?.phone || "Sem telefone"}</span></div>
          <div className="agenda-card-actions">
            <Link className="btn btn-secondary" href={`/exames/${exam.id}`}>Ver detalhes</Link>
            {(exam.status === "scheduled" || exam.status === "confirmed") && <form action={completeExam}>
              <input type="hidden" name="id" value={exam.id}/><input type="hidden" name="return_to" value={returnTo}/>
              <ConfirmSubmit message={`Marcar a consulta de ${exam.customers?.full_name} como concluída?`}><Check size={17}/>Concluir consulta</ConfirmSubmit>
            </form>}
          </div>
        </article>)}</div>
      </section>)}</div> :
      <div className="panel"><EmptyState title="Nenhuma consulta no período" description="Selecione outro intervalo ou agende uma nova consulta." action={<AddLink href="/exames/novo">Agendar exame</AddLink>}/></div>}
  </div>;
}
