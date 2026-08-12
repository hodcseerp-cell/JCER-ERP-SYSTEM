import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express';
import { BadRequestError } from '../utils/error.util';
import logger from '../utils/logger.util';
import { validateDocument } from '../utils/documentValidation.util';
import Admission from '../models/Admission';

// Ensure uploads directory exists and is located outside of public-accessible root
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req: any, file, cb) => {
    const studentId = req.studentUserId || req.user?.id || 'admin';
    const documentType = file.fieldname || 'general';
    const destDir = (studentId === 'admin' || documentType === 'handbookPdf')
      ? path.join(process.cwd(), 'uploads', documentType)
      : path.join(process.cwd(), 'uploads', 'admissions', studentId, documentType);

    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    cb(null, destDir);
  },
  filename: (req: any, file, cb) => {
    const studentId = req.studentUserId || req.user?.id || 'admin';
    const documentType = file.fieldname || 'general';
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    const prefix = documentType === 'handbookPdf' ? 'admin' : studentId;
    cb(null, `${prefix}_${documentType}_${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (
  _req: Request,
  file: any,
  cb: any
) => {
  const allowedMimes = [
    'image/jpeg', 'image/jpg', 'image/png',
    'application/pdf',
  ];
  if (!allowedMimes.includes(file.mimetype)) {
    return cb(new BadRequestError(`File type not allowed: ${file.mimetype}. Only JPG, PNG, and PDF files are accepted.`));
  }
  cb(null, true);
};

// Internal multer instance for multi-field Step 6 uploads
const multerInstance = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB per file
  },
}).fields([
  { name: 'photo', maxCount: 1 },
  { name: 'signature', maxCount: 1 },
  { name: 'tenthMarksheet', maxCount: 1 },
  { name: 'twelfthMarksheet', maxCount: 1 },
  { name: 'diplomaSemester5Marksheet', maxCount: 1 },
  { name: 'diplomaSemester6Marksheet', maxCount: 1 },
  { name: 'cetScoreCard', maxCount: 1 },
  { name: 'aadhaar', maxCount: 1 },
  { name: 'casteCertificate', maxCount: 1 },
  { name: 'domicileCertificate', maxCount: 1 },
  { name: 'gapCertificate', maxCount: 1 },
  { name: 'feesPaidReceipt', maxCount: 1 },
  { name: 'admissionFormFeeReceipt', maxCount: 1 },
]);

/**
 * Validates the first few bytes (magic bytes) of a file to check its actual type.
 */
const verifyMagicBytes = (filePath: string, mimeType: string): boolean => {
  try {
    const buffer = Buffer.alloc(4);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 4, 0);
    fs.closeSync(fd);

    const hex = buffer.toString('hex').toUpperCase();

    if (mimeType === 'application/pdf') {
      // PDF starts with 25 50 44 46 (%PDF)
      return hex === '25504446';
    }

    if (mimeType.startsWith('image/')) {
      const isJpeg = hex.startsWith('FFD8FF');
      const isPng = hex === '89504E47';
      const isWebp = hex === '52494646'; // RIFF (starts WebP containers)
      return isJpeg || isPng || isWebp;
    }

    return false;
  } catch (error) {
    logger.error(`Error reading magic bytes from file: ${filePath}`, error);
    return false;
  }
};

/**
 * Hardened upload middleware wrapper that handles multer uploads
 * and performs strict content-sniffing/magic byte checks and document quality validation.
 */
export const uploadDocuments = (req: Request, res: Response, next: NextFunction): void => {
  multerInstance(req, res, async (err: any) => {
    if (err) {
      return next(err);
    }

    if (req.files) {
      const filesObject = req.files as { [fieldname: string]: Express.Multer.File[] };
      for (const fieldName of Object.keys(filesObject)) {
        const filesList = filesObject[fieldName];
        for (const file of filesList) {
          // Double-check file signature against declared mime-type
          const isValid = verifyMagicBytes(file.path, file.mimetype);
          if (!isValid) {
            try {
              fs.unlinkSync(file.path);
            } catch (unlinkErr) {
              logger.error(`Failed to delete invalid upload: ${file.path}`, unlinkErr);
            }
            logger.warn(`Security alert: Upload blocked due to magic byte mismatch for ${file.originalname}`);
            return next(new BadRequestError(`File validation failed. Disguised files or macro scripts are not allowed.`));
          }

          // Skip quality validation for PDFs — sharp cannot process them
          if (file.mimetype === 'application/pdf') {
            continue;
          }

          // Document Quality Validation (Color + Blur) — images only
          const qualityResult = await validateDocument(fieldName, file.path, file.originalname);
          if (!qualityResult.success) {
            try {
              fs.unlinkSync(file.path);
            } catch (unlinkErr) {
              logger.error(`Failed to delete unvalidated upload: ${file.path}`, unlinkErr);
            }
            logger.warn(`Document quality validation failed for field '${fieldName}': ${qualityResult.reason}`);

            res.status(400).json({
              success: false,
              reason: qualityResult.reason,
              message: qualityResult.message,
            });
            return;
          }
        }
      }
    }
    next();
  });
};

const feeReceiptMulterInstance = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
  },
}).single('admissionFeeReceipt');

export const uploadFeeReceiptMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  feeReceiptMulterInstance(req, res, async (err: any) => {
    if (err) {
      return next(err);
    }

    if (req.file) {
      const file = req.file;
      const isValid = verifyMagicBytes(file.path, file.mimetype);
      if (!isValid) {
        try {
          fs.unlinkSync(file.path);
        } catch (unlinkErr) {
          logger.error(`Failed to delete invalid upload: ${file.path}`, unlinkErr);
        }
        return next(new BadRequestError(`File validation failed. Disguised files or macro scripts are not allowed.`));
      }

      // Skip quality validation for PDFs
      if (file.mimetype !== 'application/pdf') {
        const qualityResult = await validateDocument(file.fieldname, file.path, file.originalname);
        if (!qualityResult.success) {
          try {
            fs.unlinkSync(file.path);
          } catch (unlinkErr) {
            logger.error(`Failed to delete unvalidated fee receipt: ${file.path}`, unlinkErr);
          }
          logger.warn(`Document quality validation failed for fee receipt: ${qualityResult.reason}`);

          res.status(400).json({
            success: false,
            reason: qualityResult.reason,
            message: qualityResult.message,
          });
          return;
        }
      }
    }
    next();
  });
};

// Multer instance for instant single-document quality validation
const singleValidationMulterInstance = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
}).single('document');

export const singleDocumentValidationMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  singleValidationMulterInstance(req, res, (err: any) => {
    if (err) {
      return next(err);
    }
    next();
  });
};

export const handbookUpload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new BadRequestError('Only PDF files are allowed for the Admission Handbook.'));
    }
    cb(null, true);
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
  },
});

/**
 * Middleware to resolve a student's User ID from the admission application ID param
 */
export const resolveStudentUserId = async (req: any, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;
    if (!id) {
      return next();
    }
    const admission = await Admission.findByPk(id);
    if (!admission) {
      return res.status(404).json({ success: false, error: 'Admission application not found.' });
    }
    req.studentUserId = admission.userId;
    next();
  } catch (err) {
    next(err);
  }
};
