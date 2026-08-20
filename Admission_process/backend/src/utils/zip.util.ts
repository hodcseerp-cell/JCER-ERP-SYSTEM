import { Writable } from 'stream';
import fs from 'fs';
import archiver from 'archiver';
import JSZip from 'jszip';
import logger from './logger.util';

// Precomputed CRC-32 table for fast checksum calculations (preserved for backward compatibility)
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
  crc?: number;
  size?: number;
  offset?: number;
}

/**
 * Production-grade streaming ZIP archive builder backed by the official `archiver` library.
 * Guarantees standard ZIP specification compliance (APPNOTE.TXT), UTF-8 filename flags,
 * proper Central Directory, and seamless compatibility with:
 *  1. Windows File Explorer
 *  2. 7-Zip
 *  3. WinRAR
 *  4. macOS Archive Utility
 *  5. Node.js ZIP libraries (yauzl, jszip, adm-zip)
 */
export class StreamingZip {
  private archive: any;
  private outStream: Writable;
  private isFinalized = false;
  private completionPromise: Promise<void>;
  private errorOccurred: Error | null = null;
  private entriesCount = 0;

  constructor(outStream: Writable, options: { level?: number } = {}) {
    this.outStream = outStream;

    // Use standard ZIP compression with DEFLATE (level 6) or STORE (level 0)
    const compressionLevel = options.level !== undefined ? options.level : 6;
    this.archive = archiver('zip', {
      zlib: { level: compressionLevel },
      forceZip64: false,
    });

    this.completionPromise = new Promise<void>((resolve, reject) => {
      // The target stream will emit 'finish' or 'close' once all data & central directory are flushed to disk/network
      this.outStream.on('finish', () => {
        resolve();
      });
      this.outStream.on('close', () => {
        resolve();
      });

      this.outStream.on('error', (err) => {
        this.errorOccurred = err;
        reject(err);
      });

      this.archive.on('warning', (err: any) => {
        if (err.code === 'ENOENT') {
          logger.warn(`[StreamingZip] Warning: ${err.message}`);
        } else {
          this.errorOccurred = err;
          reject(err);
        }
      });

      this.archive.on('error', (err: any) => {
        this.errorOccurred = err;
        reject(err);
      });
    });

    this.archive.pipe(this.outStream);
  }

  /**
   * Appends a file entry to the ZIP archive.
   * Standardizes path separators to standard forward slashes '/'.
   */
  public async addFile(name: string, buffer: Buffer): Promise<void> {
    if (this.errorOccurred) {
      throw this.errorOccurred;
    }
    // Normalize path separators to standard forward slashes '/'
    const normalizedName = name.replace(/\\/g, '/').replace(/^\/+/, '');
    this.archive.append(buffer, {
      name: normalizedName,
      date: new Date(),
    });
    this.entriesCount++;
  }

  /**
   * Returns current count of entries queued/added to the archive.
   */
  public getEntryCount(): number {
    return this.entriesCount;
  }

  /**
   * Finalizes the ZIP archive by writing the Central Directory and End of Central Directory (EOCD).
   * Awaits full flushing and closing of the underlying Writable stream.
   */
  public async finalize(): Promise<void> {
    if (this.isFinalized) return;
    this.isFinalized = true;

    if (this.errorOccurred) {
      throw this.errorOccurred;
    }

    await this.archive.finalize();
    await this.completionPromise;
  }
}

/**
 * Server-side validation of a generated ZIP archive on disk.
 * Verifies that:
 *  - The file exists on disk
 *  - Size > 0 (and > minimum empty ZIP header size)
 *  - ZIP central directory exists and is intact
 *  - Archive can be opened and parsed by standard ZIP parser without corruption
 *  - Entry count matches expectations
 */
export async function validateZipArchive(
  filePath: string,
  minExpectedEntries: number = 1
): Promise<{ valid: boolean; entryCount: number; error?: string }> {
  try {
    if (!fs.existsSync(filePath)) {
      return { valid: false, entryCount: 0, error: 'ZIP file does not exist on disk.' };
    }
    const stat = fs.statSync(filePath);
    if (stat.size <= 22) {
      return { valid: false, entryCount: 0, error: `ZIP file is empty or truncated (${stat.size} bytes).` };
    }

    const data = fs.readFileSync(filePath);
    const zip = await JSZip.loadAsync(data);
    const files = Object.keys(zip.files).filter((k) => !zip.files[k].dir);

    if (files.length < minExpectedEntries) {
      return {
        valid: false,
        entryCount: files.length,
        error: `ZIP archive contains ${files.length} files, expected at least ${minExpectedEntries}.`,
      };
    }

    return {
      valid: true,
      entryCount: files.length,
    };
  } catch (err: any) {
    return {
      valid: false,
      entryCount: 0,
      error: `ZIP validation failed: ${err.message || 'Corrupted ZIP archive or missing Central Directory.'}`,
    };
  }
}
