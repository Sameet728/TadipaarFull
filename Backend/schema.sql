-- =====================================================
--  PROJECT TADIPAAR  PostgreSQL Schema
--  Run this entire block in your SQL editor
-- =====================================================

-- 1. criminals
CREATE TABLE IF NOT EXISTS criminals (
  id           SERIAL PRIMARY KEY,
  name         VARCHAR(200)        NOT NULL,
  login_id     VARCHAR(100) UNIQUE NOT NULL,
  password     VARCHAR(255)        NOT NULL,
  phone        VARCHAR(20),
  email        VARCHAR(200),
  address      TEXT,
  case_number  VARCHAR(100),
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 2. externment_orders
CREATE TABLE IF NOT EXISTS externment_orders (
  id           SERIAL PRIMARY KEY,
  criminal_id  INT NOT NULL REFERENCES criminals(id) ON DELETE CASCADE,
  order_id     VARCHAR(100) UNIQUE NOT NULL,
  start_date   DATE NOT NULL,
  end_date     DATE NOT NULL,
  issued_by    VARCHAR(200),
  notes        TEXT,
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 3. restricted_areas
CREATE TABLE IF NOT EXISTS restricted_areas (
  id           SERIAL PRIMARY KEY,
  criminal_id  INT NOT NULL REFERENCES criminals(id) ON DELETE CASCADE,
  order_id     INT REFERENCES externment_orders(id) ON DELETE SET NULL,
  area_name    VARCHAR(300) NOT NULL,
  latitude     DECIMAL(10,7) NOT NULL,
  longitude    DECIMAL(10,7) NOT NULL,
  radius_km    DECIMAL(6,2) NOT NULL DEFAULT 1.0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 4. checkins
CREATE TABLE IF NOT EXISTS checkins (
  id               SERIAL PRIMARY KEY,
  criminal_id      INT NOT NULL REFERENCES criminals(id) ON DELETE CASCADE,
  selfie_url       TEXT NOT NULL,
  selfie_public_id TEXT,
  latitude         DECIMAL(10,7) NOT NULL,
  longitude        DECIMAL(10,7) NOT NULL,
  accuracy         DECIMAL(8,2),
  status           VARCHAR(50) DEFAULT 'pending',
  violation_reason TEXT,
  remarks          TEXT,
  checked_in_at    TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at      TIMESTAMPTZ,
  reviewed_by      VARCHAR(200)
);

CREATE INDEX IF NOT EXISTS idx_checkins_criminal ON checkins(criminal_id);
CREATE INDEX IF NOT EXISTS idx_checkins_date     ON checkins(checked_in_at DESC);
CREATE INDEX IF NOT EXISTS idx_areas_criminal    ON restricted_areas(criminal_id);
CREATE INDEX IF NOT EXISTS idx_orders_criminal   ON externment_orders(criminal_id);

-- ---- SAMPLE DATA (remove in production) ----------------
-- password = 'password123'
INSERT INTO criminals (name,login_id,password,phone,email,address,case_number)
VALUES ('Ramesh Kumar','EXT001',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  '9876543210','ramesh@example.com','Flat 12 Shivaji Nagar Pune 411005','CR/2024/001')
ON CONFLICT (login_id) DO NOTHING;

INSERT INTO externment_orders (criminal_id,order_id,start_date,end_date,issued_by)
SELECT id,'ORD/2024/001','2024-01-01','2025-12-31','DCP Pune'
FROM criminals WHERE login_id='EXT001'
ON CONFLICT (order_id) DO NOTHING;

INSERT INTO restricted_areas (criminal_id,area_name,latitude,longitude,radius_km)
SELECT id,'Shivajinagar Area',18.5314,73.8446,2.0 FROM criminals WHERE login_id='EXT001';

INSERT INTO restricted_areas (criminal_id,area_name,latitude,longitude,radius_km)
SELECT id,'Koregaon Park',18.5362,73.8944,1.5 FROM criminals WHERE login_id='EXT001';

-- 5. hierarchy master tables
CREATE TABLE IF NOT EXISTS zones (
  id   SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS acp_areas (
  id      SERIAL PRIMARY KEY,
  zone_id INT NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  name    VARCHAR(160) NOT NULL,
  UNIQUE (zone_id, name)
);

CREATE TABLE IF NOT EXISTS police_stations (
  id          SERIAL PRIMARY KEY,
  zone_id     INT NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  acp_area_id INT NOT NULL REFERENCES acp_areas(id) ON DELETE CASCADE,
  name        VARCHAR(180) NOT NULL,
  UNIQUE (acp_area_id, name)
);

-- 6. admin hierarchy columns (safe, nullable)
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

-- 7. seed real hierarchy (idempotent)
INSERT INTO zones (name)
VALUES
  ('Zone 1'),
  ('Zone 2'),
  ('Zone 3'),
  ('Zone 4')
ON CONFLICT (name) DO NOTHING;

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
ON CONFLICT (zone_id, name) DO NOTHING;

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
ON CONFLICT (acp_area_id, name) DO NOTHING;

-- 8. backfill existing admins without overriding valid mappings
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
