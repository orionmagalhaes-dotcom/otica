import { describe, expect, it } from "vitest";
import { calculateSale } from "./sale-math";

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
});
