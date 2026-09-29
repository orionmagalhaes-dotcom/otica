"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { saveExam } from "@/app/(app)/exames/actions";
import type { Customer, Exam } from "@/lib/database.types";

type CustomerOption = Pick<Customer, "id" | "full_name" | "cpf" | "phone" | "email" | "city" | "address_line">;

function normalizeSearch(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

export function ExamForm({ customers, examTypes, professionals, exam, error, selectedCustomer }: { customers: CustomerOption[]; examTypes: { id: string; name: string }[]; professionals: { id: string; full_name: string }[]; exam?: Exam; error?: string; selectedCustomer?: string }) {
  const local = exam?.scheduled_at ? new Date(new Date(exam.scheduled_at).getTime() - new Date(exam.scheduled_at).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "";
  const [customerId, setCustomerId] = useState(exam?.customer_id || selectedCustomer || "");
  const [customerSearch, setCustomerSearch] = useState("");
  const matchingCustomers = useMemo(() => {
    const query = normalizeSearch(customerSearch);
    if (!query) return customers;
    return customers.filter((customer) => normalizeSearch([customer.full_name, customer.cpf, customer.phone, customer.email, customer.city, customer.address_line].filter(Boolean).join(" ")).includes(query));
  }, [customerSearch, customers]);

  return <form action={saveExam} className="panel panel-body form-grid">
    {exam && <input type="hidden" name="id" value={exam.id}/>} {error && <div className="field-span-2 login-error">{error}</div>}
    <div className="field field-span-2"><label htmlFor="customer-search">Pesquisar cliente</label><input id="customer-search" value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} placeholder="Nome, cidade, telefone, CPF ou e-mail"/></div>
    <div className="field field-span-2"><label htmlFor="customer_id">Cliente</label><select id="customer_id" name="customer_id" value={customerId} onChange={(event) => setCustomerId(event.target.value)}><option value="">Cadastrar novo cliente abaixo</option>{matchingCustomers.map((customer) => <option value={customer.id} key={customer.id}>{customer.full_name}{customer.city ? ` · ${customer.city}` : ""}{customer.phone ? ` · ${customer.phone}` : ""}</option>)}</select>{customerSearch && !matchingCustomers.length && <small className="text-gray-500">Nenhum cliente encontrado. Cadastre um novo cliente abaixo.</small>}</div>
    {!exam && <div className="field-span-2 panel panel-body form-grid"><div className="field-span-2"><strong>Novo cliente</strong><p className="text-sm text-gray-500">Se nenhum cliente for selecionado, estes dados serão cadastrados automaticamente ao salvar ou concluir o exame.</p></div><div className="field field-span-2"><label htmlFor="new_customer_name">Nome completo</label><input id="new_customer_name" name="new_customer_name" minLength={2}/></div><div className="field"><label htmlFor="new_customer_cpf">CPF</label><input id="new_customer_cpf" name="new_customer_cpf" inputMode="numeric" maxLength={14}/></div><div className="field"><label htmlFor="new_customer_phone">Telefone</label><input id="new_customer_phone" name="new_customer_phone" inputMode="tel"/></div><div className="field field-span-2"><label htmlFor="new_customer_email">E-mail</label><input id="new_customer_email" name="new_customer_email" type="email" inputMode="email"/></div></div>}
    <div className="field field-span-2"><label htmlFor="exam_product_id">Tipo de exame</label><select id="exam_product_id" name="exam_product_id" defaultValue={exam?.exam_product_id || ""}><option value="">Não informado</option>{examTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select>{!examTypes.length && <small className="text-gray-500">Cadastre tipos em Produtos e serviços, usando a categoria Exames.</small>}</div>
    <div className="field"><label htmlFor="status">Situação *</label><select id="status" name="status" defaultValue={exam?.status || "scheduled"}><option value="scheduled">Agendado</option><option value="confirmed">Confirmado</option><option value="completed">Realizado</option><option value="no_show">Não realizado</option><option value="cancelled">Cancelado</option><option value="external">Exame externo</option></select></div>
    <div className="field"><label htmlFor="scheduled_at">Data e horário (não usar para externo)</label><input id="scheduled_at" name="scheduled_at" type="datetime-local" defaultValue={local}/></div>
    <div className="field"><label htmlFor="external_date">Data do exame externo</label><input id="external_date" name="external_date" type="date" defaultValue={exam?.status === "external" && exam.completed_at ? exam.completed_at.slice(0, 10) : ""}/></div>
    <div className="field"><label htmlFor="duration_minutes">Duração (minutos)</label><input id="duration_minutes" name="duration_minutes" type="number" min="10" max="240" step="5" defaultValue={exam?.duration_minutes || 30}/></div>
    <div className="field"><label htmlFor="professional_name">Profissional</label><select id="professional_name" name="professional_name" defaultValue={exam?.professional_name || ""}><option value="">Não informado</option>{exam?.professional_name && !professionals.some((professional) => professional.full_name === exam.professional_name) && <option value={exam.professional_name}>{exam.professional_name}</option>}{professionals.map((professional) => <option key={professional.id} value={professional.full_name}>{professional.full_name}</option>)}</select><small className="text-gray-500">Cadastre profissionais em Funcionários para selecioná-los aqui.</small></div>
    <div className="field"><label htmlFor="source_name">Local do exame externo</label><input id="source_name" name="source_name" defaultValue={exam?.source_name || ""}/></div>
    <div className="field field-span-2"><label htmlFor="notes">Observações e prescrição</label><textarea id="notes" name="notes" defaultValue={exam?.notes || ""}/></div>
    <div className="field field-span-2"><label htmlFor="cancellation_reason">Motivo do cancelamento</label><input id="cancellation_reason" name="cancellation_reason" defaultValue={exam?.cancellation_reason || ""}/></div>
    <div className="form-actions field-span-2"><Link className="btn btn-secondary" href={exam ? `/exames/${exam.id}` : "/agenda"}>Cancelar</Link><button className="btn btn-primary">Salvar exame</button></div>
  </form>;
}
