/* Perceptual image hashing — pure, offline, dependency-free.
 *
 * Perceptual hashes (aHash, dHash) summarise an image's structure into a short
 * fingerprint so near-duplicates — recycled, cropped, recompressed, or lightly
 * edited photos — collide or sit a small Hamming distance apart. This is the
 * offline half of the Bellingcat reverse-image workflow (research/
 * INVESTIGATIVE_JOURNALISM_OSINT.md): fingerprint locally, then hand the image
 * to a web reverse-search if needed. Pixel extraction (canvas) lives in the
 * component; the math here is pure so it's unit-testable.
 */

/** RGBA bytes → row-major grayscale (Rec. 601 luma), one value per pixel. */
export function grayscale(rgba: Uint8ClampedArray | number[], width: number, height: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < width * height; i++) {
    const r = rgba[i * 4];
    const g = rgba[i * 4 + 1];
    const b = rgba[i * 4 + 2];
    out.push(0.299 * r + 0.587 * g + 0.114 * b);
  }
  return out;
}

function bitsToHex(bits: string): string {
  let hex = "";
  for (let i = 0; i < bits.length; i += 4) hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
  return hex;
}

/** Average hash over an 8×8 grayscale grid (64 values) → 16 hex chars. */
export function aHash(gray8x8: number[]): string {
  const mean = gray8x8.reduce((s, v) => s + v, 0) / gray8x8.length;
  let bits = "";
  for (const v of gray8x8) bits += v >= mean ? "1" : "0";
  return bitsToHex(bits);
}

/** Difference hash over a 9×8 grayscale grid (72 values) → 16 hex chars. */
export function dHash(gray9x8: number[]): string {
  let bits = "";
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const left = gray9x8[row * 9 + col];
      const right = gray9x8[row * 9 + col + 1];
      bits += left < right ? "1" : "0";
    }
  }
  return bitsToHex(bits);
}

/** Bit-difference between two equal-length hex hashes (0 = identical). */
export function hammingDistance(a: string, b: string): number {
  if (a.length !== b.length) return Math.max(a.length, b.length) * 4;
  let d = 0;
  for (let i = 0; i < a.length; i++) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (x) {
      d += x & 1;
      x >>= 1;
    }
  }
  return d;
}

/** Plain-language read of a dHash Hamming distance (0–64). */
export function similarityLabel(dist: number): string {
  if (dist === 0) return "Identical fingerprint — almost certainly the same image";
  if (dist <= 5) return "Very similar — likely the same image, lightly edited or recompressed";
  if (dist <= 10) return "Similar — possibly related, cropped, or a different frame";
  return "Different images";
}
