import { describe, it, expect } from "vitest";
import { findNearDuplicates, type HashedImage } from "./image-compare";

const img = (id: string, aHash: string, dHash: string): HashedImage => ({ id, name: id, aHash, dHash });

describe("findNearDuplicates", () => {
  it("returns no pairs for fewer than two images", () => {
    expect(findNearDuplicates([])).toEqual([]);
    expect(findNearDuplicates([img("a", "ffffffffffffffff", "0000000000000000")])).toEqual([]);
  });

  it("flags identical images as near-identical (distance 0)", () => {
    const pairs = findNearDuplicates([
      img("a", "ffffffffffffffff", "00ff00ff00ff00ff"),
      img("b", "ffffffffffffffff", "00ff00ff00ff00ff"),
    ]);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].dDistance).toBe(0);
    expect(pairs[0].aDistance).toBe(0);
    expect(pairs[0].label).toBe("near-identical");
  });

  it("thresholds on dHash, not aHash (flat aHash collision is not a match)", () => {
    // Same aHash (flat images alias) but very different dHash → NOT flagged.
    const pairs = findNearDuplicates(
      [
        img("a", "ffffffffffffffff", "0000000000000000"),
        img("b", "ffffffffffffffff", "ffffffffffffffff"),
      ],
      12,
    );
    expect(pairs).toEqual([]);
  });

  it("respects the threshold", () => {
    // dHash differs by 8 bits (one hex nibble 0x0 vs 0xff is 8 bits... use 4).
    const a = img("a", "0000000000000000", "0000000000000000");
    const b = img("b", "0000000000000000", "000000000000000f"); // 4 bits differ
    expect(findNearDuplicates([a, b], 3)).toHaveLength(0);
    expect(findNearDuplicates([a, b], 4)).toHaveLength(1);
  });

  it("orders pairs closest-first by dHash distance", () => {
    const base = img("base", "0000000000000000", "0000000000000000");
    const near = img("near", "0000000000000000", "000000000000000f"); // 4 bits
    const far = img("far", "0000000000000000", "0000000000000003"); // 2 bits
    const pairs = findNearDuplicates([base, near, far], 12);
    // base-far (2) should rank before base-near (4); near-far also within range.
    expect(pairs[0].dDistance).toBeLessThanOrEqual(pairs[1].dDistance);
    expect(pairs.map((p) => p.dDistance)).toEqual([...pairs.map((p) => p.dDistance)].sort((x, y) => x - y));
  });

  it("reports the aHash distance alongside the dHash distance", () => {
    const pairs = findNearDuplicates([
      img("a", "0000000000000000", "0000000000000000"),
      img("b", "000000000000000f", "0000000000000000"),
    ]);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].dDistance).toBe(0);
    expect(pairs[0].aDistance).toBe(4);
  });
});
