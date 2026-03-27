const bcrypt = require('bcryptjs');
const { query } = require('../config/db');

const toInt = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const getScopedParams = (req, params = {}) => {
  const scoped = { ...params };
  const role = String(req?.user?.role || '').toUpperCase();

  if (role === 'ACP') {
    if (req.user?.acp_area_id) {
      scoped.acpAreaId = String(req.user.acp_area_id);
      if (req.user?.zone_id) scoped.zoneId = String(req.user.zone_id);
    } else {
      scoped.acpAreaId = '-1';
    }
  }

  if (role === 'PS') {
    if (req.user?.police_station_id) {
      scoped.policeStationId = String(req.user.police_station_id);
      if (req.user?.acp_area_id) scoped.acpAreaId = String(req.user.acp_area_id);
      if (req.user?.zone_id) scoped.zoneId = String(req.user.zone_id);
    } else {
      scoped.policeStationId = '-1';
    }
  }

  if (role === 'DCP' && req.user?.zone_id) {
    scoped.zoneId = String(req.user.zone_id);
  }

  return scoped;
};

const resolveHierarchyIds = async ({ zoneId, acpAreaId, policeStationId }) => {
  const ids = {
    zoneId: toInt(zoneId),
    acpAreaId: toInt(acpAreaId),
    policeStationId: toInt(policeStationId),
  };

  let zone = null;
  let acp = null;
  let station = null;

  if (ids.zoneId) {
    const zoneRes = await query('SELECT id, name FROM zones WHERE id = $1', [ids.zoneId]);
    if (zoneRes.rows.length === 0) return { error: 'Invalid zone_id. Zone not found.' };
    zone = zoneRes.rows[0];
  }

  if (ids.acpAreaId) {
    const acpRes = await query('SELECT id, zone_id, name FROM acp_areas WHERE id = $1', [ids.acpAreaId]);
    if (acpRes.rows.length === 0) return { error: 'Invalid acp_area_id. ACP area not found.' };
    acp = acpRes.rows[0];

    if (zone && acp.zone_id !== zone.id) {
      return { error: 'acp_area_id does not belong to the selected zone_id.' };
    }
  }

  if (ids.policeStationId) {
    const stationRes = await query(
      'SELECT id, zone_id, acp_area_id, name FROM police_stations WHERE id = $1',
      [ids.policeStationId]
    );
    if (stationRes.rows.length === 0) return { error: 'Invalid police_station_id. Police station not found.' };
    station = stationRes.rows[0];

    if (acp && station.acp_area_id !== acp.id) {
      return { error: 'police_station_id does not belong to the selected acp_area_id.' };
    }
    if (zone && station.zone_id !== zone.id) {
      return { error: 'police_station_id does not belong to the selected zone_id.' };
    }
  }

  return {
    ids,
    zone,
    acp,
    station,
  };
};

// ─────────────────────────────────────────────────────────
// GET /api/admin/hierarchy
// Full zone → ACP → Police Station tree
// ─────────────────────────────────────────────────────────
const getHierarchy = async (req, res, next) => {
  try {
    const normalizeName = (value) => String(value || '').trim().toLowerCase();

    const zonesRes = await query('SELECT id, name FROM zones ORDER BY id');
    const acpAreasRes = await query('SELECT id, zone_id, name FROM acp_areas ORDER BY id');
    const stationsRes = await query('SELECT id, acp_area_id, zone_id, name FROM police_stations ORDER BY id');

    // Canonicalize duplicate rows by logical names so dropdown payloads stay unique.
    const zoneMap = new Map();
    const zoneIdToCanonical = new Map();
    for (const z of zonesRes.rows || []) {
      if (!z || z.id === null || z.id === undefined) continue;
      const key = normalizeName(z.name);
      if (!zoneMap.has(key)) zoneMap.set(key, { id: z.id, name: z.name });
      zoneIdToCanonical.set(z.id, zoneMap.get(key).id);
    }
    const zones = [...zoneMap.values()];

    const acpMap = new Map();
    const acpIdToCanonical = new Map();
    for (const a of acpAreasRes.rows || []) {
      if (!a || a.id === null || a.id === undefined) continue;
      const canonicalZoneId = zoneIdToCanonical.get(a.zone_id) ?? a.zone_id;
      const key = `${canonicalZoneId}::${normalizeName(a.name)}`;
      if (!acpMap.has(key)) acpMap.set(key, { id: a.id, zone_id: canonicalZoneId, name: a.name });
      acpIdToCanonical.set(a.id, acpMap.get(key).id);
    }
    const acpAreas = [...acpMap.values()];

    const stationMap = new Map();
    for (const ps of stationsRes.rows || []) {
      if (!ps || ps.id === null || ps.id === undefined) continue;
      const canonicalAcpId = acpIdToCanonical.get(ps.acp_area_id) ?? ps.acp_area_id;
      const canonicalZoneId = zoneIdToCanonical.get(ps.zone_id) ?? ps.zone_id;
      const key = `${canonicalAcpId}::${normalizeName(ps.name)}`;
      if (!stationMap.has(key)) {
        stationMap.set(key, {
          id: ps.id,
          acp_area_id: canonicalAcpId,
          zone_id: canonicalZoneId,
          name: ps.name,
        });
      }
    }
    const stations = [...stationMap.values()];

    const tree = zones.map(z => ({
      ...z,
      acpAreas: acpAreas
        .filter(a => a.zone_id === z.id)
        .map(a => ({
          ...a,
          policeStations: stations.filter(ps => ps.acp_area_id === a.id),
        })),
    }));

    return res.status(200).json({
      success: true,
      hierarchy: tree,
      zones,
      acp_areas: acpAreas,
      police_stations: stations,
    });
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

    const scopedQuery = getScopedParams(req, req.query);
    const { where, values, nextIdx } = buildCriminalFilter(scopedQuery);

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
    const scoped = getScopedParams(req, {});

    const conditions = ['c.id = $1'];
    const values = [id];
    let idx = 2;

    if (scoped.zoneId) {
      conditions.push(`c.zone_id = $${idx++}`);
      values.push(parseInt(scoped.zoneId, 10));
    }
    if (scoped.acpAreaId) {
      conditions.push(`c.acp_area_id = $${idx++}`);
      values.push(parseInt(scoped.acpAreaId, 10));
    }
    if (scoped.policeStationId) {
      conditions.push(`c.police_station_id = $${idx++}`);
      values.push(parseInt(scoped.policeStationId, 10));
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

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
       ${where}`,
      values
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
    const scoped = getScopedParams(req, {});
    const scopeConditions = ['c.is_active = TRUE'];
    const scopeValues = [];
    let scopeIdx = 1;

    if (scoped.zoneId) {
      scopeConditions.push(`c.zone_id = $${scopeIdx++}`);
      scopeValues.push(parseInt(scoped.zoneId, 10));
    }
    if (scoped.acpAreaId) {
      scopeConditions.push(`c.acp_area_id = $${scopeIdx++}`);
      scopeValues.push(parseInt(scoped.acpAreaId, 10));
    }
    if (scoped.policeStationId) {
      scopeConditions.push(`c.police_station_id = $${scopeIdx++}`);
      scopeValues.push(parseInt(scoped.policeStationId, 10));
    }

    const scopeWhere = `WHERE ${scopeConditions.join(' AND ')}`;

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
      ${scopeWhere}
    `, scopeValues);

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
      ${scopeWhere}
      GROUP BY z.id, z.name
      ORDER BY z.name
    `, scopeValues);

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
      ${scopeWhere}
      GROUP BY aa.id, aa.name, z.name
      ORDER BY z.name, aa.name
    `, scopeValues);

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
      ${scopeWhere}
      GROUP BY ps.id, ps.name, aa.name, z.name
      ORDER BY z.name, aa.name, ps.name
    `, scopeValues);

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
    const scopedQuery = getScopedParams(req, req.query);
    const { zoneId, acpAreaId, policeStationId, date } = scopedQuery;
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
    const scopedQuery = getScopedParams(req, req.query);
    const { zoneId, acpAreaId, policeStationId } = scopedQuery;
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
    const scopedQuery = getScopedParams(req, req.query);
    const { status, criminalId, zoneId, acpAreaId, policeStationId } = scopedQuery;
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

    const { name, login_id, password, role, zone_id, acp_area_id, police_station_id } = req.body;

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

    const hierarchy = await resolveHierarchyIds({
      zoneId: zone_id,
      acpAreaId: acp_area_id,
      policeStationId: police_station_id,
    });

    if (hierarchy.error) {
      return res.status(400).json({ success: false, message: hierarchy.error });
    }

    const { ids } = hierarchy;

    if (normalizedRole === 'DCP') {
      if (!ids.zoneId) {
        return res.status(400).json({
          success: false,
          message: 'DCP admin requires zone_id.',
        });
      }
    }

    if (normalizedRole === 'ACP') {
      if (!ids.zoneId || !ids.acpAreaId) {
        return res.status(400).json({
          success: false,
          message: 'ACP admin requires both zone_id and acp_area_id.',
        });
      }
    }

    if (normalizedRole === 'PS') {
      if (!ids.zoneId || !ids.acpAreaId || !ids.policeStationId) {
        return res.status(400).json({
          success: false,
          message: 'PS admin requires zone_id, acp_area_id and police_station_id.',
        });
      }
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

    const insertColumns = ['name', loginColumn, 'password', 'role'];
    const insertValues = [String(name).trim(), loginId, hashedPassword, normalizedRole];

    if (ids.zoneId) {
      insertColumns.push('zone_id');
      insertValues.push(ids.zoneId);
    }
    if (ids.acpAreaId) {
      insertColumns.push('acp_area_id');
      insertValues.push(ids.acpAreaId);
    }
    if (ids.policeStationId) {
      insertColumns.push('police_station_id');
      insertValues.push(ids.policeStationId);
    }

    const placeholders = insertColumns.map((_, i) => `$${i + 1}`).join(', ');

    const created = await query(
      `INSERT INTO admins (${insertColumns.join(', ')})
       VALUES (${placeholders})
       RETURNING id, name, ${loginColumn} AS login_id, role, zone_id, acp_area_id, police_station_id`,
      insertValues
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
