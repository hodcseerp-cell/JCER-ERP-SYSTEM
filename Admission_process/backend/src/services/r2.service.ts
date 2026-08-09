/**
 * Cloudflare R2 Service
 *
 * Manages all interactions with Cloudflare R2 (S3-compatible storage).
 *
 * Architecture:
 *  - Bucket is PRIVATE. Student documents are never publicly accessible.
 *  - Object *keys* (not full URLs) are stored in the database for portability.
 *  - Short-lived signed URLs are generated on-demand by the backend and returned
 *    to authorised callers only (admin/student, after auth + ownership checks).
 *
 * Key format:
 *  admissions/<studentId>/<fieldname>/<timestamp>-<random>.<ext>
 *  handbook/handbook-<timestamp>.pdf
 *  fee-receipts/<studentId>/<timestamp>-<random>.<ext>
 */

import AWS from 'aws-sdk';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import logger from '../utils/logger.util';

// ── S3 client pointing at Cloudflare R2 ──────────────────────────────────────
const s3 = new AWS.S3({
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,           // e.g. https://<accountId>.r2.cloudflarestorage.com
  accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  signatureVersion: 'v4',
  region: 'auto',
});

const BUCKET = process.env.CLOUDFLARE_R2_BUCKET_NAME || '';

// ── Signed-URL TTL (seconds) ──────────────────────────────────────────────────
const SIGNED_URL_TTL = 5 * 60; // 5 minutes — enough to open the document

// ── Key helpers ───────────────────────────────────────────────────────────────

/**
 * Build an R2 object key for an admission document.
 * Kept short enough to fit within the VARCHAR(255) DB column.
 */
export function buildDocumentKey(
  studentId: string,
  fieldName: string,
  originalName: string,
): string {
  const ext = path.extname(originalName).toLowerCase() || '.jpg';
  const uniqueSuffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  return `admissions/${studentId}/${fieldName}/${uniqueSuffix}${ext}`;
}

/** Build an R2 object key for a fee receipt. */
export function buildFeeReceiptKey(studentId: string, originalName: string): string {
  const ext = path.extname(originalName).toLowerCase() || '.jpg';
  const uniqueSuffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  return `fee-receipts/${studentId}/${uniqueSuffix}${ext}`;
}

/** Build an R2 object key for the admission handbook PDF. */
export function buildHandbookKey(): string {
  return `handbook/handbook-${Date.now()}.pdf`;
}

/**
 * Process and compress an image buffer using sharp to a target max size while preserving legibility.
 *
 * Strategy:
 *  - Non-images (PDFs): pass through completely unchanged.
 *  - Images (JPG/PNG/GIF):
 *    1. Check dimensions: if width or height exceeds 2000px, resize down to a max of 2000px
 *       (fit inside, keeping aspect ratio). This avoids massive camera resolution files while
 *       keeping documents perfectly readable.
 *    2. Compress using quality levels (85% -> 75% -> 65%). We stop as soon as size is <= 2MB,
 *       and we never drop quality below 65% to ensure text readability (Aadhaar/Marks cards).
 *    3. Fallback: if sharp fails or file remains > 2MB, we upload the best result to preserve upload integrity.
 */
const TARGET_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB target per image
const MAX_DIMENSION = 2000;                // Max width/height to preserve fine details
const QUALITY_STEPS = [85, 75, 65];         // High-readability quality steps

async function compressIfImage(buffer: Buffer, contentType: string): Promise<{ buffer: Buffer; contentType: string }> {
  const isImage = contentType.startsWith('image/');
  if (!isImage) {
    // PDF, handbook, etc. — pass through as-is
    return { buffer, contentType };
  }

  try {
    const pipeline = sharp(buffer).rotate(); // Auto-orient based on EXIF headers
    const metadata = await pipeline.metadata();

    const needsResize = metadata.width && metadata.height && (metadata.width > MAX_DIMENSION || metadata.height > MAX_DIMENSION);
    const needsCompression = buffer.length > TARGET_SIZE_BYTES;

    // If it's already within limits, upload original directly
    if (!needsResize && !needsCompression) {
      return { buffer, contentType };
    }

    logger.info(`[R2] Image processing required: size=${(buffer.length / 1024).toFixed(0)}KB, dimensions=${metadata.width || 0}x${metadata.height || 0}`);

    let processedPipeline = pipeline;
    if (needsResize) {
      logger.info(`[R2] Resizing image to fit inside ${MAX_DIMENSION}x${MAX_DIMENSION}px`);
      processedPipeline = processedPipeline.resize({
        width: MAX_DIMENSION,
        height: MAX_DIMENSION,
        fit: 'inside',
        withoutEnlargement: true
      });
    }

    let result = buffer;
    for (const quality of QUALITY_STEPS) {
      const compressed = await processedPipeline
        .clone()
        .jpeg({ quality, mozjpeg: true })
        .toBuffer();

      logger.info(`[R2] JPEG Compression at quality=${quality}: ${(compressed.length / 1024).toFixed(0)} KB`);
      result = compressed;

      if (compressed.length <= TARGET_SIZE_BYTES) {
        break; // Met the target size
      }
    }

    logger.info(`[R2] Processed image result: ${(result.length / 1024).toFixed(0)} KB`);
    return { buffer: result, contentType: 'image/jpeg' };

  } catch (err) {
    logger.warn('[R2] Sharp image processing failed, uploading original fallback:', err);
    return { buffer, contentType };
  }
}

/**
 * Upload a file buffer to R2 (with compression for images).
 * @returns The R2 object key (store this in the database).
 */
export async function uploadFile(
  buffer: Buffer,
  key: string,
  contentType: string,
): Promise<string> {
  const { buffer: finalBuffer, contentType: finalContentType } = await compressIfImage(buffer, contentType);

  logger.info(`[R2] Uploading: ${key} (${(finalBuffer.length / 1024).toFixed(0)} KB)`);
  await s3.putObject({
    Bucket: BUCKET,
    Key: key,
    Body: finalBuffer,
    ContentType: finalContentType,
  }).promise();
  logger.info(`[R2] Uploaded successfully: ${key}`);
  return key;
}

/**
 * Upload a file from local disk to R2, compress images, then remove the local file.
 *
 * Flow:
 *   Student uploads up to 10 MB
 *     → Multer saves to local temp disk
 *     → magic-byte + quality validation (done in middleware, unchanged)
 *     → this function reads the temp file, compresses if image, uploads to R2
 *     → local temp file deleted
 *
 * @returns The R2 object key.
 */
export async function uploadFromDisk(
  localPath: string,
  key: string,
  contentType: string,
): Promise<string> {
  const buffer = fs.readFileSync(localPath);
  await uploadFile(buffer, key, contentType);
  // Remove local temp file
  try {
    fs.unlinkSync(localPath);
  } catch (cleanupErr) {
    logger.warn(`[R2] Could not delete local temp file after upload: ${localPath}`, cleanupErr);
  }
  return key;
}

/**
 * Delete an object from R2 by its key.
 * Fails silently (only logs) so a missing old file never blocks a new upload.
 */
export async function deleteFile(key: string | null | undefined): Promise<void> {
  if (!key) return;
  // Only attempt deletion for keys that look like R2 paths (not legacy local /uploads/ paths)
  if (key.startsWith('/') || key.startsWith('http')) {
    logger.info(`[R2] Skipping deletion of legacy local path: ${key}`);
    return;
  }
  try {
    logger.info(`[R2] Deleting: ${key}`);
    await s3.deleteObject({ Bucket: BUCKET, Key: key }).promise();
    logger.info(`[R2] Deleted: ${key}`);
  } catch (err) {
    logger.error(`[R2] Failed to delete object: ${key}`, err);
  }
}

/**
 * Generate a short-lived signed GET URL for a private R2 object.
 * @param key  The R2 object key stored in the database.
 * @param ttl  Seconds until the URL expires (default 5 min).
 */
export async function getSignedUrl(
  key: string,
  ttl: number = SIGNED_URL_TTL,
): Promise<string> {
  return s3.getSignedUrlPromise('getObject', {
    Bucket: BUCKET,
    Key: key,
    Expires: ttl,
  });
}
