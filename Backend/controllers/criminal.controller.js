const bcrypt        = require('bcryptjs');
const { query }     = require('../config/db');
const { signToken } = require('../utils/jwt');
const { cloudinary } = require('../config/cloudinary');

// POST /api/criminal/login
const login = async (req, res, next) => {
  try {
    const { loginId, password } = req.body;
    if (!loginId || !password) {
      return res.status(400).json({ success: false, message: 'loginId and password are required.' });
    }

    const result = await query(
      `SELECT c.id, c.name, c.login_id, c.password, c.phone, c.email,
              c.address, c.case_number, c.is_active,
              c.externment_section, c.period_from, c.period_till,
              c.residence_address, c.photo_url,
              ps.name AS police_station_name,
              aa.name AS acp_area_name,
              z.name  AS zone_name
       FROM criminals c
       LEFT JOIN police_stations ps ON ps.id = c.police_station_id
       LEFT JOIN acp_areas        aa ON aa.id = c.acp_area_id
       LEFT JOIN zones            z  ON z.id  = c.zone_id
       WHERE c.login_id = $1`,
      [loginId.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid Login ID or password.' });
    }

    const criminal = result.rows[0];

    if (!criminal.is_active) {
      return res.status(403).json({ success: false, message: 'Account deactivated. Contact your officer.' });
    }

    const match = await bcrypt.compare(password, criminal.password);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid Login ID or password.' });
    }

    const token = signToken(criminal.id);

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      criminal: {
        _id:                criminal.id,
        name:               criminal.name,
        loginId:            criminal.login_id,
        phone:              criminal.phone,
        email:              criminal.email,
        address:            criminal.address,
        caseNumber:         criminal.case_number,
        externmentSection:  criminal.externment_section,
        periodFrom:         criminal.period_from,
        periodTill:         criminal.period_till,
        residenceAddress:   criminal.residence_address,
        photoUrl:           criminal.photo_url,
        policeStation:      criminal.police_station_name,
        acpArea:            criminal.acp_area_name,
        zone:               criminal.zone_name,
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/criminal/:id
const getProfile = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (parseInt(id) !== req.criminal.id) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const result = await query(
      `SELECT c.id, c.name, c.login_id, c.phone, c.email,
              c.address, c.case_number, c.created_at,
              c.externment_section, c.period_from, c.period_till,
              c.residence_address, c.photo_url,
              ps.name AS police_station_name,
              aa.name AS acp_area_name,
              z.name  AS zone_name
       FROM criminals c
       LEFT JOIN police_stations ps ON ps.id = c.police_station_id
       LEFT JOIN acp_areas        aa ON aa.id = c.acp_area_id
       LEFT JOIN zones            z  ON z.id  = c.zone_id
       WHERE c.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Profile not found.' });
    }

    const c = result.rows[0];
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
        createdAt:         c.created_at,
        externmentSection: c.externment_section,
        periodFrom:        c.period_from,
        periodTill:        c.period_till,
        residenceAddress:  c.residence_address,
        photoUrl:          c.photo_url,
        policeStation:     c.police_station_name,
        acpArea:           c.acp_area_name,
        zone:              c.zone_name,
      },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/criminal/register  (admin — supports multipart for photo)
const register = async (req, res, next) => {
  try {
    const {
      name, loginId, password, phone, email,
      address, caseNumber,
      policeStationId, externmentSection,
      periodFrom, periodTill, residenceAddress,
    } = req.body;

    if (!name || !loginId || !password) {
      if (req.file) await cloudinary.uploader.destroy(req.file.filename).catch(() => {});
      return res.status(400).json({ success: false, message: 'name, loginId and password are required.' });
    }

    const exists = await query('SELECT id FROM criminals WHERE login_id = $1', [loginId.trim()]);
    if (exists.rows.length > 0) {
      if (req.file) await cloudinary.uploader.destroy(req.file.filename).catch(() => {});
      return res.status(409).json({ success: false, message: 'loginId already exists.' });
    }

    // Resolve acp_area_id and zone_id from police_station_id
    let acpAreaId = null;
    let zoneId    = null;
    if (policeStationId) {
      const psResult = await query(
        'SELECT acp_area_id, zone_id FROM police_stations WHERE id = $1',
        [parseInt(policeStationId)]
      );
      if (psResult.rows.length > 0) {
        acpAreaId = psResult.rows[0].acp_area_id;
        zoneId    = psResult.rows[0].zone_id;
      }
    }

    const hashed        = await bcrypt.hash(password, 10);
    const photoUrl      = req.file ? req.file.path     : null;
    const photoPublicId = req.file ? req.file.filename  : null;

    const result = await query(
      `INSERT INTO criminals
         (name, login_id, password, phone, email, address, case_number,
          police_station_id, acp_area_id, zone_id,
          externment_section, period_from, period_till,
          residence_address, photo_url, photo_public_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       RETURNING id, name, login_id, phone, email, address, case_number,
                 externment_section, period_from, period_till,
                 residence_address, photo_url, created_at`,
      [
        name.trim(), loginId.trim(), hashed,
        phone || null, email || null, address || null, caseNumber || null,
        policeStationId ? parseInt(policeStationId) : null,
        acpAreaId, zoneId,
        externmentSection || null,
        periodFrom  || null,
        periodTill  || null,
        residenceAddress || null,
        photoUrl, photoPublicId,
      ]
    );

    const c = result.rows[0];
    return res.status(201).json({
      success: true,
      message: 'Criminal registered successfully.',
      criminal: {
        _id:               c.id,
        name:              c.name,
        loginId:           c.login_id,
        phone:             c.phone,
        email:             c.email,
        address:           c.address,
        caseNumber:        c.case_number,
        externmentSection: c.externment_section,
        periodFrom:        c.period_from,
        periodTill:        c.period_till,
        residenceAddress:  c.residence_address,
        photoUrl:          c.photo_url,
        createdAt:         c.created_at,
      },
    });
  } catch (err) {
    if (req.file) await cloudinary.uploader.destroy(req.file.filename).catch(() => {});
    next(err);
  }
};

// GET /api/criminal/meta/zones-stations  (public — for registration dropdowns)
const getZonesAndStations = async (req, res, next) => {
  try {
    const zones = await query('SELECT id, name FROM zones ORDER BY name');

    const acpAreas = await query(
      'SELECT id, zone_id, name FROM acp_areas ORDER BY zone_id, name'
    );

    const stations = await query(
      'SELECT id, acp_area_id, zone_id, name FROM police_stations ORDER BY acp_area_id, name'
    );

    return res.status(200).json({
      success: true,
      zones:          zones.rows,
      acpAreas:       acpAreas.rows,
      policeStations: stations.rows,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { login, getProfile, register, getZonesAndStations };
