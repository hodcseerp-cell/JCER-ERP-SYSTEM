import sequelize from '../config/database';
import User from '../models/User';
import Department from '../models/Department';
import Subject from '../models/Subject';
import Teacher from '../models/Teacher';
import Admin from '../models/Admin';
import RejectionReason from '../models/RejectionReason';
import HOD from '../models/HOD';

export async function seed(exitOnComplete = false) {
  try {
    console.log('Initiating database schema sync...');
    await sequelize.sync({ force: true });
    console.log('Database synced. Starting seed...');

    // ─── 1. Departments (Branches) ─────────────────────────────────────────
    const depts = await Department.bulkCreate([
      { name: 'Computer Science & Engineering', code: 'CSE' },
      { name: 'Electronics & Communication Engineering', code: 'ECE' },
      { name: 'Mechanical Engineering', code: 'ME' },
      { name: 'Civil Engineering', code: 'CE' },
      { name: 'Computer Science & Engineering (AIML)', code: 'CSE-AIML' },
    ], { returning: true });
    const [cse] = depts;
    console.log('✓ Departments created.');

    // ─── 1.5 Rejection Reasons ──────────────────────────────────────────────
    await RejectionReason.bulkCreate([
      { code: 'DOC_NOT_VERIFIED', label: 'Documents Not Verified', description: 'Uploaded documents are missing or invalid' },
      { code: 'INCOMPLETE_DOCUMENTS', label: 'Incomplete Documents', description: 'Some mandatory documents were not uploaded' },
      { code: 'FEES_NOT_PAID', label: 'Fees Not Paid', description: 'Admission or application fees have not been paid' },
      { code: 'ELIGIBILITY_FAILED', label: 'Eligibility Criteria Not Met', description: 'Candidate does not satisfy the academic eligibility criteria' },
      { code: 'INVALID_CERTIFICATES', label: 'Invalid / Mismatched Certificates', description: 'Certificates provided contain mismatched details or invalid verification details' },
      { code: 'DUPLICATE_APPLICATION', label: 'Duplicate Application Found', description: 'A duplicate admission application has been registered for this candidate' },
      { code: 'AADHAAR_MISMATCH', label: 'Aadhaar Verification Failed', description: 'Aadhaar details could not be verified' },
      { code: 'USN_CONFLICT', label: 'USN Conflict / Already Exists', description: 'University Seat Number conflicts with an existing registration' },
      { code: 'OTHER', label: 'Other', description: 'Other rejection reason (additional comments provided in remarks)' },
    ]);
    console.log('✓ Rejection Reasons created.');

    // ─── 2. Subjects (CSE Semester 3) ─────────────────────────────────────
    const subjectsData = [
      { name: 'Database Management Systems', code: 'CS301', semester: 3 },
      { name: 'Data Structures & Algorithms', code: 'CS302', semester: 3 },
      { name: 'Computer Networks', code: 'CS303', semester: 3 },
      { name: 'Operating Systems', code: 'CS304', semester: 3 },
      { name: 'Discrete Mathematics', code: 'CS305', semester: 3 },
    ];
    await Subject.bulkCreate(subjectsData);
    console.log('✓ Subjects created.');

    // ─── 3. Users ──────────────────────────────────────────────────────────

    // Admin User
    const adminUser = await User.create({
      username: 'admin1',
      email: 'admin@college.com',
      passwordHash: 'password123',
      role: 'ADMIN',
      status: 'ACTIVE',
      firstName: 'Rajesh',
      lastName: 'Kumar',
      phone: '9876543200',
      profileImage: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&fit=crop',
    });

    // Principal User
    await User.create({
      username: 'principal1',
      email: 'principal@college.com',
      passwordHash: 'password123',
      role: 'PRINCIPAL',
      status: 'ACTIVE',
      firstName: 'Dr. Ramesh',
      lastName: 'Prasad',
      phone: '9876543201',
      profileImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&fit=crop',
    });

    // HOD User
    const hodUser = await User.create({
      username: 'hod1',
      email: 'hod@college.com',
      passwordHash: 'password123',
      role: 'HOD',
      status: 'ACTIVE',
      firstName: 'Dr. Sharma',
      lastName: 'Prasad',
      phone: '9876543202',
      profileImage: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&fit=crop',
    });

    // Teacher User
    const teacherUser = await User.create({
      username: 'teacher1',
      email: 'teacher@college.com',
      passwordHash: 'password123',
      role: 'TEACHER',
      status: 'ACTIVE',
      firstName: 'Sarah',
      lastName: 'Smith',
      phone: '9876543299',
      profileImage: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&fit=crop',
    });

    console.log('✓ Users created.');

    // ─── 4. Admin profile ──────────────────────────────────────────────────
    await Admin.create({
      userId: adminUser.id,
      designation: 'Senior Admission Officer',
      employeeId: 'EMP-001',
    });
    console.log('✓ Admin profile created.');

    await Teacher.create({
      userId: teacherUser.id,
      departmentId: cse.id,
      designation: 'Associate Professor',
      joiningDate: new Date('2020-08-01'),
    });

    await HOD.create({
      userId: hodUser.id,
      departmentId: cse.id,
      tenureStartDate: new Date('2022-01-01'),
      isActive: true,
      appointmentOrderNo: 'APP-HOD-2022-001',
      appointmentDate: new Date('2022-01-01'),
    });
    console.log('✓ Teacher and HOD details linked.');

    console.log('');
    console.log('='.repeat(55));
    console.log('  DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(55));
    console.log('');
    console.log('  LOGIN CREDENTIALS:');
    console.log('  Principal→ principal@college.com  / password123');
    console.log('  Admin    → admin@college.com      / password123');
    console.log('  HOD      → hod@college.com        / password123');
    console.log('  Teacher  → teacher@college.com    / password123');
    console.log('='.repeat(55));

    if (exitOnComplete) {
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    if (exitOnComplete) {
      process.exit(1);
    }
    throw error;
  }
}

// Run if called directly
if (process.argv[1]?.replace(/\\/g, '/').endsWith('src/seeds/index.ts')) {
  seed(true);
}
