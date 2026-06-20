require('dotenv').config({ path: '../.env' });
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is missing in .env");
  process.exit(1);
}

const BACKUP_DIR = path.join(__dirname, '../backups');
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupFile = path.join(BACKUP_DIR, `backup-${timestamp}.sql`);

console.log(`Starting backup to ${backupFile}...`);

// Use pg_dump via exec
// Note: pg_dump must be installed on the host system.
const command = `pg_dump "${DATABASE_URL}" -f "${backupFile}"`;

exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error(`Backup failed: ${error.message}`);
    return;
  }
  if (stderr) {
    console.error(`stderr: ${stderr}`);
  }
  console.log('Database backup completed successfully.');
});
