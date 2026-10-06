import sequelize from '../config/database';
import Student from '../models/Student';
import User from '../models/User';
import Department from '../models/Department';
import Teacher from '../models/Teacher';
import MentorAssignment from '../models/MentorAssignment';
import MentorTransition from '../models/MentorTransition';
import MentorService from '../services/mentor.service';
import * as xlsx from 'xlsx';

async function runTestSuite() {
  console.log('\n===============================================================');
  console.log('🧪 RUNNING PRODUCTION-GRADE MENTOR SYSTEM COMPREHENSIVE TEST SUITE');
  console.log('===============================================================\n');

  try {
    await sequelize.authenticate();
    console.log('✓ PostgreSQL Database Connected.');

    // ─── Setup Test Entities ───
    const dept = await Department.findOne({ where: { code: 'CSE' } }) || await Department.findOne();
    if (!dept) {
      throw new Error('No department found in database.');
    }

    // Find or create 2 faculty users
    let facultyUserA = await User.findOne({ where: { email: 'test_mentor_a@jcer.edu' } });
    if (!facultyUserA) {
      facultyUserA = await User.create({
        username: 'test_mentor_a',
        email: 'test_mentor_a@jcer.edu',
        passwordHash: 'dummy_hash',
        role: 'TEACHER',
        status: 'ACTIVE',
        firstName: 'Faculty',
        lastName: 'MentorA',
      } as any);
    }

    let facultyUserB = await User.findOne({ where: { email: 'test_mentor_b@jcer.edu' } });
    if (!facultyUserB) {
      facultyUserB = await User.create({
        username: 'test_mentor_b',
        email: 'test_mentor_b@jcer.edu',
        passwordHash: 'dummy_hash',
        role: 'TEACHER',
        status: 'ACTIVE',
        firstName: 'Faculty',
        lastName: 'MentorB',
      } as any);
    }

    // Ensure teacher records exist for faculty
    await Teacher.findOrCreate({
      where: { userId: facultyUserA.id },
      defaults: {
        userId: facultyUserA.id,
        departmentId: dept.id,
        designation: 'Assistant Professor',
        status: 'ACTIVE',
      } as any,
    });

    await Teacher.findOrCreate({
      where: { userId: facultyUserB.id },
      defaults: {
        userId: facultyUserB.id,
        departmentId: dept.id,
        designation: 'Associate Professor',
        status: 'ACTIVE',
      } as any,
    });

    // Create or find Student A (Batch 2026-27)
    let studentUserA = await User.findOne({ where: { email: 'student_2jr26cs001@jcer.edu' } });
    if (!studentUserA) {
      studentUserA = await User.create({
        username: 'student_2jr26cs001',
        email: 'student_2jr26cs001@jcer.edu',
        passwordHash: 'dummy_hash',
        role: 'STUDENT',
        status: 'ACTIVE',
        firstName: 'Aarav',
        lastName: 'Kulkarni',
      } as any);
    }

    let studentA = await Student.findOne({ where: { usn: '2JR26CS001' } });
    if (!studentA) {
      studentA = await Student.create({
        userId: studentUserA.id,
        departmentId: dept.id,
        usn: '2JR26CS001',
        rollNumber: 'CS001',
        semester: 1,
        section: 'A',
        batchYear: 2026,
        admissionBatch: '2026-27',
        status: 'ACTIVE',
      } as any);
    } else {
      await studentA.update({
        semester: 1,
        batchYear: 2026,
        admissionBatch: '2026-27',
        status: 'ACTIVE',
      });
    }

    // Create or find Student B (Batch 2027-28)
    let studentUserB = await User.findOne({ where: { email: 'student_2jr27cs002@jcer.edu' } });
    if (!studentUserB) {
      studentUserB = await User.create({
        username: 'student_2jr27cs002',
        email: 'student_2jr27cs002@jcer.edu',
        passwordHash: 'dummy_hash',
        role: 'STUDENT',
        status: 'ACTIVE',
        firstName: 'Ananya',
        lastName: 'Deshmukh',
      } as any);
    }

    let studentB = await Student.findOne({ where: { usn: '2JR27CS002' } });
    if (!studentB) {
      studentB = await Student.create({
        userId: studentUserB.id,
        departmentId: dept.id,
        usn: '2JR27CS002',
        rollNumber: 'CS002',
        semester: 1,
        section: 'B',
        batchYear: 2027,
        admissionBatch: '2027-28',
        status: 'ACTIVE',
      } as any);
    } else {
      await studentB.update({
        semester: 1,
        batchYear: 2027,
        admissionBatch: '2027-28',
        status: 'ACTIVE',
      });
    }

    // Clean prior test mentor assignments for clean run
    await MentorAssignment.destroy({
      where: { studentId: [studentA.id, studentB.id] },
    });
    await MentorTransition.destroy({
      where: { studentId: [studentA.id, studentB.id] },
    });

    console.log(`✓ Test entities initialized: Student A (${studentA.usn}, Batch ${studentA.admissionBatch}), Student B (${studentB.usn}, Batch ${studentB.admissionBatch}).`);

    // ─────────────────────────────────────────────────────────────
    // TEST 1: Initial Allocation in Sem 1 (Phase 1)
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- TEST 1: Initial Allocation in Sem 1 (Phase 1) ---');
    const firstYearHodContext = {
      userId: facultyUserA.id,
      departmentId: dept.id,
      department: dept,
      isSemesterHandling: true,
      handlingSemesters: [1, 2],
      role: 'HOD',
    };

    const deptHodContext = {
      userId: facultyUserA.id,
      departmentId: dept.id,
      department: dept,
      isSemesterHandling: false,
      handlingSemesters: null,
      role: 'HOD',
    };

    await MentorService.bulkAssignMentors(firstYearHodContext, {
      studentIds: [studentA.id],
      facultyId: facultyUserA.id,
      mentorDepartmentId: dept.id,
      academicYear: '2026-27',
      semester: 1,
      notes: 'Initial Sem 1 allocation for Student A',
    });

    // Assign Student B to Faculty B
    await MentorService.bulkAssignMentors(firstYearHodContext, {
      studentIds: [studentB.id],
      facultyId: facultyUserB.id,
      mentorDepartmentId: dept.id,
      academicYear: '2027-28',
      semester: 1,
      notes: 'Initial Sem 1 allocation for Student B',
    });

    const assignA1 = await MentorAssignment.findOne({
      where: { studentId: studentA.id, status: 'ACTIVE' },
    });
    if (!assignA1 || assignA1.phase !== 'PHASE_1' || assignA1.admissionBatch !== '2026-27') {
      throw new Error(`TEST 1 FAILED: Expected active Phase 1 assignment with batch 2026-27, got ${JSON.stringify(assignA1)}`);
    }
    console.log(`✓ TEST 1 PASSED: Student A allocated to Faculty A in Phase 1 (startSem: ${assignA1.startSemester}, endSem: ${assignA1.endSemester}, batch: ${assignA1.admissionBatch}).`);

    // Check directory filter for Faculty A
    const menteesFacultyA = await MentorService.getMyMentees(facultyUserA.id, {
      admissionBatch: '2026-27',
      semester: 1,
    });
    if (menteesFacultyA.length !== 1 || menteesFacultyA[0].id !== studentA.id) {
      throw new Error(`TEST 1 FAILED: Faculty A should see Student A in batch 2026-27, sem 1. Got ${menteesFacultyA.length}`);
    }
    console.log(`✓ TEST 1 PASSED: Faculty A directory correctly shows Student A.`);

    // ─────────────────────────────────────────────────────────────
    // TEST 2: Promotion Sem 1 → Sem 2 (Phase 1 Automatic Continuity)
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- TEST 2: Promotion Sem 1 → Sem 2 (Phase 1 Automatic Continuity) ---');
    await studentA.update({ semester: 2 });
    await MentorService.handlePromotion([{
      studentId: studentA.id,
      fromSemester: 1,
      toSemester: 2,
      departmentId: dept.id,
    }]);

    const assignA2 = await MentorAssignment.findOne({
      where: { studentId: studentA.id, status: 'ACTIVE' },
    });
    if (!assignA2 || assignA2.facultyId !== facultyUserA.id || assignA2.status !== 'ACTIVE') {
      throw new Error(`TEST 2 FAILED: Expected Faculty A to remain active mentor after Sem 1->2 promotion.`);
    }

    const menteesSem2 = await MentorService.getMyMentees(facultyUserA.id, {
      admissionBatch: '2026-27',
      semester: 2,
    });
    if (menteesSem2.length !== 1 || menteesSem2[0].id !== studentA.id) {
      throw new Error(`TEST 2 FAILED: Faculty A should automatically see Student A in Semester 2.`);
    }
    console.log(`✓ TEST 2 PASSED: Mentor A automatically continued into Sem 2 without reassignment.`);

    // ─────────────────────────────────────────────────────────────
    // TEST 3: Promotion Sem 2 → Sem 3 (Phase Transition: Requires HOD Confirmation)
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- TEST 3: Promotion Sem 2 → Sem 3 (Phase Transition Requirement) ---');
    await studentA.update({ semester: 3 });
    await MentorService.handlePromotion([{
      studentId: studentA.id,
      fromSemester: 2,
      toSemester: 3,
      departmentId: dept.id,
    }]);

    // 1. Phase 1 assignment must now be COMPLETED
    const phase1Record = await MentorAssignment.findOne({
      where: { studentId: studentA.id, phase: 'PHASE_1' },
    });
    if (!phase1Record || phase1Record.status !== 'COMPLETED') {
      throw new Error(`TEST 3 FAILED: Phase 1 assignment should be marked COMPLETED. Found: ${phase1Record?.status}`);
    }

    // 2. There should be NO active assignment right now
    const activeAssignDuringTransition = await MentorAssignment.findOne({
      where: { studentId: studentA.id, status: 'ACTIVE' },
    });
    if (activeAssignDuringTransition) {
      throw new Error(`TEST 3 FAILED: Old mentor should not be active for Phase 2 before HOD confirmation.`);
    }

    // 3. A PENDING transition record must exist
    const transitionRecord = await MentorTransition.findOne({
      where: { studentId: studentA.id, toPhase: 'PHASE_2' },
    });
    if (!transitionRecord || transitionRecord.status !== 'PENDING' || transitionRecord.previousFacultyId !== facultyUserA.id) {
      throw new Error(`TEST 3 FAILED: Expected PENDING transition record with previousFacultyId = Faculty A.`);
    }
    console.log(`✓ TEST 3 PASSED: Sem 2->3 promotion closed Phase 1 and created PENDING transition (transitionId: ${transitionRecord.id}).`);

    // ─────────────────────────────────────────────────────────────
    // TEST 4: Idempotency Verification
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- TEST 4: Idempotency of Promotion Handling ---');
    // Run the promotion again for the same student
    await MentorService.handlePromotion([{
      studentId: studentA.id,
      fromSemester: 2,
      toSemester: 3,
      departmentId: dept.id,
    }]);

    const transitionCount = await MentorTransition.count({
      where: { studentId: studentA.id, toPhase: 'PHASE_2' },
    });
    if (transitionCount !== 1) {
      throw new Error(`TEST 4 FAILED: Expected exactly 1 transition record, got ${transitionCount}.`);
    }
    console.log(`✓ TEST 4 PASSED: Idempotency verified. Repeated promotion did not duplicate transition record.`);

    // ─────────────────────────────────────────────────────────────
    // TEST 5: HOD Transition Resolution (Option 1: Continue Previous Mentor)
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- TEST 5: HOD Transition Resolution (Continue Previous Mentor) ---');
    const resolveResult = await MentorService.resolveTransitions(deptHodContext, {
      transitions: [{
        transitionId: transitionRecord.id,
        decision: 'CONTINUE',
      }],
      academicYear: '2026-27',
    });

    if (resolveResult.resolvedCount !== 1) {
      throw new Error(`TEST 5 FAILED: Expected 1 resolved transition.`);
    }

    const updatedTransition = await MentorTransition.findByPk(transitionRecord.id);
    if (!updatedTransition || updatedTransition.status !== 'RESOLVED' || updatedTransition.decision !== 'CONTINUED_PREVIOUS') {
      throw new Error(`TEST 5 FAILED: Transition status should be RESOLVED with decision CONTINUED_PREVIOUS.`);
    }

    // Verify new Phase 2 active assignment
    const phase2Assignment = await MentorAssignment.findOne({
      where: { studentId: studentA.id, status: 'ACTIVE' },
    });
    if (!phase2Assignment || phase2Assignment.phase !== 'PHASE_2' || phase2Assignment.facultyId !== facultyUserA.id || phase2Assignment.startSemester !== 3 || phase2Assignment.endSemester !== 8) {
      throw new Error(`TEST 5 FAILED: Phase 2 active assignment for Faculty A invalid: ${JSON.stringify(phase2Assignment)}`);
    }
    console.log(`✓ TEST 5 PASSED: HOD continued Faculty A for Phase 2 (Sem 3–8) successfully.`);

    // ─────────────────────────────────────────────────────────────
    // TEST 6: Promotion within Phase 2 (Sem 3 → Sem 4 Continuity)
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- TEST 6: Promotion within Phase 2 (Sem 3 → Sem 4 Continuity) ---');
    await studentA.update({ semester: 4 });
    await MentorService.handlePromotion([{
      studentId: studentA.id,
      fromSemester: 3,
      toSemester: 4,
      departmentId: dept.id,
    }]);

    const assignSem4 = await MentorAssignment.findOne({
      where: { studentId: studentA.id, status: 'ACTIVE' },
    });
    if (!assignSem4 || assignSem4.facultyId !== facultyUserA.id || assignSem4.phase !== 'PHASE_2') {
      throw new Error(`TEST 6 FAILED: Faculty A should automatically continue into Sem 4 without reassignment.`);
    }
    console.log(`✓ TEST 6 PASSED: Phase 2 mentor assignment safely continued across Sem 3->4 promotion.`);

    // ─────────────────────────────────────────────────────────────
    // TEST 7: Mid-Phase Reassignment & History Preservation
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- TEST 7: Mid-Phase Reassignment & Full History Preservation ---');
    await MentorService.reassignMentor(deptHodContext, {
      studentId: studentA.id,
      newFacultyId: facultyUserB.id,
      mentorDepartmentId: dept.id,
      academicYear: '2026-27',
      notes: 'Mid-phase reassignment to Faculty B for specialized guidance',
    });

    const activeAssignB = await MentorAssignment.findOne({
      where: { studentId: studentA.id, status: 'ACTIVE' },
    });
    if (!activeAssignB || activeAssignB.facultyId !== facultyUserB.id) {
      throw new Error(`TEST 7 FAILED: Faculty B should now be the active mentor.`);
    }

    const profile = await MentorService.getMenteeProfile(studentA.id, facultyUserB.id);
    const history = profile.mentorshipHistory;
    if (history.length < 3) {
      throw new Error(`TEST 7 FAILED: Expected at least 3 historical records (Phase 1, Phase 2 A, Phase 2 B), got ${history.length}`);
    }
    console.log(`✓ TEST 7 PASSED: Mid-phase reassignment successful. Mentorship history preserved (${history.length} records):`);
    history.forEach((h: any, i: number) => {
      console.log(`  [${i + 1}] ${h.phase || 'PHASE'}: ${h.mentorName || 'Faculty'} (${h.status}, ${h.period || 'Sem'})`);
    });

    // ─────────────────────────────────────────────────────────────
    // TEST 8: Batch Isolation
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- TEST 8: Batch Isolation ---');
    // Faculty A is not assigned to Student B (Batch 2027-28)
    const menteesBatch2027ForA = await MentorService.getMyMentees(facultyUserA.id, {
      admissionBatch: '2027-28',
    });
    if (menteesBatch2027ForA.length !== 0) {
      throw new Error(`TEST 8 FAILED: Faculty A should not see Student B in Batch 2027-28.`);
    }
    console.log(`✓ TEST 8 PASSED: Batch isolation verified. Mentor A cannot see Batch 2027-28 students.`);

    // ─────────────────────────────────────────────────────────────
    // TEST 9: Authorization & Profile Scope Verification
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- TEST 9: Strict Scope & Authorization (403 Forbidden) ---');
    try {
      await MentorService.verifyMentorStudentAccess(facultyUserA.id, studentB.id, 'TEACHER');
      throw new Error(`TEST 9 FAILED: Unauthorized mentor access was permitted!`);
    } catch (authErr: any) {
      const is403 = authErr.status === 403 || authErr.statusCode === 403 || authErr.message.includes('Access Denied');
      if (!is403) {
        throw new Error(`TEST 9 FAILED: Expected 403 authorization error, got: ${authErr.message}`);
      }
      console.log(`✓ TEST 9 PASSED: Unauthorized access blocked with 403: "${authErr.message}"`);
    }

    // ─────────────────────────────────────────────────────────────
    // TEST 10: Parent Information Excel Import Row-Level Validation
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- TEST 10: Parent Information Excel Import Security & Validation ---');
    // Create an in-memory Excel workbook with 3 rows:
    // Row 1: Student A (Assigned to Faculty B) -> Valid
    // Row 2: Student B (Assigned to Faculty B) -> Valid
    // Row 3: Foreign Student or USN of unassigned student -> Invalid
    const sampleRows = [
      {
        'USN': studentB.usn,
        'Student Name': 'Ananya Deshmukh',
        'Parent Name': 'Ramesh Deshmukh',
        'Parent Mobile': '9876543210',
        'Address': '123 MG Road, Belagavi',
      },
      {
        'USN': '2JR99CS999', // Unknown student
        'Student Name': 'Imposter Student',
        'Parent Name': 'Fake Parent',
        'Parent Mobile': '9999999999',
        'Address': 'Nowhere',
      },
    ];

    const worksheet = xlsx.utils.json_to_sheet(sampleRows);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Parent Data');
    const excelBuffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // 1. Test Faculty A importing Student B (who belongs to Faculty B) -> Scope Mismatch
    const parseResultFacultyA = await MentorService.parseAndValidateParentImport(facultyUserA.id, excelBuffer);
    const scopeMismatchRow = parseResultFacultyA.preview.find((r) => r.usn === studentB.usn);
    if (!scopeMismatchRow || !scopeMismatchRow.errors.some((e: string) => e.includes('NOT assigned to you'))) {
      throw new Error(`TEST 10 FAILED: Faculty A should be rejected for student B with 'NOT assigned to you' scope mismatch.`);
    }
    console.log(`✓ TEST 10 PASSED: Scope isolation verified for unassigned student: "${scopeMismatchRow.errors.join(', ')}".`);

    // 2. Faculty B imports data (Student B is valid, Unknown student is invalid)
    const parseResult = await MentorService.parseAndValidateParentImport(facultyUserB.id, excelBuffer);
    console.log(`✓ Import parsed for Faculty B: ${parseResult.validCount} valid, ${parseResult.invalidCount} invalid.`);

    if (parseResult.validCount !== 1 || parseResult.invalidCount !== 1) {
      throw new Error(`TEST 10 FAILED: Expected 1 valid row (Student B) and 1 invalid row (Unknown). Got ${JSON.stringify(parseResult)}`);
    }

    const invalidUnknownRow = parseResult.preview.find((r) => r.status === 'INVALID');
    if (!invalidUnknownRow || !invalidUnknownRow.errors.some((e: string) => e.includes('not found'))) {
      throw new Error(`TEST 10 FAILED: Unknown student should be flagged as not found in system.`);
    }
    console.log(`✓ TEST 10 PASSED: Non-existent student correctly caught: "${invalidUnknownRow.errors.join(', ')}".`);

    // Confirm import for valid rows
    const validRowsToConfirm = parseResult.preview.filter((r) => r.status === 'VALID');
    const confirmResult = await MentorService.confirmParentImport(facultyUserB.id, validRowsToConfirm as any);
    if (confirmResult.updatedCount !== 1) {
      throw new Error(`TEST 10 FAILED: Expected 1 confirmed update, got ${confirmResult.updatedCount}`);
    }

    // Verify student B record has updated parent details
    const updatedStudentB = await Student.findByPk(studentB.id);
    if (updatedStudentB?.fatherName !== 'Ramesh Deshmukh' || updatedStudentB?.parentPhone !== '9876543210') {
      throw new Error(`TEST 10 FAILED: Student B parent info not updated properly in database.`);
    }
    console.log(`✓ TEST 10 PASSED: Parent info safely committed to database (Parent: ${updatedStudentB.fatherName}, Phone: ${updatedStudentB.parentPhone}).`);

    // Clean up test records
    await MentorAssignment.destroy({ where: { studentId: [studentA.id, studentB.id] } });
    await MentorTransition.destroy({ where: { studentId: [studentA.id, studentB.id] } });
    await Student.destroy({ where: { id: [studentA.id, studentB.id] } });
    await User.destroy({ where: { id: [studentUserA.id, studentUserB.id, facultyUserA.id, facultyUserB.id] } });

    console.log('\n===============================================================');
    console.log('🎉 ALL 10 PRODUCTION ACCEPTANCE TESTS PASSED WITH 100% SUCCESS!');
    console.log('===============================================================\n');
  } catch (err: any) {
    console.error('\n❌ TEST SUITE FAILED:', err);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

runTestSuite();
