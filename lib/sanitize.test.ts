import { describe, it, expect } from "vitest";
import { sanitizedFilename, normalizeRect, isDrawableRect } from "./sanitize";

describe("sanitizedFilename", () => {
  it("swaps the extension and marks the copy", () => {
    expect(sanitizedFilename("photo.JPG", "png")).toBe("photo-sanitized.png");
    expect(sanitizedFilename("scan.pdf", "jpg")).toBe("scan-sanitized.jpg");
  });
  it("only strips the final extension", () => {
    expect(sanitizedFilename("a.b.c.png", "jpg")).toBe("a.b.c-sanitized.jpg");
  });
  it("falls back to a base name when there's nothing usable", () => {
    expect(sanitizedFilename("", "png")).toBe("image-sanitized.png");
    expect(sanitizedFilename(".gitignore", "png")).toBe("image-sanitized.png");
  });
});

describe("normalizeRect", () => {
  it("orders corners to a top-left rect with positive size", () => {
    expect(normalizeRect({ x: 10, y: 10 }, { x: 4, y: 2 })).toEqual({ x: 4, y: 2, w: 6, h: 8 });
    expect(normalizeRect({ x: 0, y: 0 }, { x: 5, y: 7 })).toEqual({ x: 0, y: 0, w: 5, h: 7 });
  });
});

describe("isDrawableRect", () => {
  it("rejects accidental tiny drags", () => {
    expect(isDrawableRect({ x: 0, y: 0, w: 2, h: 50 })).toBe(false);
    expect(isDrawableRect({ x: 0, y: 0, w: 20, h: 20 })).toBe(true);
  });
});
