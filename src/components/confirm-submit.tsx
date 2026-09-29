"use client";
import { useFormStatus } from "react-dom";
export function ConfirmSubmit({ children, message, className="btn btn-primary" }: { children: React.ReactNode; message?: string; className?: string }) { const {pending}=useFormStatus(); return <button type="submit" className={className} disabled={pending} onClick={(e)=>{if(message&&!window.confirm(message))e.preventDefault()}}>{pending?"Processando…":children}</button> }
