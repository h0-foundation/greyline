/* Universal, lossless image metadata stripping — pure, offline, dependency-free.
 *
 * Operates on the raw container bytes (Uint8Array), so it removes metadata
 * WITHOUT re-encoding the image: JPEG APPn/COM segments and PNG/WebP metadata
 * chunks are excised by byte surgery, leaving the actual compressed pixel data
 * untouched. That's the difference from a canvas re-encode (lib/sanitize + the
 * sanitizer tool): no quality loss, and the tool can report exactly which
 * metadata blocks were present before removing them.
 *
 * Supported losslessly: JPEG, PNG, WebP. For anything else the caller should
 * fall back to the re-encode path (the Sanitize & redact tool). No DOM, no
 * network, no Date — safe to unit-test directly.
 */

export type ImageFormat = "jpeg" | "png" | "webp" | "unknown";

export interface MetaBlock {
  /** Container-specific tag, e.g. "APP1", "tEXt", "EXIF". */
  tag: string;
  /** Human label, e.g. "EXIF (camera, GPS, timestamps)". */
  label: string;
  /** Total bytes the block occupies in the file (header + payload). */
  bytes: number;
  /** True for blocks that can carry identifying info (EXIF/GPS/XMP/IPTC/text). */
  sensitive: boolean;
}

export interface StripResult {
  format: ImageFormat;
  /** False when the format isn't supported for lossless stripping. */
  supported: boolean;
  /** The cleaned bytes (identical reference to input when nothing was removed). */
  output: Uint8Array;
  /** Metadata blocks that were removed. */
  removed: MetaBlock[];
  removedBytes: number;
}

function u16be(b: Uint8Array, off: number): number {
  return (b[off] << 8) | b[off + 1];
}
function u32be(b: Uint8Array, off: number): number {
  // >>> 0 keeps it an unsigned 32-bit value.
  return ((b[off] << 24) | (b[off + 1] << 16) | (b[off + 2] << 8) | b[off + 3]) >>> 0;
}
function u32le(b: Uint8Array, off: number): number {
  return (b[off] | (b[off + 1] << 8) | (b[off + 2] << 16) | (b[off + 3] << 24)) >>> 0;
}
function ascii(b: Uint8Array, off: number, len: number): string {
  let s = "";
  for (let i = 0; i < len && off + i < b.length; i++) s += String.fromCharCode(b[off + i]);
  return s;
}

export function detectFormat(b: Uint8Array): ImageFormat {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpeg";
  if (
    b.length >= 8 &&
    b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
    b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a
  ) {
    return "png";
  }
  if (b.length >= 12 && ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 4) === "WEBP") return "webp";
  return "unknown";
}

function concat(parts: Uint8Array[]): Uint8Array {
  let total = 0;
  for (const p of parts) total += p.length;
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

// ---- JPEG ----------------------------------------------------------------

// Classify a JPEG APPn/COM segment by its marker and leading signature.
// Returns null to KEEP the segment (structural / colour-critical).
function classifyJpegSegment(marker: number, sig: string): MetaBlock | null {
  if (marker === 0xe0 && sig.startsWith("JFIF")) return null; // JFIF — structural
  if (marker === 0xe0 && sig.startsWith("JFXX")) return null; // JFIF extension
  if (marker === 0xee && sig.startsWith("Adobe")) return null; // Adobe colour transform
  if (marker === 0xe1 && sig.startsWith("Exif")) return { tag: "APP1", label: "EXIF (camera, GPS, timestamps)", bytes: 0, sensitive: true };
  if (marker === 0xe1 && sig.startsWith("http://ns.adobe.com/xap")) return { tag: "APP1", label: "XMP (editing history, author)", bytes: 0, sensitive: true };
  if (marker === 0xe2 && sig.startsWith("ICC_PROFILE")) return { tag: "APP2", label: "ICC colour profile", bytes: 0, sensitive: false };
  if (marker === 0xed && sig.startsWith("Photoshop")) return { tag: "APP13", label: "Photoshop / IPTC (captions, credits)", bytes: 0, sensitive: true };
  if (marker === 0xfe) return { tag: "COM", label: "Comment", bytes: 0, sensitive: true };
  // Any other APPn marker (E1–EF) is metadata we don't recognise — drop it.
  if (marker >= 0xe1 && marker <= 0xef) return { tag: `APP${marker - 0xe0}`, label: "Application metadata", bytes: 0, sensitive: true };
  return null;
}

function stripJpeg(b: Uint8Array, stripIcc: boolean): { output: Uint8Array; removed: MetaBlock[] } {
  const parts: Uint8Array[] = [b.subarray(0, 2)]; // SOI
  const removed: MetaBlock[] = [];
  let off = 2;

  while (off < b.length - 1) {
    if (b[off] !== 0xff) break; // malformed — stop scanning, keep the rest below
    const marker = b[off + 1];

    // Start of Scan: entropy-coded image data (and the trailing EOI) follow.
    if (marker === 0xda) {
      parts.push(b.subarray(off));
      off = b.length;
      break;
    }
    if (marker === 0xd9) {
      // End of Image
      parts.push(b.subarray(off, off + 2));
      off += 2;
      break;
    }
    // Standalone markers carry no length payload.
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      parts.push(b.subarray(off, off + 2));
      off += 2;
      continue;
    }

    const length = u16be(b, off + 2);
    const segEnd = off + 2 + length;
    if (segEnd > b.length) break; // malformed — keep remainder

    const sig = ascii(b, off + 4, 24);
    const cls = classifyJpegSegment(marker, sig);
    const isIcc = cls?.tag === "APP2";
    const drop = cls !== null && (!isIcc || stripIcc);

    if (drop && cls) {
      removed.push({ ...cls, bytes: segEnd - off });
    } else {
      parts.push(b.subarray(off, segEnd));
    }
    off = segEnd;
  }
  if (off < b.length) parts.push(b.subarray(off));

  return removed.length === 0 ? { output: b, removed } : { output: concat(parts), removed };
}

// ---- PNG -----------------------------------------------------------------

// PNG ancillary chunks that carry metadata. Critical chunks (IHDR/PLTE/IDAT/
// IEND) and rendering chunks (gAMA/cHRM/sRGB/tRNS/bKGD/pHYs/sBIT…) are kept.
const PNG_META_CHUNKS: Record<string, { label: string; sensitive: boolean }> = {
  tEXt: { label: "Text (uncompressed)", sensitive: true },
  zTXt: { label: "Text (compressed)", sensitive: true },
  iTXt: { label: "Text (international, often XMP)", sensitive: true },
  eXIf: { label: "EXIF (camera, GPS, timestamps)", sensitive: true },
  tIME: { label: "Last-modified time", sensitive: true },
};

function stripPng(b: Uint8Array, stripIcc: boolean): { output: Uint8Array; removed: MetaBlock[] } {
  const parts: Uint8Array[] = [b.subarray(0, 8)]; // signature
  const removed: MetaBlock[] = [];
  let off = 8;

  while (off + 8 <= b.length) {
    const length = u32be(b, off);
    const type = ascii(b, off + 4, 4);
    const chunkEnd = off + 12 + length; // len(4) + type(4) + data + crc(4)
    if (chunkEnd > b.length) break; // malformed — keep remainder

    const meta = PNG_META_CHUNKS[type];
    const isIccp = type === "iCCP";
    const drop = Boolean(meta) || (isIccp && stripIcc);

    if (drop) {
      removed.push({
        tag: type,
        label: meta?.label ?? "ICC colour profile",
        bytes: chunkEnd - off,
        sensitive: meta?.sensitive ?? false,
      });
    } else {
      parts.push(b.subarray(off, chunkEnd));
    }
    off = chunkEnd;
    if (type === "IEND") break;
  }
  if (off < b.length) parts.push(b.subarray(off));

  return removed.length === 0 ? { output: b, removed } : { output: concat(parts), removed };
}

// ---- WebP (RIFF) ----------------------------------------------------------

// VP8X feature-flag bits (first payload byte): clear these when their chunk is
// stripped so the header doesn't advertise metadata that's no longer present.
const VP8X_FLAG = { icc: 0x20, exif: 0x08, xmp: 0x04 };

function stripWebp(b: Uint8Array, stripIcc: boolean): { output: Uint8Array; removed: MetaBlock[] } {
  const removed: MetaBlock[] = [];
  // Copy so we can patch the VP8X flag byte in place.
  const buf = b.slice();
  const parts: Uint8Array[] = [];
  let vp8xFlagOff = -1;
  let off = 12; // "RIFF" + size + "WEBP"

  while (off + 8 <= buf.length) {
    const fourcc = ascii(buf, off, 4);
    const size = u32le(buf, off + 4);
    const padded = size + (size & 1); // chunks are padded to even length
    const chunkEnd = off + 8 + padded;
    if (chunkEnd > buf.length) break;

    if (fourcc === "VP8X") vp8xFlagOff = off + 8;

    let drop = false;
    if (fourcc === "EXIF") {
      removed.push({ tag: "EXIF", label: "EXIF (camera, GPS, timestamps)", bytes: chunkEnd - off, sensitive: true });
      drop = true;
    } else if (fourcc === "XMP ") {
      removed.push({ tag: "XMP", label: "XMP (editing history, author)", bytes: chunkEnd - off, sensitive: true });
      drop = true;
    } else if (fourcc === "ICCP" && stripIcc) {
      removed.push({ tag: "ICCP", label: "ICC colour profile", bytes: chunkEnd - off, sensitive: false });
      drop = true;
    }

    if (!drop) parts.push(buf.subarray(off, chunkEnd));
    off = chunkEnd;
  }

  if (removed.length === 0) return { output: b, removed };

  // Clear the matching VP8X flag bits.
  if (vp8xFlagOff >= 0) {
    let flags = buf[vp8xFlagOff];
    for (const r of removed) {
      if (r.tag === "EXIF") flags &= ~VP8X_FLAG.exif;
      if (r.tag === "XMP") flags &= ~VP8X_FLAG.xmp;
      if (r.tag === "ICCP") flags &= ~VP8X_FLAG.icc;
    }
    buf[vp8xFlagOff] = flags & 0xff;
  }

  const header = buf.subarray(0, 12).slice();
  const body = concat(parts);
  const out = concat([header, body]);
  // Patch the RIFF size field (bytes 4–7): total file size minus the 8-byte
  // "RIFF"+size prefix.
  const riffSize = out.length - 8;
  out[4] = riffSize & 0xff;
  out[5] = (riffSize >> 8) & 0xff;
  out[6] = (riffSize >> 16) & 0xff;
  out[7] = (riffSize >> 24) & 0xff;
  return { output: out, removed };
}

/**
 * Detect the format and losslessly strip metadata. `stripIcc` also removes the
 * embedded ICC colour profile (off by default — removing it can shift colours,
 * and it isn't normally identifying). Unsupported formats return the input
 * untouched with `supported: false`.
 */
export function analyzeAndStrip(b: Uint8Array, opts: { stripIcc?: boolean } = {}): StripResult {
  const stripIcc = opts.stripIcc ?? false;
  const format = detectFormat(b);
  let res: { output: Uint8Array; removed: MetaBlock[] };
  switch (format) {
    case "jpeg": res = stripJpeg(b, stripIcc); break;
    case "png": res = stripPng(b, stripIcc); break;
    case "webp": res = stripWebp(b, stripIcc); break;
    default:
      return { format, supported: false, output: b, removed: [], removedBytes: 0 };
  }
  const removedBytes = res.removed.reduce((n, m) => n + m.bytes, 0);
  return { format, supported: true, output: res.output, removed: res.removed, removedBytes };
}
