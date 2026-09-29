import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { ThemeToggle } from "./theme-toggle";

describe("ThemeToggle", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.dataset.theme = "light";
  });

  it("enables and persists the AMOLED theme", () => {
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole("button", { name: "Usar modo AMOLED" }));
    expect(document.documentElement.dataset.theme).toBe("amoled");
    expect(localStorage.getItem("otica-theme")).toBe("amoled");
    expect(screen.getByRole("button", { name: "Usar modo claro" })).toHaveAttribute("aria-pressed", "true");
  });
});
