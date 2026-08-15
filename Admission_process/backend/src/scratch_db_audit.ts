import db from './config/database';
import Department from './models/Department';
import UsnRegistry from './models/UsnRegistry';

async function run() {
  try {
    await db.authenticate();
    console.log('Database connected.');
    
    const depts = await Department.findAll();
    console.log('--- DEPARTMENTS ---');
    depts.forEach(d => {
      console.log(`ID: ${d.id}, Name: ${d.name}, Code: ${d.code}`);
    });
    
    const usns = await UsnRegistry.findAll({ limit: 10 });
    console.log('--- USN REGISTRY SAMPLES ---');
    usns.forEach(u => {
      console.log(`USN: ${u.usn}, Name: ${u.studentName}, DeptCode: ${u.departmentCode}, Status: ${u.status}`);
    });
    
  } catch (err) {
    console.error('Audit Error:', err);
  }
  process.exit(0);
}
run();
