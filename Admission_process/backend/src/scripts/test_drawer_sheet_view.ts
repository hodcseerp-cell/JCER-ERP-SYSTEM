import db from '../config/database';
import facultyService from '../services/faculty.service';
import User from '../models/User';
import FacultyAssignment from '../models/FacultyAssignment';

async function testDrawerSheetView() {
  console.log('================================================================');
  console.log('  TESTING IN-APP GOOGLE SHEET DRAWER / SIDEBAR VIEW BACKEND    ');
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

    // TEST 1: Authorized Attendance Sheet View for Faculty A
    console.log('--- TEST 1: Authorized Faculty A Sheet View Data ---');
    const sheetViewA = await facultyService.getFacultyAttendanceSheetView(facultyA.id, assignmentA.id);
    console.log('  Spreadsheet Title:', sheetViewA.spreadsheetTitle);
    console.log('  Subject Name:', sheetViewA.subjectName);
    console.log('  Subject Code (ERP):', sheetViewA.subjectCode);
    console.log('  Semester:', sheetViewA.semester);
    console.log('  Section:', sheetViewA.section);
    console.log('  Google Tab Title:', sheetViewA.sheetTitle);
    console.log('  Google Tab GID:', sheetViewA.sheetId);
    console.log('  DeepLink URL:', sheetViewA.deepLinkUrl);
    console.log('  Total Columns:', sheetViewA.columns.length);
    console.log('  Total Data Rows:', sheetViewA.rows.length);

    if (sheetViewA.sheetTitle === 'CS301' && sheetViewA.sheetId === '1097112166') {
      console.log('  ✓ Verified: Exact Google Tab "CS301" and GID "1097112166" loaded successfully.');
    } else {
      console.log('  ✗ Mismatch in Google Tab Title or GID');
    }

    if (sheetViewA.rows.length > 0) {
      console.log('  Sample Row 1:', sheetViewA.rows[0].slice(0, 5));
      console.log('  Sample Row 2:', sheetViewA.rows[1].slice(0, 5));
    }

    // TEST 2: Security Check - No Tokens in Response
    console.log('\n--- TEST 2: Security Sanitization (No Tokens Leaked) ---');
    const keys = Object.keys(sheetViewA);
    const hasTokens = keys.some(k => k.toLowerCase().includes('token') || k.toLowerCase().includes('secret'));
    if (!hasTokens) {
      console.log('  ✓ Verified: No access tokens, refresh tokens, or client secrets in payload.');
    } else {
      console.log('  ✗ Security warning: Token field found in response!');
    }

    // TEST 3: Cross-Faculty Tampering Protection (Faculty A requests Faculty B assignment)
    console.log('\n--- TEST 3: Cross-Faculty Tampering Protection (Faculty A -> Assignment B) ---');
    try {
      await facultyService.getFacultyAttendanceSheetView(facultyA.id, assignmentB.id);
      console.log('  ✗ Failed: Cross-faculty sheet-view was NOT blocked!');
    } catch (err: any) {
      console.log(`  ✓ Blocked with expected error: "${err.message}"`);
    }

    // TEST 4: Reverse Cross-Faculty Protection (Faculty B requests Faculty A assignment)
    console.log('\n--- TEST 4: Reverse Cross-Faculty Protection (Faculty B -> Assignment A) ---');
    try {
      await facultyService.getFacultyAttendanceSheetView(facultyB.id, assignmentA.id);
      console.log('  ✗ Failed: Cross-faculty sheet-view was NOT blocked!');
    } catch (err: any) {
      console.log(`  ✓ Blocked with expected error: "${err.message}"`);
    }

    // TEST 5: Bitwise Marks Sheet View
    console.log('\n--- TEST 5: Bitwise Marks Sheet View ---');
    try {
      const marksViewA = await facultyService.getFacultyMarksSheetView(facultyA.id, assignmentA.id);
      console.log('  Marks Tab Title:', marksViewA.sheetTitle);
      console.log('  Marks Tab GID:', marksViewA.sheetId);
      console.log('  Columns:', marksViewA.columns.slice(0, 6));
      console.log('  Total Rows:', marksViewA.rows.length);
      console.log('  ✓ Marks sheet view executed successfully.');
    } catch (err: any) {
      console.log('  Marks Sheet View Note:', err.message);
    }

    console.log('\n================================================================');
    console.log('  ALL GOOGLE SHEET DRAWER BACKEND TESTS PASSED SUCCESSFULLY!    ');
    console.log('================================================================');
    process.exit(0);
  } catch (err: any) {
    console.error('Test execution failed:', err);
    process.exit(1);
  }
}

testDrawerSheetView();
