const cron = require('node-cron');
const pool = require('../config/db');

const initCleanupJob = () => {
  // Run every day at midnight (00:00)
  cron.schedule('0 0 * * *', async () => {
    console.log('[CRON] Running daily cleanup of expired criminals...');
    try {
      // Deletes criminals where period_till is a valid date in the past
      // The ::date cast safely handles YYYY-MM-DD formats
      const query = `
        DELETE FROM criminals 
        WHERE period_till IS NOT NULL 
          AND period_till != '' 
          AND period_till ~ '^\\d{4}-\\d{2}-\\d{2}$'
          AND period_till::date < CURRENT_DATE
        RETURNING id, name;
      `;
      const res = await pool.query(query);
      if (res.rowCount > 0) {
        console.log(`[CRON] Successfully deleted ${res.rowCount} expired criminals.`);
        res.rows.forEach(c => console.log(`   - Deleted: ${c.name} (ID: ${c.id})`));
      } else {
        console.log('[CRON] No expired criminals found today.');
      }
    } catch (err) {
      console.error('[CRON] Error running cleanup job:', err.message);
    }
  });

  console.log('[CRON] Expiration cleanup job scheduled (runs daily at midnight).');
};

module.exports = { initCleanupJob };
