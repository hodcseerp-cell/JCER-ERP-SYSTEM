import db from '../config/database';
import googleOAuthService from '../services/googleOAuth.service';
import axios from 'axios';

async function main() {
  await db.authenticate();
  const userId = 'e7179a56-e5de-4cdf-9f8c-e77100f046c6';
  const tokenInfo = await googleOAuthService.getValidAccessTokenForUser(userId);
  console.log('Got token for:', tokenInfo?.email);
  if (!tokenInfo?.token) {
    console.log('No token');
    process.exit(1);
  }

  const sIds = ['1BQqtWNY-2N0KHEDvqj-kjHqguk5NInRG', '1NGa1hRfqtNWblH_Tq6NAGsTdjoA2FM47'];
  for (const sId of sIds) {
    console.log('\n--- Testing spreadsheet:', sId, '---');
    try {
      const driveRes = await axios.get(
        `https://www.googleapis.com/drive/v3/files/${sId}?fields=id,name,mimeType,owners,capabilities`,
        { headers: { Authorization: `Bearer ${tokenInfo.token}` } }
      );
      console.log('Drive File:', driveRes.data);
    } catch (err: any) {
      console.log('Drive Error:', err.response?.status, err.response?.data || err.message);
    }

    try {
      const sheetsRes = await axios.get(
        `https://sheets.googleapis.com/v4/spreadsheets/${sId}?fields=properties.title,sheets.properties`,
        { headers: { Authorization: `Bearer ${tokenInfo.token}` } }
      );
      console.log('Sheets Title:', sheetsRes.data?.properties?.title);
      console.log('Sheets Tabs:', sheetsRes.data?.sheets?.map((s: any) => ({
        sheetId: s.properties?.sheetId,
        title: s.properties?.title,
        index: s.properties?.index
      })));
    } catch (err: any) {
      console.log('Sheets Error:', err.response?.status, err.response?.data || err.message);
    }
  }
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
