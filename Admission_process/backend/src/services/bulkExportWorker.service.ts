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
import { StreamingZip } from '../utils/zip.util';

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

async function fetchR2WithRetry(r2Key: string): Promise<Buffer | null> {
  let attempt = 0;
  while (attempt < MAX_RETRIES) {
    attempt++;
    try {
      const buffer = await r2.getFile(r2Key);
      if (buffer) return buffer;
    } catch (err: any) {
      logger.warn(`R2 fetch attempt ${attempt}/${MAX_RETRIES} failed for key '${r2Key}': ${err.message}`);
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
        logger.error('Unhandled error in BulkExportWorkerService:', err);
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

    logger.info(`Starting execution for BulkExportJob ID: ${queuedJob.id}`);

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

      // Collect all document items to process
      const itemsToProcess: Array<{
        studentName: string;
        applicationNumber: string;
        entryPath: string;
        r2Key: string;
        documentTypeLabel: string;
      }> = [];

      let totalDocsCount = 0;

      for (const adm of admissions) {
        const studentName = adm.user
          ? `${adm.user.firstName} ${adm.user.lastName}`.trim()
          : 'Candidate';
        const appNo = adm.applicationNumber || adm.id;
        const branchCode = adm.branch ? adm.branch.code : 'GEN';
        const folderName = `${studentName} - ${appNo}`.replace(/[/\\?%*:|"<>]/g, '_');

        if (adm.studentdocuments) {
          for (const field of Object.keys(DOCUMENT_FIELD_MAP)) {
            const dbKey = DOCUMENT_FIELD_MAP[field];
            const fileUrl = adm.studentdocuments.get(dbKey as any) as string | null;
            if (fileUrl) {
              totalDocsCount++;
              const ext = path.extname(fileUrl).toLowerCase() || '.jpg';
              const label = DOCUMENT_LABELS[field] || field;
              // ZIP Path: [Academic Year]/[Branch]/[Student Name - AppNo]/[DocLabel][ext]
              const entryPath = `${adm.academicYear}/${branchCode}/${folderName}/${label}${ext}`;
              itemsToProcess.push({
                studentName,
                applicationNumber: appNo,
                entryPath,
                r2Key: fileUrl,
                documentTypeLabel: label,
              });
            }
          }
        }

        // Provisional admission documents
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
                      totalDocsCount++;
                      const ext = path.extname(pDoc.r2Key).toLowerCase() || '.jpg';
                      let docLabel = pDoc.documentType === 'FEE_RECEIPT'
                        ? 'CollegeFeeReceipt'
                        : pDoc.documentType === 'SEMESTER_MARKS_CARD'
                        ? `MarksCard_Sem${pDoc.semesterNumber}`
                        : (pDoc.originalFileName || 'ProvisionalDoc').replace(/\.[^/.]+$/, '');

                      const shortYear = (adm.academicYear || '2026-2027').replace(/-20(\d\d)$/, '-$1');
                      const semFolder = pApp.semester === 3 ? '3rd-semester' : pApp.semester === 5 ? '5th-semester' : '7th-semester';
                      const entryPath = `${adm.academicYear}/${branchCode}/${folderName}/provisional-admission/${shortYear}/${semFolder}/${docLabel}${ext}`;

                      itemsToProcess.push({
                        studentName,
                        applicationNumber: appNo,
                        entryPath,
                        r2Key: pDoc.r2Key,
                        documentTypeLabel: `Provisional_${docLabel}`,
                      });
                    }
                  }
                }
              }
            }
          } catch (err: any) {
            logger.warn(`Failed loading provisional doc records for ${studentName}: ${err.message}`);
          }
        }
      }

      await queuedJob.update({
        totalStudents: admissions.length,
        totalDocuments: totalDocsCount,
      });

      const writeStream = fs.createWriteStream(zipPath);
      const zip = new StreamingZip(writeStream);

      let processedCount = 0;
      let failedCount = 0;
      const failureList: Array<{ studentName: string; applicationNumber: string; document: string; reason: string }> = [];

      // Process R2 items in batches matching CONCURRENCY_LIMIT
      for (let i = 0; i < itemsToProcess.length; i += CONCURRENCY_LIMIT) {
        const batch = itemsToProcess.slice(i, i + CONCURRENCY_LIMIT);
        const results = await Promise.all(
          batch.map(async (item) => {
            const buffer = await fetchR2WithRetry(item.r2Key);
            return { item, buffer };
          })
        );

        for (const res of results) {
          processedCount++;
          if (res.buffer) {
            await zip.addFile(res.item.entryPath, res.buffer);
          } else {
            failedCount++;
            failureList.push({
              studentName: res.item.studentName,
              applicationNumber: res.item.applicationNumber,
              document: res.item.documentTypeLabel,
              reason: `R2 object unavailable after ${MAX_RETRIES} retries (${res.item.r2Key})`,
            });
          }
        }

        const pct = Math.min(99, Math.round((processedCount / (totalDocsCount || 1)) * 100));
        await queuedJob.update({
          processedDocuments: processedCount,
          failedDocuments: failedCount,
          progress: pct,
        });
      }

      // Generate EXPORT_SUMMARY.txt
      let summaryContent = `====================================================\n`;
      summaryContent += `JCER ERP BULK DOCUMENT EXPORT SUMMARY\n`;
      summaryContent += `====================================================\n`;
      summaryContent += `Export Job ID    : ${queuedJob.id}\n`;
      summaryContent += `Academic Year    : ${queuedJob.academicYear}\n`;
      summaryContent += `Branch / Dept    : ${queuedJob.branchId}\n`;
      summaryContent += `Total Students   : ${admissions.length}\n`;
      summaryContent += `Total Documents  : ${totalDocsCount}\n`;
      summaryContent += `Packaged         : ${totalDocsCount - failedCount}\n`;
      summaryContent += `Failed           : ${failedCount}\n`;
      summaryContent += `Generated At     : ${new Date().toISOString()}\n`;
      summaryContent += `====================================================\n\n`;

      if (failureList.length > 0) {
        summaryContent += `FAILED DOCUMENTS SUMMARY:\n`;
        summaryContent += `----------------------------------------------------\n`;
        for (const fail of failureList) {
          summaryContent += `Student: ${fail.studentName} | AppNo: ${fail.applicationNumber} | Doc: ${fail.document} | Reason: ${fail.reason}\n`;
        }
      } else {
        summaryContent += `All requested student documents were packaged successfully with zero errors.\n`;
      }

      await zip.addFile('EXPORT_SUMMARY.txt', Buffer.from(summaryContent, 'utf-8'));
      await zip.finalize();

      // Wait brief moment for write stream to close
      await delay(500);

      const stats = fs.statSync(zipPath);
      const zipObjectKey = `bulk-exports/${queuedJob.academicYear}/${queuedJob.id}.zip`;

      logger.info(`Uploading bulk export ZIP to R2 '${zipObjectKey}' (size: ${stats.size} bytes)...`);
      await r2.uploadFromDisk(zipPath, zipObjectKey, 'application/zip');

      const expiresAt = new Date(Date.now() + RETENTION_HOURS * 60 * 60 * 1000);
      const finalStatus = failedCount > 0 ? 'COMPLETED_WITH_ERRORS' : 'COMPLETED';

      await queuedJob.update({
        status: finalStatus,
        progress: 100,
        zipObjectKey,
        zipSize: stats.size,
        failureSummary: failureList.length > 0 ? failureList : null,
        completedAt: new Date(),
        expiresAt,
      });

      logger.info(`BulkExportJob ${queuedJob.id} finished with status ${finalStatus}`);
    } catch (err: any) {
      logger.error(`BulkExportJob ${queuedJob.id} failed: ${err.message}`, err);
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
          logger.warn(`Failed to cleanup temp ZIP file ${zipPath}: ${e.message}`);
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
            logger.warn(`Failed deleting R2 key '${job.zipObjectKey}' for job ${job.id}: ${e.message}`);
          }
        }
        await job.update({ status: 'EXPIRED', zipObjectKey: null });
        logger.info(`Cleaned up expired BulkExportJob ${job.id}`);
      }
    } catch (err: any) {
      logger.error(`Error during bulk export retention cleanup: ${err.message}`);
    }
  }
}

export default new BulkExportWorkerService();
