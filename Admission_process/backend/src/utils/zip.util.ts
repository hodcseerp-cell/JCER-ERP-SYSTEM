import { Writable } from 'stream';

// Precomputed CRC-32 table for fast checksum calculations
const crcTable: number[] = [];
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[i] = c;
}

/**
 * Calculates the CRC-32 checksum of a Buffer.
 */
export function getCrc32(buf: Buffer): number {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ -1) >>> 0;
}

export interface ZipEntry {
  name: string;
  crc: number;
  size: number;
  offset: number;
}

/**
 * A lightweight, dependency-free streaming ZIP archive builder.
 * Streams files sequentially to any Writable stream (e.g. Express Response or fs.WriteStream).
 */
export class StreamingZip {
  private outStream: Writable;
  private entries: ZipEntry[] = [];
  private currentOffset = 0;
  private time: number;
  private date: number;

  constructor(outStream: Writable) {
    this.outStream = outStream;
    const now = new Date();
    this.time = ((now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)) & 0xFFFF;
    this.date = (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xFFFF;
  }

  /**
   * Appends a file entry to the ZIP archive.
   * Immediately streams the Local File Header and data buffer to the target stream.
   */
  public async addFile(name: string, buffer: Buffer): Promise<void> {
    const nameBuf = Buffer.from(name, 'utf-8');
    const crc = getCrc32(buffer);
    const size = buffer.length;
    const offset = this.currentOffset;

    // Local File Header (30 bytes)
    const lfh = Buffer.alloc(30);
    lfh.writeUInt32LE(0x04034b50, 0); // PK\3\4 signature
    lfh.writeUInt16LE(10, 4);         // Version needed to extract (1.0)
    lfh.writeUInt16LE(0, 6);          // General purpose bit flag (0)
    lfh.writeUInt16LE(0, 8);          // Compression method (0 = stored/uncompressed)
    lfh.writeUInt16LE(this.time, 10); // Last mod time
    lfh.writeUInt16LE(this.date, 12); // Last mod date
    lfh.writeUInt32LE(crc, 14);       // CRC-32 checksum
    lfh.writeUInt32LE(size, 18);      // Compressed size
    lfh.writeUInt32LE(size, 22);      // Uncompressed size
    lfh.writeUInt16LE(nameBuf.length, 26); // File name length
    lfh.writeUInt16LE(0, 28);         // Extra field length (0)

    // Stream Local File Header, file name, and file data
    this.outStream.write(lfh);
    this.outStream.write(nameBuf);
    this.outStream.write(buffer);

    // Record central directory entry details
    this.entries.push({ name, crc, size, offset });
    this.currentOffset += lfh.length + nameBuf.length + size;
  }

  /**
   * Finalizes the ZIP archive by writing Central Directory headers and EOCD record.
   * Flushes and terminates the output stream.
   */
  public async finalize(): Promise<void> {
    const cdOffset = this.currentOffset;
    let cdSize = 0;

    for (const entry of this.entries) {
      const nameBuf = Buffer.from(entry.name, 'utf-8');

      // Central Directory File Header (46 bytes)
      const cdfh = Buffer.alloc(46);
      cdfh.writeUInt32LE(0x02014b50, 0); // PK\1\2 signature
      cdfh.writeUInt16LE(20, 4);         // Version made by (2.0)
      cdfh.writeUInt16LE(10, 6);         // Version needed to extract (1.0)
      cdfh.writeUInt16LE(0, 8);          // General purpose bit flag (0)
      cdfh.writeUInt16LE(0, 10);         // Compression method (0 = stored)
      cdfh.writeUInt16LE(this.time, 12); // Last mod time
      cdfh.writeUInt16LE(this.date, 14); // Last mod date
      cdfh.writeUInt32LE(entry.crc, 16); // CRC-32
      cdfh.writeUInt32LE(entry.size, 20); // Compressed size
      cdfh.writeUInt32LE(entry.size, 24); // Uncompressed size
      cdfh.writeUInt16LE(nameBuf.length, 28); // File name length
      cdfh.writeUInt16LE(0, 30);         // Extra field length (0)
      cdfh.writeUInt16LE(0, 32);         // File comment length (0)
      cdfh.writeUInt16LE(0, 34);         // Disk number start (0)
      cdfh.writeUInt16LE(0, 36);         // Internal file attributes (0)
      cdfh.writeUInt32LE(0, 38);         // External file attributes (0)
      cdfh.writeUInt32LE(entry.offset, 42); // Local file header relative offset

      // Stream Central Directory entry
      this.outStream.write(cdfh);
      this.outStream.write(nameBuf);
      cdSize += cdfh.length + nameBuf.length;
    }

    // End of Central Directory Record (EOCD) (22 bytes)
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0); // PK\5\6 signature
    eocd.writeUInt16LE(0, 4);           // Disk number (0)
    eocd.writeUInt16LE(0, 6);           // Disk with CD start (0)
    eocd.writeUInt16LE(this.entries.length, 8); // CD entries on this disk
    eocd.writeUInt16LE(this.entries.length, 10); // Total CD entries
    eocd.writeUInt32LE(cdSize, 12);     // Size of Central Directory
    eocd.writeUInt32LE(cdOffset, 16);   // Offset of Central Directory
    eocd.writeUInt16LE(0, 20);          // Comment length (0)

    this.outStream.write(eocd);
    this.outStream.end();
  }
}
