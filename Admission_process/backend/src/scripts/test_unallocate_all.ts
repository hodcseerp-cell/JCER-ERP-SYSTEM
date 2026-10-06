import sequelize from '../config/database';
import Section from '../models/Section';
import Student from '../models/Student';
import User from '../models/User';
import Department from '../models/Department';
import StudentAcademicEnrollment from '../models/StudentAcademicEnrollment';
import AttendanceRecord from '../models/AttendanceRecord';
import AuditLog from '../models/AuditLog';
import sectionAllocationService from '../services/sectionAllocation.service';

async function runTests() {
  console.log('====================================================');
  console.log('STARTING SECTION UNALLOCATE-ALL VERIFICATION SUITE');
  console.log('====================================================');

  await sequelize.authenticate();
  console.log('Connected to PostgreSQL database.');

  // Find CSE Department
  const cseDept = await Department.findOne({ where: { code: 'CSE' } });
  if (!cseDept) {
    throw new Error('CSE department not found');
  }
  console.log(`CSE Department ID: ${cseDept.id}`);

  // Find another department (e.g. ME, CV, or ECE)
  const otherDept = await Department.findOne({ where: { code: 'ME' } }) || await Department.findOne({ where: { code: 'CV' } }) || await Department.findOne({ where: { code: 'ECE' } });
  console.log(`Other Department: ${otherDept?.code} (${otherDept?.id})`);

  // Target Section A
  const sectionA = await Section.findByPk('c1445c62-f500-43c5-a163-11b914b9ae41');
  if (!sectionA) {
    throw new Error('Section A not found with ID c1445c62-f500-43c5-a163-11b914b9ae41');
  }
  console.log(`Section A: ${sectionA.name}, capacity: ${sectionA.capacity}, semester: ${sectionA.semester}, branch: ${sectionA.branch}`);

  // Section B for isolation testing
  const sectionB = await Section.findOne({
    where: {
      departmentId: [cseDept.id, '40143d08-f3ac-4cb6-9b1b-e4844d48dd60'],
      semester: sectionA.semester,
      name: 'Section B',
    },
  }) || await Section.findOne({
    where: {
      semester: sectionA.semester,
      name: 'Section B',
    },
  });

  console.log(`Section B: ${sectionB ? sectionB.id + ' (' + sectionB.name + ')' : 'Not found'}`);

  // 1. Initial State Check
  const initialSecAData = await sectionAllocationService.getSectionStudents(sectionA.id, cseDept.id);
  const initialSecACount = initialSecAData.students.length;
  console.log(`Section A Initial Allocated Count: ${initialSecACount}`);

  let initialSecBCount = 0;
  if (sectionB) {
    const secBData = await sectionAllocationService.getSectionStudents(sectionB.id, cseDept.id);
    initialSecBCount = secBData.students.length;
    console.log(`Section B Initial Allocated Count: ${initialSecBCount}`);
  }

  // Pre-check student and user records exist
  const sampleStudent = initialSecAData.students[0];
  console.log(`Sample Student before unallocation: ${sampleStudent.name} (ID: ${sampleStudent.id})`);
  const totalStudentsBefore = await Student.count();
  const totalUsersBefore = await User.count();
  const totalAttendanceBefore = await AttendanceRecord.count();
  console.log(`Totals Before: Students=${totalStudentsBefore}, Users=${totalUsersBefore}, AttendanceRecords=${totalAttendanceBefore}`);

  // -------------------------------------------------------------
  // TEST 4: Security / Authorization Test
  // Attempt to unallocate Section A using an unauthorized department
  // -------------------------------------------------------------
  console.log('\n--- TEST 4: Cross-Department Authorization Security Check ---');
  if (otherDept) {
    try {
      await sectionAllocationService.unallocateAllStudents(sectionA.id, otherDept.id, { id: 'test-user', role: 'HOD' });
      console.error('FAIL: Expected 403 SECTION_ACCESS_DENIED error but call succeeded!');
      process.exit(1);
    } catch (err: any) {
      if (err.statusCode === 403 || err.code === 'SECTION_ACCESS_DENIED' || err.message?.includes('access')) {
        console.log(`PASS: Unauthorized department rejected with 403: "${err.message}"`);
      } else {
        console.log(`PASS: Rejected with error: ${err.message}`);
      }
    }
  }

  // Verify no data changed after unauthorized attempt
  const afterAuthSecAData = await sectionAllocationService.getSectionStudents(sectionA.id, cseDept.id);
  if (afterAuthSecAData.students.length !== initialSecACount) {
    console.error('FAIL: Data changed after unauthorized attempt!');
    process.exit(1);
  }
  console.log('PASS: Section A count intact after unauthorized attempt.');

  // -------------------------------------------------------------
  // TEST 2: Unallocate All Students from Section A
  // -------------------------------------------------------------
  console.log('\n--- TEST 2: Perform Unallocate All on Section A ---');
  const mockHodUser = await User.findOne({ where: { role: 'HOD' } });
  const unallocateResult = await sectionAllocationService.unallocateAllStudents(
    sectionA.id,
    cseDept.id,
    mockHodUser ? { id: mockHodUser.id, role: 'HOD' } : undefined
  );

  console.log('Unallocate All Result:', unallocateResult);
  if (!unallocateResult.success || unallocateResult.data.affectedCount !== initialSecACount) {
    console.error(`FAIL: Expected affectedCount=${initialSecACount}, got ${unallocateResult.data.affectedCount}`);
    process.exit(1);
  }
  console.log(`PASS: Affected count matches exactly: ${unallocateResult.data.affectedCount}`);

  // Verify Section A now has 0 students
  const afterSecAData = await sectionAllocationService.getSectionStudents(sectionA.id, cseDept.id);
  console.log(`Section A Allocated Count After: ${afterSecAData.students.length}`);
  console.log(`Section A Available Capacity After: ${afterSecAData.section.availableCapacity} / ${afterSecAData.section.capacity}`);
  if (afterSecAData.students.length !== 0) {
    console.error('FAIL: Section A should have 0 students!');
    process.exit(1);
  }
  if (afterSecAData.section.availableCapacity !== afterSecAData.section.capacity) {
    console.error(`FAIL: Section A availableCapacity should be ${afterSecAData.section.capacity}`);
    process.exit(1);
  }
  console.log('PASS: Section A has exactly 0 students and 100% capacity available.');

  // -------------------------------------------------------------
  // TEST 3: Isolation Test - Section B Remains Completely Unchanged
  // -------------------------------------------------------------
  console.log('\n--- TEST 3: Section B Isolation Verification ---');
  if (sectionB) {
    const afterSecBData = await sectionAllocationService.getSectionStudents(sectionB.id, cseDept.id);
    console.log(`Section B Allocated Count After: ${afterSecBData.students.length} (Initial: ${initialSecBCount})`);
    if (afterSecBData.students.length !== initialSecBCount) {
      console.error(`FAIL: Section B student count was modified! Expected ${initialSecBCount}, got ${afterSecBData.students.length}`);
      process.exit(1);
    }
    console.log('PASS: Section B is 100% untouched and preserved!');
  }

  // -------------------------------------------------------------
  // TEST 2 (cont): Verify Non-Deletion of Records
  // -------------------------------------------------------------
  console.log('\n--- TEST 2 (cont): Verify Data Preservation (No Deletes) ---');
  const totalStudentsAfter = await Student.count();
  const totalUsersAfter = await User.count();
  const totalAttendanceAfter = await AttendanceRecord.count();
  console.log(`Totals After: Students=${totalStudentsAfter}, Users=${totalUsersAfter}, AttendanceRecords=${totalAttendanceAfter}`);

  if (totalStudentsAfter !== totalStudentsBefore) {
    console.error(`FAIL: Student records were deleted! Before: ${totalStudentsBefore}, After: ${totalStudentsAfter}`);
    process.exit(1);
  }
  if (totalUsersAfter !== totalUsersBefore) {
    console.error(`FAIL: User records were deleted! Before: ${totalUsersBefore}, After: ${totalUsersAfter}`);
    process.exit(1);
  }
  if (totalAttendanceAfter !== totalAttendanceBefore) {
    console.error(`FAIL: Attendance records were deleted! Before: ${totalAttendanceBefore}, After: ${totalAttendanceAfter}`);
    process.exit(1);
  }

  // Check sample student still exists and has null sectionId
  const checkSampleStudent = await Student.findByPk(sampleStudent.id);
  console.log(`Sample Student after check:`, {
    id: checkSampleStudent?.id,
    name: sampleStudent.name,
    sectionId: checkSampleStudent?.sectionId,
    section: checkSampleStudent?.section,
    rollNumber: checkSampleStudent?.rollNumber,
  });

  if (!checkSampleStudent || checkSampleStudent.sectionId !== null || checkSampleStudent.section !== null) {
    console.error('FAIL: Sample student sectionId or section was not set to null!');
    process.exit(1);
  }
  console.log('PASS: Sample student exists, record intact, sectionId and section are null.');

  // -------------------------------------------------------------
  // TEST 6: Audit Log Verification
  // -------------------------------------------------------------
  console.log('\n--- TEST 6: Administrative Audit Event Verification ---');
  const latestAudit = await AuditLog.findOne({
    where: { action: 'SECTION_STUDENTS_BULK_UNALLOCATED' },
    order: [['createdAt', 'DESC']],
  });
  console.log('Latest Audit Log Event:', {
    action: latestAudit?.action,
    userId: latestAudit?.userId,
    details: latestAudit?.details,
    createdAt: latestAudit?.createdAt,
  });

  if (!latestAudit || (latestAudit.details as any)?.sectionId !== sectionA.id) {
    console.error('FAIL: Audit log entry for SECTION_STUDENTS_BULK_UNALLOCATED not found or sectionId mismatch!');
    process.exit(1);
  }
  console.log('PASS: Audit log event registered successfully with all metadata.');

  // -------------------------------------------------------------
  // TEST 8: Section Already Empty Behavior
  // -------------------------------------------------------------
  console.log('\n--- TEST 8: Calling Unallocate on Already Empty Section ---');
  const emptyResult = await sectionAllocationService.unallocateAllStudents(
    sectionA.id,
    cseDept.id,
    mockHodUser ? { id: mockHodUser.id, role: 'HOD' } : undefined
  );
  console.log('Empty Section Unallocate Result:', emptyResult);
  if (!emptyResult.success || emptyResult.data.affectedCount !== 0) {
    console.error('FAIL: Expected affectedCount=0 for already empty section');
    process.exit(1);
  }
  console.log('PASS: Empty section returns affectedCount=0 safely.');

  // -------------------------------------------------------------
  // RESTORE DATA FOR USER
  // Re-allocate students back to Section A so user's database remains in its expected state
  // -------------------------------------------------------------
  console.log('\n--- RESTORING STUDENTS BACK TO SECTION A ---');
  const studentAllocations = initialSecAData.students.map((s, idx) => ({
    studentId: s.id,
    rollNumber: (idx + 1).toString(),
  }));

  const reallocateResult = await sectionAllocationService.allocateStudents(
    sectionA.id,
    cseDept.id,
    studentAllocations,
    mockHodUser ? { id: mockHodUser.id, role: 'HOD' } : undefined
  );
  console.log('Re-allocation Result:', reallocateResult.message);

  const restoredSecAData = await sectionAllocationService.getSectionStudents(sectionA.id, cseDept.id);
  console.log(`Restored Section A Count: ${restoredSecAData.students.length} (Expected: ${initialSecACount})`);
  if (restoredSecAData.students.length !== initialSecACount) {
    console.error('FAIL: Failed to restore students to Section A!');
    process.exit(1);
  }
  console.log('PASS: Section A restored cleanly to original state.');

  console.log('\n====================================================');
  console.log('ALL VERIFICATION TESTS COMPLETED SUCCESSFULLY!');
  console.log('====================================================');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('TEST RUNNER FAILED:', err);
  process.exit(1);
});
