# Disaster Recovery & Backup Guide

## Database Backups
A script is provided in `Backend/scripts/backup-db.js` which executes `pg_dump`. 

### Scheduling Backups
Configure a CRON job on the host server to run the script daily:
`0 2 * * * cd /path/to/Backend && node scripts/backup-db.js >> /var/log/db-backup.log 2>&1`

The script will save SQL dumps into the `Backend/backups` directory. It is highly recommended to sync this folder to AWS S3 or a secondary volume.

## Database Restoration
If data is corrupted or the database server fails:
1. Locate the latest safe backup in the `backups` directory.
2. Run the restore script: `node scripts/restore-db.js ../backups/backup-YYYY-MM-DD.sql`
**WARNING:** The restore script will overwrite existing data.

## Service Outages
### Node.js Process Crash
- **Behavior:** The application goes down.
- **Recovery:** PM2 will automatically detect the crash and restart the worker process instantly. No manual intervention is needed.
- **Logs:** Check `pm2 logs tadipaar-api`.

### High Memory Usage
- **Behavior:** The Node.js process consumes > 800MB RAM.
- **Recovery:** PM2 is configured to automatically restart the process if memory exceeds 800MB (`max_memory_restart: '800M'`). This prevents hard lockups.

### Database Connection Loss
- **Behavior:** The backend logs "Connection terminated unexpectedly".
- **Recovery:** The Node.js `pg-pool` is configured to retry connections. If the database goes offline, API requests will hang for up to 15 seconds (timeout middleware) before failing gracefully. Once the DB returns, the backend will auto-recover.
