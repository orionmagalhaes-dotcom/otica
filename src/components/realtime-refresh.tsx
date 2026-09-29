"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
export function RealtimeRefresh({table}:{table:"exams"|"products"}) { const router=useRouter(); useEffect(()=>{const client=createClient(); const channel=client.channel(`refresh-${table}`).on("postgres_changes",{event:"*",schema:"public",table},()=>router.refresh()).subscribe(); return()=>{void client.removeChannel(channel)};},[router,table]); return null; }
