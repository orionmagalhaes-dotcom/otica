import { describe, expect, it } from "vitest";
import { calculateSale, fillRemainingPayment } from "./sale-math";

describe("calculateSale", () => {
  it("calcula itens e descontos sem arredondar prematuramente", () => {
    expect(calculateSale([{ quantity: 2, unitPrice: 100, discount: 10 }, { quantity: 1, unitPrice: 50 }], 20)).toEqual({ subtotal: 240, total: 220 });
  });
  it("rejeita desconto maior que a venda", () => {
    expect(() => calculateSale([{ quantity: 1, unitPrice: 20 }], 21)).toThrow("Desconto geral inválido");
  });
  it("rejeita quantidade não positiva", () => {
    expect(() => calculateSale([{ quantity: 0, unitPrice: 20 }])).toThrow("Valores inválidos");
  });
  it("preenche o pagamento restante considerando o desconto", () => {
    expect(fillRemainingPayment(180, [{ amount: 50 }, { amount: 0 }], 1)).toBe(130);
  });
});
