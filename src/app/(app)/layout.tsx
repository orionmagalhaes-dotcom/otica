import { AppShell } from "@/components/app-shell";
import { SetupRequired } from "@/components/setup-required";
import { getSessionProfile } from "@/lib/auth";
import "@/components/app-shell.css";
import "@/app/login/login.css";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return <SetupRequired />;
  }
  const { profile } = await getSessionProfile();
  return <AppShell profile={profile}>{children}</AppShell>;
}
