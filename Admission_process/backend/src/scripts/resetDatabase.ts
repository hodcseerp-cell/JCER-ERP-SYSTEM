import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

import db from '../config/database';
import User from '../models/User';
import Admission from '../models/Admission';
import AdmissionDocument from '../models/AdmissionDocument';
import AdmissionAcademicDetail from '../models/AdmissionAcademicDetail';
import AdmissionAddress from '../models/AdmissionAddress';
import AdmissionParentDetail from '../models/AdmissionParentDetail';
import AdmissionPersonalDetail from '../models/AdmissionPersonalDetail';
import AdmissionSequence from '../models/AdmissionSequence';
import AuditLog from '../models/AuditLog';
import Notification from '../models/Notification';
import Otp from '../models/Otp';
import Parent from '../models/Parent';
import Student from '../models/Student';
import Teacher from '../models/Teacher';
import HOD from '../models/HOD';
import Fee from '../models/Fee';
import UsnRegistry from '../models/UsnRegistry';
import SystemConfiguration from '../models/SystemConfiguration';
import redisClient from '../config/redis';
import { Op } from 'sequelize';

/**
 * Recursive function to delete all files in a folder while preserving folder structure.
 */
function cleanDirectoryFiles(dirPath: string): { filesDeleted: number; foldersCleaned: number } {
  let filesDeleted = 0;
  let foldersCleaned = 0;

  if (!fs.existsSync(dirPath)) {
    return { filesDeleted, foldersCleaned };
  }

  const items = fs.readdirSync(dirPath);
  for (const item of items) {
    if (item === '.gitkeep') continue;
    const fullPath = path.join(dirPath, item);
    const stat = fs.lstatSync(fullPath);

    if (stat.isDirectory()) {
      foldersCleaned++;
      const sub = cleanDirectoryFiles(fullPath);
      filesDeleted += sub.filesDeleted;
      foldersCleaned += sub.foldersCleaned;
    } else if (stat.isFile()) {
      fs.unlinkSync(fullPath);
      filesDeleted++;
    }
  }

  return { filesDeleted, foldersCleaned };
}

async function resetDatabase() {
  console.log('\n====================================================');
  console.log('🚀 STARTING ONE-TIME DATABASE & STORAGE RESET');
  console.log('====================================================\n');

  const tableSummary: Array<{ table: string; deletedCount: number }> = [];

  try {
    await db.authenticate();
    console.log('✓ Database connected successfully.');

    const transaction = await db.transaction();

    try {
      console.log('🔒 Disabling Foreign Key Checks for atomic cleanup...');
      const dialect = db.getDialect();
      if (dialect === 'mysql' || dialect === 'mariadb') {
        await db.query('SET FOREIGN_KEY_CHECKS = 0;', { transaction });
      } else if (dialect === 'postgres') {
        await db.query('SET CONSTRAINTS ALL DEFERRED;', { transaction });
      } else if (dialect === 'sqlite') {
        await db.query('PRAGMA foreign_keys = OFF;', { transaction });
      }

      // 1. Delete Admission Child Details
      const deletedDocs = await AdmissionDocument.destroy({ where: {}, transaction });
      tableSummary.push({ table: 'admission_documents', deletedCount: deletedDocs });

      const deletedAcad = await AdmissionAcademicDetail.destroy({ where: {}, transaction });
      tableSummary.push({ table: 'admission_academic_details', deletedCount: deletedAcad });

      const deletedAddr = await AdmissionAddress.destroy({ where: {}, transaction });
      tableSummary.push({ table: 'admission_addresses', deletedCount: deletedAddr });

      const deletedParentDet = await AdmissionParentDetail.destroy({ where: {}, transaction });
      tableSummary.push({ table: 'admission_parent_details', deletedCount: deletedParentDet });

      const deletedPersDet = await AdmissionPersonalDetail.destroy({ where: {}, transaction });
      tableSummary.push({ table: 'admission_personal_details', deletedCount: deletedPersDet });

      // 2. Delete Fees & Admissions
      const deletedFees = await Fee.destroy({ where: {}, transaction });
      tableSummary.push({ table: 'fees', deletedCount: deletedFees });

      const deletedAdmissions = await Admission.destroy({ where: {}, transaction });
      tableSummary.push({ table: 'admissions', deletedCount: deletedAdmissions });

      // 3. Reset Admission Sequences
      const deletedSeq = await AdmissionSequence.destroy({ where: {}, transaction });
      tableSummary.push({ table: 'admission_sequences', deletedCount: deletedSeq });

      // 4. Delete Profiles & Role Entities
      const deletedStudents = await Student.destroy({ where: {}, transaction });
      tableSummary.push({ table: 'students', deletedCount: deletedStudents });

      const deletedParents = await Parent.destroy({ where: {}, transaction });
      tableSummary.push({ table: 'parents', deletedCount: deletedParents });

      const deletedTeachers = await Teacher.destroy({ where: {}, transaction });
      tableSummary.push({ table: 'teachers', deletedCount: deletedTeachers });

      const deletedHODs = await HOD.destroy({ where: {}, transaction });
      tableSummary.push({ table: 'hods', deletedCount: deletedHODs });

      // 5. Delete Operational Logs & Registries
      const deletedOtps = await Otp.destroy({ where: {}, transaction });
      tableSummary.push({ table: 'otps', deletedCount: deletedOtps });

      const deletedNotifs = await Notification.destroy({ where: {}, transaction });
      tableSummary.push({ table: 'notifications', deletedCount: deletedNotifs });

      const deletedAudits = await AuditLog.destroy({ where: {}, transaction });
      tableSummary.push({ table: 'audit_logs', deletedCount: deletedAudits });

      const deletedUsn = await UsnRegistry.destroy({ where: {}, transaction });
      tableSummary.push({ table: 'usn_registries', deletedCount: deletedUsn });

      // 6. Delete Users EXCEPT Admin & Principal
      const deletedUsers = await User.destroy({
        where: {
          role: {
            [Op.notIn]: ['ADMIN', 'SUPER_ADMIN', 'PRINCIPAL']
          }
        },
        transaction
      });
      tableSummary.push({ table: 'users (Student/Staff/HOD/Teacher)', deletedCount: deletedUsers });

      // Re-enable Foreign Key Checks
      if (dialect === 'mysql' || dialect === 'mariadb') {
        await db.query('SET FOREIGN_KEY_CHECKS = 1;', { transaction });
      } else if (dialect === 'sqlite') {
        await db.query('PRAGMA foreign_keys = ON;', { transaction });
      }

      await transaction.commit();
      console.log('✓ Transaction committed successfully.');
    } catch (err) {
      await transaction.rollback();
      console.error('❌ Deletion transaction failed. Rolled back all changes.');
      throw err;
    }

    // 7. Clean Storage Upload Folders (Files only, keep directories)
    console.log('\n📂 Cleaning Upload Folders...');
    const uploadsRoot = path.resolve(process.cwd(), 'uploads');
    const storageStats = cleanDirectoryFiles(uploadsRoot);
    console.log(`✓ Deleted ${storageStats.filesDeleted} file(s) across storage directories.`);

    // 8. Flush Redis Cache
    try {
      if (redisClient && typeof redisClient.flushall === 'function') {
        await redisClient.flushall();
        console.log('✓ Redis cache flushed successfully.');
      }
    } catch (redisErr: any) {
      console.warn('⚠️ Redis flush skipped:', redisErr.message);
    }

    // 9. Fetch Remaining Preserved System Data & System Configuration
    const preservedUsers = await User.findAll({
      attributes: ['id', 'email', 'firstName', 'lastName', 'role']
    });

    const sysConfig = await SystemConfiguration.findOne();

    // 10. Print Detailed Report
    console.log('\n====================================================');
    console.log('📊 DATABASE CLEANUP & RESET REPORT');
    console.log('====================================================');

    console.log('\n1. Tables Cleaned & Rows Deleted:');
    tableSummary.forEach(item => {
      console.log(`   • ${item.table.padEnd(42, ' ')} : ${item.deletedCount} row(s) deleted`);
    });

    console.log('\n2. Preserved Administrative Users:');
    preservedUsers.forEach(u => {
      console.log(`   ✔ [${u.role}] ${u.firstName || ''} ${u.lastName || ''} (${u.email})`);
    });

    console.log('\n3. Preserved Master Configurations:');
    console.log(`   ✔ College Name  : ${sysConfig?.collegeName || 'Jain College of Engineering & Research'}`);
    console.log(`   ✔ Academic Year : ${sysConfig?.admissionCycle || '2026-2027'}`);
    console.log(`   ✔ Admission Status: ${sysConfig?.admissionOpen ? 'OPEN' : 'CLOSED'}`);

    console.log('\n4. Admission Sequence Status:');
    console.log(`   ✔ Sequence Reset : AdmissionSequence table emptied. Next admission sequence starts at 00001.`);

    console.log('\n5. Storage Status:');
    console.log(`   ✔ Files Removed : ${storageStats.filesDeleted} file(s) deleted. Upload directory structure preserved.`);

    console.log('\n====================================================');
    console.log('✨ SYSTEM RESET COMPLETED SUCCESSFULLY');
    console.log('The system is ready for fresh production/demo testing.');
    console.log('====================================================\n');

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Reset script failed:', error);
    process.exit(1);
  }
}

resetDatabase();
