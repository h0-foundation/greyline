import { describe, it, expect } from "vitest";
import { isPillarMode, visibleInPillar } from "./pillars";

describe("pillar mode", () => {
  it("validates pillar mode strings", () => {
    expect(isPillarMode("all")).toBe(true);
    expect(isPillarMode("travel")).toBe(true);
    expect(isPillarMode("counter-surveillance")).toBe(true);
    expect(isPillarMode("journalism")).toBe(true);
    expect(isPillarMode("nope")).toBe(false);
    expect(isPillarMode(null)).toBe(false);
  });

  it("shows everything in 'all' mode", () => {
    expect(visibleInPillar(["travel"], "all")).toBe(true);
    expect(visibleInPillar(["journalism"], "all")).toBe(true);
    expect(visibleInPillar(undefined, "all")).toBe(true);
  });

  it("always shows untagged (cross-cutting) items", () => {
    expect(visibleInPillar(undefined, "travel")).toBe(true);
    expect(visibleInPillar([], "journalism")).toBe(true);
  });

  it("shows a tagged item only when its tag matches the active pillar", () => {
    expect(visibleInPillar(["travel"], "travel")).toBe(true);
    expect(visibleInPillar(["travel"], "journalism")).toBe(false);
    expect(visibleInPillar(["counter-surveillance", "journalism"], "journalism")).toBe(true);
  });
});
