const { query } = require('./db');

const initializePoliceHierarchy = async () => {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS zones (
        id SERIAL PRIMARY KEY,
        name VARCHAR(120) NOT NULL UNIQUE
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS acp_areas (
        id SERIAL PRIMARY KEY,
        zone_id INT NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
        name VARCHAR(160) NOT NULL,
        UNIQUE (zone_id, name)
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS police_stations (
        id SERIAL PRIMARY KEY,
        zone_id INT NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
        acp_area_id INT NOT NULL REFERENCES acp_areas(id) ON DELETE CASCADE,
        name VARCHAR(180) NOT NULL,
        UNIQUE (acp_area_id, name)
      )
    `);

    await query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'admins'
        ) THEN
          ALTER TABLE admins ADD COLUMN IF NOT EXISTS zone_id INT;
          ALTER TABLE admins ADD COLUMN IF NOT EXISTS acp_area_id INT;
          ALTER TABLE admins ADD COLUMN IF NOT EXISTS police_station_id INT;
        END IF;
      END $$;
    `);

    await query(`
      INSERT INTO zones (name)
      VALUES
        ('Zone 1'),
        ('Zone 2'),
        ('Zone 3'),
        ('Zone 4')
      ON CONFLICT DO NOTHING
    `);

    await query(`
      INSERT INTO acp_areas (zone_id, name)
      SELECT z.id, v.acp_name
      FROM (
        VALUES
          ('Zone 1', 'ACP PIMPRI'),
          ('Zone 1', 'ACP SANGAWI'),
          ('Zone 2', 'ACP WAKAD'),
          ('Zone 2', 'ACP HINJEWADI'),
          ('Zone 3', 'ACP BHOSARI MIDC'),
          ('Zone 3', 'ACP CHAKAN'),
          ('Zone 4', 'ACP DEHU ROAD'),
          ('Zone 4', 'ACP MHALUNGE MIDC')
      ) AS v(zone_name, acp_name)
      JOIN zones z ON z.name = v.zone_name
      ON CONFLICT DO NOTHING
    `);

    await query(`
      INSERT INTO police_stations (zone_id, acp_area_id, name)
      SELECT z.id, aa.id, v.ps_name
      FROM (
        VALUES
          ('Zone 1', 'ACP PIMPRI', 'Pimpri PS'),
          ('Zone 1', 'ACP PIMPRI', 'Chinchwad PS'),
          ('Zone 1', 'ACP PIMPRI', 'Nigdi PS'),
          ('Zone 1', 'ACP SANGAWI', 'Sant Tukaram Nagar PS'),
          ('Zone 1', 'ACP SANGAWI', 'Dapodi PS'),
          ('Zone 1', 'ACP SANGAWI', 'Sangawi PS'),
          ('Zone 2', 'ACP WAKAD', 'Wakad PS'),
          ('Zone 2', 'ACP WAKAD', 'Kalewadi PS'),
          ('Zone 2', 'ACP WAKAD', 'Ravet PS'),
          ('Zone 2', 'ACP HINJEWADI', 'Hinjewadi PS'),
          ('Zone 2', 'ACP HINJEWADI', 'Bawdhan PS'),
          ('Zone 3', 'ACP BHOSARI MIDC', 'Bhosari MIDC PS'),
          ('Zone 3', 'ACP BHOSARI MIDC', 'Dighi PS'),
          ('Zone 3', 'ACP BHOSARI MIDC', 'Bhosari PS'),
          ('Zone 3', 'ACP CHAKAN', 'Chakan South PS'),
          ('Zone 3', 'ACP CHAKAN', 'Chakan North PS'),
          ('Zone 3', 'ACP CHAKAN', 'Alandi PS'),
          ('Zone 4', 'ACP DEHU ROAD', 'Dehu Road PS'),
          ('Zone 4', 'ACP DEHU ROAD', 'Shirgaon PS'),
          ('Zone 4', 'ACP DEHU ROAD', 'Chikhali PS'),
          ('Zone 4', 'ACP MHALUNGE MIDC', 'Mhalunge North PS'),
          ('Zone 4', 'ACP MHALUNGE MIDC', 'Mhalunge South PS')
      ) AS v(zone_name, acp_name, ps_name)
      JOIN zones z ON z.name = v.zone_name
      JOIN acp_areas aa ON aa.name = v.acp_name AND aa.zone_id = z.id
      ON CONFLICT DO NOTHING
    `);

    await query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'admins'
        ) THEN
          UPDATE admins a
          SET
            acp_area_id = COALESCE(a.acp_area_id, ps.acp_area_id),
            zone_id = COALESCE(a.zone_id, ps.zone_id)
          FROM police_stations ps
          WHERE a.police_station_id = ps.id
            AND (a.acp_area_id IS NULL OR a.zone_id IS NULL);

          UPDATE admins a
          SET zone_id = COALESCE(a.zone_id, aa.zone_id)
          FROM acp_areas aa
          WHERE a.acp_area_id = aa.id
            AND a.zone_id IS NULL;
        END IF;
      END $$;
    `);

    console.log('[BOOTSTRAP] Police hierarchy ensured and seeded.');
  } catch (err) {
    console.error('[BOOTSTRAP] Failed to initialize hierarchy:', err.message);
  }
};

module.exports = { initializePoliceHierarchy };
