import axios from 'axios';

async function main() {
  const id = '1NGa1hRfqtNWblH_Tq6NAGsTdjoA2FM47';
  console.log('Testing ID:', id);

  try {
    const res = await axios.get(`https://docs.google.com/spreadsheets/d/${id}/htmlview`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 8000,
      validateStatus: () => true,
    });
    console.log('HTMLView Status:', res.status);
    console.log('HTMLView Title match:', String(res.data).match(/<title>([^<]+)<\/title>/i));
    console.log('HTMLView contains xlsx?', /xlsx/i.test(String(res.data)));
    console.log('HTMLView snippet:', String(res.data).substring(0, 500));
  } catch (e: any) {
    console.log('HTMLView Err:', e.message);
  }

  try {
    const res2 = await axios.get(`https://sheets.googleapis.com/v4/spreadsheets/${id}`, {
      validateStatus: () => true,
    });
    console.log('Sheets API no-auth Status:', res2.status);
    console.log('Sheets API no-auth Data:', res2.data);
  } catch (e: any) {
    console.log('Sheets API Err:', e.message);
  }
}

main().catch(console.error);
