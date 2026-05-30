import { describe, it, expect } from "vitest";
import { detectFormat, analyzeAndStrip } from "./metadata-strip";

// --- helpers to build tiny valid-enough containers by hand ---

function bytes(...xs: number[]): Uint8Array {
  return new Uint8Array(xs);
}
function strBytes(s: string): number[] {
  return Array.from(s).map((c) => c.charCodeAt(0));
}

// A JPEG: SOI, APP0/JFIF (keep), APP1/Exif (drop), COM (drop), SOS + data, EOI.
function makeJpeg(): Uint8Array {
  const out: number[] = [0xff, 0xd8]; // SOI
  // APP0 JFIF: length covers length(2)+"JFIF\0"(5)+1 padding = 8
  const jfif = [...strBytes("JFIF"), 0x00, 0x00];
  out.push(0xff, 0xe0, 0x00, jfif.length + 2, ...jfif);
  // APP1 Exif: "Exif\0\0" + 2 payload bytes
  const exif = [...strBytes("Exif"), 0x00, 0x00, 0xaa, 0xbb];
  out.push(0xff, 0xe1, 0x00, exif.length + 2, ...exif);
  // COM: "hi"
  const com = strBytes("hi");
  out.push(0xff, 0xfe, 0x00, com.length + 2, ...com);
  // SOS + a couple of entropy bytes, then EOI
  out.push(0xff, 0xda, 0x00, 0x02, 0x12, 0x34, 0xff, 0xd9);
  return new Uint8Array(out);
}

// A PNG: signature, IHDR (keep), tEXt (drop), eXIf (drop), IDAT (keep), IEND.
function makePng(): Uint8Array {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  const chunk = (type: string, data: number[]): number[] => {
    const len = data.length;
    return [
      (len >>> 24) & 0xff, (len >>> 16) & 0xff, (len >>> 8) & 0xff, len & 0xff,
      ...strBytes(type), ...data,
      0x00, 0x00, 0x00, 0x00, // fake CRC (we don't verify CRC)
    ];
  };
  return new Uint8Array([
    ...sig,
    ...chunk("IHDR", [0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0]),
    ...chunk("tEXt", strBytes("Author\0Jane")),
    ...chunk("eXIf", [0x49, 0x49, 0x2a, 0x00]),
    ...chunk("IDAT", [0x78, 0x9c, 0x00]),
    ...chunk("IEND", []),
  ]);
}

describe("detectFormat", () => {
  it("recognises JPEG / PNG / WebP signatures", () => {
    expect(detectFormat(makeJpeg())).toBe("jpeg");
    expect(detectFormat(makePng())).toBe("png");
    const webp = new Uint8Array([...strBytes("RIFF"), 0, 0, 0, 0, ...strBytes("WEBP")]);
    expect(detectFormat(webp)).toBe("webp");
  });
  it("returns unknown for unrecognised bytes", () => {
    expect(detectFormat(bytes(1, 2, 3, 4))).toBe("unknown");
  });
});

describe("analyzeAndStrip — JPEG", () => {
  const jpeg = makeJpeg();
  const res = analyzeAndStrip(jpeg);

  it("removes EXIF and COM but keeps JFIF", () => {
    expect(res.supported).toBe(true);
    const tags = res.removed.map((r) => r.tag).sort();
    expect(tags).toEqual(["APP1", "COM"]);
    expect(res.removed.find((r) => r.tag === "APP1")?.label).toMatch(/EXIF/);
  });
  it("shrinks the file by exactly the removed segment bytes", () => {
    expect(res.output.length).toBe(jpeg.length - res.removedBytes);
    expect(res.removedBytes).toBeGreaterThan(0);
  });
  it("preserves SOI, the JFIF segment, and the entropy/EOI tail", () => {
    expect(Array.from(res.output.subarray(0, 2))).toEqual([0xff, 0xd8]);
    expect(Array.from(res.output.subarray(-2))).toEqual([0xff, 0xd9]);
    // JFIF marker still present.
    let hasJfif = false;
    for (let i = 0; i < res.output.length - 1; i++) {
      if (res.output[i] === 0xff && res.output[i + 1] === 0xe0) hasJfif = true;
    }
    expect(hasJfif).toBe(true);
  });
});

describe("analyzeAndStrip — PNG", () => {
  const png = makePng();
  const res = analyzeAndStrip(png);

  it("removes tEXt and eXIf, keeps IHDR/IDAT/IEND", () => {
    expect(res.supported).toBe(true);
    expect(res.removed.map((r) => r.tag).sort()).toEqual(["eXIf", "tEXt"]);
    expect(res.output.length).toBe(png.length - res.removedBytes);
  });
  it("keeps the 8-byte PNG signature", () => {
    expect(Array.from(res.output.subarray(0, 8))).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  });
});

describe("analyzeAndStrip — ICC handling", () => {
  it("keeps a JPEG ICC profile by default, removes it when asked", () => {
    const icc = [...strBytes("ICC_PROFILE"), 0x00, 0x01, 0x01, 0x00, 0x00];
    const jpeg = new Uint8Array([
      0xff, 0xd8,
      0xff, 0xe2, 0x00, icc.length + 2, ...icc,
      0xff, 0xda, 0x00, 0x02, 0x11, 0xff, 0xd9,
    ]);
    expect(analyzeAndStrip(jpeg).removed).toHaveLength(0); // kept by default
    const stripped = analyzeAndStrip(jpeg, { stripIcc: true });
    expect(stripped.removed.map((r) => r.tag)).toEqual(["APP2"]);
  });
});

describe("analyzeAndStrip — no-op + unsupported", () => {
  it("returns the input untouched when there's no metadata", () => {
    const clean = new Uint8Array([0xff, 0xd8, 0xff, 0xda, 0x00, 0x02, 0x11, 0xff, 0xd9]);
    const res = analyzeAndStrip(clean);
    expect(res.removed).toHaveLength(0);
    expect(res.removedBytes).toBe(0);
    expect(res.output).toBe(clean); // same reference — nothing rebuilt
  });
  it("flags unsupported formats without modifying bytes", () => {
    const gif = bytes(0x47, 0x49, 0x46, 0x38, 0x39, 0x61);
    const res = analyzeAndStrip(gif);
    expect(res.supported).toBe(false);
    expect(res.format).toBe("unknown");
    expect(res.output).toBe(gif);
  });
});
