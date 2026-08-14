import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

import db from '../config/database';
import Admission from '../models/Admission';
import AdmissionDocument from '../models/AdmissionDocument';
import AdmissionPersonalDetail from '../models/AdmissionPersonalDetail';
import Department from '../models/Department';
import User from '../models/User';
import * as r2 from '../services/r2.service';
import { MAPPED_DOC_NAMES } from '../controllers/admission.controller';
import { buildR2Key } from '../utils/r2Key.util';

async function runMigration() {
  console.log('\n====================================================');
  console.log('🚀 STARTING LOCAL-TO-R2 DOCUMENT MIGRATION SCRIPT');
  console.log('====================================================\n');

  let totalScanned = 0;
  let totalMigrated = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  try {
    await db.authenticate();
    console.log('✓ Database connected successfully.');

    // Fetch all admissions with their associated documents, user, and branch
    const admissions = await Admission.findAll({
      include: [
        { model: User, as: 'user' },
        { model: Department, as: 'branch' },
        { model: AdmissionDocument, as: 'studentdocuments' }
      ]
    });

    console.log(`✓ Found ${admissions.length} admission applications to scan.`);

    for (const admission of admissions) {
      const studentId = admission.userId;
      const academicYear = admission.academicYear || '2026-2027';
      const branchCode = (admission as any).branch?.code || 'GEN';
      const appNum = admission.applicationNumber || `TEMP-${studentId}`;

      // Resolve student name
      const userRec = (admission as any).user;
      const studentName = userRec
        ? `${userRec.firstName || ''} ${userRec.lastName || ''}`.trim()
        : 'Student';

      // 1. Process standard documents in AdmissionDocument model
      const docs = (admission as any).studentdocuments;
      if (docs) {
        for (const field of Object.keys(MAPPED_DOC_NAMES)) {
          const dbKey = `${field}Url`;
          const val = docs.get(dbKey as any) as string | null;
          
          if (val && (val.startsWith('/uploads/') || val.startsWith('uploads/'))) {
            totalScanned++;
            const localPath = path.join(process.cwd(), val.replace(/^\/+/, ''));
            
            if (fs.existsSync(localPath)) {
              try {
                const ext = path.extname(val).toLowerCase() || '.jpg';
                const r2Key = buildR2Key({
                  academicYear,
                  branchCode,
                  studentName,
                  applicationNumber: appNum,
                  mappedDocName: MAPPED_DOC_NAMES[field] || field,
                  ext,
                });

                console.log(`[Migrating] ${localPath} -> R2: ${r2Key}`);
                
                let mimeType = 'image/jpeg';
                if (ext === '.pdf') mimeType = 'application/pdf';
                else if (ext === '.png') mimeType = 'image/png';

                await r2.uploadFromDisk(localPath, r2Key, mimeType);
                await docs.update({ [dbKey]: r2Key });
                totalMigrated++;
              } catch (err: any) {
                console.error(`❌ Failed to migrate standard doc ${localPath}:`, err.message);
                totalFailed++;
              }
            } else {
              console.warn(`⚠️ Local file not found, skipping: ${localPath}`);
              totalSkipped++;
            }
          } else if (val) {
            totalSkipped++;
          }
        }
      }

      // 2. Process admissionFeeReceiptUrl in Admission model itself
      const receiptUrl = admission.admissionFeeReceiptUrl;
      if (receiptUrl && (receiptUrl.startsWith('/uploads/') || receiptUrl.startsWith('uploads/'))) {
        totalScanned++;
        const localPath = path.join(process.cwd(), receiptUrl.replace(/^\/+/, ''));
        
        if (fs.existsSync(localPath)) {
          try {
            const ext = path.extname(receiptUrl).toLowerCase() || '.jpg';
            const r2Key = buildR2Key({
              academicYear,
              branchCode,
              studentName,
              applicationNumber: appNum,
              mappedDocName: 'AdmissionFeesReceipt',
              ext,
            });

            console.log(`[Migrating Fee Receipt] ${localPath} -> R2: ${r2Key}`);

            let mimeType = 'image/jpeg';
            if (ext === '.pdf') mimeType = 'application/pdf';
            else if (ext === '.png') mimeType = 'image/png';

            await r2.uploadFromDisk(localPath, r2Key, mimeType);
            await admission.update({ admissionFeeReceiptUrl: r2Key });
            totalMigrated++;
          } catch (err: any) {
            console.error(`❌ Failed to migrate fee receipt ${localPath}:`, err.message);
            totalFailed++;
          }
        } else {
          console.warn(`⚠️ Local fee receipt not found, skipping: ${localPath}`);
          totalSkipped++;
        }
      } else if (receiptUrl) {
        totalSkipped++;
      }
    }

    console.log('\n====================================================');
    console.log('📊 MIGRATION RUN SUMMARY REPORT');
    console.log('====================================================');
    console.log(`   • Total Scanned Local Files : ${totalScanned}`);
    console.log(`   • Successfully Migrated     : ${totalMigrated}`);
    console.log(`   • Skipped (Missing/R2)      : ${totalSkipped}`);
    console.log(`   • Migration Failures        : ${totalFailed}`);
    console.log('====================================================');
    console.log('✨ MIGRATION PIPELINE PROCESS COMPLETED');
    console.log('====================================================\n');
    process.exit(0);

  } catch (err: any) {
    console.error('❌ Migration failed to run:', err.message);
    process.exit(1);
  }
}

runMigration();
