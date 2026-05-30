import { describe, it, expect } from "vitest";
import {
  deriveCheckinStatus,
  summarizeRoster,
  sortByUrgency,
  CHECKIN_SEVERITY,
  type CheckinStatus,
} from "./roster";

const HOUR = 3_600_000;

describe("deriveCheckinStatus", () => {
  const now = 1_000_000_000;
  const overdueAfter = 12 * HOUR;

  it("SOS always wins, regardless of timing", () => {
    expect(deriveCheckinStatus("sos", now, now, overdueAfter)).toBe("sos");
    expect(deriveCheckinStatus("sos", null, now, overdueAfter)).toBe("sos");
  });
  it("no check-in → unknown", () => {
    expect(deriveCheckinStatus("ok", null, now, overdueAfter)).toBe("unknown");
  });
  it("recent check-in → ok", () => {
    expect(deriveCheckinStatus("ok", now - HOUR, now, overdueAfter)).toBe("ok");
  });
  it("stale check-in → overdue", () => {
    expect(deriveCheckinStatus("ok", now - 13 * HOUR, now, overdueAfter)).toBe("overdue");
  });
  it("exactly at the threshold is still ok (strictly greater is overdue)", () => {
    expect(deriveCheckinStatus("ok", now - overdueAfter, now, overdueAfter)).toBe("ok");
  });
});

describe("summarizeRoster", () => {
  it("counts each status and flags attention on sos/overdue", () => {
    const s = summarizeRoster(["ok", "ok", "overdue", "sos", "unknown"]);
    expect(s).toMatchObject({ total: 5, ok: 2, overdue: 1, sos: 1, unknown: 1, needsAttention: true });
  });
  it("an all-ok roster needs no attention", () => {
    expect(summarizeRoster(["ok", "ok"]).needsAttention).toBe(false);
  });
  it("empty roster", () => {
    expect(summarizeRoster([])).toMatchObject({ total: 0, needsAttention: false });
  });
});

describe("sortByUrgency", () => {
  it("orders SOS → overdue → unknown → ok, then by name", () => {
    const people = [
      { name: "Zoe", checkin_status: "ok" as CheckinStatus },
      { name: "Amy", checkin_status: "sos" as CheckinStatus },
      { name: "Bob", checkin_status: "overdue" as CheckinStatus },
      { name: "Cal", checkin_status: "unknown" as CheckinStatus },
      { name: "Ann", checkin_status: "ok" as CheckinStatus },
    ];
    expect(sortByUrgency(people).map((p) => p.name)).toEqual(["Amy", "Bob", "Cal", "Ann", "Zoe"]);
  });
  it("does not mutate the input", () => {
    const people = [
      { name: "B", checkin_status: "ok" as CheckinStatus },
      { name: "A", checkin_status: "sos" as CheckinStatus },
    ];
    const copy = [...people];
    sortByUrgency(people);
    expect(people).toEqual(copy);
  });
});

describe("CHECKIN_SEVERITY", () => {
  it("ranks sos highest and ok lowest", () => {
    expect(CHECKIN_SEVERITY.sos).toBeGreaterThan(CHECKIN_SEVERITY.overdue);
    expect(CHECKIN_SEVERITY.overdue).toBeGreaterThan(CHECKIN_SEVERITY.unknown);
    expect(CHECKIN_SEVERITY.unknown).toBeGreaterThan(CHECKIN_SEVERITY.ok);
  });
});
