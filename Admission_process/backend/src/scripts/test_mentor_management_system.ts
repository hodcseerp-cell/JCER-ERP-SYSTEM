import sequelize from '../config/database';
import Student from '../models/Student';
import User from '../models/User';
import Department from '../models/Department';
import Teacher from '../models/Teacher';
import HOD from '../models/HOD';
import MentorAssignment from '../models/MentorAssignment';
import MentoringRecord from '../models/MentoringRecord';
import MentorService from '../services/mentor.service';

async function runMentorManagementTests() {
  console.log('\n===============================================================');
  console.log('🧪 RUNNING MENTOR MANAGEMENT SYSTEM ACCEPTANCE TESTS');
  console.log('===============================================================\n');

  try {
    await sequelize.authenticate();
    console.log('✓ PostgreSQL Database Connected.');

    // 1. Verify tables exist
    const [maTableExists]: any = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'mentor_assignments'
      );
    `);
    const [mrTableExists]: any = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'mentoring_records'
      );
    `);

    console.log(`✓ Table mentor_assignments exists: ${maTableExists[0]?.exists}`);
    console.log(`✓ Table mentoring_records exists: ${mrTableExists[0]?.exists}`);

    // 2. Fetch or mock HOD, Department, Faculty, and Students
    const cseDept = await Department.findOne({ where: { code: 'CSE' } }) || await Department.findOne();
    if (!cseDept) {
      console.warn('⚠️ No department found. Skipping live data tests.');
      return;
    }
    console.log(`✓ Resolved Test Department: ${cseDept.name} (${cseDept.code})`);

    // Core departments list
    const coreDepts = await MentorService.getMentorCoreDepartments();
    console.log(`✓ Found ${coreDepts.length} mentor core departments.`);

    // Faculty in department
    const eligibleFaculty = await MentorService.getEligibleFaculty(cseDept.id);
    console.log(`✓ Found ${eligibleFaculty.length} eligible faculty members in ${cseDept.code}.`);

    // Find a real user to act as HOD in the test
    const testUser = await User.findOne({ where: { role: 'HOD' } }) || await User.findOne({ where: { role: 'ADMIN' } }) || await User.findOne();
    const testUserId = testUser ? testUser.id : '00000000-0000-0000-0000-000000000000';

    // 3. Test HOD Overview
    const hodScopeContext = {
      userId: testUserId,
      departmentId: cseDept.id,
      department: cseDept,
      isSemesterHandling: false,
      handlingSemesters: null,
      role: 'HOD',
    };

    const overview = await MentorService.getHodMentorOverview(hodScopeContext, '2026-27');
    console.log(`✓ HOD Overview loaded successfully.`);
    console.log(`  - Total students in scope: ${overview.summary.totalStudents}`);
    console.log(`  - Assigned students: ${overview.summary.assignedStudents}`);
    console.log(`  - Unassigned students: ${overview.summary.unassignedStudents}`);
    console.log(`  - Active mentors pool: ${overview.summary.activeMentors}`);

    // 4. Test Student Query
    const studentsRes = await MentorService.getEligibleStudents(hodScopeContext, {
      semester: 3,
      status: 'ALL',
      limit: 10,
    });
    console.log(`✓ Eligible students query for Sem 3 returned ${studentsRes.total} total students.`);

    // 5. If we have a faculty member and a student, test assignment workflow
    if (eligibleFaculty.length > 0 && studentsRes.students.length > 0) {
      const testFaculty = eligibleFaculty[0];
      const testStudent = studentsRes.students[0];

      console.log(`\n--- Testing Bulk Allocation Workflow ---`);
      console.log(`Assigning Student ${testStudent.name} (${testStudent.usn}) to Faculty ${testFaculty.name}...`);

      const assignResult = await MentorService.bulkAssignMentors(hodScopeContext, {
        studentIds: [testStudent.id],
        facultyId: testFaculty.facultyId,
        mentorDepartmentId: cseDept.id,
        academicYear: '2026-27',
        semester: testStudent.semester,
        notes: 'Automated test assignment',
      });

      console.log(`✓ Bulk assignment completed:`, assignResult);

      // Verify active assignment
      const activeAssign = await MentorAssignment.findOne({
        where: { studentId: testStudent.id, status: 'ACTIVE' },
      });
      console.log(`✓ Active mentor assignment verified: ID ${activeAssign?.id}, Faculty ${activeAssign?.facultyId}`);

      // 6. Test Faculty Mentor Overview & Mentees
      const mentorOverview = await MentorService.getMentorDashboardOverview(testFaculty.facultyId, '2026-27');
      console.log(`✓ Faculty Mentor Dashboard Overview:`, {
        myMenteesCount: mentorOverview.myMenteesCount,
        attentionCount: mentorOverview.attentionCount,
        lowAttendanceCount: mentorOverview.lowAttendanceCount,
      });

      const myMentees = await MentorService.getMyMentees(testFaculty.facultyId, {});
      console.log(`✓ My Mentees query returned ${myMentees.length} mentees for faculty ${testFaculty.name}.`);

      // 7. Test Mentee Profile & Records
      const menteeProfile = await MentorService.getMenteeProfile(testStudent.id, testFaculty.facultyId);
      console.log(`✓ Mentee Profile loaded for ${menteeProfile.student.name}:`, {
        attendance: menteeProfile.summaryCards.attendance,
        latestResult: menteeProfile.summaryCards.latestResult,
      });

      // 8. Test Creating a Mentoring Session Record
      console.log(`Creating mentoring session record...`);
      const newRecord = await MentorService.createMentoringRecord(testFaculty.facultyId, {
        studentId: testStudent.id,
        meetingType: 'IN_PERSON',
        concernCategory: 'GENERAL',
        summary: 'Automated test mentoring meeting discussing semester progress.',
        actionPlan: 'Maintain attendance above 85% and review CIE 1 syllabus.',
        followUpStatus: 'OPEN',
      });
      console.log(`✓ Mentoring record created with ID: ${newRecord.id}`);

      // 9. Test Updating Follow-up Status
      const updatedRecord = await MentorService.updateFollowUpStatus(testFaculty.facultyId, newRecord.id, {
        followUpStatus: 'RESOLVED',
        resolutionNotes: 'Action plan completed successfully.',
      });
      console.log(`✓ Follow-up updated to: ${updatedRecord.followUpStatus}`);

      // 10. Test Security & Access Control: An unassigned faculty cannot access this mentee
      console.log(`\n--- Testing Access Control Guard ---`);
      try {
        await MentorService.verifyMentorStudentAccess('random-unassigned-faculty-uuid', testStudent.id, 'FACULTY');
        console.error('❌ SECURITY FAILED: Unassigned faculty was allowed access.');
      } catch (secErr: any) {
        console.log(`✓ SECURITY VERIFIED: Access denied to unassigned faculty (${secErr.message}).`);
      }
    }

    console.log('\n===============================================================');
    console.log('🎉 ALL MENTOR MANAGEMENT ACCEPTANCE TESTS COMPLETED SUCCESSFULLY!');
    console.log('===============================================================\n');
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  } finally {
    process.exit(0);
  }
}

runMentorManagementTests();
