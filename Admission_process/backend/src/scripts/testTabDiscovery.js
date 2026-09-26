const axios = require('axios');

async function discoverGoogleTabs(spreadsheetId, accessToken) {
  // 1. Try Google Sheets API v4 with OAuth token
  if (accessToken && !accessToken.startsWith('mock-')) {
    try {
      const response = await axios.get(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title,sheets.properties`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          timeout: 7000,
        }
      );
      const sheets = response.data?.sheets || [];
      if (sheets.length > 0) {
        return {
          title: response.data?.properties?.title || 'Spreadsheet',
          tabs: sheets.map((s) => ({
            sheetId: String(s.properties?.sheetId ?? '0'),
            title: String(s.properties?.title || ''),
            index: Number(s.properties?.index || 0),
            hidden: Boolean(s.properties?.hidden || false),
          })),
        };
      }
    } catch (apiErr) {
      console.log('OAuth Sheets API failed, falling back to public discovery:', apiErr?.message);
    }
  }

  // 2. Try HTML View discovery (works for public / domain-accessible sheets)
  try {
    const htmlRes = await axios.get(
      `https://docs.google.com/spreadsheets/d/${spreadsheetId}/htmlview`,
      {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: 7000,
      }
    );
    const html = String(htmlRes.data || '');
    
    // Extract title
    let title = 'Spreadsheet';
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    if (titleMatch) {
      title = titleMatch[1].replace(/\s*-\s*Google Sheets\s*$/i, '').trim();
    }

    // Extract tabs from sheet-button or gid links
    const tabs = [];
    const seenGids = new Set();
    const sheetRegex = /<li\s+id=["']sheet-button-([0-9]+)["'][^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/gi;
    let match;
    while ((match = sheetRegex.exec(html)) !== null) {
      const gid = match[1];
      const tabTitle = match[2].trim();
      if (!seenGids.has(gid) && tabTitle) {
        seenGids.add(gid);
        tabs.push({
          sheetId: gid,
          title: tabTitle,
          index: tabs.length,
          hidden: false,
        });
      }
    }

    if (tabs.length === 0) {
      // Fallback regex for gid links
      const linkRegex = /href=["']#gid=([0-9]+)["'][^>]*>([^<]+)<\/a>/gi;
      while ((match = linkRegex.exec(html)) !== null) {
        const gid = match[1];
        const tabTitle = match[2].trim();
        if (!seenGids.has(gid) && tabTitle) {
          seenGids.add(gid);
          tabs.push({
            sheetId: gid,
            title: tabTitle,
            index: tabs.length,
            hidden: false,
          });
        }
      }
    }

    if (tabs.length > 0) {
      return { title, tabs };
    }
  } catch (htmlErr) {
    console.log('HTML View discovery failed:', htmlErr.message);
  }

  return null;
}

// Test with spreadsheet
async function main() {
  console.log('Testing Tab Discovery for standard spreadsheets...');
  const result = await discoverGoogleTabs('1BQqtwNY-2N0I0-IEDvqj-kjHgqukSNInRG');
  console.log('Result:', JSON.stringify(result, null, 2));
}

main();
