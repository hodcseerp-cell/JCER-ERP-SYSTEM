import db from './config/database';
import User from './models/User';
import Admission from './models/Admission';

async function run() {
  try {
    await db.authenticate();
    const user = await User.findOne({
      where: { email: 'yuvaraj.talawar@gmail.com' } // fallback or search by name
    }) || await User.findOne({
      where: db.where(db.cast(db.col('id'), 'text'), { $like: 'bd999a16%' } as any)
    });
    
    if (!user) {
      console.log('User not found');
      const allUsers = await User.findAll({ limit: 5 });
      console.log('All Users:', allUsers.map(u => ({ id: u.id, email: u.email, name: `${u.firstName} ${u.lastName}` })));
      process.exit(0);
    }
    
    console.log('Found User:', { id: user.id, name: `${user.firstName} ${user.lastName}`, email: user.email });
    
    const admission = await Admission.findOne({
      where: { userId: user.id }
    });
    
    if (admission) {
      console.log('Admission Record:', {
        id: admission.id,
        applicationStatus: admission.applicationStatus,
        correctionRequestedSections: admission.correctionRequestedSections,
        correctionRemarks: admission.correctionRemarks,
        adminRemarks: admission.adminRemarks
      });
    } else {
      console.log('No admission record found for this user.');
    }
  } catch (err) {
    console.error('Error:', err);
  }
  process.exit(0);
}
run();
