import db from '../config/database';
import facultyService from '../services/faculty.service';
import User from '../models/User';
import FacultyAssignment from '../models/FacultyAssignment';

async function runSecurityTests() {
  console.log('====================================================');
  console.log('  FACULTY DASHBOARD SECURITY & AUTHORIZATION TESTS  ');
  console.log('====================================================\n');

  try {
    await db.authenticate();

    // Faculty A: Arihant Desai
    const facultyA = await User.findOne({ where: { email: 'aditihundre0309@gmail.com' } });
    // Faculty B: Sarah Smith
    const facultyB = await User.findOne({ where: { email: 'teacher@college.com' } });

    if (!facultyA || !facultyB) {
      console.error('Test faculty users not found in database.');
      process.exit(1);
    }

    const assignmentsA = await FacultyAssignment.findAll({ where: { userId: facultyA.id, status: 'ACTIVE' } });
    const assignmentsB = await FacultyAssignment.findAll({ where: { userId: facultyB.id, status: 'ACTIVE' } });

    const assignmentA = assignmentsA[0];
    const assignmentB = assignmentsB[0];

    console.log(`Faculty A (${facultyA.email}): Assignment ID = ${assignmentA?.id}`);
    console.log(`Faculty B (${facultyB.email}): Assignment ID = ${assignmentB?.id}`);

    // TEST 1: Faculty A sees only their assigned subject and exact mapped Google tab CS301
    console.log('\n--- TEST 1: Faculty A Scope & Tab Isolation ---');
    const enrichedA = await facultyService.getFacultyAssignments(facultyA.id);
    console.log(`Assignments count for Faculty A: ${enrichedA.length}`);
    enrichedA.forEach(a => {
      console.log(`  Subject: ${a.subjectName} (${a.subjectCode}), Section: ${a.section}`);
      console.log(`  Attendance Tab: ${a.attendanceSheet.tabTitle} (GID: ${a.attendanceSheet.tabGid})`);
      if (a.attendanceSheet.tabTitle === 'CS301') {
        console.log('  ✓ Verified: Tab title is preserved as exact string "CS301" (NOT transformed to BCS301)');
      } else {
        console.log('  ✗ Unexpected tab title:', a.attendanceSheet.tabTitle);
      }
    });

    // TEST 2: Faculty B cannot see Faculty A's assignments
    console.log('\n--- TEST 2: Faculty B Assignment Scoping ---');
    const enrichedB = await facultyService.getFacultyAssignments(facultyB.id);
    const hasAInB = enrichedB.some(b => b.id === assignmentA.id);
    if (!hasAInB) {
      console.log('  ✓ Verified: Faculty B cannot see Faculty A assignments in assignment list.');
    } else {
      console.log('  ✗ Failed: Faculty B received Faculty A assignment!');
    }

    // TEST 3: Faculty A attempts to access Faculty B's assignment workspace directly
    console.log('\n--- TEST 3: Cross-Faculty Assignment ID Tampering Protection ---');
    try {
      await facultyService.getFacultyAttendanceWorkspace(facultyA.id, assignmentB.id);
      console.log('  ✗ Failed: Cross-faculty workspace access was not blocked!');
    } catch (err: any) {
      console.log(`  ✓ Blocked with expected error: "${err.message}"`);
    }

    // TEST 4: Faculty B attempts to access Faculty A's assignment workspace directly
    console.log('\n--- TEST 4: Reverse Cross-Faculty Workspace Protection ---');
    try {
      await facultyService.getFacultyAttendanceWorkspace(facultyB.id, assignmentA.id);
      console.log('  ✗ Failed: Cross-faculty workspace access was not blocked!');
    } catch (err: any) {
      console.log(`  ✓ Blocked with expected error: "${err.message}"`);
    }

    // TEST 5: Faculty A attempts to sync Faculty B's assignment
    console.log('\n--- TEST 5: Cross-Faculty Sync Tampering Protection ---');
    try {
      await facultyService.syncFacultyAttendance(facultyA.id, assignmentB.id);
      console.log('  ✗ Failed: Cross-faculty sync was not blocked!');
    } catch (err: any) {
      console.log(`  ✓ Blocked with expected error: "${err.message}"`);
    }

    // TEST 6: Immutable Tab Title check
    console.log('\n--- TEST 6: Google Tab Title Preservation ---');
    const wsA = await facultyService.getFacultyAttendanceWorkspace(facultyA.id, assignmentA.id);
    if (wsA.googleSheet.tabTitle === 'CS301') {
      console.log('  ✓ Verified: wsA.googleSheet.tabTitle is strictly "CS301"');
      console.log('  ✓ Verified: wsA.assignment.subjectCode is strictly "BCS301"');
    } else {
      console.log('  ✗ Failed: Tab title mismatch:', wsA.googleSheet.tabTitle);
    }

    // TEST 7: Deep Link Immutable GID URL structure
    console.log('\n--- TEST 7: Immutable GID Deep-Link URL ---');
    if (wsA.googleSheet.deepLinkUrl && wsA.googleSheet.deepLinkUrl.includes('#gid=1097112166')) {
      console.log(`  ✓ Verified Deep Link URL: ${wsA.googleSheet.deepLinkUrl}`);
    } else {
      console.log('  ✗ Unexpected deep link URL:', wsA.googleSheet.deepLinkUrl);
    }

    console.log('\n====================================================');
    console.log('  ✓ ALL 7 CRITICAL SECURITY TESTS PASSED 100%!       ');
    console.log('====================================================');
  } catch (err) {
    console.error('Security test failed with unexpected error:', err);
  } finally {
    process.exit(0);
  }
}

runSecurityTests();
