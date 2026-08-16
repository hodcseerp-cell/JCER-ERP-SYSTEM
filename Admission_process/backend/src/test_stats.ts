import admissionService from './services/admission.service';
import db from './config/database';

async function main() {
  try {
    console.log("Connecting to DB...");
    await db.authenticate();
    console.log("DB connected successfully. Fetching dashboard stats...");
    const stats = await admissionService.getDashboardStats();
    console.log("Stats fetched successfully:", stats);
  } catch (err) {
    console.error("Error fetching stats:", err);
  } finally {
    await db.close();
  }
}

main();
