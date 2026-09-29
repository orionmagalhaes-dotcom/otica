import Link from "next/link";
import type { Customer } from "@/lib/database.types";
import { saveCustomer } from "@/app/(app)/clientes/actions";

export function CustomerForm({ customer, error }: { customer?: Customer; error?: string }) {
  return <form action={saveCustomer} className="panel panel-body form-grid">
    {customer && <input type="hidden" name="id" value={customer.id}/>} 
    {error && <div className="field-span-2 login-error" role="alert">{error}</div>}
    <div className="field field-span-2"><label htmlFor="full_name">Nome completo *</label><input id="full_name" name="full_name" defaultValue={customer?.full_name} required minLength={2} autoFocus/></div>
    <div className="field"><label htmlFor="cpf">CPF</label><input id="cpf" name="cpf" defaultValue={customer?.cpf ?? ""} inputMode="numeric" maxLength={14} placeholder="Somente números"/></div>
    <div className="field"><label htmlFor="birth_date">Data de nascimento</label><input id="birth_date" name="birth_date" type="date" defaultValue={customer?.birth_date ?? ""}/></div>
    <div className="field"><label htmlFor="phone">Telefone</label><input id="phone" name="phone" defaultValue={customer?.phone ?? ""} inputMode="tel"/></div>
    <div className="field"><label htmlFor="email">E-mail</label><input id="email" name="email" defaultValue={customer?.email ?? ""} type="email" inputMode="email"/></div>
    <div className="field field-span-2"><label htmlFor="address_line">Endereço</label><input id="address_line" name="address_line" defaultValue={customer?.address_line ?? ""}/></div>
    <div className="field"><label htmlFor="city">Cidade</label><input id="city" name="city" defaultValue={customer?.city ?? ""}/></div>
    <div className="form-grid" style={{gridTemplateColumns:"1fr 1fr"}}><div className="field"><label htmlFor="state">UF</label><input id="state" name="state" defaultValue={customer?.state ?? ""} maxLength={2}/></div><div className="field"><label htmlFor="postal_code">CEP</label><input id="postal_code" name="postal_code" defaultValue={customer?.postal_code ?? ""} inputMode="numeric"/></div></div>
    <div className="field field-span-2"><label htmlFor="notes">Observações</label><textarea id="notes" name="notes" defaultValue={customer?.notes ?? ""} maxLength={2000}/></div>
    <div className="form-actions field-span-2"><Link className="btn btn-secondary" href={customer ? `/clientes/${customer.id}` : "/clientes"}>Cancelar</Link><button className="btn btn-primary" type="submit">Salvar cliente</button></div>
  </form>;
}
