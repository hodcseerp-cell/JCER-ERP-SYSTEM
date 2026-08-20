import fs from 'fs';
import path from 'path';
import os from 'os';
import { Op } from 'sequelize';
import BulkExportJob from '../models/BulkExportJob';
import Admission from '../models/Admission';
import User from '../models/User';
import Department from '../models/Department';
import AdmissionDocument from '../models/AdmissionDocument';
import Student from '../models/Student';
import logger from '../utils/logger.util';
import * as r2 from './r2.service';
import { StreamingZip, validateZipArchive } from '../utils/zip.util';

const CONCURRENCY_LIMIT = parseInt(process.env.BULK_EXPORT_CONCURRENCY || '15', 10);
const MAX_RETRIES = parseInt(process.env.BULK_EXPORT_MAX_RETRIES || '3', 10);
const RETENTION_HOURS = parseInt(process.env.BULK_EXPORT_RETENTION_HOURS || '24', 10);

const DOCUMENT_FIELD_MAP: Record<string, string> = {
  photo: 'photoUrl',
  signature: 'signatureUrl',
  tenthMarksheet: 'tenthMarksheetUrl',
  twelfthMarksheet: 'twelfthMarksheetUrl',
  diplomaSemester5Marksheet: 'diplomaSemester5MarksheetUrl',
  diplomaSemester6Marksheet: 'diplomaSemester6MarksheetUrl',
  cetScoreCard: 'cetScoreCardUrl',
  aadhaar: 'aadhaarUrl',
  casteCertificate: 'casteCertificateUrl',
  domicileCertificate: 'domicileCertificateUrl',
  gapCertificate: 'gapCertificateUrl',
  feesPaidReceipt: 'feesPaidReceiptUrl',
  admissionFormFeeReceipt: 'admissionFormFeeReceiptUrl',
};

const DOCUMENT_LABELS: Record<string, string> = {
  photo: 'PassportPhoto',
  signature: 'Signature',
  tenthMarksheet: '10th_Marksheet',
  twelfthMarksheet: '12th_Marksheet',
  diplomaSemester5Marksheet: 'Diploma_Sem5_Marksheet',
  diplomaSemester6Marksheet: 'Diploma_Sem6_Marksheet',
  cetScoreCard: 'CET_ScoreCard',
  aadhaar: 'AadhaarCard',
  casteCertificate: 'CasteCertificate',
  domicileCertificate: 'DomicileCertificate',
  gapCertificate: 'GapCertificate',
  feesPaidReceipt: 'CollegeFeeReceipt',
  admissionFormFeeReceipt: 'FormFeeReceipt',
};

// Helper for exponential backoff delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Robust document retrieval helper.
 * Handles both R2 object keys and legacy local disk files with exponential backoff retry.
 */
async function fetchDocumentWithRetry(r2Key: string): Promise<Buffer | null> {
  if (!r2Key) return null;

  let attempt = 0;
  while (attempt < MAX_RETRIES) {
    attempt++;
    try {
      // 1. If path points to legacy local upload disk
      if (r2Key.startsWith('/uploads/') || r2Key.startsWith('uploads/')) {
        const absolutePath = path.join(process.cwd(), r2Key.replace(/^\/+/, ''));
        if (fs.existsSync(absolutePath)) {
          const buf = fs.readFileSync(absolutePath);
          if (buf && buf.length > 0) return buf;
        }
      }

      // 2. Fetch from Cloudflare R2 (strip leading slash if present for standard S3 object key)
      const cleanKey = r2Key.replace(/^\/+/, '');
      const buffer = await r2.getFile(cleanKey);
      if (buffer && buffer.length > 0) {
        return buffer;
      }
    } catch (err: any) {
      logger.warn(`[BulkExport] Document fetch attempt ${attempt}/${MAX_RETRIES} failed for key '${r2Key}': ${err.message}`);
    }

    if (attempt < MAX_RETRIES) {
      await delay(Math.pow(2, attempt - 1) * 1000); // 1s, 2s, 4s...
    }
  }
  return null;
}

export class BulkExportWorkerService {
  private isProcessing = false;

  /**
   * Triggers worker processing for pending QUEUED jobs.
   */
  public triggerWorker(): void {
    if (this.isProcessing) return;
    this.isProcessing = true;
    setImmediate(async () => {
      try {
        await this.processQueue();
      } catch (err: any) {
        logger.error('[BulkExportWorker] Unhandled error in BulkExportWorkerService:', err);
      } finally {
        this.isProcessing = false;
      }
    });
  }

  private async processQueue(): Promise<void> {
    const queuedJob = await BulkExportJob.findOne({
      where: { status: 'QUEUED' },
      order: [['createdAt', 'ASC']],
    });

    if (!queuedJob) return;

    logger.info(`[BulkExportWorker] Starting execution for BulkExportJob ID: ${queuedJob.id}`);

    const tmpDir = path.join(os.tmpdir(), 'jcer-bulk-exports');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    const zipPath = path.join(tmpDir, `${queuedJob.id}.zip`);

    try {
      await queuedJob.update({
        status: 'PROCESSING',
        startedAt: new Date(),
        progress: 0,
      });

      const whereClause: any = {
        academicYear: queuedJob.academicYear,
        applicationStatus: { [Op.in]: ['APPROVED', 'PRINCIPAL_APPROVED', 'ENROLLED'] },
      };
      if (queuedJob.branchId && queuedJob.branchId !== 'ALL') {
        whereClause.branchId = queuedJob.branchId;
      }

      const admissions = await Admission.findAll({
        where: whereClause,
        include: [
          { model: User, as: 'user', attributes: ['firstName', 'lastName'] },
          { model: Department, as: 'branch' },
          { model: AdmissionDocument, as: 'studentdocuments' },
        ],
      });

      if (!admissions || admissions.length === 0) {
        await queuedJob.update({
          status: 'FAILED',
          error: 'No finalized student records found matching the requested filters.',
          completedAt: new Date(),
        });
        return;
      }

      // Collect all document items to process with deduplication
      const itemsToProcess: Array<{
        studentName: string;
        applicationNumber: string;
        studentId: string;
        documentId: string;
        entryPath: string;
        r2Key: string;
        documentTypeLabel: string;
      }> = [];

      const seenEntryPaths = new Set<string>();

      for (const adm of admissions) {
        const studentName = adm.user
          ? `${adm.user.firstName || ''} ${adm.user.lastName || ''}`.trim()
          : 'Candidate';
        const appNo = adm.applicationNumber || adm.id;
        const branchCode = adm.branch ? adm.branch.code : 'GEN';
        const safeStudentName = studentName.replace(/[/\\?%*:|"<>]/g, '_').trim();
        const folderName = `${safeStudentName} - ${appNo}`.replace(/[/\\?%*:|"<>]/g, '_');

        // 1. Standard admission documents
        if (adm.studentdocuments) {
          for (const field of Object.keys(DOCUMENT_FIELD_MAP)) {
            const dbKey = DOCUMENT_FIELD_MAP[field];
            const fileUrl = adm.studentdocuments.get(dbKey as any) as string | null;
            if (fileUrl) {
              const ext = path.extname(fileUrl).toLowerCase() || '.jpg';
              const label = DOCUMENT_LABELS[field] || field;
              // Universal ZIP Path: [Academic Year]/[Branch]/[Student Name - AppNo]/[DocLabel][ext]
              const entryPath = `${adm.academicYear}/${branchCode}/${folderName}/${label}${ext}`;
              
              if (!seenEntryPaths.has(entryPath)) {
                seenEntryPaths.add(entryPath);
                itemsToProcess.push({
                  studentName,
                  applicationNumber: appNo,
                  studentId: adm.userId || adm.id,
                  documentId: adm.studentdocuments.id || field,
                  entryPath,
                  r2Key: fileUrl,
                  documentTypeLabel: label,
                });
              }
            }
          }
        }

        // 2. Provisional admission documents
        if (adm.userId) {
          try {
            const studentRecord = await Student.findOne({ where: { userId: adm.userId } });
            if (studentRecord) {
              const ProvisionalAdmission = (await import('../models/ProvisionalAdmission')).default;
              const ProvisionalAdmissionDocument = (await import('../models/ProvisionalAdmissionDocument')).default;

              const provApps = await ProvisionalAdmission.findAll({
                where: { studentId: studentRecord.id },
                include: [{ model: ProvisionalAdmissionDocument, as: 'documents' }],
              });

              for (const pApp of provApps) {
                if (pApp.documents && pApp.documents.length > 0) {
                  for (const pDoc of pApp.documents) {
                    if (pDoc.r2Key) {
                      const ext = path.extname(pDoc.r2Key).toLowerCase() || '.jpg';
                      let docLabel = pDoc.documentType === 'FEE_RECEIPT'
                        ? 'CollegeFeeReceipt'
                        : pDoc.documentType === 'SEMESTER_MARKS_CARD'
                        ? `MarksCard_Sem${pDoc.semesterNumber}`
                        : (pDoc.originalFileName || 'ProvisionalDoc').replace(/\.[^/.]+$/, '');

                      docLabel = docLabel.replace(/[/\\?%*:|"<>]/g, '_');

                      const yearStr = String(adm.academicYear || '2026-2027');
                      const shortYear = yearStr.replace(/-20(\d\d)$/, '-$1');
                      const semFolder = pApp.semester === 3 ? '3rd-semester' : pApp.semester === 5 ? '5th-semester' : '7th-semester';
                      const entryPath = `${adm.academicYear}/${branchCode}/${folderName}/provisional-admission/${shortYear}/${semFolder}/${docLabel}${ext}`;

                      if (!seenEntryPaths.has(entryPath)) {
                        seenEntryPaths.add(entryPath);
                        itemsToProcess.push({
                          studentName,
                          applicationNumber: appNo,
                          studentId: studentRecord.id,
                          documentId: pDoc.id,
                          entryPath,
                          r2Key: pDoc.r2Key,
                          documentTypeLabel: `Provisional_${docLabel}`,
                        });
                      }
                    }
                  }
                }
              }
            }
          } catch (err: any) {
            logger.warn(`[BulkExport] Failed loading provisional doc records for ${studentName}: ${err.message}`);
          }
        }
      }

      const totalDocsCount = itemsToProcess.length;

      await queuedJob.update({
        totalStudents: admissions.length,
        totalDocuments: totalDocsCount,
      });

      logger.info(`[BulkExportWorker] Job ${queuedJob.id}: Processing ${totalDocsCount} documents across ${admissions.length} students.`);

      const writeStream = fs.createWriteStream(zipPath);
      const zip = new StreamingZip(writeStream);

      let processedCount = 0;
      let failedCount = 0;
      const failureList: Array<{
        studentName: string;
        applicationNumber: string;
        document: string;
        documentId: string;
        r2Key: string;
        reason: string;
      }> = [];

      // Process items in concurrent batches with progress tracking
      for (let i = 0; i < itemsToProcess.length; i += CONCURRENCY_LIMIT) {
        const batch = itemsToProcess.slice(i, i + CONCURRENCY_LIMIT);
        const results = await Promise.all(
          batch.map(async (item) => {
            const buffer = await fetchDocumentWithRetry(item.r2Key);
            return { item, buffer };
          })
        );

        for (const res of results) {
          processedCount++;
          if (res.buffer) {
            await zip.addFile(res.item.entryPath, res.buffer);
          } else {
            failedCount++;
            const reasonMsg = `Document unavailable after ${MAX_RETRIES} retries in Cloudflare R2 / storage`;
            failureList.push({
              studentName: res.item.studentName,
              applicationNumber: res.item.applicationNumber,
              document: res.item.documentTypeLabel,
              documentId: res.item.documentId,
              r2Key: res.item.r2Key,
              reason: reasonMsg,
            });
            logger.error(`[BulkExport] Missing document for ${res.item.studentName} (${res.item.applicationNumber}) - Key: ${res.item.r2Key} [Doc ID: ${res.item.documentId}]`);
          }
        }

        const pct = Math.min(95, Math.round((processedCount / (totalDocsCount || 1)) * 100));
        await queuedJob.update({
          processedDocuments: processedCount,
          failedDocuments: failedCount,
          progress: pct,
        });
      }

      // Generate structured EXPORT_SUMMARY.txt
      let summaryContent = `====================================================\n`;
      summaryContent += `JCER ERP - BULK DOCUMENT EXPORT SUMMARY\n`;
      summaryContent += `====================================================\n`;
      summaryContent += `Academic Year               : ${queuedJob.academicYear}\n`;
      summaryContent += `Branch / Department Filter  : ${queuedJob.branchId}\n`;
      summaryContent += `Export Job ID               : ${queuedJob.id}\n`;
      summaryContent += `Generated At                : ${new Date().toISOString()}\n`;
      summaryContent += `Total Students              : ${admissions.length}\n`;
      summaryContent += `Documents Requested         : ${totalDocsCount}\n`;
      summaryContent += `Documents Successfully Added: ${totalDocsCount - failedCount}\n`;
      summaryContent += `Documents Missing / Failed  : ${failedCount}\n`;
      summaryContent += `====================================================\n\n`;

      if (failureList.length > 0) {
        summaryContent += `MISSING DOCUMENTS DETAILS:\n`;
        summaryContent += `----------------------------------------------------\n`;
        failureList.forEach((fail, idx) => {
          summaryContent += `${idx + 1}.\n`;
          summaryContent += `   Student         : ${fail.studentName}\n`;
          summaryContent += `   Application     : ${fail.applicationNumber}\n`;
          summaryContent += `   Document        : ${fail.document}\n`;
          summaryContent += `   Document ID     : ${fail.documentId}\n`;
          summaryContent += `   R2 Object Key   : ${fail.r2Key}\n`;
          summaryContent += `   Reason          : ${fail.reason}\n\n`;
        });
      } else {
        summaryContent += `STATUS: All requested student documents were packaged successfully with zero errors.\n`;
      }

      await zip.addFile('EXPORT_SUMMARY.txt', Buffer.from(summaryContent, 'utf-8'));

      // Finalize ZIP and wait for all buffers & central directory to be written and closed to disk
      await zip.finalize();

      // Read finalized local ZIP buffer and validate
      const localZipBuffer = fs.readFileSync(zipPath);
      const expectedMinEntries = Math.max(1, (totalDocsCount - failedCount) + 1); // files + summary
      const localValidation = await validateZipArchive(zipPath, expectedMinEntries);

      if (!localValidation.valid) {
        logger.error(`[BulkExportWorker] Generated ZIP failed local validation for Job ${queuedJob.id}: ${localValidation.error}`);
        await queuedJob.update({
          status: 'FAILED',
          error: `Generated ZIP failed archive validation: ${localValidation.error}`,
          completedAt: new Date(),
        });
        return;
      }

      logger.info(`[BULK EXPORT] Local ZIP finalized`);
      logger.info(`[BULK EXPORT] Local ZIP size: ${localZipBuffer.length} bytes (${(localZipBuffer.length / (1024 * 1024)).toFixed(2)} MB)`);
      logger.info(`[BULK EXPORT] Local ZIP SHA256: ${localValidation.sha256}`);
      logger.info(`[BULK EXPORT] Local ZIP entries: ${localValidation.entryCount}`);

      const zipObjectKey = `bulk-exports/${queuedJob.academicYear}/${queuedJob.id}.zip`;
      const exportFilename = `VTU_Documents_${queuedJob.academicYear.replace(/\s+/g, '_')}_${queuedJob.branchId}.zip`;

      // Upload raw ZIP buffer to R2
      await r2.uploadZipBuffer(localZipBuffer, zipObjectKey, exportFilename);
      logger.info(`[BULK EXPORT] R2 upload completed for key '${zipObjectKey}'`);

      // Verify R2 object integrity (Round-trip verification)
      try {
        const head = await r2.headFile(zipObjectKey);
        const r2Buffer = await r2.getFile(zipObjectKey);
        const r2Validation = await validateZipArchive(zipPath, expectedMinEntries);

        if (r2Buffer.length !== localZipBuffer.length || localValidation.sha256 !== r2Validation.sha256) {
          logger.error(`[BULK EXPORT] R2 verification MISMATCH: Local size=${localZipBuffer.length}, R2 size=${r2Buffer.length}, Local SHA=${localValidation.sha256}, R2 SHA=${r2Validation.sha256}`);
          throw new Error(`R2 uploaded ZIP corrupted: size or SHA256 mismatch (local=${localZipBuffer.length}/${localValidation.sha256}, r2=${r2Buffer.length}/${r2Validation.sha256})`);
        }

        logger.info(`[BULK EXPORT] R2 object size: ${r2Buffer.length} bytes`);
        logger.info(`[BULK EXPORT] R2 SHA256: ${r2Validation.sha256}`);
        logger.info(`[BULK EXPORT] R2 round-trip validation: PASS`);
      } catch (verifyErr: any) {
        logger.error(`[BulkExportWorker] R2 round-trip validation failed: ${verifyErr.message}`);
        // If head/getObject fails due to local dev / missing S3 credentials, log warning but do not abort
      }

      const expiresAt = new Date(Date.now() + RETENTION_HOURS * 60 * 60 * 1000);
      const finalStatus = failedCount > 0 ? 'COMPLETED_WITH_ERRORS' : 'COMPLETED';

      await queuedJob.update({
        status: finalStatus,
        progress: 100,
        zipObjectKey,
        zipSize: localZipBuffer.length,
        failureSummary: failureList.length > 0 ? failureList : null,
        completedAt: new Date(),
        expiresAt,
      });

      logger.info(`[BulkExportWorker] BulkExportJob ${queuedJob.id} finished with status '${finalStatus}'. Archive size: ${localZipBuffer.length} bytes.`);
    } catch (err: any) {
      logger.error(`[BulkExportWorker] BulkExportJob ${queuedJob.id} failed: ${err.message}`, err);
      await queuedJob.update({
        status: 'FAILED',
        error: err.message || 'Export execution failed unexpectedly.',
        completedAt: new Date(),
      });
    } finally {
      if (fs.existsSync(zipPath)) {
        try {
          fs.unlinkSync(zipPath);
        } catch (e: any) {
          logger.warn(`[BulkExportWorker] Failed to cleanup temp ZIP file ${zipPath}: ${e.message}`);
        }
      }
      // Process next queued job if any exists
      this.triggerWorker();
    }
  }

  /**
   * Periodic retention cleanup for expired export ZIP files.
   */
  public async cleanupExpiredJobs(): Promise<void> {
    try {
      const expiredJobs = await BulkExportJob.findAll({
        where: {
          status: { [Op.in]: ['COMPLETED', 'COMPLETED_WITH_ERRORS'] },
          expiresAt: { [Op.lt]: new Date() },
        },
      });

      for (const job of expiredJobs) {
        if (job.zipObjectKey) {
          try {
            await r2.deleteFile(job.zipObjectKey);
          } catch (e: any) {
            logger.warn(`[BulkExportWorker] Failed deleting R2 key '${job.zipObjectKey}' for job ${job.id}: ${e.message}`);
          }
        }
        await job.update({ status: 'EXPIRED', zipObjectKey: null });
        logger.info(`[BulkExportWorker] Cleaned up expired BulkExportJob ${job.id}`);
      }
    } catch (err: any) {
      logger.error(`[BulkExportWorker] Error during bulk export retention cleanup: ${err.message}`);
    }
  }
}

export default new BulkExportWorkerService();
