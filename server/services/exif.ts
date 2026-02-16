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

export interface ExifMetadata {
  hasGps: boolean;
  hasDevice: boolean;
  hasThumbnail: boolean;
  markerCount: number;
  totalExifBytes: number;
}

export function analyzeJpegExif(buffer: Buffer): ExifMetadata {
  const result: ExifMetadata = {
    hasGps: false,
    hasDevice: false,
    hasThumbnail: false,
    markerCount: 0,
    totalExifBytes: 0
  };

  if (buffer[0] !== 0xff || buffer[1] !== 0xd8) return result;

  let offset = 2;
  while (offset < buffer.length - 1) {
    if (buffer[offset] !== 0xff) break;
    const marker = buffer[offset + 1];
    if (marker === 0xda) break;
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }

    const length = buffer.readUInt16BE(offset + 2);

    if (marker === 0xe1) {
      result.markerCount++;
      result.totalExifBytes += 2 + length;
      const segment = buffer.subarray(offset + 4, offset + 2 + length);
      const str = segment.toString('ascii', 0, Math.min(200, segment.length));
      if (str.includes('GPS')) result.hasGps = true;
      if (str.includes('Make') || str.includes('Model')) result.hasDevice = true;
      if (segment.length > 1000) result.hasThumbnail = true;
    }

    offset += 2 + length;
  }

  return result;
}
