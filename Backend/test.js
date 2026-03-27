require('dotenv').config();
const { CompareFacesCommand } = require('@aws-sdk/client-rekognition');
const { rekognitionClient }   = require('./config/rekognition');
const fs = require('fs');
const path = require('path');

/**
 * Pass local image paths directly as buffers — no Cloudinary needed
 * Usage: node test-face-local.js ./photo1.jpg ./photo2.jpg
 */
async function testLocal(img1Path, img2Path) {
  console.log('\n🔍 Testing face similarity with local images...\n');
  console.log(`📸 Image 1: ${img1Path}`);
  console.log(`🤳 Image 2: ${img2Path}\n`);

  if (!fs.existsSync(img1Path)) return console.error(`❌ File not found: ${img1Path}`);
  if (!fs.existsSync(img2Path)) return console.error(`❌ File not found: ${img2Path}`);

  const sourceBuffer = fs.readFileSync(img1Path);
  const targetBuffer = fs.readFileSync(img2Path);

  const command = new CompareFacesCommand({
    SourceImage:         { Bytes: sourceBuffer },
    TargetImage:         { Bytes: targetBuffer },
    SimilarityThreshold: 0, // 0 = show ALL results, even low matches
  });

  try {
    const response = await rekognitionClient.send(command);

    if (!response.FaceMatches || response.FaceMatches.length === 0) {
      console.log('❌ No face match found.');
      console.log(`   Unmatched faces detected: ${response.UnmatchedFaces?.length ?? 0}`);
      return;
    }

    const best = response.FaceMatches.sort((a, b) => b.Similarity - a.Similarity)[0];

    console.log('✅ MATCH FOUND');
    console.log(`   Similarity : ${best.Similarity.toFixed(2)}%`);
    console.log(`   Confidence : ${best.Face.Confidence.toFixed(2)}%`);
    console.log(`   Verified   : ${best.Similarity >= 80 ? '✅ YES (≥80%)' : '❌ NO (<80%)'}`);

  } catch (err) {
    if (err.name === 'InvalidParameterException') {
      console.error('❌ No face detected in one or both images.');
    } else if (err.name === 'InvalidImageFormatException') {
      console.error('❌ Invalid image format. Use JPEG or PNG only.');
    } else {
      console.error('💥 AWS Error:', err.message);
    }
  }
}

// Read paths from command line args
const [,, img1, img2] = process.argv;

if (!img1 || !img2) {
  console.log('Usage: node test-face-local.js <image1> <image2>');
  console.log('Example: node test-face-local.js ./person1.jpg ./person2.jpg');
  process.exit(1);
}

testLocal(
  path.resolve(img1),
  path.resolve(img2)
);