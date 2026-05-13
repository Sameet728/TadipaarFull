const { query } = require('./db');

/**
 * Idempotent DDL only — safe on every request / server start.
 * Fixes "column geofence_lat does not exist" when an old DB never ran full bootstrap.
 */
const ensureGeofenceSchema = async () => {
  await query(`ALTER TABLE zones ADD COLUMN IF NOT EXISTS geofence_lat DECIMAL(10,7)`);
  await query(`ALTER TABLE zones ADD COLUMN IF NOT EXISTS geofence_lng DECIMAL(10,7)`);
  await query(`ALTER TABLE zones ADD COLUMN IF NOT EXISTS geofence_radius_km DECIMAL(6,2) DEFAULT 8.0`);

  await query(`ALTER TABLE police_stations ADD COLUMN IF NOT EXISTS geofence_lat DECIMAL(10,7)`);
  await query(`ALTER TABLE police_stations ADD COLUMN IF NOT EXISTS geofence_lng DECIMAL(10,7)`);
  await query(`ALTER TABLE police_stations ADD COLUMN IF NOT EXISTS geofence_radius_km DECIMAL(6,2) DEFAULT 1.5`);

  await query(`
    ALTER TABLE restricted_areas ADD COLUMN IF NOT EXISTS source_zone_id INT
      REFERENCES zones(id) ON DELETE SET NULL
  `);
  await query(`
    ALTER TABLE restricted_areas ADD COLUMN IF NOT EXISTS source_police_station_id INT
      REFERENCES police_stations(id) ON DELETE SET NULL
  `);

  try {
    await query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_restricted_areas_criminal_ps
        ON restricted_areas (criminal_id, source_police_station_id)
        WHERE source_police_station_id IS NOT NULL
    `);
  } catch (e) {
    console.warn('[BOOTSTRAP] idx_restricted_areas_criminal_ps:', e.message);
  }
  try {
    await query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_restricted_areas_criminal_zone
        ON restricted_areas (criminal_id, source_zone_id)
        WHERE source_zone_id IS NOT NULL
    `);
  } catch (e) {
    console.warn('[BOOTSTRAP] idx_restricted_areas_criminal_zone:', e.message);
  }
};

/**
 * Adds geofence columns + seeds Pune PCMC preset coordinates.
 */
const initializeGeofencePresets = async () => {
  try {
    await ensureGeofenceSchema();

    await query(`
      UPDATE zones SET
        geofence_lat = v.lat, geofence_lng = v.lng, geofence_radius_km = v.r
      FROM (VALUES
        ('Zone 1', 18.6200::decimal, 73.8050::decimal, 9.0::decimal),
        ('Zone 2', 18.5850::decimal, 73.7350::decimal, 8.5::decimal),
        ('Zone 3', 18.6750::decimal, 73.8850::decimal, 11.0::decimal),
        ('Zone 4', 18.6750::decimal, 73.7750::decimal, 9.0::decimal)
      ) AS v(name, lat, lng, r)
      WHERE zones.name = v.name
    `);

    await query(`
      UPDATE police_stations ps SET
        geofence_lat = v.lat,
        geofence_lng = v.lng,
        geofence_radius_km = v.r
      FROM (VALUES
        ('Pimpri PS',              18.6229::decimal, 73.8067::decimal, 1.6::decimal),
        ('Chinchwad PS',           18.6320::decimal, 73.7800::decimal, 1.6::decimal),
        ('Nigdi PS',               18.6820::decimal, 73.7690::decimal, 1.8::decimal),
        ('Sant Tukaram Nagar PS',  18.6080::decimal, 73.8420::decimal, 1.6::decimal),
        ('Dapodi PS',              18.5820::decimal, 73.8380::decimal, 1.6::decimal),
        ('Sangawi PS',             18.5650::decimal, 73.8480::decimal, 1.8::decimal),
        ('Wakad PS',               18.5912::decimal, 73.7389::decimal, 1.6::decimal),
        ('Kalewadi PS',            18.5820::decimal, 73.7920::decimal, 1.6::decimal),
        ('Ravet PS',               18.6520::decimal, 73.7180::decimal, 1.8::decimal),
        ('Hinjewadi PS',           18.5910::decimal, 73.7180::decimal, 1.8::decimal),
        ('Bawdhan PS',             18.5180::decimal, 73.7780::decimal, 2.0::decimal),
        ('Bhosari MIDC PS',        18.6180::decimal, 73.8720::decimal, 1.8::decimal),
        ('Dighi PS',               18.6420::decimal, 73.8980::decimal, 1.8::decimal),
        ('Bhosari PS',             18.6280::decimal, 73.8480::decimal, 1.8::decimal),
        ('Chakan South PS',        18.7580::decimal, 73.8620::decimal, 2.0::decimal),
        ('Chakan North PS',        18.7820::decimal, 73.8780::decimal, 2.0::decimal),
        ('Alandi PS',              18.6780::decimal, 73.9020::decimal, 2.0::decimal),
        ('Dehu Road PS',           18.7180::decimal, 73.7580::decimal, 1.8::decimal),
        ('Shirgaon PS',            18.7020::decimal, 73.7980::decimal, 1.8::decimal),
        ('Chikhali PS',            18.6880::decimal, 73.8080::decimal, 1.8::decimal),
        ('Mhalunge North PS',      18.6620::decimal, 73.7580::decimal, 1.6::decimal),
        ('Mhalunge South PS',      18.6420::decimal, 73.7680::decimal, 1.6::decimal)
      ) AS v(ps_name, lat, lng, r)
      WHERE ps.name = v.ps_name
    `);

    console.log('[BOOTSTRAP] Geofence presets (zones / police stations) ensured.');
  } catch (err) {
    console.error('[BOOTSTRAP] Geofence preset init failed:', err.message);
  }
};

module.exports = { ensureGeofenceSchema, initializeGeofencePresets };
