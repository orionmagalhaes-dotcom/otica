export type SaleLine = { quantity: number; unitPrice: number; discount?: number };

export function calculateSale(lines: SaleLine[], generalDiscount = 0) {
  if (lines.some((line) => line.quantity <= 0 || line.unitPrice < 0 || (line.discount ?? 0) < 0)) throw new Error("Valores inválidos");
  const subtotal = lines.reduce((sum, line) => {
    const gross = line.quantity * line.unitPrice;
    if ((line.discount ?? 0) > gross) throw new Error("Desconto do item inválido");
    return sum + gross - (line.discount ?? 0);
  }, 0);
  if (generalDiscount < 0 || generalDiscount > subtotal) throw new Error("Desconto geral inválido");
  return { subtotal, total: subtotal - generalDiscount };
}

export type PaymentAmount = { amount: number };

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function fillRemainingPayment(total: number, payments: PaymentAmount[], targetIndex: number) {
  const paidByOthers = payments.reduce((sum, payment, index) => index === targetIndex ? sum : sum + Number(payment.amount || 0), 0);
  return Math.max(0, roundCurrency(total - paidByOthers));
}
