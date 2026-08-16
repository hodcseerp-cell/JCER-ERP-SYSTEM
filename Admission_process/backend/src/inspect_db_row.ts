import Admission from './models/Admission';
import AdmissionDocument from './models/AdmissionDocument';
import User from './models/User';
import db from './config/database';

async function main() {
  try {
    console.log("Connecting to DB...");
    await db.authenticate();
    const id = "67bebe6d-e211-460e-a5c7-c7e5e8ea0a02";
    console.log("Fetching student details for ID:", id);
    const student = await Admission.findByPk(id, {
      include: [
        { model: User, as: 'user' },
        { model: AdmissionDocument, as: 'studentdocuments' }
      ]
    });
    if (student) {
      console.log("Admission Application Status:", student.applicationStatus);
      console.log("User profileImage:", student.user?.profileImage);
      console.log("Student Documents photoUrl:", student.studentdocuments?.photoUrl);
    } else {
      console.log("Student not found!");
    }
  } catch (err) {
    console.error("Error inspecting database row:", err);
  } finally {
    await db.close();
  }
}

main();
