export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type AppRole = "admin" | "manager" | "employee";
export type EmployeeAccessType = "standard" | "salesperson" | "professional";
export type ExamStatus = "scheduled" | "confirmed" | "completed" | "no_show" | "cancelled" | "external";
export type SaleStatus = "draft" | "completed" | "cancelled";

export interface Profile { id: string; full_name: string; role: AppRole; active: boolean; access_type: EmployeeAccessType; }
export interface Customer {
  id: string; full_name: string; birth_date: string | null; cpf: string | null; phone: string | null;
  email: string | null; address_line: string | null; city: string | null; state: string | null;
  postal_code: string | null; notes: string | null; active: boolean; created_at: string; updated_at: string;
}
export interface Exam {
  id: string; customer_id: string; status: ExamStatus; scheduled_at: string | null; duration_minutes: number;
  exam_product_id?: string | null;
  professional_name: string | null; source_name: string | null; prescription: Json | null; notes: string | null;
  cancellation_reason: string | null; completed_at: string | null; created_at: string;
  customers?: Pick<Customer, "id" | "full_name" | "phone">;
}
export interface Product {
  id: string; category_id: string; sku: string | null; name: string; description: string | null;
  cost_price: number; sale_price: number; stock_quantity: number; minimum_stock: number; active: boolean;
  product_categories?: { name: string };
}
export interface Employee { id: string; profile_id: string | null; full_name: string; job_title: string; phone: string | null; email: string | null; status: "active" | "inactive"; }
export interface Sale { id: string; number: number; customer_id: string | null; employee_id: string; status: SaleStatus; subtotal: number; discount: number; total: number; completed_at: string | null; created_at: string; customers?: { full_name: string } | null; employees?: { full_name: string }; }

// Intentionally permissive at the generated-client boundary. Database invariants and RLS remain authoritative.
export interface Database { public: { Tables: Record<string, { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }>; Views: Record<string, { Row: Record<string, unknown> }>; Functions: Record<string, { Args: Record<string, unknown>; Returns: unknown }>; Enums: Record<string, string>; CompositeTypes: never; }; }
