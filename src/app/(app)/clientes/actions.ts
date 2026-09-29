"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { digits } from "@/lib/utils";

const schema = z.object({
  id: z.string().uuid().optional(), full_name: z.string().trim().min(2, "Informe o nome completo"),
  birth_date: z.string().optional(), cpf: z.string().optional(), phone: z.string().optional(),
  email: z.string().trim().email().or(z.literal("")).optional(), address_line: z.string().trim().optional(),
  city: z.string().trim().optional(), state: z.string().trim().toUpperCase().length(2).or(z.literal("")).optional(),
  postal_code: z.string().optional(), notes: z.string().trim().max(2000).optional(),
});

export async function saveCustomer(formData: FormData) {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/clientes/novo?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  const { id, ...input } = parsed.data;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const payload = { ...input, cpf: input.cpf ? digits(input.cpf) : null, phone: input.phone ? digits(input.phone) : null, postal_code: input.postal_code ? digits(input.postal_code) : null, birth_date: input.birth_date || null, email: input.email || null, state: input.state || null, created_by: user.id };
  const result = id ? await supabase.from("customers").update(payload).eq("id", id).select("id").single() : await supabase.from("customers").insert(payload).select("id").single();
  if (result.error) {
    const message = result.error.code === "23505" ? "Já existe um cliente com este CPF." : "Não foi possível salvar o cliente.";
    redirect(`/clientes/${id ? `${id}/editar` : "novo"}?error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/clientes"); redirect(`/clientes/${result.data.id}?saved=1`);
}
