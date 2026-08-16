import AWS from 'aws-sdk';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const s3 = new AWS.S3({
  endpoint: process.env.R2_ENDPOINT,
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  signatureVersion: 'v4',
  region: process.env.R2_REGION || 'auto',
});

const BUCKET = process.env.R2_BUCKET_NAME || '';

async function runTest() {
  console.log('Testing Cloudflare R2 Connection...');
  console.log(`Endpoint: ${process.env.R2_ENDPOINT}`);
  console.log(`Bucket: ${BUCKET}`);
  
  try {
    const data = await s3.listObjectsV2({
      Bucket: BUCKET,
      MaxKeys: 5
    }).promise();
    
    console.log('\n✅ Cloudflare R2 is CONNECTED successfully!');
    console.log(`Found ${data.Contents?.length || 0} files in bucket:`);
    data.Contents?.forEach(file => {
      console.log(` - ${file.Key} (${(file.Size || 0) / 1024} KB)`);
    });
  } catch (error: any) {
    console.error('\n❌ Cloudflare R2 Connection FAILED!');
    console.error('Error Code:', error.code);
    console.error('Error Message:', error.message);
  }
}

runTest();
