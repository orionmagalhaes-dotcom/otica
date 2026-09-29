"use client";
import { cancelSale } from "@/app/(app)/vendas/actions";
import { ConfirmSubmit } from "@/components/confirm-submit";
export function CancelSaleForm({ id }: { id: string }) { return <form action={cancelSale} className="field"><input type="hidden" name="id" value={id}/><label>Motivo *</label><textarea name="reason" minLength={5} required/><ConfirmSubmit className="btn btn-danger" message="Cancelar esta venda? O estoque será devolvido e o estorno financeiro será registrado.">Cancelar e estornar</ConfirmSubmit></form>; }
