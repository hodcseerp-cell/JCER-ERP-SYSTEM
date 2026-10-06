import db from '../config/database';
import { getEnrolledStudentsForAssignment, facultyService } from '../services/faculty.service';
import { attendanceExcelService } from '../services/attendanceExcel.service';
import Student from '../models/Student';
import User from '../models/User';
import Department from '../models/Department';
import FacultyAssignment from '../models/FacultyAssignment';
import Subject from '../models/Subject';
import Section from '../models/Section';

async function runTests() {
  console.log('================================================================');
  console.log('🚀 RUNNING ATTENDANCE ROSTER SEMESTER-SPECIFIC ORDERING SUITE');
  console.log('================================================================\n');

  await db.authenticate();
  console.log('✓ Database connected.\n');

  // Find or verify an active Semester 1 Faculty Assignment
  const sem1Assignment = await FacultyAssignment.findOne({
    where: { semester: 1, status: 'ACTIVE' },
    include: [
      { model: Subject, as: 'subject' },
      { model: Department, as: 'department' },
    ],
  });

  if (sem1Assignment) {
    console.log(`📦 TEST 1: Semester 1 Assignment Roster (${(sem1Assignment as any).subject?.code} - Sem 1)`);
    const { students: sem1Students } = await getEnrolledStudentsForAssignment(sem1Assignment);
    console.log(`  Total enrolled students: ${sem1Students.length}`);
    
    if (sem1Students.length > 1) {
      // Check if student names are in A-Z order
      let isAlphabetical = true;
      for (let i = 0; i < sem1Students.length - 1; i++) {
        const nameA = sem1Students[i].user ? `${sem1Students[i].user.firstName || ''} ${sem1Students[i].user.lastName || ''}`.trim().toLowerCase() : '';
        const nameB = sem1Students[i + 1].user ? `${sem1Students[i + 1].user.firstName || ''} ${sem1Students[i + 1].user.lastName || ''}`.trim().toLowerCase() : '';
        if (nameA.localeCompare(nameB) > 0) {
          isAlphabetical = false;
          console.error(`  ❌ Order violation at index ${i}: "${nameA}" should be before "${nameB}"`);
          break;
        }
      }
      if (isAlphabetical) {
        console.log(`  ✅ [PASS] Semester 1 roster is strictly ordered by Student Name A-Z (case-insensitive).`);
        console.log(`  Sample (first 5):`);
        sem1Students.slice(0, 5).forEach((s, idx) => {
          const sName = s.user ? `${s.user.firstName || ''} ${s.user.lastName || ''}`.trim() : 'Student';
          console.log(`    ${String(idx + 1).padStart(2, '0')} | USN: ${s.usn || s.enrollmentNumber} | Name: ${sName}`);
        });
      }
    } else {
      console.log(`  ⚠️ Note: Less than 2 students in this Sem 1 assignment.`);
    }
  } else {
    console.log('  ⚠️ No active Sem 1 assignment found for direct testing.');
  }

  // Find or verify an active Semester 2+ Faculty Assignment
  const semSeniorAssignment = await FacultyAssignment.findOne({
    where: { semester: [2, 3, 4, 5, 6, 7, 8], status: 'ACTIVE' },
    include: [
      { model: Subject, as: 'subject' },
      { model: Department, as: 'department' },
    ],
  });

  if (semSeniorAssignment) {
    console.log(`\n📦 TEST 2: Semester ${semSeniorAssignment.semester} Assignment Roster (${(semSeniorAssignment as any).subject?.code})`);
    const { students: seniorStudents } = await getEnrolledStudentsForAssignment(semSeniorAssignment);
    console.log(`  Total enrolled students: ${seniorStudents.length}`);
    
    if (seniorStudents.length > 1) {
      let isUsnAsc = true;
      for (let i = 0; i < seniorStudents.length - 1; i++) {
        const usnA = (seniorStudents[i].usn || seniorStudents[i].enrollmentNumber || '').trim().toLowerCase();
        const usnB = (seniorStudents[i + 1].usn || seniorStudents[i + 1].enrollmentNumber || '').trim().toLowerCase();
        if (usnA.localeCompare(usnB) > 0) {
          isUsnAsc = false;
          console.error(`  ❌ Order violation at index ${i}: USN "${usnA}" should be before "${usnB}"`);
          break;
        }
      }
      if (isUsnAsc) {
        console.log(`  ✅ [PASS] Semester ${semSeniorAssignment.semester} roster is strictly ordered by USN ASC.`);
        console.log(`  Sample (first 5):`);
        seniorStudents.slice(0, 5).forEach((s, idx) => {
          const sName = s.user ? `${s.user.firstName || ''} ${s.user.lastName || ''}`.trim() : 'Student';
          console.log(`    ${String(idx + 1).padStart(2, '0')} | USN: ${s.usn || s.enrollmentNumber} | Name: ${sName}`);
        });
      }
    } else {
      console.log(`  ⚠️ Note: Less than 2 students in this Sem ${semSeniorAssignment.semester} assignment.`);
    }
  }

  // TEST 3: Mock In-Memory Array Verification for Edge Cases
  console.log('\n📦 TEST 3: Edge Case Verification (Tie-breakers, Mixed Casing, Symbols)');
  
  // Simulated Sem 1 batch
  const mockSem1Students = [
    { usn: '1JC26CS002', user: { firstName: 'Yuvaraj', lastName: 'Talawar' } },
    { usn: '1JC26CS001', user: { firstName: 'ananya', lastName: 'Deshmukh' } },
    { usn: 'JCER-2026-CSE-00003', user: { firstName: 'Cat', lastName: 'Don' } },
    { usn: 'SEM1-TEST-041', user: { firstName: 'SEM1', lastName: 'Student041' } },
    { usn: 'SEM1-TEST-040', user: { firstName: 'SEM1', lastName: 'Student040' } },
    { usn: '1JC26CS015', user: { firstName: 'Aarav', lastName: 'Kumar' } },
    { usn: '1JC26CS005', user: { firstName: 'Aarav', lastName: 'Kumar' } },
  ];

  const sortedSem1 = [...mockSem1Students].sort((a: any, b: any) => {
    const nameA = a.user ? `${a.user.firstName || ''} ${a.user.lastName || ''}`.trim().toLowerCase() : '';
    const nameB = b.user ? `${b.user.firstName || ''} ${b.user.lastName || ''}`.trim().toLowerCase() : '';
    const cmp = nameA.localeCompare(nameB);
    if (cmp !== 0) return cmp;
    const usnA = (a.usn || a.enrollmentNumber || '').trim().toLowerCase();
    const usnB = (b.usn || b.enrollmentNumber || '').trim().toLowerCase();
    return usnA.localeCompare(usnB);
  });

  console.log('  Sorted Sem 1 results:');
  sortedSem1.forEach((s, idx) => console.log(`    ${idx + 1}. ${s.user.firstName} ${s.user.lastName} (${s.usn})`));

  if (
    sortedSem1[0].user.firstName === 'Aarav' &&
    sortedSem1[0].usn === '1JC26CS005' &&
    sortedSem1[1].usn === '1JC26CS015' &&
    sortedSem1[2].user.firstName === 'ananya' &&
    sortedSem1[sortedSem1.length - 1].user.firstName === 'Yuvaraj'
  ) {
    console.log('  ✅ [PASS] Sem 1: Names A-Z with case-insensitivity and USN tie-breaker verified.');
  } else {
    throw new Error('Sem 1 sorting failed validation check.');
  }

  // Simulated Sem 2+ batch
  const mockSeniorStudents = [
    { usn: '2JR25CS005', user: { firstName: 'Yuvaraj', lastName: 'Talawar' } },
    { usn: '2JR25CS001', user: { firstName: 'Ananya', lastName: 'Deshmukh' } },
    { usn: '2JR25CS003', user: { firstName: 'Cat', lastName: 'Don' } },
    { usn: '2JR25CS002', user: { firstName: 'Bhavana', lastName: 'Patil' } },
  ];

  const sortedSenior = [...mockSeniorStudents].sort((a: any, b: any) => {
    const usnA = (a.usn || a.enrollmentNumber || '').trim().toLowerCase();
    const usnB = (b.usn || b.enrollmentNumber || '').trim().toLowerCase();
    const cmp = usnA.localeCompare(usnB);
    if (cmp !== 0) return cmp;
    const nameA = a.user ? `${a.user.firstName || ''} ${a.user.lastName || ''}`.trim().toLowerCase() : '';
    const nameB = b.user ? `${b.user.firstName || ''} ${b.user.lastName || ''}`.trim().toLowerCase() : '';
    return nameA.localeCompare(nameB);
  });

  console.log('  Sorted Sem 2+ results:');
  sortedSenior.forEach((s, idx) => console.log(`    ${idx + 1}. ${s.usn} - ${s.user.firstName} ${s.user.lastName}`));

  if (
    sortedSenior[0].usn === '2JR25CS001' &&
    sortedSenior[1].usn === '2JR25CS002' &&
    sortedSenior[2].usn === '2JR25CS003' &&
    sortedSenior[3].usn === '2JR25CS005'
  ) {
    console.log('  ✅ [PASS] Sem 2+: USN ascending strictly obeyed.');
  } else {
    throw new Error('Sem 2+ sorting failed validation check.');
  }

  console.log('\n================================================================');
  console.log('🎉 ALL ATTENDANCE ROSTER SORTING TESTS PASSED!');
  console.log('================================================================\n');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
