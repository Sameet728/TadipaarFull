const bcrypt = require('bcrypt');
const { query } = require('../config/db');

// ─────────────────────────────────────────────────────────
// GET /api/admin/hierarchy
// Full zone → ACP → Police Station tree
// ─────────────────────────────────────────────────────────
const getHierarchy = async (req, res, next) => {
  try {
    const zones    = await query('SELECT id, name FROM zones ORDER BY name');
    const acpAreas = await query('SELECT id, zone_id, name FROM acp_areas ORDER BY zone_id, name');
    const stations = await query('SELECT id, acp_area_id, zone_id, name FROM police_stations ORDER BY acp_area_id, name');

    const tree = zones.rows.map(z => ({
      ...z,
      acpAreas: acpAreas.rows
        .filter(a => a.zone_id === z.id)
        .map(a => ({
          ...a,
          policeStations: stations.rows.filter(ps => ps.acp_area_id === a.id),
        })),
    }));

    return res.status(200).json({ success: true, hierarchy: tree });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────
// Helper: build WHERE clause for filtering by zone/acp/ps
// ─────────────────────────────────────────────────────────
const buildCriminalFilter = (query_params) => {
  const { zoneId, acpAreaId, policeStationId, section } = query_params;
  const conditions = ['c.is_active = TRUE'];
  const values     = [];
  let   idx        = 1;

  if (zoneId)          { conditions.push(`c.zone_id = $${idx++}`);           values.push(parseInt(zoneId)); }
  if (acpAreaId)       { conditions.push(`c.acp_area_id = $${idx++}`);       values.push(parseInt(acpAreaId)); }
  if (policeStationId) { conditions.push(`c.police_station_id = $${idx++}`); values.push(parseInt(policeStationId)); }
  if (section)         { conditions.push(`c.externment_section = $${idx++}`); values.push(section); }

  return { where: 'WHERE ' + conditions.join(' AND '), values, nextIdx: idx };
};

// ─────────────────────────────────────────────────────────
// GET /api/admin/criminals
// List with zone/ACP/PS filter + compliance summary
// ─────────────────────────────────────────────────────────
const getCriminals = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page  || '1'));
    const limit = Math.min(100, parseInt(req.query.limit || '30'));
    const offset = (page - 1) * limit;

    const { where, values, nextIdx } = buildCriminalFilter(req.query);

    const dataValues = [...values, limit, offset];

    const result = await query(
      `SELECT
         c.id, c.name, c.login_id, c.phone, c.email,
         c.address, c.case_number, c.created_at,
         c.externment_section, c.period_from, c.period_till,
         c.residence_address, c.photo_url,
         ps.name AS police_station,
         aa.name AS acp_area,
         z.name  AS zone,
         -- Compliance summary
         COUNT(ci.id)                                              AS total_checkins,
         COUNT(ci.id) FILTER (WHERE ci.status = 'compliant')      AS compliant_count,
         COUNT(ci.id) FILTER (WHERE ci.status = 'non_compliant')  AS non_compliant_count,
         MAX(ci.checked_in_at)                                     AS last_checkin,
         -- Days since last check-in (null if never)
         EXTRACT(DAY FROM NOW() - MAX(ci.checked_in_at))::INT      AS days_since_last_checkin,
         -- Photo not uploaded days (days since registration with 0 check-ins that day) - approximation
         (
           SELECT COUNT(*) FROM generate_series(c.created_at::date, CURRENT_DATE - 1, '1 day') AS d(day)
           WHERE NOT EXISTS (
             SELECT 1 FROM checkins ci2
             WHERE ci2.criminal_id = c.id AND ci2.checked_in_at::date = d.day
           )
         ) AS missed_checkin_days,
         -- Entered restricted area flag
         EXISTS (
           SELECT 1 FROM checkins ci3
           WHERE ci3.criminal_id = c.id AND ci3.status = 'non_compliant'
         ) AS entered_restricted_area
       FROM criminals c
       LEFT JOIN police_stations ps ON ps.id = c.police_station_id
       LEFT JOIN acp_areas        aa ON aa.id = c.acp_area_id
       LEFT JOIN zones            z  ON z.id  = c.zone_id
       LEFT JOIN checkins         ci ON ci.criminal_id = c.id
       ${where}
       GROUP BY c.id, c.name, c.login_id, c.phone, c.email,
                c.address, c.case_number, c.created_at,
                c.externment_section, c.period_from, c.period_till,
                c.residence_address, c.photo_url,
                ps.name, aa.name, z.name
       ORDER BY c.name
       LIMIT $${nextIdx} OFFSET $${nextIdx + 1}`,
      dataValues
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM criminals c
       LEFT JOIN police_stations ps ON ps.id = c.police_station_id
       LEFT JOIN acp_areas        aa ON aa.id = c.acp_area_id
       LEFT JOIN zones            z  ON z.id  = c.zone_id
       ${where}`,
      values
    );

    const criminals = result.rows.map(c => ({
      _id:                  c.id,
      name:                 c.name,
      loginId:              c.login_id,
      phone:                c.phone,
      email:                c.email,
      address:              c.address,
      caseNumber:           c.case_number,
      externmentSection:    c.externment_section,
      periodFrom:           c.period_from,
      periodTill:           c.period_till,
      residenceAddress:     c.residence_address,
      photoUrl:             c.photo_url,
      policeStation:        c.police_station,
      acpArea:              c.acp_area,
      zone:                 c.zone,
      createdAt:            c.created_at,
      stats: {
        totalCheckins:        parseInt(c.total_checkins),
        compliantCount:       parseInt(c.compliant_count),
        nonCompliantCount:    parseInt(c.non_compliant_count),
        lastCheckin:          c.last_checkin,
        daysSinceLastCheckin: c.days_since_last_checkin,
        missedCheckinDays:    parseInt(c.missed_checkin_days),
        enteredRestrictedArea: c.entered_restricted_area,
      },
    }));

    return res.status(200).json({
      success: true,
      criminals,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        page, limit,
        pages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
      },
    });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────
// GET /api/admin/criminals/:id
// Single criminal full detail
// ─────────────────────────────────────────────────────────
const getCriminalById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT
         c.id, c.name, c.login_id, c.phone, c.email,
         c.address, c.case_number, c.created_at, c.is_active,
         c.externment_section, c.period_from, c.period_till,
         c.residence_address, c.photo_url,
         ps.id   AS police_station_id,
         ps.name AS police_station,
         aa.id   AS acp_area_id,
         aa.name AS acp_area,
         z.id    AS zone_id,
         z.name  AS zone
       FROM criminals c
       LEFT JOIN police_stations ps ON ps.id = c.police_station_id
       LEFT JOIN acp_areas        aa ON aa.id = c.acp_area_id
       LEFT JOIN zones            z  ON z.id  = c.zone_id
       WHERE c.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Criminal not found.' });
    }

    const c = result.rows[0];

    // Recent check-ins
    const checkIns = await query(
      `SELECT id, selfie_url, latitude, longitude, status,
              violation_reason, checked_in_at
       FROM checkins WHERE criminal_id=$1
       ORDER BY checked_in_at DESC LIMIT 10`,
      [id]
    );

    // Restricted areas
    const areas = await query(
      `SELECT id, area_name, latitude, longitude, radius_km, created_at
       FROM restricted_areas WHERE criminal_id=$1`,
      [id]
    );

    return res.status(200).json({
      success: true,
      criminal: {
        _id:               c.id,
        name:              c.name,
        loginId:           c.login_id,
        phone:             c.phone,
        email:             c.email,
        address:           c.address,
        caseNumber:        c.case_number,
        isActive:          c.is_active,
        externmentSection: c.externment_section,
        periodFrom:        c.period_from,
        periodTill:        c.period_till,
        residenceAddress:  c.residence_address,
        photoUrl:          c.photo_url,
        policeStationId:   c.police_station_id,
        policeStation:     c.police_station,
        acpAreaId:         c.acp_area_id,
        acpArea:           c.acp_area,
        zoneId:            c.zone_id,
        zone:              c.zone,
        createdAt:         c.created_at,
      },
      recentCheckIns:   checkIns.rows,
      restrictedAreas:  areas.rows,
    });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────
// GET /api/admin/dashboard
// City-wide summary for DCP/CP level
// ─────────────────────────────────────────────────────────
const getDashboard = async (req, res, next) => {
  try {
    // Overall counts
    const totals = await query(`
      SELECT
        COUNT(DISTINCT c.id)                                                       AS total_criminals,
        COUNT(DISTINCT ci.id)                                                      AS total_checkins_today,
        COUNT(DISTINCT ci.id) FILTER (WHERE ci.status = 'non_compliant'
          AND ci.checked_in_at::date = CURRENT_DATE)                               AS violations_today,
        COUNT(DISTINCT c.id) FILTER (WHERE NOT EXISTS (
          SELECT 1 FROM checkins ci2
          WHERE ci2.criminal_id = c.id AND ci2.checked_in_at::date = CURRENT_DATE
        ))                                                                          AS not_checked_in_today
      FROM criminals c
      LEFT JOIN checkins ci
        ON ci.criminal_id = c.id AND ci.checked_in_at::date = CURRENT_DATE
      WHERE c.is_active = TRUE
    `);

    // Zone-wise breakdown
    const zoneStats = await query(`
      SELECT
        z.id, z.name AS zone,
        COUNT(DISTINCT c.id)                                                        AS total,
        COUNT(DISTINCT ci_today.criminal_id)                                        AS checked_in_today,
        COUNT(DISTINCT c.id) - COUNT(DISTINCT ci_today.criminal_id)                 AS not_checked_in,
        COUNT(DISTINCT ci_viol.id)                                                  AS violations_today
      FROM zones z
      LEFT JOIN criminals    c        ON c.zone_id = z.id AND c.is_active = TRUE
      LEFT JOIN checkins     ci_today ON ci_today.criminal_id = c.id
                                     AND ci_today.checked_in_at::date = CURRENT_DATE
      LEFT JOIN checkins     ci_viol  ON ci_viol.criminal_id = c.id
                                     AND ci_viol.checked_in_at::date = CURRENT_DATE
                                     AND ci_viol.status = 'non_compliant'
      GROUP BY z.id, z.name
      ORDER BY z.name
    `);

    // ACP-wise breakdown
    const acpStats = await query(`
      SELECT
        aa.id, aa.name AS acp_area, z.name AS zone,
        COUNT(DISTINCT c.id)                                                        AS total,
        COUNT(DISTINCT ci_today.criminal_id)                                        AS checked_in_today,
        COUNT(DISTINCT c.id) - COUNT(DISTINCT ci_today.criminal_id)                 AS not_checked_in,
        COUNT(DISTINCT ci_viol.id)                                                  AS violations_today
      FROM acp_areas aa
      JOIN zones z ON z.id = aa.zone_id
      LEFT JOIN criminals    c        ON c.acp_area_id = aa.id AND c.is_active = TRUE
      LEFT JOIN checkins     ci_today ON ci_today.criminal_id = c.id
                                     AND ci_today.checked_in_at::date = CURRENT_DATE
      LEFT JOIN checkins     ci_viol  ON ci_viol.criminal_id = c.id
                                     AND ci_viol.checked_in_at::date = CURRENT_DATE
                                     AND ci_viol.status = 'non_compliant'
      GROUP BY aa.id, aa.name, z.name
      ORDER BY z.name, aa.name
    `);

    // Police Station wise breakdown
    const psStats = await query(`
      SELECT
        ps.id, ps.name AS police_station,
        aa.name AS acp_area, z.name AS zone,
        COUNT(DISTINCT c.id)                                                        AS total,
        COUNT(DISTINCT ci_today.criminal_id)                                        AS checked_in_today,
        COUNT(DISTINCT c.id) - COUNT(DISTINCT ci_today.criminal_id)                 AS not_checked_in,
        COUNT(DISTINCT ci_viol.id)                                                  AS violations_today
      FROM police_stations ps
      JOIN acp_areas aa ON aa.id = ps.acp_area_id
      JOIN zones     z  ON z.id  = ps.zone_id
      LEFT JOIN criminals    c        ON c.police_station_id = ps.id AND c.is_active = TRUE
      LEFT JOIN checkins     ci_today ON ci_today.criminal_id = c.id
                                     AND ci_today.checked_in_at::date = CURRENT_DATE
      LEFT JOIN checkins     ci_viol  ON ci_viol.criminal_id = c.id
                                     AND ci_viol.checked_in_at::date = CURRENT_DATE
                                     AND ci_viol.status = 'non_compliant'
      GROUP BY ps.id, ps.name, aa.name, z.name
      ORDER BY z.name, aa.name, ps.name
    `);

    return res.status(200).json({
      success: true,
      summary:          totals.rows[0],
      zoneBreakdown:    zoneStats.rows,
      acpBreakdown:     acpStats.rows,
      stationBreakdown: psStats.rows,
    });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────
// GET /api/admin/violations  - criminals who entered restricted area
// ─────────────────────────────────────────────────────────
const getViolations = async (req, res, next) => {
  try {
    const { zoneId, acpAreaId, policeStationId, date } = req.query;
    const page  = Math.max(1, parseInt(req.query.page  || '1'));
    const limit = Math.min(100, parseInt(req.query.limit || '30'));
    const offset = (page - 1) * limit;

    const conditions = ["ci.status = 'non_compliant'"];
    const values     = [];
    let   idx        = 1;

    if (date) { conditions.push(`ci.checked_in_at::date = $${idx++}`); values.push(date); }
    else       { /* default: today */ conditions.push(`ci.checked_in_at::date = CURRENT_DATE`); }

    if (zoneId)          { conditions.push(`c.zone_id = $${idx++}`);           values.push(parseInt(zoneId)); }
    if (acpAreaId)       { conditions.push(`c.acp_area_id = $${idx++}`);       values.push(parseInt(acpAreaId)); }
    if (policeStationId) { conditions.push(`c.police_station_id = $${idx++}`); values.push(parseInt(policeStationId)); }

    const where      = 'WHERE ' + conditions.join(' AND ');
    const dataValues = [...values, limit, offset];

    const result = await query(
      `SELECT
         ci.id AS checkin_id, ci.selfie_url, ci.latitude, ci.longitude,
         ci.violation_reason, ci.checked_in_at,
         c.id AS criminal_id, c.name, c.login_id, c.phone,
         c.case_number, c.externment_section,
         c.photo_url AS criminal_photo,
         ps.name AS police_station,
         aa.name AS acp_area,
         z.name  AS zone
       FROM checkins ci
       JOIN criminals     c  ON c.id  = ci.criminal_id
       LEFT JOIN police_stations ps ON ps.id = c.police_station_id
       LEFT JOIN acp_areas        aa ON aa.id = c.acp_area_id
       LEFT JOIN zones            z  ON z.id  = c.zone_id
       ${where}
       ORDER BY ci.checked_in_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      dataValues
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM checkins ci
       JOIN criminals c ON c.id = ci.criminal_id
       ${where}`,
      values
    );

    return res.status(200).json({
      success: true,
      violations: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        page, limit,
        pages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
      },
    });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────
// GET /api/admin/missed-checkins
// Criminals who have NOT checked in today
// ─────────────────────────────────────────────────────────
const getMissedCheckIns = async (req, res, next) => {
  try {
    const { zoneId, acpAreaId, policeStationId } = req.query;
    const page  = Math.max(1, parseInt(req.query.page  || '1'));
    const limit = Math.min(100, parseInt(req.query.limit || '30'));
    const offset = (page - 1) * limit;

    const conditions = [
      'c.is_active = TRUE',
      `NOT EXISTS (
         SELECT 1 FROM checkins ci
         WHERE ci.criminal_id = c.id AND ci.checked_in_at::date = CURRENT_DATE
       )`,
    ];
    const values = [];
    let   idx    = 1;

    if (zoneId)          { conditions.push(`c.zone_id = $${idx++}`);           values.push(parseInt(zoneId)); }
    if (acpAreaId)       { conditions.push(`c.acp_area_id = $${idx++}`);       values.push(parseInt(acpAreaId)); }
    if (policeStationId) { conditions.push(`c.police_station_id = $${idx++}`); values.push(parseInt(policeStationId)); }

    const where      = 'WHERE ' + conditions.join(' AND ');
    const dataValues = [...values, limit, offset];

    const result = await query(
      `SELECT
         c.id, c.name, c.login_id, c.phone,
         c.case_number, c.externment_section,
         c.period_from, c.period_till,
         c.photo_url,
         ps.name AS police_station,
         aa.name AS acp_area,
         z.name  AS zone,
         MAX(ci2.checked_in_at) AS last_checkin,
         EXTRACT(DAY FROM NOW() - MAX(ci2.checked_in_at))::INT AS days_missed
       FROM criminals c
       LEFT JOIN police_stations ps  ON ps.id  = c.police_station_id
       LEFT JOIN acp_areas        aa ON aa.id  = c.acp_area_id
       LEFT JOIN zones            z  ON z.id   = c.zone_id
       LEFT JOIN checkins         ci2 ON ci2.criminal_id = c.id
       ${where}
       GROUP BY c.id, c.name, c.login_id, c.phone,
                c.case_number, c.externment_section,
                c.period_from, c.period_till, c.photo_url,
                ps.name, aa.name, z.name
       ORDER BY days_missed DESC NULLS LAST
       LIMIT $${idx} OFFSET $${idx + 1}`,
      dataValues
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM criminals c ${where}`,
      values
    );

    return res.status(200).json({
      success: true,
      criminals: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        page, limit,
        pages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
      },
    });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────
// POST /api/admin/areas  — add restricted area
// ─────────────────────────────────────────────────────────
const addRestrictedArea = async (req, res, next) => {
  try {
    const { criminalId, areaName, latitude, longitude, radiusKm } = req.body;
    if (!criminalId || !areaName || !latitude || !longitude) {
      return res.status(400).json({ success: false, message: 'criminalId, areaName, latitude, longitude are required.' });
    }
    const result = await query(
      `INSERT INTO restricted_areas (criminal_id, area_name, latitude, longitude, radius_km)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [criminalId, areaName.trim(), parseFloat(latitude), parseFloat(longitude), parseFloat(radiusKm || 1)]
    );
    return res.status(201).json({ success: true, message: 'Area added.', area: result.rows[0] });
  } catch (err) { next(err); }
};

// DELETE /api/admin/areas/:id
const deleteRestrictedArea = async (req, res, next) => {
  try {
    const result = await query('DELETE FROM restricted_areas WHERE id=$1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Area not found.' });
    return res.status(200).json({ success: true, message: 'Area deleted.' });
  } catch (err) { next(err); }
};

// GET /api/admin/checkins  — all check-ins (existing)
const getAllCheckIns = async (req, res, next) => {
  try {
    const { status, criminalId, zoneId, acpAreaId, policeStationId } = req.query;
    const page  = Math.max(1, parseInt(req.query.page  || '1'));
    const limit = Math.min(100, parseInt(req.query.limit || '30'));
    const offset = (page - 1) * limit;

    const conditions = [];
    const values     = [];
    let   idx        = 1;

    if (status)          { conditions.push(`ci.status = $${idx++}`);           values.push(status); }
    if (criminalId)      { conditions.push(`ci.criminal_id = $${idx++}`);      values.push(parseInt(criminalId)); }
    if (zoneId)          { conditions.push(`c.zone_id = $${idx++}`);           values.push(parseInt(zoneId)); }
    if (acpAreaId)       { conditions.push(`c.acp_area_id = $${idx++}`);       values.push(parseInt(acpAreaId)); }
    if (policeStationId) { conditions.push(`c.police_station_id = $${idx++}`); values.push(parseInt(policeStationId)); }

    const where      = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const dataValues = [...values, limit, offset];

    const result = await query(
      `SELECT ci.id, ci.selfie_url, ci.latitude, ci.longitude,
              ci.status, ci.violation_reason, ci.checked_in_at,
              c.name AS criminal_name, c.login_id, c.case_number,
              ps.name AS police_station, aa.name AS acp_area, z.name AS zone
       FROM checkins ci
       JOIN criminals     c  ON c.id  = ci.criminal_id
       LEFT JOIN police_stations ps ON ps.id = c.police_station_id
       LEFT JOIN acp_areas        aa ON aa.id = c.acp_area_id
       LEFT JOIN zones            z  ON z.id  = c.zone_id
       ${where}
       ORDER BY ci.checked_in_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      dataValues
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM checkins ci JOIN criminals c ON c.id=ci.criminal_id ${where}`,
      values
    );

    return res.status(200).json({
      success: true,
      checkIns: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        page, limit,
        pages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
      },
    });
  } catch (err) { next(err); }
};

// POST /api/admin/add-admin
// CP can create only DCP/ACP/PS admins
const addAdmin = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== 'CP') {
      return res.status(403).json({ success: false, message: 'Only CP can create admin users.' });
    }

    const { name, login_id, password, role } = req.body;

    if (!name || !login_id || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'name, login_id, password, role are required.',
      });
    }

    const normalizedRole = String(role).trim().toUpperCase();
    const allowedRoles   = ['DCP', 'ACP', 'PS'];

    if (!allowedRoles.includes(normalizedRole)) {
      return res.status(400).json({
        success: false,
        message: 'Allowed roles are DCP, ACP, PS only.',
      });
    }

    if (normalizedRole === 'CP') {
      return res.status(400).json({ success: false, message: 'Creating CP role is not allowed.' });
    }

    const loginId = String(login_id).trim();

    const columnResult = await query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'admins'
         AND column_name IN ('login_id', 'username')`
    );

    const hasLoginId = columnResult.rows.some((r) => r.column_name === 'login_id');
    const hasUsername = columnResult.rows.some((r) => r.column_name === 'username');
    const loginColumn = hasLoginId ? 'login_id' : (hasUsername ? 'username' : null);

    if (!loginColumn) {
      return res.status(500).json({
        success: false,
        message: 'Admins table is missing login identifier column.',
      });
    }

    const existing = await query(
      `SELECT id FROM admins WHERE ${loginColumn} = $1 LIMIT 1`,
      [loginId]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Login ID already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const created = await query(
      `INSERT INTO admins (name, ${loginColumn}, password, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, ${loginColumn} AS login_id, role`,
      [String(name).trim(), loginId, hashedPassword, normalizedRole]
    );

    return res.status(201).json({
      success: true,
      message: 'Admin user created successfully.',
      admin: created.rows[0],
    });
  } catch (err) { next(err); }
};

module.exports = {
  getHierarchy,
  getCriminals,
  getCriminalById,
  getDashboard,
  getViolations,
  getMissedCheckIns,
  addRestrictedArea,
  deleteRestrictedArea,
  getAllCheckIns,
  addAdmin,
};