import AdmissionAcademicDetail from '../models/AdmissionAcademicDetail.js';
import { Op } from 'sequelize';

async function run() {
  try {
    const [affectedCount] = await AdmissionAcademicDetail.update(
      { twelfthStream: 'SCIENCE' },
      {
        where: {
          twelfthStream: { [Op.or]: [null, ''] },
          twelfthSchool: { [Op.ne]: null }
        }
      }
    );
    console.log(`Updated ${affectedCount} records with default SCIENCE stream.`);
    process.exit(0);
  } catch (err) {
    console.error('Failed to run update script:', err);
    process.exit(1);
  }
}
run();
