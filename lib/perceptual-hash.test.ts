import { describe, it, expect } from "vitest";
import { grayscale, aHash, dHash, hammingDistance, similarityLabel } from "./perceptual-hash";

describe("grayscale", () => {
  it("maps white to 255 and black to 0 (Rec. 601 luma)", () => {
    expect(grayscale([255, 255, 255, 255], 1, 1)).toEqual([255]);
    expect(grayscale([0, 0, 0, 255], 1, 1)).toEqual([0]);
  });
  it("weights red channel at 0.299", () => {
    expect(grayscale([255, 0, 0, 255], 1, 1)[0]).toBeCloseTo(76.245, 2);
  });
  it("returns one value per pixel", () => {
    const rgba = new Array(2 * 2 * 4).fill(128);
    expect(grayscale(rgba, 2, 2)).toHaveLength(4);
  });
});

describe("aHash / dHash", () => {
  it("produces 16 hex chars", () => {
    expect(aHash(new Array(64).fill(100))).toHaveLength(16);
    expect(dHash(new Array(72).fill(100))).toHaveLength(16);
  });
  it("all-equal 8x8 is all-ones (every value >= mean)", () => {
    expect(aHash(new Array(64).fill(50))).toBe("ffffffffffffffff");
  });
  it("strictly-increasing rows make dHash all-ones (left < right)", () => {
    const gray: number[] = [];
    for (let row = 0; row < 8; row++) for (let col = 0; col < 9; col++) gray.push(col);
    expect(dHash(gray)).toBe("ffffffffffffffff");
  });
});

describe("hammingDistance", () => {
  it("is 0 for identical hashes", () => {
    expect(hammingDistance("abcd1234", "abcd1234")).toBe(0);
  });
  it("counts all 64 bits between all-zero and all-one", () => {
    expect(hammingDistance("0000000000000000", "ffffffffffffffff")).toBe(64);
  });
  it("penalises mismatched lengths", () => {
    expect(hammingDistance("ffff", "ffffffff")).toBe(32);
  });
});

describe("similarityLabel", () => {
  it("brackets distance into plain-language reads", () => {
    expect(similarityLabel(0)).toMatch(/Identical/);
    expect(similarityLabel(5)).toMatch(/Very similar/);
    expect(similarityLabel(10)).toMatch(/^Similar/);
    expect(similarityLabel(11)).toBe("Different images");
  });
});
