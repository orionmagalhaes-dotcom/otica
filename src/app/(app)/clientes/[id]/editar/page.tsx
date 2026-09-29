import { notFound } from "next/navigation";
import { CustomerForm } from "@/components/customer-form";
import { PageHeader } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import type { Customer } from "@/lib/database.types";
export default async function EditCustomerPage({ params, searchParams }: { params: Promise<{id:string}>; searchParams: Promise<{error?:string}> }) { const [{id},{error}] = await Promise.all([params,searchParams]); const supabase=await createClient(); const {data}=await supabase.from("customers").select("*").eq("id",id).single(); if(!data) notFound(); return <div className="page"><PageHeader title="Editar cliente" description="Atualize os dados cadastrais"/><CustomerForm customer={data as unknown as Customer} error={error}/></div>; }
