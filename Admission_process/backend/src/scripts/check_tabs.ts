import db from '../config/database';

async function main() {
  await db.authenticate();
  const [tokens] = await db.query(`SELECT id, "userId", "googleAccountEmail", "userEmail", status, "tokenExpiry" FROM google_oauth_tokens ORDER BY "createdAt" DESC LIMIT 5`);
  console.log('TOKENS:', JSON.stringify(tokens, null, 2));

  const [connections] = await db.query(`SELECT id, semester, section, "sheetType", "googleSpreadsheetId", "googleAccountEmail", status FROM google_sheet_connections WHERE semester = 3 ORDER BY "createdAt" DESC`);
  console.log('CONNECTIONS:', JSON.stringify(connections, null, 2));

  const [tabs] = await db.query(`SELECT id, "googleSheetConnectionId", "googleSheetId", "sheetTitle", "sheetIndex", "sheetType", "subjectId", "subjectCode", status FROM google_sheet_tabs ORDER BY "createdAt" DESC LIMIT 20`);
  console.log('TABS:', JSON.stringify(tabs, null, 2));

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
