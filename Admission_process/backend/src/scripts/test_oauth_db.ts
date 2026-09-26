import GoogleOAuthToken from '../models/GoogleOAuthToken';
import db from '../config/database';

async function main() {
  await db.authenticate();
  const tokens = await GoogleOAuthToken.findAll();
  console.log('ACTIVE TOKENS COUNT:', tokens.length);
  for (const t of tokens) {
    console.log({
      id: t.id,
      userId: t.userId,
      connectedBy: t.connectedBy,
      departmentId: t.departmentId,
      userEmail: t.userEmail,
      googleAccountEmail: t.googleAccountEmail,
      status: t.status,
      tokenExpiry: t.tokenExpiry,
      updatedAt: t.updatedAt,
    });
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
