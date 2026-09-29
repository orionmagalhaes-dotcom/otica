import { describe, expect, it } from "vitest";
import { date } from "./utils";

describe("date", () => {
  it("renders appointment timestamps in the company timezone", () => {
    expect(date("2026-09-28T12:30:00Z", true)).toBe("28/09/2026 às 09:30");
  });
});
