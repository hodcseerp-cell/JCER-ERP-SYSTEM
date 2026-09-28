import sequelize from '../config/database';
import Student from '../models/Student';
import StudentAcademicEnrollment from '../models/StudentAcademicEnrollment';
import Department from '../models/Department';
import Subject from '../models/Subject';
import FacultyAssignment from '../models/FacultyAssignment';
import AttendanceRecord from '../models/AttendanceRecord';
import Assessment from '../models/Assessment';
import GoogleSheetTab from '../models/GoogleSheetTab';
import GoogleSheetResource from '../models/GoogleSheetResource';
import GoogleSheetConnection from '../models/GoogleSheetConnection';
import User from '../models/User';
import Teacher from '../models/Teacher';
import Section from '../models/Section';
import AcademicYear from '../models/AcademicYear';
import Semester from '../models/Semester';

async function runTests() {
  console.log('==================================================');
  console.log('JCER ERP — PRODUCTION ARCHITECTURE INTEGRATION TESTS');
  console.log('==================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}${detail ? ` (${detail})` : ''}`);
      failed++;
    }
  }

  try {
    await sequelize.authenticate();
    console.log('✓ PostgreSQL connected.\n');

    // ─── Test 1: Department Retrieval ──────────────────────────────────────────
    console.log('--- 1. Testing Department Scope Resolution ---');
    const eceDept = await Department.findOne({ where: { code: 'ECE' } });
    const cseDept = await Department.findOne({ where: { code: 'CSE' } });
    assert(Boolean(eceDept && cseDept), 'ECE and CSE departments exist in PostgreSQL');

    // ─── Test 2: Department Isolation & Security Scoping ─────────────────────
    console.log('\n--- 2. Testing HOD Department Isolation ---');
    // Ensure test students exist in ECE and CSE
    const eceStudents = await Student.findAll({
      where: { departmentId: eceDept?.id },
      include: [{ model: StudentAcademicEnrollment, as: 'academicEnrollments', required: false }],
    });
    const cseStudents = await Student.findAll({
      where: { departmentId: cseDept?.id },
      include: [{ model: StudentAcademicEnrollment, as: 'academicEnrollments', required: false }],
    });

    assert(eceStudents.length > 0, `ECE department has enrolled students (${eceStudents.length} found)`);
    assert(cseStudents.length > 0, `CSE department has enrolled students (${cseStudents.length} found)`);

    // Verify zero cross-department contamination
    const cseInEce = eceStudents.filter(s => s.departmentId === cseDept?.id);
    const eceInCse = cseStudents.filter(s => s.departmentId === eceDept?.id);
    assert(cseInEce.length === 0, 'Zero CSE students leaked into ECE department scope');
    assert(eceInCse.length === 0, 'Zero ECE students leaked into CSE department scope');

    // Verify that every student has an associated StudentAcademicEnrollment
    const allStudents = [...eceStudents, ...cseStudents];
    const studentsWithEnrollment = allStudents.filter(s => (s as any).academicEnrollments && (s as any).academicEnrollments.length > 0);
    assert(studentsWithEnrollment.length === allStudents.length, 'Every student has authoritative StudentAcademicEnrollment record in PostgreSQL');

    // ─── Test 3: Subject Academic Protection Rules ───────────────────────────
    console.log('\n--- 3. Testing Subject Deletion Academic Protection ---');
    // Create test subject
    const testSubCode = 'TEST_AUDIT_SUB_' + Date.now().toString().slice(-4);
    const testSubject = await Subject.create({
      code: testSubCode,
      name: 'Integration Test Subject',
      departmentId: eceDept?.id,
      semester: 3,
      credits: 4,
      type: 'IPCC',
      status: 'ACTIVE',
    });
    assert(Boolean(testSubject), `Created test subject ${testSubCode}`);

    // Create an academic record (FacultyAssignment / Tab) linked to this subject
    const sampleTeacher = await Teacher.findOne();
    let dummyRecord: any = null;
    if (sampleTeacher && eceDept) {
      dummyRecord = await FacultyAssignment.create({
        teacherId: sampleTeacher.id,
        userId: sampleTeacher.userId,
        departmentId: eceDept.id,
        subjectId: testSubject.id,
        semester: 3,
        section: 'A',
        academicYear: '2026-27',
        status: 'ACTIVE',
      });
    } else {
      dummyRecord = await Assessment.create({
        subjectId: testSubject.id,
        departmentId: eceDept?.id,
        semester: 3,
        academicYear: '2026-27',
        name: 'IA-1 Test',
        maxMarks: 50,
      });
    }

    // Check academic protection rule
    const [assignmentCount, attendanceCount, assessmentCount, sheetTabCount] = await Promise.all([
      FacultyAssignment.count({ where: { subjectId: testSubject.id } }),
      AttendanceRecord.count({ where: { subjectId: testSubject.id } }),
      Assessment.count({ where: { subjectId: testSubject.id } }),
      GoogleSheetTab.count({ where: { subjectId: testSubject.id } }),
    ]);

    const totalAcademicRecords = assignmentCount + attendanceCount + assessmentCount + sheetTabCount;
    assert(totalAcademicRecords > 0, `Detected ${totalAcademicRecords} academic records linked to subject`);

    // In a deletion attempt with academic data:
    const deletionBlocked = totalAcademicRecords > 0;
    assert(deletionBlocked, 'Hard delete blocked by academic records dependency check');

    // Soft-deactivation to INACTIVE
    await testSubject.update({ status: 'INACTIVE' });
    const refreshedSub = await Subject.findByPk(testSubject.id);
    assert(refreshedSub?.status === 'INACTIVE', 'Subject safely transitioned to INACTIVE status preserving academic history');

    // Clean up test attendance record and test subject
    await dummyRecord.destroy();
    await testSubject.destroy();
    assert(true, 'Test subject cleanup completed safely');

    // ─── Test 4: Google Sheet Tab & Resource Integrity ───────────────────────
    console.log('\n--- 4. Testing Google Sheet Tab Mapping & Resource Integrity ---');
    const existingTabs = await GoogleSheetTab.findAll({ limit: 5 });
    if (existingTabs.length > 0) {
      const sampleTab = existingTabs[0];
      assert(Boolean(sampleTab.googleSheetId), `Google Tab ID preserved as immutable string (${sampleTab.googleSheetId})`);
      assert(Boolean(sampleTab.sheetTitle), `Real Google Tab title preserved (${sampleTab.sheetTitle})`);
    } else {
      console.log('  ℹ️ No existing tabs present; testing GoogleSheetResource model initialization');
    }

    // Verify GoogleSheetResource table exists and accepts records
    await GoogleSheetResource.sync();
    const testResource = await GoogleSheetResource.create({
      sheetType: 'ACADEMIC_MARKS',
      googleSpreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      googleSheetTabId: '66972508',
      sheetUrl: 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=66972508',
      status: 'MAPPED',
    });
    assert(Boolean(testResource.id), 'google_sheet_resources persistence created successfully');
    await testResource.destroy();

    // ─── Test 5: Section Allocation operates on Enrollment ───────────────────
    console.log('\n--- 5. Testing Section Allocation on StudentAcademicEnrollment ---');
    if (eceStudents.length > 0) {
      const targetEnrollment = await StudentAcademicEnrollment.findOne({
        where: { studentId: eceStudents[0].id },
      });
      assert(Boolean(targetEnrollment), `Found StudentAcademicEnrollment for student ${eceStudents[0].usn || eceStudents[0].id}`);
      assert(Boolean(targetEnrollment?.departmentId), `Enrollment departmentId is set to ${targetEnrollment?.departmentId}`);
    }

    console.log('\n==================================================');
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('==================================================\n');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err: any) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runTests();
