import { describe, expect, it } from "vitest";
import { agendaTimestamp, resolveAgendaPeriod } from "./agenda-period";

describe("resolveAgendaPeriod", () => {
  it("includes today in the last 7, 15 and 30 day ranges", () => {
    expect(resolveAgendaPeriod({ period: "last7" }, "2026-09-28")).toMatchObject({ start: "2026-09-22", end: "2026-09-28" });
    expect(resolveAgendaPeriod({ period: "last15" }, "2026-09-28")).toMatchObject({ start: "2026-09-14", end: "2026-09-28" });
    expect(resolveAgendaPeriod({ period: "last30" }, "2026-09-28")).toMatchObject({ start: "2026-08-30", end: "2026-09-28" });
  });

  it("accepts a valid custom range and rejects an inverted one", () => {
    expect(resolveAgendaPeriod({ period: "custom", start: "2026-09-01", end: "2026-09-10" }, "2026-09-28")).toMatchObject({ start: "2026-09-01", end: "2026-09-10", invalid: false });
    expect(resolveAgendaPeriod({ period: "custom", start: "2026-09-10", end: "2026-09-01" }, "2026-09-28")).toMatchObject({ start: "2026-09-28", end: "2026-09-28", invalid: true });
  });

  it("uses the company timezone in database boundaries", () => {
    expect(agendaTimestamp("2026-09-28")).toBe("2026-09-28T00:00:00-03:00");
    expect(agendaTimestamp("2026-09-28", true)).toBe("2026-09-28T23:59:59.999-03:00");
  });
});
