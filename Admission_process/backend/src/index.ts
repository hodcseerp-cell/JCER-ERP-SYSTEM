// Trigger watch reload 
import app from './app';
import sequelize, { getSafeDatabaseTargetInfo } from './config/database';
import { initRedis } from './config/redis';

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // 1. Authenticate PostgreSQL database connection
    console.log(`Connecting to PostgreSQL (${getSafeDatabaseTargetInfo()})...`);
    await sequelize.authenticate();
    console.log('PostgreSQL connected successfully.');

    // 2. Initialize Redis connection
    await initRedis();
    
    // Run safe, non-destructive schema synchronization queries on server startup (Production & Development)
    // Pre-cast: fix audit_logs.details column type before sync tries to alter it.
    // PostgreSQL cannot automatically cast TEXT -> JSON; we must specify USING.
    try {
      await sequelize.query(`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'audit_logs' AND column_name = 'details'
              AND data_type <> 'json' AND data_type <> 'jsonb'
          ) THEN
            ALTER TABLE "audit_logs" ALTER COLUMN "details" TYPE JSON USING "details"::json;
          END IF;
        END
        $$;
      `);
    } catch (castErr: any) {
      console.warn('Pre-cast migration for audit_logs.details skipped:', castErr.message);
    }

    // Pre-cast: fix admission_parent_details.fatherAnnualIncome column type to DECIMAL(38, 2).
    try {
      await sequelize.query(`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'admission_parent_details' AND column_name = 'fatherAnnualIncome'
          ) THEN
            ALTER TABLE "admission_parent_details" ALTER COLUMN "fatherAnnualIncome" TYPE DECIMAL(38, 2)
            USING (
              CASE 
                WHEN "fatherAnnualIncome" IS NULL THEN NULL
                WHEN TRIM("fatherAnnualIncome"::text) = '' THEN NULL
                WHEN TRIM(regexp_replace("fatherAnnualIncome"::text, '[^-0-9.]', '', 'g')) = '' THEN NULL
                ELSE TRIM(regexp_replace("fatherAnnualIncome"::text, '[^-0-9.]', '', 'g'))::numeric(38, 2)
              END
            );
          END IF;
        END
        $$;
      `);
    } catch (castErr: any) {
      console.warn('Pre-cast migration for admission_parent_details.fatherAnnualIncome skipped:', castErr.message);
    }

    // Pre-cast: fix parents.annualIncome column type to DECIMAL(38, 2).
    try {
      await sequelize.query(`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'parents' AND column_name = 'annualIncome'
          ) THEN
            ALTER TABLE "parents" ALTER COLUMN "annualIncome" TYPE DECIMAL(38, 2)
            USING (
              CASE 
                WHEN "annualIncome" IS NULL THEN NULL
                WHEN TRIM("annualIncome"::text) = '' THEN NULL
                WHEN TRIM(regexp_replace("annualIncome"::text, '[^-0-9.]', '', 'g')) = '' THEN NULL
                ELSE TRIM(regexp_replace("annualIncome"::text, '[^-0-9.]', '', 'g'))::numeric(38, 2)
              END
            );
          END IF;
        END
        $$;
      `);
    } catch (castErr: any) {
      console.warn('Pre-cast migration for parents.annualIncome skipped:', castErr.message);
    }

    // Pre-cast: fix admission_academic_details percentage columns type.
    try {
      const percentageCols = ['tenthPercentage', 'twelfthPercentage', 'diplomaPercentage'];
      for (const col of percentageCols) {
        await sequelize.query(`
          DO $$
          BEGIN
            IF EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_name = 'admission_academic_details' AND column_name = '${col}'
                AND data_type NOT IN ('numeric', 'decimal', 'double precision', 'real')
            ) THEN
              ALTER TABLE "admission_academic_details" ALTER COLUMN "${col}" TYPE DECIMAL(5, 2)
              USING (
                CASE 
                  WHEN "${col}" IS NULL THEN NULL
                  WHEN TRIM("${col}"::text) = '' THEN NULL
                  WHEN TRIM(regexp_replace("${col}"::text, '[^-0-9.]', '', 'g')) = '' THEN NULL
                  ELSE TRIM(regexp_replace("${col}"::text, '[^-0-9.]', '', 'g'))::numeric(5, 2)
                END
              );
            END IF;
          END
          $$;
        `);
      }
    } catch (castErr: any) {
      console.warn('Pre-cast migration for admission_academic_details percentages skipped:', castErr.message);
    }

    // Pre-cast: ensure admission_addresses has taluk and district columns
    try {
      const addressCols = ['currentTaluk', 'currentDistrict', 'currentDistrictId', 'permanentTaluk', 'permanentDistrict', 'permanentDistrictId'];
      for (const col of addressCols) {
        await sequelize.query(`
          DO $$
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_name = 'admission_addresses' AND column_name = '${col}'
            ) THEN
              ALTER TABLE "admission_addresses" ADD COLUMN "${col}" VARCHAR(100);
            END IF;
          END
          $$;
        `);
      }
    } catch (castErr: any) {
      console.warn('Pre-cast migration for admission_addresses columns skipped:', castErr.message);
    }

    // Pre-cast: fix admission_academic_details integer columns type.
    try {
      const integerCols = [
        'tenthMarksObtained', 'tenthMaxMarks', 'tenthAttempts',
        'physicsMarks', 'mathsMarks', 'chemistryMarks', 'optionalMarks',
        'twelfthMaxMarks', 'twelfthAggregate', 'twelfthAttempts',
        'diplomaFinalYearMaxMarks', 'diplomaFinalYearObtained', 'diplomaAttempts',
        'cetScore', 'cetRank', 'cetYear'
      ];
      for (const col of integerCols) {
        await sequelize.query(`
          DO $$
          BEGIN
            IF EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_name = 'admission_academic_details' AND column_name = '${col}'
                AND data_type NOT IN ('integer', 'bigint', 'smallint')
            ) THEN
              ALTER TABLE "admission_academic_details" ALTER COLUMN "${col}" TYPE INTEGER
              USING (
                CASE 
                  WHEN "${col}" IS NULL THEN NULL
                  WHEN TRIM("${col}"::text) = '' THEN NULL
                  WHEN TRIM(regexp_replace("${col}"::text, '[^-0-9.]', '', 'g')) = '' THEN NULL
                  ELSE TRIM(regexp_replace("${col}"::text, '[^-0-9.]', '', 'g'))::numeric::integer
                END
              );
            END IF;
          END
          $$;
        `);
      }
    } catch (castErr: any) {
      console.warn('Pre-cast migration for admission_academic_details integers skipped:', castErr.message);
    }

    // Pre-cast: ensure admissions.qualification column and its ENUM type exist
    try {
      await sequelize.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_admissions_qualification') THEN
            CREATE TYPE "enum_admissions_qualification" AS ENUM ('PUC', 'DIPLOMA');
          END IF;
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'admissions' AND column_name = 'qualification'
          ) THEN
            ALTER TABLE "admissions" ADD COLUMN "qualification" "enum_admissions_qualification";
          END IF;
        END
        $$;
      `);
    } catch (e: any) {
      console.warn('Pre-cast migration for admissions.qualification skipped:', e.message);
    }

    // Pre-cast: ensure admission_documents columns exist
    try {
      await sequelize.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'admission_documents' AND column_name = 'feesPaidReceiptUrl'
          ) THEN
            ALTER TABLE "admission_documents" ADD COLUMN "feesPaidReceiptUrl" VARCHAR(255);
          END IF;
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'admission_documents' AND column_name = 'diplomaSemester5MarksheetUrl'
          ) THEN
            ALTER TABLE "admission_documents" ADD COLUMN "diplomaSemester5MarksheetUrl" VARCHAR(255);
          END IF;
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'admission_documents' AND column_name = 'diplomaSemester6MarksheetUrl'
          ) THEN
            ALTER TABLE "admission_documents" ADD COLUMN "diplomaSemester6MarksheetUrl" VARCHAR(255);
          END IF;
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'system_configurations' AND column_name = 'admissionClosingDate'
          ) THEN
            ALTER TABLE "system_configurations" ADD COLUMN "admissionClosingDate" TIMESTAMPTZ DEFAULT '2026-08-31 23:59:59+00';
          END IF;
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'system_configurations' AND column_name = 'handbookUrl'
          ) THEN
            ALTER TABLE "system_configurations" ADD COLUMN "handbookUrl" VARCHAR(255);
          END IF;
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'admissions' AND column_name = 'applicationFeeStatus'
          ) THEN
            ALTER TABLE "admissions" ADD COLUMN "applicationFeeStatus" VARCHAR(50) DEFAULT 'Pending Payment';
          END IF;
        END
        $$;
      `);
    } catch (e: any) {
      console.warn('Pre-cast migration for system and admission columns skipped:', e.message);
    }

    // Pre-cast: ensure admissions applicationStatus enum has CANCELLATION_REQUESTED and CANCELLED
    try {
      await sequelize.query(`ALTER TYPE "enum_admissions_applicationStatus" ADD VALUE IF NOT EXISTS 'CANCELLATION_REQUESTED'`);
      await sequelize.query(`ALTER TYPE "enum_admissions_applicationStatus" ADD VALUE IF NOT EXISTS 'CANCELLED'`);
      await sequelize.query(`ALTER TYPE "enum_admissions_applicationStatus" ADD VALUE IF NOT EXISTS 'CORRECTION_REQUIRED'`);
      await sequelize.query(`ALTER TYPE "enum_admissions_applicationStatus" ADD VALUE IF NOT EXISTS 'RESUBMITTED'`);
    } catch (e: any) {
      console.warn('Pre-cast migration for admissions applicationStatus enum skipped:', e.message);
    }

    // Pre-cast: ensure admissions correction workflow columns exist
    try {
      await sequelize.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'admissions' AND column_name = 'correctionRequestedSections'
          ) THEN
            ALTER TABLE "admissions" ADD COLUMN "correctionRequestedSections" JSON;
          END IF;
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'admissions' AND column_name = 'correctionRemarks'
          ) THEN
            ALTER TABLE "admissions" ADD COLUMN "correctionRemarks" TEXT;
          END IF;
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'admissions' AND column_name = 'correctionDeadline'
          ) THEN
            ALTER TABLE "admissions" ADD COLUMN "correctionDeadline" TIMESTAMPTZ;
          END IF;
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'admissions' AND column_name = 'correctionRequestedAt'
          ) THEN
            ALTER TABLE "admissions" ADD COLUMN "correctionRequestedAt" TIMESTAMPTZ;
          END IF;
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'admissions' AND column_name = 'correctionRequestedById'
          ) THEN
            ALTER TABLE "admissions" ADD COLUMN "correctionRequestedById" UUID;
          END IF;
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'admissions' AND column_name = 'verifiedDocuments'
          ) THEN
            ALTER TABLE "admissions" ADD COLUMN "verifiedDocuments" JSON;
          END IF;
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'admissions' AND column_name = 'usn'
          ) THEN
            ALTER TABLE "admissions" ADD COLUMN "usn" VARCHAR(50) UNIQUE;
          END IF;
        END
        $$;
      `);
    } catch (e: any) {
      console.warn('Pre-cast migration for admissions correction workflow columns skipped:', e.message);
    }

    // Pre-cast: ensure users.lastActivityAt column and index exist
    try {
      await sequelize.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'users' AND column_name = 'lastActivityAt'
          ) THEN
            ALTER TABLE "users" ADD COLUMN "lastActivityAt" TIMESTAMP WITH TIME ZONE;
          END IF;
          IF NOT EXISTS (
            SELECT 1 FROM pg_indexes
            WHERE tablename = 'users' AND indexname = 'idx_users_last_activity_at'
          ) THEN
            CREATE INDEX "idx_users_last_activity_at" ON "users" ("lastActivityAt");
          END IF;
        END
        $$;
      `);
    } catch (e: any) {
      console.warn('Pre-cast migration for users.lastActivityAt skipped:', e.message);
    }

    // Provisional Admission and system settings column alterations
    try {
      await sequelize.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'system_configurations' AND column_name = 'freshAdmissionOpen'
          ) THEN
            ALTER TABLE "system_configurations" ADD COLUMN "freshAdmissionOpen" BOOLEAN DEFAULT true;
          END IF;
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'system_configurations' AND column_name = 'lateralEntryOpen'
          ) THEN
            ALTER TABLE "system_configurations" ADD COLUMN "lateralEntryOpen" BOOLEAN DEFAULT true;
          END IF;
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'system_configurations' AND column_name = 'provisionalAdmissionOpen'
          ) THEN
            ALTER TABLE "system_configurations" ADD COLUMN "provisionalAdmissionOpen" BOOLEAN DEFAULT true;
          END IF;
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'system_configurations' AND column_name = 'provisionalAdmission3Open'
          ) THEN
            ALTER TABLE "system_configurations" ADD COLUMN "provisionalAdmission3Open" BOOLEAN DEFAULT false;
          END IF;
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'system_configurations' AND column_name = 'provisionalAdmission5Open'
          ) THEN
            ALTER TABLE "system_configurations" ADD COLUMN "provisionalAdmission5Open" BOOLEAN DEFAULT false;
          END IF;
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'system_configurations' AND column_name = 'provisionalAdmission7Open'
          ) THEN
            ALTER TABLE "system_configurations" ADD COLUMN "provisionalAdmission7Open" BOOLEAN DEFAULT false;
          END IF;
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'users' AND column_name = 'registrationType'
          ) THEN
            ALTER TABLE "users" ADD COLUMN "registrationType" VARCHAR(20) DEFAULT 'FRESH';
          END IF;
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'admissions' AND column_name = 'applicationType'
          ) THEN
            ALTER TABLE "admissions" ADD COLUMN "applicationType" VARCHAR(20) DEFAULT 'FRESH';
          END IF;
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'admissions' AND column_name = 'entrySemester'
          ) THEN
            ALTER TABLE "admissions" ADD COLUMN "entrySemester" INTEGER DEFAULT 1;
          END IF;
        END
        $$;
      `);
    } catch (err: any) {
      console.warn('Provisional admission database alterations skipped:', err.message);
    }

    // Academic promotion columns on students table
    try {
      await sequelize.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'students' AND column_name = 'admissionType'
          ) THEN
            ALTER TABLE "students" ADD COLUMN "admissionType" VARCHAR(20) DEFAULT 'FRESH';
          END IF;
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'students' AND column_name = 'initialSemester'
          ) THEN
            ALTER TABLE "students" ADD COLUMN "initialSemester" INTEGER DEFAULT 1;
          END IF;
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'students' AND column_name = 'currentAcademicYear'
          ) THEN
            ALTER TABLE "students" ADD COLUMN "currentAcademicYear" VARCHAR(30) DEFAULT '2026-2027';
          END IF;
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'students' AND column_name = 'lastPromotedAt'
          ) THEN
            ALTER TABLE "students" ADD COLUMN "lastPromotedAt" TIMESTAMP WITH TIME ZONE;
          END IF;
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'students' AND column_name = 'lastPromotedBy'
          ) THEN
            ALTER TABLE "students" ADD COLUMN "lastPromotedBy" UUID;
          END IF;
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE table_name = 'students' AND constraint_name = 'students_lastPromotedBy_fkey'
          ) THEN
            ALTER TABLE "students" 
            ADD CONSTRAINT "students_lastPromotedBy_fkey" 
            FOREIGN KEY ("lastPromotedBy") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
          END IF;
        END
        $$;
      `);
    } catch (err: any) {
      console.warn('Academic promotion database alterations skipped:', err.message);
    }

    // Pre-cast: ensure bulk_export_jobs table exists
    try {
      await sequelize.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_name = 'bulk_export_jobs'
          ) THEN
            CREATE TABLE IF NOT EXISTS "bulk_export_jobs" (
              "id" UUID PRIMARY KEY,
              "createdBy" UUID NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
              "academicYear" VARCHAR(50) NOT NULL,
              "branchId" VARCHAR(100) NOT NULL DEFAULT 'ALL',
              "status" VARCHAR(50) NOT NULL DEFAULT 'QUEUED',
              "totalStudents" INTEGER NOT NULL DEFAULT 0,
              "totalDocuments" INTEGER NOT NULL DEFAULT 0,
              "processedDocuments" INTEGER NOT NULL DEFAULT 0,
              "failedDocuments" INTEGER NOT NULL DEFAULT 0,
              "progress" INTEGER NOT NULL DEFAULT 0,
              "zipObjectKey" VARCHAR(500),
              "zipSize" BIGINT,
              "error" TEXT,
              "failureSummary" JSON,
              "startedAt" TIMESTAMP WITH TIME ZONE,
              "completedAt" TIMESTAMP WITH TIME ZONE,
              "expiresAt" TIMESTAMP WITH TIME ZONE,
              "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
              "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
            );
          END IF;
        END
        $$;
      `);
    } catch (err: any) {
      console.warn('Pre-cast migration for bulk_export_jobs skipped:', err.message);
    }

    // Initialize worker and trigger retention cleanup periodically (every 1 hour)
    try {
      const bulkExportWorker = (await import('./services/bulkExportWorker.service')).default;
      bulkExportWorker.cleanupExpiredJobs();
      setInterval(() => {
        bulkExportWorker.cleanupExpiredJobs();
      }, 60 * 60 * 1000);
    } catch (err: any) {
      console.warn('Bulk export worker retention cleanup init notice:', err.message);
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('Syncing database schema (development alter)...');
      try {
        await sequelize.sync({ alter: true });
      } catch (alterErr: any) {
        console.warn('Sync alter notice (falling back to standard sync):', alterErr.message);
        await sequelize.sync();
      }
    } else {
      console.log('✓ Production mode: Ensuring database schema & tables exist...');
      await sequelize.sync();

      // Auto-seed initial Admin, Principal, Departments, and Rejection Reasons if database is fresh
      try {
        const User = (await import('./models/User')).default;
        const adminCount = await User.count({ where: { role: 'ADMIN' } }).catch(() => 0);
        if (adminCount === 0) {
          console.log('🌱 Unseeded database detected in production. Running initial seed...');
          const { seed } = await import('./seeds/index');
          await seed(false);
          console.log('✅ Initial production database seed completed!');
        }
      } catch (seedErr: any) {
        console.warn('⚠️ Production auto-seed notice:', seedErr.message);
      }
    }
    
    // Alter PostgreSQL enum values for Principal actions if they are missing
    try {
      const enumValues = [
        'PRINCIPAL_APPROVED_ADMISSION',
        'PRINCIPAL_REJECTED_ADMISSION',
        'PRINCIPAL_APPROVED_BUDGET',
        'PRINCIPAL_REJECTED_BUDGET',
        'PRINCIPAL_APPROVED_LEAVE',
        'PRINCIPAL_REJECTED_LEAVE',
        'PRINCIPAL_APPROVED_CURRICULUM_CHANGE',
        'PRINCIPAL_REJECTED_CURRICULUM_CHANGE',
        'PRINCIPAL_APPROVED_EVALUATION',
        'PRINCIPAL_REJECTED_EVALUATION',
        'PRINCIPAL_DECIDED_FEE_WAIVER'
      ];
      for (const val of enumValues) {
        await sequelize.query(`ALTER TYPE "enum_audit_logs_action" ADD VALUE IF NOT EXISTS '${val}'`).catch(() => {
          // ADD VALUE IF NOT EXISTS works in PG, catch dialect errors
        });
      }
      console.log('✓ Audit log enum migration verified.');
    } catch (e: any) {
      console.log('ENUM migration skipped:', e.message);
    }

    try {
      await sequelize.query(`ALTER TYPE "enum_otps_purpose" ADD VALUE IF NOT EXISTS 'EMAIL_CHANGE'`).catch(() => {});
    } catch (e: any) {
      // ignore
    }

    // Alter PostgreSQL enum values for Admission Category if they are missing
    try {
      const categoryEnumValues = ['C1', '2A', '2B', '3A', '3B'];
      for (const val of categoryEnumValues) {
        await sequelize.query(`ALTER TYPE "enum_admission_personal_details_category" ADD VALUE IF NOT EXISTS '${val}'`).catch(() => {
          // ADD VALUE IF NOT EXISTS works in PG, catch dialect errors
        });
      }
      console.log('✓ Admission category enum migration verified.');
    } catch (e: any) {
      console.log('Admission category ENUM migration skipped:', e.message);
    }

    // Automatically update the department name from 'Information Science & Engineering' to 'Computer Science & Engineering (AIML)' if it exists
    try {
      await sequelize.query(`
        UPDATE "departments" 
        SET "name" = 'Computer Science & Engineering (AIML)', "code" = 'CSE-AIML' 
        WHERE "name" = 'Information Science & Engineering' OR "code" = 'ISE'
      `);
      console.log('✓ Department name updated to Computer Science & Engineering (AIML) in database.');
    } catch (e: any) {
      console.log('Department migration check skipped/failed:', e.message);
    }

    // Automatically update Civil Engineering code from CE to CV if it exists
    try {
      await sequelize.query(`
        UPDATE "departments" 
        SET "code" = 'CV' 
        WHERE "code" = 'CE' OR "name" = 'Civil Engineering'
      `);
      console.log('✓ Civil Engineering department code updated from CE to CV in database.');
    } catch (e: any) {
      console.log('Civil Engineering department migration check skipped/failed:', e.message);
    }

    // Pre-cast: ensure twelfthStream defaults to 'SCIENCE' if null/empty
    try {
      await sequelize.query(`
        UPDATE "admission_academic_details" 
        SET "twelfthStream" = 'SCIENCE' 
        WHERE "twelfthStream" IS NULL OR "twelfthStream" = ''
      `);
      console.log('✓ Legacy twelfthStream null columns updated to SCIENCE.');
    } catch (e: any) {
      console.log('twelfthStream update check skipped/failed:', e.message);
    }
    
    // Invalidate Redis/In-memory cache on startup in development to prevent stale caches
    if (process.env.NODE_ENV === 'development') {
      try {
        const { default: redisClient } = await import('./config/redis');
        if (redisClient) {
          if (typeof redisClient.flushall === 'function') {
            await redisClient.flushall();
            console.log('✓ Redis cache flushed on startup.');
          } else if (typeof redisClient.flushDb === 'function') {
            await redisClient.flushDb();
            console.log('✓ Redis cache flushed on startup.');
          } else {
            console.log('✓ In-memory/Redis fallback cache reset.');
          }
        }
      } catch (cacheErr: any) {
        console.warn('Could not flush Redis cache on startup:', cacheErr.message);
      }
    }
    
    // Force load the new Provisional Admission models
    try {
      await import('./models/ProvisionalAdmission');
      await import('./models/ProvisionalAdmissionSemesterRecord');
      await import('./models/ProvisionalAdmissionDocument');
      await import('./models/PromotionBatch');
      await import('./models/StudentPromotionHistory');
      console.log('✓ Provisional & Promotion models loaded.');
    } catch (err: any) {
      console.warn('Failed to load Provisional & Promotion models:', err.message);
    }

    // Auto-seed database if no Admin accounts exist
    try {
      const { default: User } = await import('./models/User');
      const adminCount = await User.count({ where: { role: 'ADMIN' } });
      if (adminCount === 0) {
        console.log('No Admin user found. Running automatic database seed...');
        const { seed } = await import('./seeds/index');
        await seed(false);
      } else {
        console.log('✓ Database already seeded (Admin user found).');
      }
    } catch (seedErr: any) {
      console.warn('Seeding check failed or skipped:', seedErr.message);
    }

    // Run Database Row-Level Security (RLS) setup if enabled
    if (process.env.DB_RLS_ENABLED === 'true') {
      console.log('Row-Level Security (RLS) is enabled, but setup utility is not present.');
    }

    // Print beautiful features startup validation banner
    try {
      const { default: SystemConfiguration } = await import('./models/SystemConfiguration');
      const config = await SystemConfiguration.findOne();
      const dbFeatures = config?.features || {};
      const keys = ['admission', 'admin', 'principal', 'student', 'teacher', 'hod', 'parent', 'fees', 'library', 'placement', 'hostel', 'grievances'];
      
      console.log('\n--------------------------------------------------');
      console.log(`JCER ERP SYSTEM — STARTUP FEATURE VALIDATION`);
      console.log(`Deployment Profile: [${process.env.DEPLOYMENT_PROFILE || 'admission-only'}]`);
      console.log(`Node Environment:   [${process.env.NODE_ENV || 'development'}]`);
      console.log('--------------------------------------------------');
      
      for (const key of keys) {
        const envKey = `FEATURE_${key.toUpperCase()}`;
        const envVal = process.env[envKey];
        let isEnabled = false;
        let source = 'DEFAULT';
        
        if (envVal !== undefined) {
          isEnabled = envVal === 'true';
          source = 'ENV_VAR';
        } else {
          isEnabled = !!dbFeatures[key];
          source = 'DATABASE';
        }
        
        const statusText = isEnabled ? '✔ ENABLED ' : '✖ DISABLED';
        const padding = 15 - key.length;
        const nameLabel = key.charAt(0).toUpperCase() + key.slice(1);
        console.log(`${nameLabel}:${' '.repeat(padding)} [${statusText}] (Source: ${source})`);
      }
      console.log('--------------------------------------------------\n');
    } catch (e: any) {
      console.warn('Startup feature validation banner failed:', e.message);
    }

    const portNum = typeof PORT === 'string' ? parseInt(PORT, 10) : PORT;
    app.listen(portNum, '0.0.0.0', () => {
      console.log(`Server listening on port ${portNum}.`);
    });
  } catch (error) {
    console.error('Unable to start the application server:', error);
    process.exit(1);
  }
}

startServer();
