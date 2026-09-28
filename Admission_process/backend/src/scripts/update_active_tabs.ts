import db from '../config/database';
import GoogleSheetConnection from '../models/GoogleSheetConnection';
import GoogleSheetTab from '../models/GoogleSheetTab';
import Subject from '../models/Subject';

async function updateTabs() {
  await db.authenticate();
  console.log('Database connected.');

  const connection = await GoogleSheetConnection.findOne({
    where: {
      semester: 3,
      section: 'A',
      sheetType: 'ATTENDANCE',
      status: 'ACTIVE',
    },
  });

  if (!connection) {
    console.log('No active Section A connection found.');
    process.exit(0);
  }

  console.log('Found connection:', connection.id);

  const departmentSubjects = await Subject.findAll({
    where: { semester: 3 },
  });

  const realTabs = [
    { gid: '1097112166', title: 'CS301', index: 0 },
    { gid: '1097112167', title: 'CS302', index: 1 },
    { gid: '1097112168', title: 'CS303', index: 2 },
    { gid: '1097112169', title: 'CS304', index: 3 },
    { gid: '1097112170', title: 'BCS305', index: 4 },
    { gid: '1097112171', title: 'com project', index: 5 },
    { gid: '1097112172', title: 'Final', index: 6 },
  ];

  // Remove old inaccurate tabs for this connection
  await GoogleSheetTab.destroy({
    where: { googleSheetConnectionId: connection.id },
  });

  for (const t of realTabs) {
    const cleanUpper = t.title.trim().toUpperCase();
    const isSpecialTab = cleanUpper === 'FINAL' || cleanUpper.includes('FINAL MARKS');
    const tabNumberMatch = cleanUpper.match(/\d+/);
    const tabNumber = tabNumberMatch ? tabNumberMatch[0] : '';

    const matchedSubject = !isSpecialTab
      ? departmentSubjects.find((sub) => {
          const cleanCode = (sub.code || '').trim().toUpperCase();
          const cleanName = (sub.name || '').trim().toUpperCase();
          const codeNumberMatch = cleanCode.match(/\d+/);
          const codeNumber = codeNumberMatch ? codeNumberMatch[0] : '';

          return (
            cleanUpper === cleanCode ||
            cleanUpper.includes(cleanCode) ||
            cleanCode.includes(cleanUpper) ||
            cleanName.includes(cleanUpper) ||
            (Boolean(tabNumber) && Boolean(codeNumber) && tabNumber === codeNumber)
          );
        })
      : null;

    const created = await GoogleSheetTab.create({
      googleSheetConnectionId: connection.id,
      googleSpreadsheetId: connection.googleSpreadsheetId,
      googleSheetId: t.gid,
      sheetTitle: t.title, // Exact immutable tab name: CS301, CS302, etc.
      sheetIndex: t.index,
      sheetType: isSpecialTab ? 'SPECIAL' : 'SUBJECT',
      subjectId: matchedSubject?.id || null,
      subjectCode: matchedSubject?.code || (isSpecialTab ? null : t.title),
      status: matchedSubject ? 'MAPPED' : isSpecialTab ? 'IGNORED' : 'UNMAPPED',
      isHidden: false,
    });

    console.log(`Created tab: [${t.title}] -> Mapped to: [${matchedSubject ? `${matchedSubject.code} — ${matchedSubject.name}` : 'Unmapped'}]`);
  }

  console.log('Tabs updated successfully.');
  process.exit(0);
}

updateTabs().catch((err) => {
  console.error(err);
  process.exit(1);
});
