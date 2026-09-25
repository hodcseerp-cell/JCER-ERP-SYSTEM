import { Request, Response, NextFunction } from 'express';
import * as XLSX from 'xlsx';
import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import db from '../config/database';
import User from '../models/User';
import Student from '../models/Student';
import Department from '../models/Department';
import AcademicYear from '../models/AcademicYear';
import Section from '../models/Section';
import UsnRegistry from '../models/UsnRegistry';
import AuditLog from '../models/AuditLog';
import ExistingStudentOnboardingBatch from '../models/ExistingStudentOnboardingBatch';
import logger from '../utils/logger.util';

interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
    email?: string;
  };
}

// VTU department code aliases
const VTU_ALIASES: Record<string, string> = {
  'CI': 'CSE-AIML',
  'CS': 'CSE',
  'EC': 'ECE',
  'CV': 'CV',
  'ME': 'ME',
  'IS': 'ISE',
  'CD': 'CSE-DS',
  'CB': 'CSBS',
  'EE': 'EEE',
};

/**
 * GET /api/admin/onboarding/existing-students/context
 * Returns academic context parameters (Academic Years, Schemes, Departments, Semesters, Sections)
 */
export const getOnboardingContext = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const departments = await Department.findAll({
      order: [['name', 'ASC']],
      attributes: ['id', 'name', 'code'],
    });

    const academicYearsData = await AcademicYear.findAll({
      order: [['year', 'DESC']],
      attributes: ['id', 'year', 'status', 'isCurrent'],
    }).catch(() => []);

    const sectionsData = await Section.findAll({
      where: { status: 'ACTIVE' },
      attributes: ['id', 'name', 'semester', 'academicYear', 'departmentId'],
      order: [['name', 'ASC']],
    }).catch(() => []);

    // Fallback standard years if table is empty
    const defaultYears = ['2026-2027', '2025-2026', '2024-2025', '2023-2024', '2022-2023'];
    const academicYears = academicYearsData.length > 0 
      ? academicYearsData.map((y: any) => y.year) 
      : defaultYears;

    const schemes = ['2025', '2022', '2021', '2018', '2017', '2015'];
    const semesters = [1, 2, 3, 4, 5, 6, 7, 8];
    const sections = ['A', 'B', 'C', 'D', 'E'];

    return res.json({
      success: true,
      data: {
        departments,
        academicYears: Array.from(new Set([...academicYears, ...defaultYears])),
        schemes,
        semesters,
        sections,
        sectionsList: sectionsData,
      },
    });
  } catch (err) {
    logger.error('GET_ONBOARDING_CONTEXT_ERROR:', err);
    return next(err);
  }
};

/**
 * GET /api/admin/onboarding/existing-students/template
 * Generates and downloads standard Excel template for existing student onboarding
 */
export const downloadExistingStudentsTemplate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const headers = [
      'USN',
      'Student Name',
      'Enrollment Number',
      'Department',
      'Scheme',
      'Entry Semester',
      'Current Semester',
      'Section',
      'Roll Number',
      'Academic Year',
      'Admission Type',
      'Date of Birth',
      'Gender',
      'Student Mobile',
      'Student Email',
      'Parent Name',
      'Parent Mobile',
      'Parent Email',
      'Address',
    ];

    const sampleRows = [
      [
        '2JR25CS064',
        'RAGHAV ANAND PATIL',
        '2JR25CS064',
        'CSE',
        '2025',
        1,
        3,
        'A',
        '1',
        '2026-2027',
        'EXISTING',
        '2005-04-15',
        'Male',
        '9876543210',
        'raghav.patil@example.com',
        'Anand Patil',
        '9876543211',
        'anand.patil@example.com',
        'Belagavi, Karnataka',
      ],
      [
        '2JR25CS065',
        'PRIYA SURESH KULKARNI',
        '2JR25CS065',
        'CSE',
        '2025',
        1,
        3,
        'A',
        '2',
        '2026-2027',
        'EXISTING',
        '2005-08-22',
        'Female',
        '9876543212',
        'priya.kulkarni@example.com',
        'Suresh Kulkarni',
        '9876543213',
        'suresh.kulkarni@example.com',
        'Dharwad, Karnataka',
      ],
    ];

    const wsData = [headers, ...sampleRows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    ws['!cols'] = [
      { wch: 15 }, // USN
      { wch: 26 }, // Student Name
      { wch: 18 }, // Enrollment Number
      { wch: 14 }, // Department
      { wch: 10 }, // Scheme
      { wch: 14 }, // Entry Semester
      { wch: 16 }, // Current Semester
      { wch: 10 }, // Section
      { wch: 12 }, // Roll Number
      { wch: 15 }, // Academic Year
      { wch: 16 }, // Admission Type
      { wch: 14 }, // DOB
      { wch: 10 }, // Gender
      { wch: 16 }, // Student Mobile
      { wch: 28 }, // Student Email
      { wch: 22 }, // Parent Name
      { wch: 16 }, // Parent Mobile
      { wch: 28 }, // Parent Email
      { wch: 30 }, // Address
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Existing_Students');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Existing_Student_Onboarding_Template.xlsx"');
    return res.send(buffer);
  } catch (err) {
    logger.error('DOWNLOAD_TEMPLATE_ERROR:', err);
    return next(err);
  }
};

/**
 * Helper to normalize and validate row data
 */
const validateRow = async (
  row: any,
  index: number,
  deptMap: Map<string, Department>,
  seenUSNs: Set<string>,
  seenEnrollments: Set<string>,
  seenEmails: Set<string>,
  context: {
    academicYear?: string;
    scheme?: string;
    semester?: number;
    departmentCode?: string;
    section?: string;
  }
) => {
  const errors: string[] = [];
  const warnings: string[] = [];

  const rawUSN = (row['USN'] || row['usn'] || '').toString().trim().toUpperCase();
  const rawName = (row['Student Name'] || row['studentName'] || row['Name'] || row['name'] || '').toString().trim();
  const rawEnrollment = (row['Enrollment Number'] || row['enrollmentNumber'] || row['EnrollmentNo'] || rawUSN || '').toString().trim().toUpperCase();
  const rawDept = (row['Department'] || row['department'] || row['Branch'] || row['branch'] || context.departmentCode || '').toString().trim().toUpperCase();
  const rawScheme = (row['Scheme'] || row['scheme'] || context.scheme || '2025').toString().trim();
  const rawEntrySem = parseInt(row['Entry Semester'] || row['entrySemester'] || '1', 10);
  const rawCurrentSem = parseInt(row['Current Semester'] || row['currentSemester'] || row['semester'] || context.semester || '3', 10);
  const rawSection = (row['Section'] || row['section'] || context.section || '').toString().trim().toUpperCase();
  const rawRollNumber = (row['Roll Number'] || row['rollNumber'] || row['RollNo'] || '').toString().trim();
  const rawAcademicYear = (row['Academic Year'] || row['academicYear'] || context.academicYear || '2026-2027').toString().trim();
  const rawAdmissionType = (row['Admission Type'] || row['admissionType'] || 'EXISTING').toString().trim().toUpperCase();
  const rawDOB = (row['Date of Birth'] || row['dateOfBirth'] || row['DOB'] || row['dob'] || '').toString().trim();
  const rawGender = (row['Gender'] || row['gender'] || '').toString().trim();
  const rawMobile = (row['Student Mobile'] || row['studentMobile'] || row['Mobile'] || row['phone'] || '').toString().trim();
  const rawEmail = (row['Student Email'] || row['studentEmail'] || row['Email'] || row['email'] || '').toString().trim().toLowerCase();
  const rawParentName = (row['Parent Name'] || row['parentName'] || row['Father Name'] || row['fatherName'] || '').toString().trim();
  const rawParentMobile = (row['Parent Mobile'] || row['parentMobile'] || '').toString().trim();
  const rawParentEmail = (row['Parent Email'] || row['parentEmail'] || '').toString().trim().toLowerCase();
  const rawAddress = (row['Address'] || row['address'] || '').toString().trim();

  // 1. Mandatory Name
  if (!rawName) {
    errors.push('Student Name is required.');
  }

  // 2. USN Validation
  let usn: string | null = rawUSN || null;
  if (usn) {
    if (seenUSNs.has(usn)) {
      errors.push(`Duplicate USN "${usn}" found within the uploaded spreadsheet.`);
    } else {
      seenUSNs.add(usn);
      const existingStudentByUSN = await Student.findOne({ where: { usn } });
      if (existingStudentByUSN) {
        errors.push(`USN "${usn}" already exists in database (Student ID: ${existingStudentByUSN.id}).`);
      }
    }
  } else {
    warnings.push('USN is empty. A valid university USN should be allocated when available.');
  }

  // 3. Enrollment Number Validation
  let enrollmentNumber: string | null = rawEnrollment || usn || null;
  if (enrollmentNumber) {
    if (seenEnrollments.has(enrollmentNumber)) {
      errors.push(`Duplicate Enrollment Number "${enrollmentNumber}" found within file.`);
    } else {
      seenEnrollments.add(enrollmentNumber);
      const existingStudentByEnrollment = await Student.findOne({ where: { enrollmentNumber } });
      if (existingStudentByEnrollment) {
        errors.push(`Enrollment Number "${enrollmentNumber}" already exists in database.`);
      }
    }
  }

  // 4. Email & User Validation
  let email = rawEmail;
  if (!email) {
    if (usn) {
      email = `${usn.toLowerCase()}@jcer.ac.in`;
      warnings.push(`Email was empty; automatically defaulted to "${email}".`);
    } else {
      errors.push('Student Email is required.');
    }
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push(`Invalid email format: "${email}".`);
    }
  }

  if (email) {
    if (seenEmails.has(email)) {
      errors.push(`Duplicate Email "${email}" found within file.`);
    } else {
      seenEmails.add(email);
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        errors.push(`User account with email "${email}" already exists.`);
      }
    }
  }

  // 5. Department Validation
  let department = deptMap.get(rawDept);
  if (!department && rawDept) {
    const aliasCode = VTU_ALIASES[rawDept];
    if (aliasCode) {
      department = deptMap.get(aliasCode);
    }
  }
  if (!department) {
    errors.push(`Department "${rawDept}" is invalid or does not exist.`);
  }

  // 6. Context matching check
  if (context.departmentCode && department && department.code.toUpperCase() !== context.departmentCode.toUpperCase()) {
    warnings.push(`Row department (${department.code}) differs from selected context (${context.departmentCode}).`);
  }
  if (context.academicYear && rawAcademicYear !== context.academicYear) {
    warnings.push(`Row academic year (${rawAcademicYear}) differs from selected context (${context.academicYear}).`);
  }
  if (context.semester && rawCurrentSem !== context.semester) {
    warnings.push(`Row semester (${rawCurrentSem}) differs from selected context (${context.semester}).`);
  }

  // 7. Scheme Validation
  if (!rawScheme) {
    errors.push('Scheme is required (e.g. 2025).');
  }

  // 8. Semesters validation
  if (isNaN(rawCurrentSem) || rawCurrentSem < 1 || rawCurrentSem > 8) {
    errors.push(`Invalid current semester: "${rawCurrentSem}". Must be between 1 and 8.`);
  }
  if (isNaN(rawEntrySem) || rawEntrySem < 1 || rawEntrySem > 8) {
    warnings.push(`Entry semester "${rawEntrySem}" defaulted to 1.`);
  }

  // 9. Admission Type check
  if (rawAdmissionType !== 'EXISTING' && rawAdmissionType !== 'FRESH' && rawAdmissionType !== 'LATERAL') {
    warnings.push(`Admission type "${rawAdmissionType}" mapped to EXISTING.`);
  }

  let dobDate: Date | null = null;
  if (rawDOB) {
    const parsed = new Date(rawDOB);
    if (!isNaN(parsed.getTime())) {
      dobDate = parsed;
    } else {
      warnings.push(`Invalid date format for Date of Birth: "${rawDOB}".`);
    }
  }

  return {
    rowIndex: index + 1,
    status: errors.length > 0 ? 'ERROR' : warnings.length > 0 ? 'WARNING' : 'VALID',
    errors,
    warnings,
    data: {
      usn,
      name: rawName,
      enrollmentNumber: enrollmentNumber || usn,
      departmentId: department?.id || null,
      departmentCode: department?.code || rawDept,
      departmentName: department?.name || rawDept,
      scheme: rawScheme,
      entrySemester: isNaN(rawEntrySem) ? 1 : rawEntrySem,
      currentSemester: isNaN(rawCurrentSem) ? 3 : rawCurrentSem,
      section: rawSection || null,
      rollNumber: rawRollNumber || null,
      academicYear: rawAcademicYear,
      admissionType: 'EXISTING',
      dateOfBirth: dobDate,
      gender: rawGender || null,
      studentMobile: rawMobile || null,
      studentEmail: email,
      parentName: rawParentName || null,
      parentMobile: rawParentMobile || null,
      parentEmail: rawParentEmail || null,
      address: rawAddress || null,
    },
  };
};

/**
 * POST /api/admin/onboarding/existing-students/validate
 * Validates uploaded spreadsheet against academic context & DB rules without persisting
 */
export const validateExistingStudents = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No Excel file provided.' });
    }

    const { academicYear, scheme, semester, departmentCode, section } = req.body;

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return res.status(400).json({ success: false, error: 'Excel file is empty.' });
    }

    const sheet = workbook.Sheets[sheetName];
    const rawRows: any[] = XLSX.utils.sheet_to_json(sheet);

    if (rawRows.length === 0) {
      return res.status(400).json({ success: false, error: 'No student records found in the spreadsheet.' });
    }

    // Cache departments
    const departments = await Department.findAll();
    const deptMap = new Map<string, Department>();
    departments.forEach((d) => {
      deptMap.set(d.code.toUpperCase(), d);
      deptMap.set(d.name.toUpperCase(), d);
    });

    const seenUSNs = new Set<string>();
    const seenEnrollments = new Set<string>();
    const seenEmails = new Set<string>();

    const context = {
      academicYear: academicYear?.trim(),
      scheme: scheme?.trim(),
      semester: semester ? parseInt(semester, 10) : undefined,
      departmentCode: departmentCode?.trim()?.toUpperCase(),
      section: section?.trim()?.toUpperCase(),
    };

    const validatedRows: any[] = [];
    let validCount = 0;
    let warningCount = 0;
    let errorCount = 0;
    let duplicateCount = 0;

    for (let i = 0; i < rawRows.length; i++) {
      const result = await validateRow(rawRows[i], i, deptMap, seenUSNs, seenEnrollments, seenEmails, context);
      if (result.status === 'ERROR') {
        errorCount++;
        if (result.errors.some((e: string) => e.includes('Duplicate') || e.includes('already exists'))) {
          duplicateCount++;
        }
      } else if (result.status === 'WARNING') {
        warningCount++;
        validCount++;
      } else {
        validCount++;
      }
      validatedRows.push(result);
    }

    return res.json({
      success: true,
      data: {
        totalRecords: rawRows.length,
        validRecords: validCount,
        warningCount,
        errorCount,
        duplicateCount,
        canImport: errorCount === 0 && validCount > 0,
        rows: validatedRows,
      },
    });
  } catch (err) {
    logger.error('VALIDATE_EXISTING_STUDENTS_ERROR:', err);
    return next(err);
  }
};

/**
 * POST /api/admin/onboarding/existing-students/import
 * Transactionally creates student records and academic enrollments
 */
export const importExistingStudents = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  const t = await db.transaction();
  try {
    const adminUserId = req.user?.id;
    if (!adminUserId) {
      await t.rollback();
      return res.status(401).json({ success: false, error: 'Unauthorized admin user.' });
    }

    const { fileName, academicYear, scheme, semester, departmentCode, section, records } = req.body;

    if (!Array.isArray(records) || records.length === 0) {
      await t.rollback();
      return res.status(400).json({ success: false, error: 'No validated student records provided for import.' });
    }

    // Cache departments
    const departments = await Department.findAll({ transaction: t });
    const deptMap = new Map<string, Department>();
    departments.forEach((d) => {
      deptMap.set(d.id, d);
      deptMap.set(d.code.toUpperCase(), d);
    });

    const defaultPasswordHash = await bcrypt.hash('password123', 10);
    const createdStudents: any[] = [];
    const failedRows: any[] = [];

    for (let i = 0; i < records.length; i++) {
      const item = records[i];
      try {
        // Resolve department
        let dept = deptMap.get(item.departmentId);
        if (!dept && item.departmentCode) {
          dept = deptMap.get(item.departmentCode.toUpperCase());
        }
        if (!dept) {
          throw new Error(`Department not found for student ${item.name}`);
        }

        const nameParts = (item.name || 'Student').trim().split(/\s+/);
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ') || 'Student';
        const email = (item.studentEmail || `${(item.usn || `stu${Date.now()}`).toLowerCase()}@jcer.ac.in`).trim().toLowerCase();
        const username = item.usn ? item.usn.toLowerCase() : email.split('@')[0];

        // 1. Create User
        const newUser = await User.create(
          {
            username,
            email,
            passwordHash: defaultPasswordHash,
            role: 'STUDENT',
            status: 'ACTIVE',
            firstName,
            lastName,
            phone: item.studentMobile || null,
            profileImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&fit=crop',
            mustChangePassword: true,
          },
          { transaction: t }
        );

        // 2. Create Student Master & Academic Enrollment record
        // (application_number is NULL, no Admission entity is created)
        const batchYear = parseInt(item.scheme || '2025', 10) || new Date().getFullYear();
        const currentSem = Number(item.currentSemester) || 3;
        const entrySem = Number(item.entrySemester) || 1;

        const newStudent = await Student.create(
          {
            userId: newUser.id,
            usn: item.usn ? item.usn.toUpperCase() : null,
            enrollmentNumber: item.enrollmentNumber ? item.enrollmentNumber.toUpperCase() : (item.usn ? item.usn.toUpperCase() : null),
            rollNumber: item.rollNumber || null,
            batchYear,
            scheme: item.scheme || '2025',
            departmentId: dept.id,
            semester: currentSem,
            section: item.section || null,
            currentAcademicYear: item.academicYear || academicYear || '2026-2027',
            initialSemester: entrySem,
            admissionStatus: 'APPROVED',
            admissionType: 'EXISTING',
            gender: item.gender || null,
            dateOfBirth: item.dateOfBirth ? new Date(item.dateOfBirth) : null,
            address: item.address || null,
            fatherName: item.parentName || null,
            motherName: null,
            parentPhone: item.parentMobile || null,
            parentEmail: item.parentEmail || null,
          },
          { transaction: t }
        );

        // 3. If USN registry entry exists, update to CLAIMED
        if (item.usn) {
          await UsnRegistry.update(
            { status: 'CLAIMED' },
            { where: { usn: item.usn.toUpperCase() }, transaction: t }
          );
        }

        createdStudents.push({
          id: newStudent.id,
          usn: newStudent.usn,
          name: `${newUser.firstName} ${newUser.lastName}`.trim(),
          department: dept.code,
          semester: newStudent.semester,
        });
      } catch (err: any) {
        failedRows.push({
          row: i + 1,
          name: item.name,
          usn: item.usn,
          reason: err.message,
        });
      }
    }

    if (failedRows.length > 0 && createdStudents.length === 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        error: 'Failed to import student records.',
        details: failedRows,
      });
    }

    // 4. Create Batch History Record
    let deptId: string | null = null;
    if (departmentCode) {
      const dept = deptMap.get(departmentCode.toUpperCase());
      if (dept) deptId = dept.id;
    }

    const batch = await ExistingStudentOnboardingBatch.create(
      {
        fileName: fileName || `existing_students_${Date.now()}.xlsx`,
        academicYear: academicYear || '2026-2027',
        scheme: scheme || '2025',
        semester: Number(semester) || 3,
        departmentId: deptId,
        departmentCode: departmentCode || 'ALL',
        section: section || 'ALL',
        totalRecords: records.length,
        successfulRecords: createdStudents.length,
        failedRecords: failedRows.length,
        status: failedRows.length === 0 ? 'COMPLETED' : createdStudents.length > 0 ? 'PARTIAL' : 'FAILED',
        importedBy: adminUserId,
        errors: failedRows.length > 0 ? failedRows : null,
      },
      { transaction: t }
    );

    // 5. Create Audit Log
    await AuditLog.create(
      {
        userId: adminUserId,
        action: 'EXISTING_STUDENT_ONBOARDED',
        ipAddress: req.ip || '127.0.0.1',
        userAgent: req.get('user-agent') || 'ERP-Admin',
        details: {
          batchId: batch.id,
          fileName: batch.fileName,
          academicYear: batch.academicYear,
          scheme: batch.scheme,
          semester: batch.semester,
          departmentCode: batch.departmentCode,
          total: records.length,
          successful: createdStudents.length,
          failed: failedRows.length,
        },
      },
      { transaction: t }
    );

    await t.commit();

    return res.json({
      success: true,
      message: `Successfully onboarded ${createdStudents.length} existing students into the ERP system.`,
      data: {
        batchId: batch.id,
        totalImported: createdStudents.length,
        failedCount: failedRows.length,
        createdStudents,
        failedRows,
      },
    });
  } catch (err) {
    await t.rollback();
    logger.error('IMPORT_EXISTING_STUDENTS_ERROR:', err);
    return next(err);
  }
};

/**
 * GET /api/admin/onboarding/existing-students/history
 * Returns list of onboarding batches
 */
export const getOnboardingHistory = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = parseInt((req.query.limit as string) || '10', 10);
    const offset = (page - 1) * limit;

    const { count, rows } = await ExistingStudentOnboardingBatch.findAndCountAll({
      include: [
        {
          model: User,
          as: 'operator',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name', 'code'],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    return res.json({
      success: true,
      data: {
        batches: rows,
        pagination: {
          total: count,
          page,
          totalPages: Math.ceil(count / limit),
          limit,
        },
      },
    });
  } catch (err) {
    logger.error('GET_ONBOARDING_HISTORY_ERROR:', err);
    return next(err);
  }
};
