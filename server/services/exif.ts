// Simple EXIF stripping by removing EXIF APP1 marker from JPEG files.
// For production use, consider a library like sharp or exif-reader.

export function stripJpegExif(buffer: Buffer): { stripped: Buffer; removedBytes: number } {
  // JPEG files start with FF D8
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return { stripped: buffer, removedBytes: 0 };
  }

  const markers: { start: number; end: number }[] = [];
  let offset = 2;

  while (offset < buffer.length - 1) {
    if (buffer[offset] !== 0xff) break;

    const marker = buffer[offset + 1];

    // SOS (Start of Scan) -- image data follows, stop processing
    if (marker === 0xda) break;

    // Markers without length (standalone)
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }

    const length = buffer.readUInt16BE(offset + 2);

    // APP1 (0xE1) contains EXIF data -- mark for removal
    // Also strip APP2 (0xE2, ICC), APP12 (0xEC, Ducky), APP13 (0xED, IPTC)
    if (marker === 0xe1 || marker === 0xe2 || marker === 0xec || marker === 0xed) {
      markers.push({ start: offset, end: offset + 2 + length });
    }

    offset += 2 + length;
  }

  if (markers.length === 0) {
    return { stripped: buffer, removedBytes: 0 };
  }

  // Rebuild without marked segments
  const parts: Buffer[] = [buffer.subarray(0, 2)]; // FF D8
  let pos = 2;
  let removedBytes = 0;

  for (const m of markers) {
    if (pos < m.start) {
      parts.push(buffer.subarray(pos, m.start));
    }
    removedBytes += m.end - m.start;
    pos = m.end;
  }

  parts.push(buffer.subarray(pos));
  return { stripped: Buffer.concat(parts), removedBytes };
}

export interface ExifLint {
  id: string;
  severity: "high" | "med" | "low";
  title: string;
  detail: string;
}

export interface ExifMetadata {
  gps?: { lat: number; lng: number; alt?: number };
  device?: {
    make?: string;
    model?: string;
    bodySerial?: string;
    lensSerial?: string;
    lens?: string;
  };
  time?: { original?: string; digitized?: string; modified?: string };
  software?: string;
  orientation?: number;
  hasMakerNote: boolean;
  hasThumbnail: boolean;
  lint: ExifLint[];
}

// --- TIFF/EXIF tag IDs ---
const T_MAKE = 0x010f;
const T_MODEL = 0x0110;
const T_ORIENTATION = 0x0112;
const T_SOFTWARE = 0x0131;
const T_DATETIME = 0x0132;
const T_EXIF_IFD = 0x8769;
const T_GPS_IFD = 0x8825;
const T_THUMB_OFFSET = 0x0201;
const T_THUMB_LENGTH = 0x0202;

const T_DATETIME_ORIGINAL = 0x9003;
const T_DATETIME_DIGITIZED = 0x9004;
const T_MAKERNOTE = 0x927c;
const T_LENS_MODEL = 0xa434;
const T_BODY_SERIAL = 0xa431;
const T_LENS_SERIAL = 0xa435;

const T_GPS_LAT_REF = 0x0001;
const T_GPS_LAT = 0x0002;
const T_GPS_LON_REF = 0x0003;
const T_GPS_LON = 0x0004;
const T_GPS_ALT_REF = 0x0005;
const T_GPS_ALT = 0x0006;

// Byte size per TIFF field type.
const TYPE_SIZE: Record<number, number> = {
  1: 1, // BYTE
  2: 1, // ASCII
  3: 2, // SHORT
  4: 4, // LONG
  5: 8, // RATIONAL
  7: 1, // UNDEFINED
  9: 4, // SLONG
  10: 8, // SRATIONAL
};

interface IfdEntry {
  tag: number;
  type: number;
  count: number;
  valueOffset: number; // absolute offset into the buffer of the 4-byte value field
}

class TiffReader {
  constructor(
    private readonly buf: Buffer,
    private readonly tiffStart: number,
    private readonly little: boolean,
  ) {}

  private inBounds(off: number, len: number): boolean {
    return off >= 0 && len >= 0 && off + len <= this.buf.length;
  }

  u16(off: number): number {
    if (!this.inBounds(off, 2)) throw new RangeError("u16 oob");
    return this.little ? this.buf.readUInt16LE(off) : this.buf.readUInt16BE(off);
  }

  u32(off: number): number {
    if (!this.inBounds(off, 4)) throw new RangeError("u32 oob");
    return this.little ? this.buf.readUInt32LE(off) : this.buf.readUInt32BE(off);
  }

  // Parse one IFD at an offset relative to the TIFF start. Returns entries plus
  // the offset (relative to TIFF start) of the next IFD (0 if none).
  readIfd(relOffset: number): { entries: IfdEntry[]; next: number } {
    const base = this.tiffStart + relOffset;
    if (!this.inBounds(base, 2)) return { entries: [], next: 0 };
    const count = this.u16(base);
    const entries: IfdEntry[] = [];
    for (let i = 0; i < count; i++) {
      const eOff = base + 2 + i * 12;
      if (!this.inBounds(eOff, 12)) break;
      const tag = this.u16(eOff);
      const type = this.u16(eOff + 2);
      const n = this.u32(eOff + 4);
      entries.push({ tag, type, count: n, valueOffset: eOff + 8 });
    }
    const nextOff = base + 2 + count * 12;
    const next = this.inBounds(nextOff, 4) ? this.u32(nextOff) : 0;
    return { entries, next };
  }

  // Absolute buffer offset where an entry's value data lives (inline or pointed-to).
  private dataOffset(e: IfdEntry): number {
    const size = (TYPE_SIZE[e.type] ?? 0) * e.count;
    if (size <= 4) return e.valueOffset;
    return this.tiffStart + this.u32(e.valueOffset);
  }

  ascii(e: IfdEntry): string | undefined {
    try {
      const off = this.dataOffset(e);
      if (!this.inBounds(off, e.count)) return undefined;
      let s = this.buf.toString("ascii", off, off + e.count);
      const nul = s.indexOf("\0");
      if (nul !== -1) s = s.slice(0, nul);
      s = s.trim();
      return s.length ? s : undefined;
    } catch {
      return undefined;
    }
  }

  short(e: IfdEntry): number | undefined {
    try {
      const off = this.dataOffset(e);
      if (e.type === 3) return this.u16(off);
      if (e.type === 4) return this.u32(off);
      return undefined;
    } catch {
      return undefined;
    }
  }

  // Read `n` RATIONAL values (num/den pairs).
  rationals(e: IfdEntry, n: number): number[] {
    const out: number[] = [];
    try {
      const off = this.dataOffset(e);
      for (let i = 0; i < n; i++) {
        const p = off + i * 8;
        if (!this.inBounds(p, 8)) break;
        const num = this.u32(p);
        const den = this.u32(p + 4);
        out.push(den === 0 ? 0 : num / den);
      }
    } catch {
      // return whatever parsed
    }
    return out;
  }
}

function dmsToDecimal(parts: number[], ref: string | undefined): number | undefined {
  if (parts.length < 3) return undefined;
  const [d, m, s] = parts as [number, number, number];
  let dd = d + m / 60 + s / 3600;
  if (ref === "S" || ref === "W") dd = -dd;
  return dd;
}

function find(entries: IfdEntry[], tag: number): IfdEntry | undefined {
  return entries.find((e) => e.tag === tag);
}

function buildLint(m: ExifMetadata): ExifLint[] {
  const lint: ExifLint[] = [];
  if (m.gps) {
    lint.push({
      id: "gps",
      severity: "high",
      title: "Exact location embedded",
      detail: "This photo carries the precise GPS coordinate where it was taken.",
    });
  }
  if (m.device?.bodySerial || m.device?.lensSerial) {
    lint.push({
      id: "serial",
      severity: "high",
      title: "Device serial number",
      detail: "A camera/lens serial number links every photo from this device together.",
    });
  }
  if (m.hasThumbnail) {
    lint.push({
      id: "thumbnail",
      severity: "med",
      title: "Embedded thumbnail",
      detail: "An embedded thumbnail may retain a pre-edit (uncropped) version of the image.",
    });
  }
  if (m.hasMakerNote) {
    lint.push({
      id: "makernote",
      severity: "low",
      title: "Vendor MakerNote",
      detail: "A proprietary MakerNote block may carry undocumented vendor identifiers.",
    });
  }
  const looksScreenshot =
    (m.software ? /screenshot/i.test(m.software) : false) ||
    (!m.device?.make && !m.device?.model);
  if (looksScreenshot) {
    lint.push({
      id: "screenshot",
      severity: "low",
      title: "Looks like a screenshot",
      detail: "No camera make/model present — this is likely a screenshot or synthetic image.",
    });
  }
  return lint;
}

// Parse the EXIF payload (everything after the "Exif\0\0" header) starting at a
// TIFF header. Mutates `m`. Never throws — best-effort.
function parseTiff(buf: Buffer, tiffStart: number, m: ExifMetadata): void {
  try {
    if (tiffStart + 8 > buf.length) return;
    const b0 = buf[tiffStart];
    const b1 = buf[tiffStart + 1];
    let little: boolean;
    if (b0 === 0x49 && b1 === 0x49) little = true; // "II"
    else if (b0 === 0x4d && b1 === 0x4d) little = false; // "MM"
    else return;

    const r = new TiffReader(buf, tiffStart, little);
    if (r.u16(tiffStart + 2) !== 0x002a) return; // TIFF magic
    const ifd0Off = r.u32(tiffStart + 4);
    if (ifd0Off === 0) return;

    const ifd0 = r.readIfd(ifd0Off);

    // IFD0 fields
    const make = find(ifd0.entries, T_MAKE);
    const model = find(ifd0.entries, T_MODEL);
    const software = find(ifd0.entries, T_SOFTWARE);
    const orientation = find(ifd0.entries, T_ORIENTATION);
    const dateTime = find(ifd0.entries, T_DATETIME);

    const device: NonNullable<ExifMetadata["device"]> = {};
    if (make) device.make = r.ascii(make);
    if (model) device.model = r.ascii(model);
    if (software) m.software = r.ascii(software);
    if (orientation) m.orientation = r.short(orientation);
    const time: NonNullable<ExifMetadata["time"]> = {};
    if (dateTime) time.modified = r.ascii(dateTime);

    // EXIF SubIFD
    const exifPtr = find(ifd0.entries, T_EXIF_IFD);
    if (exifPtr) {
      const off = r.short(exifPtr) ?? r.u32(exifPtr.valueOffset);
      const sub = r.readIfd(off);
      const dto = find(sub.entries, T_DATETIME_ORIGINAL);
      const dtd = find(sub.entries, T_DATETIME_DIGITIZED);
      const bodySerial = find(sub.entries, T_BODY_SERIAL);
      const lensSerial = find(sub.entries, T_LENS_SERIAL);
      const lensModel = find(sub.entries, T_LENS_MODEL);
      const makerNote = find(sub.entries, T_MAKERNOTE);
      if (dto) time.original = r.ascii(dto);
      if (dtd) time.digitized = r.ascii(dtd);
      if (bodySerial) device.bodySerial = r.ascii(bodySerial);
      if (lensSerial) device.lensSerial = r.ascii(lensSerial);
      if (lensModel) device.lens = r.ascii(lensModel);
      if (makerNote && makerNote.count > 0) m.hasMakerNote = true;
    }

    // GPS IFD
    const gpsPtr = find(ifd0.entries, T_GPS_IFD);
    if (gpsPtr) {
      const off = r.u32(gpsPtr.valueOffset);
      const gps = r.readIfd(off);
      const latRef = find(gps.entries, T_GPS_LAT_REF);
      const latE = find(gps.entries, T_GPS_LAT);
      const lonRef = find(gps.entries, T_GPS_LON_REF);
      const lonE = find(gps.entries, T_GPS_LON);
      const altRef = find(gps.entries, T_GPS_ALT_REF);
      const altE = find(gps.entries, T_GPS_ALT);

      if (latE && lonE) {
        const lat = dmsToDecimal(r.rationals(latE, 3), latRef ? r.ascii(latRef) : undefined);
        const lng = dmsToDecimal(r.rationals(lonE, 3), lonRef ? r.ascii(lonRef) : undefined);
        if (lat !== undefined && lng !== undefined && Number.isFinite(lat) && Number.isFinite(lng)) {
          const g: NonNullable<ExifMetadata["gps"]> = { lat, lng };
          if (altE) {
            const alt = r.rationals(altE, 1)[0];
            if (alt !== undefined && Number.isFinite(alt)) {
              const below = altRef ? r.short(altRef) === 1 : false;
              g.alt = below ? -alt : alt;
            }
          }
          m.gps = g;
        }
      }
    }

    // IFD1 thumbnail
    if (ifd0.next !== 0) {
      const ifd1 = r.readIfd(ifd0.next);
      if (find(ifd1.entries, T_THUMB_OFFSET) && find(ifd1.entries, T_THUMB_LENGTH)) {
        m.hasThumbnail = true;
      }
    }

    if (Object.keys(device).length > 0) m.device = device;
    if (Object.keys(time).length > 0) m.time = time;
  } catch {
    // best-effort: keep whatever was parsed
  }
}

export function analyzeJpegExif(buffer: Buffer): ExifMetadata {
  const result: ExifMetadata = {
    hasMakerNote: false,
    hasThumbnail: false,
    lint: [],
  };

  try {
    if (buffer[0] !== 0xff || buffer[1] !== 0xd8) {
      result.lint = buildLint(result);
      return result;
    }

    let offset = 2;
    while (offset < buffer.length - 1) {
      if (buffer[offset] !== 0xff) break;
      const marker = buffer[offset + 1];
      if (marker === 0xda) break; // SOS
      if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
        offset += 2;
        continue;
      }
      if (offset + 4 > buffer.length) break;
      const length = buffer.readUInt16BE(offset + 2);

      if (marker === 0xe1) {
        // APP1: verify "Exif\0\0" header at offset+4.
        const hdr = offset + 4;
        if (
          hdr + 6 <= buffer.length &&
          buffer[hdr] === 0x45 && // E
          buffer[hdr + 1] === 0x78 && // x
          buffer[hdr + 2] === 0x69 && // i
          buffer[hdr + 3] === 0x66 && // f
          buffer[hdr + 4] === 0x00 &&
          buffer[hdr + 5] === 0x00
        ) {
          parseTiff(buffer, hdr + 6, result);
        }
      }

      offset += 2 + length;
    }
  } catch {
    // best-effort
  }

  result.lint = buildLint(result);
  return result;
}
