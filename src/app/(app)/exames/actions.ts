"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const examSchema = z.object({ id:z.string().uuid().optional(), customer_id:z.string().uuid(), status:z.enum(["scheduled","confirmed","completed","no_show","cancelled","external"]), scheduled_at:z.string().optional(), external_date:z.string().optional(), duration_minutes:z.coerce.number().int().min(10).max(240), professional_name:z.string().trim().optional(), source_name:z.string().trim().optional(), notes:z.string().trim().max(3000).optional(), cancellation_reason:z.string().trim().optional() });
export async function saveExam(formData: FormData) {
 const parsed=examSchema.safeParse(Object.fromEntries(formData)); if(!parsed.success) redirect(`/exames/novo?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
 const {id,external_date,...v}=parsed.data; const external=v.status==="external";
 if(!external&&!v.scheduled_at) redirect(`/exames/${id?`${id}/editar`:"novo"}?error=${encodeURIComponent("Informe a data e o horário.")}`);
 if(v.status==="cancelled"&&(!v.cancellation_reason||v.cancellation_reason.length<5)) redirect(`/exames/${id?`${id}/editar`:"novo"}?error=${encodeURIComponent("Informe o motivo do cancelamento.")}`);
 const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user) redirect("/login");
 const payload={...v,scheduled_at:external?null:new Date(v.scheduled_at!).toISOString(),completed_at:v.status==="completed"?new Date().toISOString():external&&external_date?new Date(`${external_date}T12:00:00`).toISOString():null,source_name:external?v.source_name||null:null,cancellation_reason:v.status==="cancelled"?v.cancellation_reason:null,created_by:user.id};
 const result=id?await supabase.from("exams").update(payload).eq("id",id).select("id").single():await supabase.from("exams").insert(payload).select("id").single();
 if(result.error) redirect(`/exames/${id?`${id}/editar`:"novo"}?error=${encodeURIComponent("Não foi possível salvar o exame.")}`);
 revalidatePath("/agenda");revalidatePath("/exames");redirect(`/exames/${result.data.id}?saved=1`);
}

export async function completeExam(formData: FormData) {
 const id=z.string().uuid().safeParse(String(formData.get("id")||""));
 const requestedReturn=String(formData.get("return_to")||"/agenda");
 const returnTo=requestedReturn.startsWith("/agenda")&&!requestedReturn.startsWith("//")?requestedReturn:"/agenda";
 const destination=(result:string)=>`${returnTo}${returnTo.includes("?")?"&":"?"}${result}`;
 if(!id.success)redirect(destination("error=invalid_exam"));
 const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
 const {data,error}=await supabase.from("exams").update({status:"completed",completed_at:new Date().toISOString(),cancellation_reason:null}).eq("id",id.data).in("status",["scheduled","confirmed"]).select("id,customer_id").maybeSingle();
 if(error||!data)redirect(destination("error=invalid_state"));
 revalidatePath("/agenda");revalidatePath("/exames");revalidatePath(`/exames/${id.data}`);revalidatePath(`/clientes/${data.customer_id}`);
 redirect(destination("saved=completed"));
}
