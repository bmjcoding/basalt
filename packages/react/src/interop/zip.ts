// Zero-dependency deterministic store-mode ZIP writer (PKWARE APPNOTE / ISO 29500-2 OPC).
// Uses fixed DOS timestamp 1980-01-01 00:00:00 and compression method 0 (STORE) so the output is
// synchronous, runtime-independent (browser and Node produce identical bytes), and byte-identical on repeat.
// No module-scope allocations: the CRC-32 table and TextEncoder are created lazily on first call.

export interface ZipEntry {
  name: string;
  data: string | Uint8Array;
}

let crcTable: Uint32Array | undefined;
let encoder: TextEncoder | undefined;

function getCrcTable(): Uint32Array {
  if (!crcTable) {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) !== 0 ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    crcTable = t;
  }
  return crcTable;
}

function encodeUtf8(s: string): Uint8Array {
  encoder ??= new TextEncoder();
  return encoder.encode(s);
}

export function crc32(bytes: Uint8Array): number {
  const table = getCrcTable();
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = table[(c ^ bytes[i]!) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function writeU16(view: DataView, offset: number, value: number): void {
  view.setUint16(offset, value & 0xffff, true);
}

function writeU32(view: DataView, offset: number, value: number): void {
  view.setUint32(offset, value >>> 0, true);
}

/** Builds a deterministic ZIP archive (store mode, fixed 1980-01-01 timestamp) from `entries`. */
export function makeDeterministicZip(entries: readonly ZipEntry[]): Uint8Array {
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encodeUtf8(entry.name);
    const raw = typeof entry.data === "string" ? encodeUtf8(entry.data) : entry.data;
    const crc = crc32(raw);
    const size = raw.length;
    // Bit 11 (0x0800): UTF-8 filename flag when any non-ASCII byte appears in entry name.
    let flags = 0;
    for (let i = 0; i < nameBytes.length; i++) {
      if (nameBytes[i]! >= 0x80) { flags = 0x0800; break; }
    }

    const local = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(local.buffer);
    writeU32(lv, 0, 0x04034b50); // local file header signature
    writeU16(lv, 4, 20);         // version needed (2.0)
    writeU16(lv, 6, flags);      // general purpose bit flag
    writeU16(lv, 8, 0);          // compression method: 0 (STORE)
    writeU16(lv, 10, 0x0000);    // mod time: 00:00:00
    writeU16(lv, 12, 0x0021);    // mod date: 1980-01-01
    writeU32(lv, 14, crc);
    writeU32(lv, 18, size);
    writeU32(lv, 22, size);
    writeU16(lv, 26, nameBytes.length);
    writeU16(lv, 28, 0);         // extra field length
    local.set(nameBytes, 30);
    locals.push(local, raw);

    const central = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(central.buffer);
    writeU32(cv, 0, 0x02014b50); // central directory header signature
    writeU16(cv, 4, 20);         // version made by
    writeU16(cv, 6, 20);         // version needed
    writeU16(cv, 8, flags);
    writeU16(cv, 10, 0);         // compression method: 0 (STORE)
    writeU16(cv, 12, 0x0000);    // mod time
    writeU16(cv, 14, 0x0021);    // mod date (1980-01-01)
    writeU32(cv, 16, crc);
    writeU32(cv, 20, size);
    writeU32(cv, 24, size);
    writeU16(cv, 28, nameBytes.length);
    writeU16(cv, 30, 0);         // extra length
    writeU16(cv, 32, 0);         // comment length
    writeU16(cv, 34, 0);         // disk number start
    writeU16(cv, 36, 0);         // internal attributes
    writeU32(cv, 38, 0);         // external attributes
    writeU32(cv, 42, offset);    // relative offset of local header
    central.set(nameBytes, 46);
    centrals.push(central);

    offset += local.length + raw.length;
  }

  let centralSize = 0;
  for (const c of centrals) centralSize += c.length;

  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  writeU32(ev, 0, 0x06054b50);       // end of central dir signature
  writeU16(ev, 4, 0);                // disk number
  writeU16(ev, 6, 0);                // start disk
  writeU16(ev, 8, entries.length);   // entries on this disk
  writeU16(ev, 10, entries.length);  // total entries
  writeU32(ev, 12, centralSize);     // size of central dir
  writeU32(ev, 16, offset);          // offset of central dir
  writeU16(ev, 20, 0);               // comment length

  const total = offset + centralSize + eocd.length;
  const out = new Uint8Array(total);
  let pos = 0;
  for (const part of locals) { out.set(part, pos); pos += part.length; }
  for (const part of centrals) { out.set(part, pos); pos += part.length; }
  out.set(eocd, pos);
  return out;
}
