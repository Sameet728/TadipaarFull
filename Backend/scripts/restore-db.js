require('dotenv').config({ path: '../.env' });
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is missing in .env");
  process.exit(1);
}

const args = process.argv.slice(2);
const backupFile = args[0];

if (!backupFile) {
  console.error("Usage: node restore-db.js <path-to-backup.sql>");
  process.exit(1);
}

if (!fs.existsSync(backupFile)) {
  console.error(`File not found: ${backupFile}`);
  process.exit(1);
}

console.log(`Starting restore from ${backupFile}...`);
console.log(`WARNING: This will overwrite existing data! Proceeding in 5 seconds...`);

setTimeout(() => {
  const command = `psql "${DATABASE_URL}" -f "${backupFile}"`;
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Restore failed: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`stderr: ${stderr}`);
    }
    console.log('Database restore completed successfully.');
  });
}, 5000);
