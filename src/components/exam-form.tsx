import Link from "next/link";
import { saveExam } from "@/app/(app)/exames/actions";
import type { Customer, Exam } from "@/lib/database.types";
export function ExamForm({customers,exam,error,selectedCustomer}:{customers:Pick<Customer,"id"|"full_name">[];exam?:Exam;error?:string;selectedCustomer?:string}) {
 const local=exam?.scheduled_at?new Date(new Date(exam.scheduled_at).getTime()-new Date(exam.scheduled_at).getTimezoneOffset()*60000).toISOString().slice(0,16):"";
 return <form action={saveExam} className="panel panel-body form-grid">{exam&&<input type="hidden" name="id" value={exam.id}/>} {error&&<div className="field-span-2 login-error">{error}</div>}
  <div className="field field-span-2"><label htmlFor="customer_id">Cliente *</label><select id="customer_id" name="customer_id" defaultValue={exam?.customer_id||selectedCustomer||""} required><option value="" disabled>Selecione um cliente</option>{customers.map(c=><option value={c.id} key={c.id}>{c.full_name}</option>)}</select></div>
  <div className="field"><label htmlFor="status">Situação *</label><select id="status" name="status" defaultValue={exam?.status||"scheduled"}><option value="scheduled">Agendado</option><option value="confirmed">Confirmado</option><option value="completed">Realizado</option><option value="no_show">Não realizado</option><option value="cancelled">Cancelado</option><option value="external">Exame externo</option></select></div>
  <div className="field"><label htmlFor="scheduled_at">Data e horário (não usar para externo)</label><input id="scheduled_at" name="scheduled_at" type="datetime-local" defaultValue={local}/></div>
  <div className="field"><label htmlFor="external_date">Data do exame externo</label><input id="external_date" name="external_date" type="date" defaultValue={exam?.status==="external"&&exam.completed_at?exam.completed_at.slice(0,10):""}/></div>
  <div className="field"><label htmlFor="duration_minutes">Duração (minutos)</label><input id="duration_minutes" name="duration_minutes" type="number" min="10" max="240" step="5" defaultValue={exam?.duration_minutes||30}/></div>
  <div className="field"><label htmlFor="professional_name">Profissional</label><input id="professional_name" name="professional_name" defaultValue={exam?.professional_name||""}/></div>
  <div className="field"><label htmlFor="source_name">Local do exame externo</label><input id="source_name" name="source_name" defaultValue={exam?.source_name||""}/></div>
  <div className="field field-span-2"><label htmlFor="notes">Observações e prescrição</label><textarea id="notes" name="notes" defaultValue={exam?.notes||""}/></div>
  <div className="field field-span-2"><label htmlFor="cancellation_reason">Motivo do cancelamento</label><input id="cancellation_reason" name="cancellation_reason" defaultValue={exam?.cancellation_reason||""}/></div>
  <div className="form-actions field-span-2"><Link className="btn btn-secondary" href={exam?`/exames/${exam.id}`:"/agenda"}>Cancelar</Link><button className="btn btn-primary">Salvar exame</button></div>
 </form>;
}
