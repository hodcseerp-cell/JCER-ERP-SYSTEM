import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import logger from './logger.util';

export interface ValidationResult {
  success: boolean;
  reason?: 'BLACK_AND_WHITE_IMAGE' | 'BLURRY_IMAGE';
  message?: string;
}

export interface DocumentRule {
  checkColor: boolean;
  checkBlur: boolean;
}

/**
 * Normalizes document type strings or field names into standard keys.
 */
export function normalizeDocumentType(docType: string): string {
  if (!docType) return 'unknown';
  const clean = docType.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

  const map: Record<string, string> = {
    // 1. Passport Photo (Color + Blur)
    'photo': 'photo',
    'passportphoto': 'photo',
    'recentpassportphoto': 'photo',

    // 2. Aadhaar Card (Color + Blur)
    'aadhaar': 'aadhaar',
    'aadhaarcard': 'aadhaar',

    // 3. SSLC / 10th Marks Card (Color + Blur)
    'tenthmarksheet': 'tenthMarksheet',
    'sslcmarkscard': 'tenthMarksheet',
    '10thmarkscard': 'tenthMarksheet',
    'sslc10thmarkscard': 'tenthMarksheet',
    'sslc': 'tenthMarksheet',

    // 4. PUC / 12th Marks Card (Color + Blur)
    'twelfthmarksheet': 'twelfthMarksheet',
    'pucmarkscard': 'twelfthMarksheet',
    '12thmarkscard': 'twelfthMarksheet',
    'puc12thmarkscard': 'twelfthMarksheet',
    'puc': 'twelfthMarksheet',

    // Diploma 5th & 6th Semester Marks Cards (Color + Blur)
    'diplomasemester5marksheet': 'diplomaSemester5Marksheet',
    'diploma5thsemestermarkscard': 'diplomaSemester5Marksheet',
    'diploma5thsemmarkscard': 'diplomaSemester5Marksheet',
    'diploma5thsem': 'diplomaSemester5Marksheet',
    'diplomasemester6marksheet': 'diplomaSemester6Marksheet',
    'diploma6thsemestermarkscard': 'diplomaSemester6Marksheet',
    'diploma6thsemmarkscard': 'diplomaSemester6Marksheet',
    'diploma6thsem': 'diplomaSemester6Marksheet',

    // 5. Entrance Score Card (CET/DCET) (Color + Blur)
    'cetscorecard': 'cetScoreCard',
    'entrancescorecardcetdcet': 'cetScoreCard',
    'entrancescorecard': 'cetScoreCard',
    'cetdcet': 'cetScoreCard',
    'cet': 'cetScoreCard',

    // 6. E-Signature (Blur Only)
    'signature': 'signature',
    'esignature': 'signature',

    // 7. Income Certificate (Blur Only)
    'incomecertificate': 'incomeCertificate',
    'incomecert': 'incomeCertificate',
    'gapcertificate': 'gapCertificate', // Frontend maps income certificate field to gapCertificate
    'gapcert': 'gapCertificate',

    // 8. Caste Certificate (Blur Only)
    'castecertificate': 'casteCertificate',
    'castecert': 'casteCertificate',

    // 9. 7 Years Study Certificate (Blur Only)
    'domicilecertificate': 'domicileCertificate',
    'studycertificate': 'domicileCertificate',
    '7yearsstudycertificate': 'domicileCertificate',

    // 10. Fees Paid Receipt (Blur Only)
    'feespaidreceipt': 'feesPaidReceipt',
    'feereceipt': 'feesPaidReceipt',
    'admissionfeereceipt': 'admissionFeeReceipt',
  };

  return map[clean] || docType;
}

/**
 * Configuration matrix specifying required quality validations per document type.
 */
export const DOCUMENT_VALIDATION_CONFIG: Record<string, DocumentRule> = {
  // ALL QUALITY RESTRICTIONS DISABLED (Only frontend compression & file type check active)
  photo: { checkColor: false, checkBlur: false },
  tenthMarksheet: { checkColor: false, checkBlur: false },
  aadhaar: { checkColor: false, checkBlur: false },
  feesPaidReceipt: { checkColor: false, checkBlur: false },

  // COLOR OR BLACK & WHITE ACCEPTED
  signature: { checkColor: false, checkBlur: false },
  twelfthMarksheet: { checkColor: false, checkBlur: false },
  diplomaSemester5Marksheet: { checkColor: false, checkBlur: false },
  diplomaSemester6Marksheet: { checkColor: false, checkBlur: false },
  cetScoreCard: { checkColor: false, checkBlur: false },
  incomeCertificate: { checkColor: false, checkBlur: false },
  casteCertificate: { checkColor: false, checkBlur: false },
  domicileCertificate: { checkColor: false, checkBlur: false },
  gapCertificate: { checkColor: false, checkBlur: false },
  admissionFeeReceipt: { checkColor: false, checkBlur: false },
};

/**
 * Validates if an image is in color.
 * Calculates grayscale pixel percentage using RGB channel tolerance.
 * If image is mostly grayscale (>= 92.0%), rejects it as BLACK_AND_WHITE_IMAGE.
 */
export async function validateColor(input: string | Buffer, tolerance: number = 18): Promise<{ isColor: boolean; grayscalePercentage: number }> {
  try {
    const pipeline = typeof input === 'string' ? sharp(input) : sharp(input);

    const { data, info } = await pipeline
      .resize(300, 300, { fit: 'inside' })
      .toFormat('png')
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Single-channel image is 100% grayscale
    if (info.channels === 1) {
      return { isColor: false, grayscalePercentage: 100.0 };
    }

    const channels = info.channels;
    const totalPixels = info.width * info.height;
    let grayscalePixelCount = 0;

    for (let i = 0; i < data.length; i += channels) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // A pixel is grayscale if RGB channel differences are within tolerance (accounts for JPEG noise)
      const diffRG = Math.abs(r - g);
      const diffGB = Math.abs(g - b);
      const diffRB = Math.abs(r - b);

      if (diffRG <= tolerance && diffGB <= tolerance && diffRB <= tolerance) {
        grayscalePixelCount++;
      }
    }

    const grayscalePercentage = (grayscalePixelCount / totalPixels) * 100;

    // If 92.0% or more pixels are grayscale, classify as BLACK_AND_WHITE_IMAGE
    const isColor = grayscalePercentage < 92.0;

    return { isColor, grayscalePercentage };
  } catch (error) {
    logger.error('Error during color validation:', error);
    // Safe fallback for unreadable formats like non-raster PDFs
    return { isColor: true, grayscalePercentage: 0 };
  }
}

/**
 * Validates if an image is clear (rejects blurry images using Variance of Laplacian).
 */
export async function validateBlur(input: string | Buffer, blurThreshold: number = 85): Promise<{ isSharp: boolean; blurScore: number }> {
  try {
    const pipeline = typeof input === 'string' ? sharp(input) : sharp(input);

    const { data, info } = await pipeline
      .resize(400, 400, { fit: 'inside' })
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const width = info.width;
    const height = info.height;

    if (width < 3 || height < 3) return { isSharp: true, blurScore: 999 };

    // 3x3 Laplacian Operator Kernel
    let sum = 0;
    const laplacianValues: number[] = [];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;

        const current = data[idx];
        const left = data[idx - 1];
        const right = data[idx + 1];
        const top = data[idx - width];
        const bottom = data[idx + width];

        const lap = left + right + top + bottom - 4 * current;
        laplacianValues.push(lap);
        sum += lap;
      }
    }

    const count = laplacianValues.length;
    if (count === 0) return { isSharp: true, blurScore: 999 };

    const mean = sum / count;
    let varianceSum = 0;

    for (let i = 0; i < count; i++) {
      const diff = laplacianValues[i] - mean;
      varianceSum += diff * diff;
    }

    const blurScore = varianceSum / count;
    const isSharp = blurScore >= blurThreshold;

    return { isSharp, blurScore };
  } catch (error) {
    logger.error('Error during blur validation:', error);
    return { isSharp: true, blurScore: 999 };
  }
}

/**
 * Main entry point: Validates an uploaded document based on its type rules.
 * Prints detailed debug logs as requested.
 */
export async function validateDocument(
  documentType: string,
  input: string | Buffer,
  fileName?: string
): Promise<ValidationResult> {
  const normType = normalizeDocumentType(documentType);
  const rule = DOCUMENT_VALIDATION_CONFIG[normType] || { checkColor: false, checkBlur: true };
  const actualFileName = fileName || (typeof input === 'string' ? path.basename(input) : 'Selected Buffer');

  console.log('====================================================');
  console.log(`📄 Document Validation Started`);
  console.log(`• Document Type           : ${documentType} (Normalized: ${normType})`);
  console.log(`• Selected File Name      : ${actualFileName}`);
  console.log(`• Validation Started      : YES`);
  console.log(`• Color Validation Required: ${rule.checkColor ? 'YES' : 'NO'}`);
  console.log(`• Blur Validation Required : ${rule.checkBlur ? 'YES' : 'NO'}`);

  let colorPass = true;
  let colorDetails = 'SKIPPED (Not required for this document)';

  // 1. Color Validation (only if required for document type)
  if (rule.checkColor) {
    const { isColor, grayscalePercentage } = await validateColor(input);
    colorPass = isColor;
    colorDetails = `${isColor ? 'PASS' : 'FAIL'} (Grayscale: ${grayscalePercentage.toFixed(2)}%)`;
    console.log(`• Color Validation Result  : ${colorDetails}`);

    if (!isColor) {
      const result: ValidationResult = {
        success: false,
        reason: 'BLACK_AND_WHITE_IMAGE',
        message: 'Please upload the original COLOR image of this document.',
      };
      console.log(`• Blur Validation Result   : SKIPPED (Blocked by Color check)`);
      console.log(`• Final Decision           : REJECTED`);
      console.log(`• Upload Blocked           : YES`);
      console.log(`• Reason                   : ${result.reason} - "${result.message}"`);
      console.log('====================================================\n');
      return result;
    }
  } else {
    console.log(`• Color Validation Result  : ${colorDetails}`);
  }

  // 2. Blur Validation (required for all specified documents)
  if (rule.checkBlur) {
    const { isSharp, blurScore } = await validateBlur(input);
    const blurDetails = `${isSharp ? 'PASS' : 'FAIL'} (Blur Score: ${blurScore.toFixed(2)})`;
    console.log(`• Blur Validation Result   : ${blurDetails}`);

    if (!isSharp) {
      const result: ValidationResult = {
        success: false,
        reason: 'BLURRY_IMAGE',
        message: 'The uploaded image is blurry. Please upload a clearer image.',
      };
      console.log(`• Final Decision           : REJECTED`);
      console.log(`• Upload Blocked           : YES`);
      console.log(`• Reason                   : ${result.reason} - "${result.message}"`);
      console.log('====================================================\n');
      return result;
    }
  } else {
    console.log(`• Blur Validation Result   : SKIPPED`);
  }

  console.log(`• Final Decision           : PASSED`);
  console.log(`• Upload Blocked           : NO`);
  console.log('====================================================\n');

  return { success: true };
}
