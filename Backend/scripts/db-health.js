const { query, pool } = require('./config/db');

async function runHealthCheck() {
  console.log("=== Database Health Check ===");
  try {
    // Check connections
    const connResult = await query("SELECT count(*) FROM pg_stat_activity;");
    console.log(`Active Connections: ${connResult.rows[0].count}`);

    // Check sizes
    const sizeResult = await query(`
      SELECT relname as "table",
             pg_size_pretty(pg_total_relation_size(relid)) As "size"
      FROM pg_catalog.pg_statio_user_tables
      ORDER BY pg_total_relation_size(relid) DESC;
    `);
    console.log("\nTable Sizes:");
    sizeResult.rows.forEach(r => console.log(`- ${r.table}: ${r.size}`));

    // Check slow queries (if pg_stat_statements is enabled)
    try {
      const slowQuery = await query(`
        SELECT query, calls, total_exec_time, mean_exec_time
        FROM pg_stat_statements
        ORDER BY mean_exec_time DESC
        LIMIT 5;
      `);
      console.log("\nTop 5 Slowest Queries:");
      slowQuery.rows.forEach(r => {
        console.log(`- ${Math.round(r.mean_exec_time)}ms (called ${r.calls} times) | ${r.query.slice(0, 100)}...`);
      });
    } catch (e) {
      console.log("\n(pg_stat_statements extension not enabled, skipping slow query stats)");
    }

  } catch (err) {
    console.error("Health check failed:", err);
  } finally {
    await pool.end();
  }
}

runHealthCheck();
