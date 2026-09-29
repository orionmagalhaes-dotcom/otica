import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return <header className="page-header"><div><h1 className="page-title">{title}</h1>{description && <p className="page-subtitle">{description}</p>}</div>{action}</header>;
}
export function EmptyState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return <div className="empty"><strong>{title}</strong><span>{description}</span>{action && <div style={{ marginTop: 18 }}>{action}</div>}</div>;
}
export function Metric({ label, value, note, icon: Icon }: { label: string; value: React.ReactNode; note?: string; icon?: LucideIcon }) {
  return <div className="panel metric"><div className="flex items-center justify-between"><span className="metric-label">{label}</span>{Icon && <Icon size={18} aria-hidden />}</div><div className="metric-value">{value}</div>{note && <div className="metric-note">{note}</div>}</div>;
}
export function StatusBadge({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "warning" | "danger" | "success" }) {
  return <span className={cn("badge", tone !== "default" && `badge-${tone}`)}>{children}</span>;
}
export function AddLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link className="btn btn-primary" href={href}>{children}</Link>;
}
