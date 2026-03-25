require('dotenv').config();
const { verifyFace } = require('./utils/faceVerification');
const { query }      = require('./config/db');

async function run() {

  // ✅ HARDCODE YOUR CRIMINAL ID HERE
  const CRIMINAL_ID = 7;  // ← put your criminal's id here

  const res = await query(
    `SELECT id, name, photo_url FROM criminals WHERE id = $1`,
    [CRIMINAL_ID]
  );

  if (!res.rows[0]) {
    console.error(`❌ No criminal found with id ${CRIMINAL_ID}`);
    process.exit(1);
  }

  if (!res.rows[0].photo_url) {
    console.error(`❌ Criminal id ${CRIMINAL_ID} has no registered photo_url`);
    process.exit(1);
  }

  const { id, name, photo_url } = res.rows[0];

  // Grab their latest selfie from checkins
  const checkin = await query(
    `SELECT selfie_url FROM checkins
     WHERE criminal_id = $1
     ORDER BY checked_in_at DESC LIMIT 1`,
    [id]
  );

  if (!checkin.rows[0]) {
    console.error('❌ No past checkin selfie found for this criminal');
    console.log('💡 This criminal has never checked in before.');
    console.log('   Either do a checkin first, or hardcode two Cloudinary URLs manually:\n');
    console.log('   const result = await verifyFace("REGISTERED_PHOTO_URL", "SELFIE_URL")');
    process.exit(1);
  }

  const { selfie_url } = checkin.rows[0];

  console.log(`\n👤 Criminal  : ${name} (id: ${id})`);
  console.log(`📸 Registered: ${photo_url}`);
  console.log(`🤳 Selfie    : ${selfie_url}\n`);
  console.log('🔍 Running face verification...\n');

  const result = await verifyFace(photo_url, selfie_url);

  console.log('── Result ───────────────────────────────');
  console.log(`  Status     : ${result.faceCheckStatus}`);
  console.log(`  Verified   : ${result.verified}`);
  console.log(`  Similarity : ${result.similarity}%`);
  console.log(`  Reason     : ${result.reason}`);
  console.log('─────────────────────────────────────────');

  if (result.verified)                                  console.log('\n✅ PASS — Same person detected');
  else if (result.faceCheckStatus === 'no_face')        console.log('\n⚠️  No face in image');
  else if (result.faceCheckStatus === 'multiple_faces') console.log('\n⚠️  Multiple faces detected');
  else                                                  console.log('\n❌ FAIL — Face mismatch');

  process.exit(0);
}

run().catch(err => {
  console.error('💥 Error:', err.message);
  process.exit(1);
});