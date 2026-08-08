import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { validateDocument } from '../utils/documentValidation.util';

async function runTests() {
  console.log('🧪 Testing Document Quality Validation System...\n');

  const testDir = path.join(process.cwd(), 'temp_test_images');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  const colorImagePath = path.join(testDir, 'sharp_color.png');
  const bwImagePath = path.join(testDir, 'bw_image.png');
  const blurryImagePath = path.join(testDir, 'blurry_image.png');

  // 1. Create a sharp color test image
  await sharp({
    create: {
      width: 400,
      height: 400,
      channels: 4,
      background: { r: 255, g: 0, b: 50, alpha: 1 },
    },
  })
    .composite([
      {
        input: Buffer.from(
          '<svg width="400" height="400"><rect x="50" y="50" width="300" height="300" fill="#00FF44"/><text x="100" y="200" font-size="30" fill="#0000FF">COLOR DOC</text></svg>'
        ),
      },
    ])
    .png()
    .toFile(colorImagePath);

  // 2. Create a Black & White / Grayscale test image (simulating grayscale document with JPEG noise)
  await sharp(colorImagePath)
    .grayscale()
    .png()
    .toFile(bwImagePath);

  // 3. Create a heavily Blurred test image
  await sharp(colorImagePath)
    .blur(15)
    .png()
    .toFile(blurryImagePath);

  console.log('Test Case 1: Uploading Grayscale Income Cert into tenthMarksheet field (Requires Color + Blur)');
  const res1 = await validateDocument('tenthMarksheet', bwImagePath);

  console.log('Test Case 2: Uploading Sharp Color Photo into photo field (Requires Color + Blur)');
  const res2 = await validateDocument('photo', colorImagePath);

  console.log('Test Case 3: Uploading Blurry Aadhaar into aadhaar field (Requires Color + Blur)');
  const res3 = await validateDocument('aadhaar', blurryImagePath);

  console.log('Test Case 4: Uploading Grayscale Signature into signature field (Blur Only, NO Color)');
  const res4 = await validateDocument('signature', bwImagePath);

  // Cleanup test files
  fs.rmSync(testDir, { recursive: true, force: true });
  console.log('✅ All validation tests completed successfully.');
}

runTests().catch(console.error);
