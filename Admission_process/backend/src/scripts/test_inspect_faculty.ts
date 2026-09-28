import db from '../config/database';
import User from '../models/User';
import Teacher from '../models/Teacher';
import Department from '../models/Department';
import Subject from '../models/Subject';
import Section from '../models/Section';
import Student from '../models/Student';
import FacultyAssignment from '../models/FacultyAssignment';
import GoogleSheetConnection from '../models/GoogleSheetConnection';
import GoogleSheetTab from '../models/GoogleSheetTab';
import FacultyGoogleSheetAccess from '../models/FacultyGoogleSheetAccess';
import GoogleOAuthToken from '../models/GoogleOAuthToken';

async function main() {
  try {
    await db.authenticate();
    console.log('Database connected.');

    const teachers = await Teacher.findAll({
      include: [
        { model: User, as: 'user' },
        { model: Department, as: 'department' }
      ]
    });
    console.log(`\n=== TEACHERS (${teachers.length}) ===`);
    teachers.forEach((t: any) => {
      console.log(`Teacher ID: ${t.id}, User: ${t.user?.firstName} ${t.user?.lastName} (${t.user?.email}), Role: ${t.user?.role}, Dept: ${t.department?.code}`);
    });

    const teacherUsers = await User.findAll({
      where: { role: 'TEACHER' }
    });
    console.log(`\n=== USERS WITH ROLE TEACHER (${teacherUsers.length}) ===`);
    teacherUsers.forEach((u: any) => {
      console.log(`User ID: ${u.id}, Name: ${u.firstName} ${u.lastName}, Email: ${u.email}`);
    });

    const assignments = await FacultyAssignment.findAll({
      include: [
        { model: User, as: 'user' },
        { model: Subject, as: 'subject' },
        { model: Department, as: 'department' }
      ]
    });
    console.log(`\n=== FACULTY ASSIGNMENTS (${assignments.length}) ===`);
    assignments.forEach((a: any) => {
      console.log(`Assignment ID: ${a.id}, User: ${a.user?.email}, Subject: ${a.subject?.name} (${a.subject?.code}), Sem: ${a.semester}, Sec: ${a.section}, AY: ${a.academicYear}, AttAccess: ${a.attendanceAccess}, MarksAccess: ${a.marksAccess}, Status: ${a.status}`);
    });

    const connections = await GoogleSheetConnection.findAll({
      include: [
        { model: GoogleSheetTab, as: 'tabs' }
      ]
    });
    console.log(`\n=== GOOGLE SHEET CONNECTIONS (${connections.length}) ===`);
    connections.forEach((c: any) => {
      console.log(`Conn ID: ${c.id}, Type: ${c.sheetType}, Sem: ${c.semester}, Sec: ${c.section}, Status: ${c.status}, URL: ${c.googleSpreadsheetUrl}`);
      console.log(`Tabs (${c.tabs?.length || 0}):`, c.tabs?.map((t: any) => `${t.sheetTitle} (GID: ${t.googleSheetId}, SubCode: ${t.subjectCode})`).join(', '));
    });

    const accesses = await FacultyGoogleSheetAccess.findAll();
    console.log(`\n=== FACULTY GOOGLE SHEET ACCESSES (${accesses.length}) ===`);
    accesses.forEach((acc: any) => {
      console.log(`Access ID: ${acc.id}, FacultyId: ${acc.facultyId}, Email: ${acc.googleEmail}, Status: ${acc.status}, Sec: ${acc.section}`);
    });

    const tokens = await GoogleOAuthToken.findAll();
    console.log(`\n=== GOOGLE OAUTH TOKENS (${tokens.length}) ===`);
    tokens.forEach((t: any) => {
      console.log(`Token ID: ${t.id}, UserId: ${t.userId}, UserEmail: ${t.userEmail}, GoogleEmail: ${t.googleAccountEmail}, Status: ${t.status}`);
    });

  } catch (err) {
    console.error('Error inspecting:', err);
  } finally {
    process.exit(0);
  }
}

main();
