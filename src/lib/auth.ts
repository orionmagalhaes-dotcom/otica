import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/database.types";

export const getSessionProfile = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data } = await supabase.from("profiles").select("id, full_name, role, active, access_type").eq("id", user.id).single();
  if (!data || !(data as unknown as Profile).active) redirect("/login?error=inactive");
  return { user, profile: data as unknown as Profile };
});

export async function hasPermission(permission: string) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("current_user_has_permission", { requested: permission });
  return data === true;
}
