"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { money } from "@/lib/utils";
import { fillRemainingPayment } from "@/lib/sale-math";

type Option = { id: string; name?: string; full_name?: string; sale_price?: number; stock_quantity?: number };
type Line = { product_id: string; quantity: number; discount: number };
type Payment = { payment_method_id: string; amount: number; installments: number };
type NewCustomer = { full_name: string; cpf: string; phone: string; email: string };

const emptyCustomer: NewCustomer = { full_name: "", cpf: "", phone: "", email: "" };

export function SaleForm({ customers: initialCustomers, employees, products, paymentMethods, selectedCustomer }: { customers: Option[]; employees: Option[]; products: Option[]; paymentMethods: Option[]; selectedCustomer?: string }) {
  const router = useRouter();
  const key = useRef(crypto.randomUUID());
  const [customers, setCustomers] = useState(initialCustomers);
  const [customer, setCustomer] = useState(selectedCustomer || "");
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState<NewCustomer>(emptyCustomer);
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [employee, setEmployee] = useState("");
  const [items, setItems] = useState<Line[]>([]);
  const [payments, setPayments] = useState<Payment[]>([{ payment_method_id: "", amount: 0, installments: 1 }]);
  const [discount, setDiscount] = useState(0);
  const [pending, setPending] = useState(false);
  const subtotal = useMemo(() => items.reduce((sum, item) => {
    const product = products.find((entry) => entry.id === item.product_id);
    return sum + item.quantity * Number(product?.sale_price || 0) - item.discount;
  }, 0), [items, products]);
  const total = Math.max(0, subtotal - discount);
  const allocatedPayments = useMemo(() => payments.map((payment, index) => {
    const targetIndex = payments.length - 1;
    return index === targetIndex ? { ...payment, amount: fillRemainingPayment(total, payments, targetIndex) } : payment;
  }), [payments, total]);
  const paymentTotal = allocatedPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

  function addItem(id: string) {
    if (!id) return;
    setItems((current) => current.some((item) => item.product_id === id) ? current : [...current, { product_id: id, quantity: 1, discount: 0 }]);
  }

  function updateLine(index: number, patch: Partial<Line>) {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  }

  function updatePayment(index: number, patch: Partial<Payment>) {
    setPayments((current) => current.map((payment, paymentIndex) => paymentIndex === index ? { ...payment, ...patch } : payment));
  }

  async function saveNewCustomer() {
    const fullName = newCustomer.full_name.trim();
    if (fullName.length < 2) {
      toast.error("Informe o nome do cliente.");
      return;
    }
    setSavingCustomer(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Sua sessão expirou. Entre novamente.");
      setSavingCustomer(false);
      return;
    }
    const digits = (value: string) => value.replace(/\D/g, "");
    const { data, error } = await supabase.from("customers").insert({
      full_name: fullName,
      cpf: newCustomer.cpf ? digits(newCustomer.cpf) : null,
      phone: newCustomer.phone ? digits(newCustomer.phone) : null,
      email: newCustomer.email.trim() || null,
      created_by: user.id,
    }).select("id,full_name").single();
    setSavingCustomer(false);
    if (error || !data) {
      toast.error(error?.code === "23505" ? "Já existe um cliente com este CPF." : "Não foi possível cadastrar o cliente.");
      return;
    }
    setCustomers((current) => [...current, data].sort((first, second) => (first.full_name || "").localeCompare(second.full_name || "")));
    setCustomer(data.id);
    setNewCustomer(emptyCustomer);
    setShowNewCustomer(false);
    toast.success("Cliente cadastrado e selecionado para esta venda.");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!employee || !items.length || allocatedPayments.some((payment) => !payment.payment_method_id) || Math.abs(paymentTotal - total) > 0.009) {
      toast.error("Revise o responsável, os itens e a soma dos pagamentos.");
      return;
    }
    setPending(true);
    const { data, error } = await createClient().rpc("complete_sale", { p_idempotency_key: key.current, p_customer_id: customer || null, p_employee_id: employee, p_discount: discount, p_notes: "", p_items: items, p_payments: allocatedPayments });
    if (error) {
      toast.error(error.message);
      setPending(false);
      return;
    }
    toast.success("Venda concluída e estoque atualizado.");
    router.push(`/vendas/${data}`);
    router.refresh();
  }

  return <form onSubmit={submit} className="grid gap-4">
    <section className="panel panel-body form-grid">
      <div className="field">
        <label>Cliente (opcional)</label>
        <select value={customer} onChange={(event) => setCustomer(event.target.value)}><option value="">Consumidor não identificado</option>{customers.map((entry) => <option key={entry.id} value={entry.id}>{entry.full_name}</option>)}</select>
        <button type="button" className="btn btn-secondary mt-2 self-start" onClick={() => setShowNewCustomer((current) => !current)}><Plus size={16}/>{showNewCustomer ? "Cancelar cadastro" : "Cadastrar novo cliente"}</button>
      </div>
      <div className="field"><label>Funcionário responsável *</label><select value={employee} onChange={(event) => setEmployee(event.target.value)} required><option value="">Selecione</option>{employees.map((entry) => <option key={entry.id} value={entry.id}>{entry.full_name}</option>)}</select></div>
      {showNewCustomer && <div className="field-span-2 panel panel-body form-grid">
        <div className="field field-span-2"><label htmlFor="new-customer-name">Nome completo *</label><input id="new-customer-name" value={newCustomer.full_name} onChange={(event) => setNewCustomer((current) => ({ ...current, full_name: event.target.value }))} minLength={2} required /></div>
        <div className="field"><label htmlFor="new-customer-cpf">CPF</label><input id="new-customer-cpf" value={newCustomer.cpf} onChange={(event) => setNewCustomer((current) => ({ ...current, cpf: event.target.value }))} inputMode="numeric" maxLength={14} placeholder="Somente números" /></div>
        <div className="field"><label htmlFor="new-customer-phone">Telefone</label><input id="new-customer-phone" value={newCustomer.phone} onChange={(event) => setNewCustomer((current) => ({ ...current, phone: event.target.value }))} inputMode="tel" /></div>
        <div className="field field-span-2"><label htmlFor="new-customer-email">E-mail</label><input id="new-customer-email" value={newCustomer.email} onChange={(event) => setNewCustomer((current) => ({ ...current, email: event.target.value }))} type="email" inputMode="email" /></div>
        <button type="button" className="btn btn-primary justify-self-start" disabled={savingCustomer} onClick={saveNewCustomer}>{savingCustomer ? "Cadastrando…" : "Salvar e usar cliente"}</button>
      </div>}
    </section>

    <section className="panel"><div className="panel-header"><h2 className="section-title">Produtos</h2></div><div className="panel-body"><div className="field mb-4"><label>Adicionar produto</label><select value="" onChange={(event) => addItem(event.target.value)}><option value="">Selecione um produto</option>{products.filter((product) => !items.some((item) => item.product_id === product.id) && Number(product.stock_quantity) > 0).map((product) => <option key={product.id} value={product.id}>{product.name} · {product.stock_quantity} un. · {money(product.sale_price)}</option>)}</select></div>{items.length ? <div className="data-list">{items.map((item, index) => { const product = products.find((entry) => entry.id === item.product_id)!; return <div className="data-card" key={item.product_id}><div className="flex justify-between gap-3"><div><strong>{product.name}</strong><div className="data-card-meta mt-1">{money(product.sale_price)} cada · {product.stock_quantity} disponíveis</div></div><button type="button" className="icon-btn" onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remover ${product.name}`}><Trash2 size={17}/></button></div><div className="flex flex-wrap items-end gap-3"><div className="field"><label>Quantidade</label><div className="flex"><button type="button" className="icon-btn" onClick={() => updateLine(index, { quantity: Math.max(1, item.quantity - 1) })}><Minus size={16}/></button><input style={{ width: 74, textAlign: "center" }} type="number" min="1" max={product.stock_quantity} step="1" value={item.quantity} onChange={(event) => updateLine(index, { quantity: Number(event.target.value) })}/><button type="button" className="icon-btn" onClick={() => updateLine(index, { quantity: Math.min(Number(product.stock_quantity), item.quantity + 1) })}><Plus size={16}/></button></div></div><div className="field"><label>Desconto no item</label><input style={{ width: 130 }} type="number" min="0" step="0.01" value={item.discount} onChange={(event) => updateLine(index, { discount: Number(event.target.value) })}/></div><strong className="ml-auto mb-3">{money(item.quantity * Number(product.sale_price) - item.discount)}</strong></div></div>; })}</div> : <div className="empty"><strong>Nenhum produto adicionado</strong>Selecione acima para montar a venda.</div>}</div></section>

    <div className="split"><section className="panel"><div className="panel-header"><h2 className="section-title">Pagamentos</h2><button type="button" className="btn btn-secondary" onClick={() => setPayments([...allocatedPayments, { payment_method_id: "", amount: 0, installments: 1 }])}><Plus size={16}/>Dividir</button></div><div className="panel-body data-list">{allocatedPayments.map((payment, index) => <div className="form-grid" key={index}><div className="field"><label>Forma</label><select value={payment.payment_method_id} onChange={(event) => updatePayment(index, { payment_method_id: event.target.value })}><option value="">Selecione</option>{paymentMethods.map((method) => <option key={method.id} value={method.id}>{method.name}</option>)}</select></div><div className="field"><label>Valor</label><div className="flex gap-2"><input type="number" min="0.01" step="0.01" value={payment.amount || ""} readOnly={index === allocatedPayments.length - 1} onChange={(event) => updatePayment(index, { amount: Number(event.target.value) })}/>{allocatedPayments.length > 1 && <button type="button" className="icon-btn" onClick={() => setPayments((current) => current.filter((_, paymentIndex) => paymentIndex !== index))}><Trash2 size={16}/></button>}</div></div></div>)}</div></section>
      <section className="panel panel-body"><div className="flex justify-between py-2"><span>Subtotal</span><strong>{money(subtotal)}</strong></div><div className="field py-2"><label>Desconto geral (gerente)</label><input type="number" min="0" max={subtotal} step="0.01" value={discount} onChange={(event) => setDiscount(Number(event.target.value))}/></div><div className="flex justify-between border-t border-gray-200 mt-3 pt-4 text-xl"><strong>Total</strong><strong>{money(total)}</strong></div><div className="flex justify-between text-sm text-gray-500 py-3"><span>Pagamentos informados</span><span>{money(paymentTotal)}</span></div><button className="btn btn-primary w-full" disabled={pending || !items.length}>{pending ? "Concluindo…" : "Concluir venda"}</button><p className="text-xs text-gray-500 mt-3">Preços e estoque serão validados novamente pelo servidor.</p></section></div>
  </form>;
}
