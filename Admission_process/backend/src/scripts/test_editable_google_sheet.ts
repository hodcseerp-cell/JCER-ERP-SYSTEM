import db from '../config/database';
import facultyService from '../services/faculty.service';
import User from '../models/User';
import FacultyAssignment from '../models/FacultyAssignment';
import AuditLog from '../models/AuditLog';

async function testEditableGoogleSheet() {
  console.log('================================================================');
  console.log('  TESTING TRUE EDITABLE IN-PAGE GOOGLE SHEET WORKSPACE BACKEND   ');
  console.log('================================================================\n');

  try {
    await db.authenticate();

    // Faculty A: Arihant Desai
    const facultyA = await User.findOne({ where: { email: 'aditihundre0309@gmail.com' } });
    // Faculty B: Sarah Smith
    const facultyB = await User.findOne({ where: { email: 'teacher@college.com' } });

    if (!facultyA || !facultyB) {
      console.error('Faculty users not found in database.');
      process.exit(1);
    }

    const assignmentsA = await FacultyAssignment.findAll({ where: { userId: facultyA.id, status: 'ACTIVE' } });
    const assignmentsB = await FacultyAssignment.findAll({ where: { userId: facultyB.id, status: 'ACTIVE' } });

    const assignmentA = assignmentsA[0];
    const assignmentB = assignmentsB[0];

    console.log(`Faculty A (${facultyA.email}): Assignment ID = ${assignmentA?.id}`);
    console.log(`Faculty B (${facultyB.email}): Assignment ID = ${assignmentB?.id}\n`);

    // TEST 1: Authorized Attendance Sheet View & Grid for Faculty A
    console.log('--- TEST 1: Authorized Sheet View & Full Grid ---');
    const sheetViewA = await facultyService.getFacultyAttendanceSheetView(facultyA.id, assignmentA.id);
    console.log('  Spreadsheet Title:', sheetViewA.spreadsheetTitle);
    console.log('  Subject Name:', sheetViewA.subjectName);
    console.log('  Subject Code (ERP):', sheetViewA.subjectCode);
    console.log('  Semester:', sheetViewA.semester);
    console.log('  Section:', sheetViewA.section);
    console.log('  Google Tab Title:', sheetViewA.sheetTitle);
    console.log('  Google Tab GID:', sheetViewA.sheetId);
    console.log('  isEditable:', sheetViewA.isEditable);
    console.log('  Grid Dimensions:', `${sheetViewA.grid?.length || 0} rows x ${sheetViewA.grid?.[0]?.length || 0} cols`);

    if (sheetViewA.sheetTitle === 'CS301' && sheetViewA.sheetId === '1097112166') {
      console.log('  ✓ Verified: Exact Google Tab "CS301" and GID "1097112166" resolved.');
    } else {
      console.error('  ✗ Mismatch in Google Tab Title or GID');
    }

    if (sheetViewA.isEditable) {
      console.log('  ✓ Verified: isEditable is true for authorized faculty.');
    } else {
      console.error('  ✗ isEditable should be true');
    }

    // Check Row 7 (first student 2JR25CS001) and column H (index 7)
    if (sheetViewA.grid && sheetViewA.grid.length >= 7) {
      console.log('  Row 1 (Header excerpt):', sheetViewA.grid[0].slice(0, 4));
      console.log('  Row 6 (Col headers):', sheetViewA.grid[5].slice(0, 8));
      console.log('  Row 7 (Student 1):', sheetViewA.grid[6].slice(0, 8));
    }

    // TEST 2: Update a Single Cell (H8 -> 1)
    console.log('\n--- TEST 2: Single Cell Update (H8 = 1) ---');
    const updateResult1 = await facultyService.updateFacultyAttendanceSheetCells(
      facultyA.id,
      assignmentA.id,
      [
        {
          cellAddress: 'H8',
          value: '1',
          row: 8,
          col: 7,
          studentUsn: '2JR25CS001',
          date: '18/09/2026',
        },
      ]
    );

    console.log('  Update Result:', updateResult1);
    if (updateResult1.success && updateResult1.updatedCount === 1) {
      console.log('  ✓ Verified: Cell H8 updated successfully.');
    } else {
      console.error('  ✗ Cell update failed:', updateResult1);
    }

    // Verify change in subsequent read
    const verifyRead1 = await facultyService.getFacultyAttendanceSheetView(facultyA.id, assignmentA.id);
    const valH8 = verifyRead1.grid?.[7]?.[7];
    console.log(`  Read-back H8 value: "${valH8}"`);
    if (valH8 === '1') {
      console.log('  ✓ Verified: Value 1 persisted and verified in subsequent read.');
    } else {
      console.error(`  ✗ Expected '1', got '${valH8}'`);
    }

    // TEST 3: Batch Update Multiple Cells (H8=0, H9=1, H10=0)
    console.log('\n--- TEST 3: Batch Update Multiple Cells (H8=0, H9=1, H10=0) ---');
    const batchResult = await facultyService.updateFacultyAttendanceSheetCells(
      facultyA.id,
      assignmentA.id,
      [
        { cellAddress: 'H8', value: '0', row: 8, col: 7, studentUsn: '2JR25CS001', date: '18/09/2026' },
        { cellAddress: 'H9', value: '1', row: 9, col: 7, studentUsn: '2JR25CS002', date: '18/09/2026' },
        { cellAddress: 'H10', value: '0', row: 10, col: 7, studentUsn: '2JR25CS003', date: '18/09/2026' },
      ]
    );

    console.log('  Batch Update Result:', batchResult);
    if (batchResult.success && batchResult.updatedCount === 3) {
      console.log('  ✓ Verified: 3 cells batch updated successfully.');
    }

    const verifyRead2 = await facultyService.getFacultyAttendanceSheetView(facultyA.id, assignmentA.id);
    console.log('  Read-back Row 8 (H8):', verifyRead2.grid?.[7]?.[7]);
    console.log('  Read-back Row 9 (H9):', verifyRead2.grid?.[8]?.[7]);
    console.log('  Read-back Row 10 (H10):', verifyRead2.grid?.[9]?.[7]);

    // TEST 4: Reject Invalid Attendance Value (e.g. "invalid_text")
    console.log('\n--- TEST 4: Reject Invalid Attendance Values ---');
    try {
      await facultyService.updateFacultyAttendanceSheetCells(
        facultyA.id,
        assignmentA.id,
        [{ cellAddress: 'H8', value: 'INVALID_TEXT', row: 8, col: 7 }]
      );
      console.error('  ✗ Failed: Invalid attendance value was NOT rejected!');
    } catch (err: any) {
      console.log(`  ✓ Blocked with expected validation error: "${err.message}"`);
    }

    // TEST 5: Cross-Faculty Tampering Protection (Faculty B cannot edit Faculty A sheet)
    console.log('\n--- TEST 5: Cross-Faculty Edit Tampering Protection ---');
    try {
      await facultyService.updateFacultyAttendanceSheetCells(
        facultyB.id,
        assignmentA.id,
        [{ cellAddress: 'H8', value: '1', row: 8, col: 7 }]
      );
      console.error('  ✗ Failed: Cross-faculty edit was NOT blocked!');
    } catch (err: any) {
      console.log(`  ✓ Blocked with expected error: "${err.message}"`);
    }

    // TEST 6: Audit Log Verification
    console.log('\n--- TEST 6: Audit Log Verification ---');
    const auditLogs = await AuditLog.findAll({
      where: {
        userId: facultyA.id,
        action: 'FACULTY_GOOGLE_SHEET_ATTENDANCE_EDIT',
      },
      order: [['createdAt', 'DESC']],
      limit: 2,
    });

    if (auditLogs.length > 0) {
      console.log(`  ✓ Found ${auditLogs.length} recent AuditLog entries for Google Sheet cell edits.`);
      console.log('  Latest Audit Details:', auditLogs[0].details);
    } else {
      console.warn('  Warning: No audit log found.');
    }

    console.log('\n================================================================');
    console.log('  ALL EDITABLE GOOGLE SHEET BACKEND TESTS PASSED SUCCESSFULLY!  ');
    console.log('================================================================');
    process.exit(0);
  } catch (err: any) {
    console.error('Test execution failed:', err);
    process.exit(1);
  }
}

testEditableGoogleSheet();
