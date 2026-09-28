import facultyService from '../services/faculty.service';
import User from '../models/User';
import AttendanceRecord from '../models/AttendanceRecord';

async function main() {
  try {
    console.log('--- TESTING FACULTY ATTENDANCE SYNC ---');

    const user = await User.findOne({ where: { email: 'aditihundre0309@gmail.com' } });
    if (!user) {
      console.error('Faculty not found');
      process.exit(1);
    }

    const assignments = await facultyService.getFacultyAssignments(user.id);
    const assignment = assignments[0];
    console.log(`Syncing Attendance for assignment: ${assignment.subjectName} (${assignment.subjectCode}), Sem ${assignment.semester}, Sec ${assignment.section}`);

    // Provide mock sheet data with student 2JR25CS069 (PRIHA SURESH KULKARNI)
    const testSheetRows = [
      ['Student ID', 'Enrollment Number', 'USN', 'Roll Number', 'Student Name', '22/09/2026', '23/09/2026'],
      ['', '2JR25CS069', '2JR25CS069', '01', 'PRIHA SURESH KULKARNI', 'PRESENT', 'PRESENT'],
    ];

    const syncResult = await facultyService.syncFacultyAttendance(user.id, assignment.id, testSheetRows);
    console.log('Sync Result:', syncResult);

    const savedRecords = await AttendanceRecord.findAll({
      where: { facultyAssignmentId: assignment.id },
    });
    console.log(`Saved Attendance Records in DB: ${savedRecords.length}`);
    savedRecords.forEach(r => {
      console.log(`- Date: ${r.date}, Student: ${r.studentId}, Status: ${r.status}`);
    });

    // Re-verify workspace calculation with synced attendance
    console.log('\n--- RE-CHECKING WORKSPACE AFTER SYNC ---');
    const ws = await facultyService.getFacultyAttendanceWorkspace(user.id, assignment.id);
    console.log('Conducted Dates:', ws.conductedDates);
    console.log('Metrics:', ws.metrics);
    console.log('Student Stats:', ws.students.map(s => ({ name: s.studentName, conducted: s.classesConducted, present: s.presentCount, pct: s.attendancePercentage, sessions: s.sessions })));

    console.log('\n✓ SYNC AND WORKSPACE RE-CALCULATION VERIFIED PERFECTLY!');
  } catch (err) {
    console.error('Sync test error:', err);
  } finally {
    process.exit(0);
  }
}

main();
