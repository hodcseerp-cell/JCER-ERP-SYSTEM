/**
 * Full end-to-end diagnostic:
 * 1. Login as admin
 * 2. List all admissions 
 * 3. Find one with documents
 * 4. Try fetching each document field directly via the streaming endpoint
 * 5. Check R2 bucket listing
 */
import axios from 'axios';
import * as r2 from './services/r2.service';
import AdmissionDocument from './models/AdmissionDocument';
import Admission from './models/Admission';
import User from './models/User';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const BASE = 'http://localhost:5000/api';

const DOCUMENT_FIELD_MAP: Record<string, string> = {
  photo:                    'photoUrl',
  signature:                'signatureUrl',
  tenthMarksheet:           'tenthMarksheetUrl',
  twelfthMarksheet:         'twelfthMarksheetUrl',
  diplomaSemester5Marksheet:'diplomaSemester5MarksheetUrl',
  diplomaSemester6Marksheet:'diplomaSemester6MarksheetUrl',
  cetScoreCard:             'cetScoreCardUrl',
  aadhaar:                  'aadhaarUrl',
  casteCertificate:         'casteCertificateUrl',
  domicileCertificate:      'domicileCertificateUrl',
  gapCertificate:           'gapCertificateUrl',
  feesPaidReceipt:          'feesPaidReceiptUrl',
  admissionFormFeeReceipt:  'admissionFormFeeReceiptUrl',
};

async function run() {
  console.log('\n============================================');
  console.log(' JCER ERP — DOCUMENT PIPELINE DIAGNOSTIC');
  console.log('============================================\n');

  // 1. Login
  console.log('► STEP 1: Login as admin...');
  const loginRes = await axios.post(`${BASE}/auth/login`, {
    email: 'admin@college.com',
    password: 'password123',
  });
  const token = loginRes.data.data.token;
  console.log('  ✅ Login successful. Token obtained.\n');

  // 2. Get admission with documents
  console.log('► STEP 2: Fetching admissions from database...');
  const admissions = await Admission.findAll({
    include: [
      { model: User, as: 'user', attributes: ['id', 'email', 'firstName', 'lastName'] },
      { model: AdmissionDocument, as: 'studentdocuments' }
    ],
    limit: 10
  });
  console.log(`  Found ${admissions.length} admission(s) in database.`);
  if (admissions.length === 0) {
    console.error('  ❌ No admissions found. Students may not have submitted applications.');
    return;
  }

  const withDocs = admissions.find(a => a.studentdocuments && 
    Object.values(a.studentdocuments.toJSON()).some(v => typeof v === 'string' && v.length > 5)
  );

  if (!withDocs) {
    console.log('  ⚠️  No admission found with uploaded documents.');
    console.log('  All admissions:');
    for (const a of admissions) {
      console.log(`    - ${a.applicationNumber} | Status: ${a.applicationStatus} | Has docs: ${!!a.studentdocuments}`);
    }
    return;
  }

  console.log(`  ✅ Using admission: ${withDocs.applicationNumber} (${withDocs.user?.email})\n`);

  // 3. Check raw document URLs stored in DB
  console.log('► STEP 3: Checking raw document URLs in database...');
  const docs = withDocs.studentdocuments!.toJSON() as Record<string, any>;
  let hasAnyDoc = false;
  for (const [field, dbKey] of Object.entries(DOCUMENT_FIELD_MAP)) {
    const val = docs[dbKey];
    if (val) {
      hasAnyDoc = true;
      const isR2 = !val.startsWith('/uploads') && !val.startsWith('uploads/') && !val.startsWith('http');
      console.log(`  [${field}] = "${val.substring(0, 60)}..." → ${isR2 ? '☁️ R2 key' : '📁 Local path'}`);
    }
  }
  if (!hasAnyDoc) {
    console.log('  ⚠️  No documents found in database for this admission!');
  }
  console.log('');

  // 4. Test R2 direct access
  console.log('► STEP 4: Testing R2 direct access for each document...');
  for (const [field, dbKey] of Object.entries(DOCUMENT_FIELD_MAP)) {
    const val = docs[dbKey];
    if (!val) continue;
    const isR2 = !val.startsWith('/uploads') && !val.startsWith('uploads/') && !val.startsWith('http');
    if (isR2) {
      try {
        const buffer = await r2.getFile(val);
        console.log(`  ✅ [${field}] R2 fetch success: ${buffer.length} bytes`);
      } catch (err: any) {
        console.error(`  ❌ [${field}] R2 fetch FAILED: ${err.message}`);
        console.error(`      Key: ${val}`);
      }
    }
  }
  console.log('');

  // 5. Test streaming endpoint via HTTP
  console.log('► STEP 5: Testing streaming endpoint via HTTP...');
  for (const field of Object.keys(DOCUMENT_FIELD_MAP)) {
    const dbKey = DOCUMENT_FIELD_MAP[field];
    const val = docs[dbKey];
    if (!val) continue;
    try {
      const url = `${BASE}/admin/admissions/${withDocs.id}/documents/${field}?token=${encodeURIComponent(token)}`;
      const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 10000 });
      console.log(`  ✅ [${field}] HTTP stream: ${res.status} | ${res.headers['content-type']} | ${res.data.byteLength} bytes`);
    } catch (err: any) {
      console.error(`  ❌ [${field}] HTTP stream FAILED: ${err.response?.status || err.message}`);
      if (err.response?.data) {
        const text = Buffer.from(err.response.data).toString('utf-8');
        console.error(`      Response: ${text.substring(0, 200)}`);
      }
    }
  }

  // 6. R2 bucket listing
  console.log('\n► STEP 6: R2 bucket listing (first 5 files)...');
  try {
    const AWS = require('aws-sdk');
    const s3 = new AWS.S3({
      endpoint: process.env.R2_ENDPOINT,
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      signatureVersion: 'v4',
      region: process.env.R2_REGION || 'auto',
    });
    const listed = await s3.listObjectsV2({ Bucket: process.env.R2_BUCKET_NAME, MaxKeys: 5 }).promise();
    console.log(`  ✅ R2 connected. ${listed.Contents?.length || 0} files listed:`);
    listed.Contents?.forEach((f: any) => console.log(`    - ${f.Key} (${f.Size} bytes)`));
  } catch (err: any) {
    console.error(`  ❌ R2 bucket listing FAILED: ${err.message}`);
  }

  console.log('\n============================================');
  console.log(' DIAGNOSTIC COMPLETE');
  console.log('============================================\n');
}

run().catch(console.error);
