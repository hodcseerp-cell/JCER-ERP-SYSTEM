import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import sequelize from '../config/database';
import User from '../models/User';
import Admin from '../models/Admin';

async function updatePrivilegedAccounts() {
  console.log('\n====================================================');
  console.log('🔒 UPDATING PRIVILEGED ACCOUNTS FOR TESTING');
  console.log('====================================================\n');

  try {
    await sequelize.authenticate();
    console.log('✓ Database connection authenticated.');

    const adminEmail = process.env.INITIAL_ADMIN_EMAIL || 'arihantdesai483@gmail.com';
    const adminPassword = process.env.INITIAL_ADMIN_PASSWORD;

    const principalEmail = process.env.INITIAL_PRINCIPAL_EMAIL || 'arihantdesai47@gmail.com';
    const principalPassword = process.env.INITIAL_PRINCIPAL_PASSWORD;

    if (!adminPassword) {
      throw new Error('INITIAL_ADMIN_PASSWORD environment variable is missing.');
    }
    if (!principalPassword) {
      throw new Error('INITIAL_PRINCIPAL_PASSWORD environment variable is missing.');
    }

    const hashedAdminPassword = await bcrypt.hash(adminPassword, 10);
    const hashedPrincipalPassword = await bcrypt.hash(principalPassword, 10);

    // ─── 1. UPDATE EXISTING ADMIN ACCOUNT ──────────────────────────────────────
    let adminUsers = await User.findAll({
      where: {
        [Op.or]: [
          { role: 'ADMIN' },
          { role: 'SUPER_ADMIN' },
          { email: 'admin@college.com' },
          { email: adminEmail }
        ]
      },
      order: [['createdAt', 'ASC']]
    });

    let targetAdmin: User;

    if (adminUsers.length > 0) {
      targetAdmin = adminUsers[0];

      // Remove any other user record that claims adminEmail to avoid unique constraint error
      const extraUsersWithAdminEmail = await User.findAll({
        where: { email: adminEmail, id: { [Op.ne]: targetAdmin.id } }
      });
      for (const extra of extraUsersWithAdminEmail) {
        await Admin.destroy({ where: { userId: extra.id } });
        await extra.destroy();
      }

      // Remove extra admin accounts if more than 1 exist
      if (adminUsers.length > 1) {
        for (let i = 1; i < adminUsers.length; i++) {
          const extraUser = adminUsers[i];
          if (extraUser.id !== targetAdmin.id) {
            await Admin.destroy({ where: { userId: extraUser.id } });
            await extraUser.destroy();
          }
        }
      }

      await targetAdmin.update({
        username: adminEmail,
        email: adminEmail,
        passwordHash: hashedAdminPassword,
        role: 'ADMIN',
        status: 'ACTIVE',
        firstName: 'Shivakumar',
        lastName: 'Biradar',
        mustChangePassword: false,
      });

      // Ensure corresponding record in Admin table exists and links to targetAdmin.id
      const adminProfile = await Admin.findOne({ where: { userId: targetAdmin.id } });
      if (!adminProfile) {
        await Admin.create({
          userId: targetAdmin.id,
          designation: 'Senior Admission Officer',
          employeeId: 'EMP-001',
        });
      }

      console.log(`✓ Preserved Admin account ID [${targetAdmin.id}] and updated name to Shivakumar Biradar, email to: ${adminEmail}`);
    } else {
      targetAdmin = await User.create({
        username: adminEmail,
        email: adminEmail,
        passwordHash: hashedAdminPassword,
        role: 'ADMIN',
        status: 'ACTIVE',
        firstName: 'Shivakumar',
        lastName: 'Biradar',
        phone: '9876543200',
        mustChangePassword: false,
      });
      await Admin.create({
        userId: targetAdmin.id,
        designation: 'Senior Admission Officer',
        employeeId: 'EMP-001',
      });
      console.log(`✓ Created new Admin account ID [${targetAdmin.id}] with email: ${adminEmail}`);
    }

    // ─── 2. UPDATE EXISTING PRINCIPAL ACCOUNT ──────────────────────────────────
    let principalUsers = await User.findAll({
      where: {
        [Op.or]: [
          { role: 'PRINCIPAL' },
          { email: 'principal@college.com' },
          { email: principalEmail }
        ]
      },
      order: [['createdAt', 'ASC']]
    });

    let targetPrincipal: User;

    if (principalUsers.length > 0) {
      targetPrincipal = principalUsers[0];

      // Remove any other user record that claims principalEmail to avoid unique constraint error
      const extraUsersWithPrincipalEmail = await User.findAll({
        where: { email: principalEmail, id: { [Op.ne]: targetPrincipal.id } }
      });
      for (const extra of extraUsersWithPrincipalEmail) {
        await extra.destroy();
      }

      // Remove extra principal accounts if more than 1 exist
      if (principalUsers.length > 1) {
        for (let i = 1; i < principalUsers.length; i++) {
          const extraUser = principalUsers[i];
          if (extraUser.id !== targetPrincipal.id) {
            await extraUser.destroy();
          }
        }
      }

      await targetPrincipal.update({
        username: principalEmail,
        email: principalEmail,
        passwordHash: hashedPrincipalPassword,
        role: 'PRINCIPAL',
        status: 'ACTIVE',
        firstName: 'Dr. S.V.',
        lastName: 'Gorbal',
        phone: '9448693987',
        mustChangePassword: false,
      });

      console.log(`✓ Preserved Principal account ID [${targetPrincipal.id}] and updated name to Dr. S.V. Gorbal, email to: ${principalEmail}`);
    } else {
      targetPrincipal = await User.create({
        username: principalEmail,
        email: principalEmail,
        passwordHash: hashedPrincipalPassword,
        role: 'PRINCIPAL',
        status: 'ACTIVE',
        firstName: 'Dr. S.V.',
        lastName: 'Gorbal',
        phone: '9876543201',
        mustChangePassword: false,
      });
      console.log(`✓ Created new Principal account ID [${targetPrincipal.id}] with email: ${principalEmail}`);
    }

    // ─── 3. VERIFICATION CHECKS ──────────────────────────────────────────────
    console.log('\n----------------------------------------------------');
    console.log('🔍 RUNNING DATABASE VERIFICATION CHECKS...');
    console.log('----------------------------------------------------');

    const adminCount = await User.count({ where: { role: 'ADMIN' } });
    const principalCount = await User.count({ where: { role: 'PRINCIPAL' } });

    const oldAdminCheck = await User.findOne({ where: { email: 'admin@college.com' } });
    const oldPrincipalCheck = await User.findOne({ where: { email: 'principal@college.com' } });

    console.log(`• Total Active ADMIN Accounts in DB    : ${adminCount} (Expected: 1)`);
    console.log(`• Total Active PRINCIPAL Accounts in DB: ${principalCount} (Expected: 1)`);
    console.log(`• admin@college.com query result       : ${oldAdminCheck ? 'FOUND (FAIL)' : 'NOT FOUND (PASS)'}`);
    console.log(`• principal@college.com query result   : ${oldPrincipalCheck ? 'FOUND (FAIL)' : 'NOT FOUND (PASS)'}`);

    if (adminCount === 1 && principalCount === 1 && !oldAdminCheck && !oldPrincipalCheck) {
      console.log('\n====================================================');
      console.log('🎉 PRIVILEGED ACCOUNT SEEDING/UPDATE SUCCESSFUL');
      console.log('====================================================\n');
    } else {
      throw new Error('Verification checks failed. Please inspect database records.');
    }

    process.exit(0);
  } catch (err: any) {
    console.error('❌ Script failed:', err.message);
    if (err.errors) {
      console.error('Detailed validation errors:', JSON.stringify(err.errors, null, 2));
    }
    process.exit(1);
  }
}

updatePrivilegedAccounts();
