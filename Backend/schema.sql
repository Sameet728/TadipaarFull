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
