const bcrypt        = require('bcrypt');
const jwt           = require('jsonwebtoken');
const { query }     = require('../config/db');

// POST /api/admin/auth/login
const adminLogin = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required.' });
    }

    const result = await query(
      `SELECT
         a.id, a.name, a.username, a.password, a.role, a.is_active,
         a.zone_id, a.acp_area_id, a.police_station_id,
         z.name  AS zone_name,
         aa.name AS acp_name,
         ps.name AS ps_name
       FROM admins a
       LEFT JOIN zones          z  ON z.id  = a.zone_id
       LEFT JOIN acp_areas      aa ON aa.id = a.acp_area_id
       LEFT JOIN police_stations ps ON ps.id = a.police_station_id
       WHERE a.username = $1`,
      [username.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid username or password.' });
    }

    const admin = result.rows[0];

    if (!admin.is_active) {
      return res.status(403).json({ success: false, message: 'Account deactivated. Contact CP office.' });
    }

    const match = await bcrypt.compare(password, admin.password);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid username or password.' });
    }

    const token = jwt.sign(
      { id: admin.id, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '12h' }
    );

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      admin: {
        id:               admin.id,
        name:             admin.name,
        username:         admin.username,
        role:             admin.role,
        zoneId:           admin.zone_id,
        acpAreaId:        admin.acp_area_id,
        policeStationId:  admin.police_station_id,
        zoneName:         admin.zone_name,
        acpName:          admin.acp_name,
        psName:           admin.ps_name,
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/auth/me  (verify token + return admin info)
const adminMe = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
    }

    const result = await query(
      `SELECT a.id, a.name, a.username, a.role, a.is_active,
              a.zone_id, a.acp_area_id, a.police_station_id,
              z.name AS zone_name, aa.name AS acp_name, ps.name AS ps_name
       FROM admins a
       LEFT JOIN zones          z  ON z.id  = a.zone_id
       LEFT JOIN acp_areas      aa ON aa.id = a.acp_area_id
       LEFT JOIN police_stations ps ON ps.id = a.police_station_id
       WHERE a.id = $1 AND a.is_active = TRUE`,
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Admin not found.' });
    }

    const a = result.rows[0];
    return res.status(200).json({
      success: true,
      admin: {
        id: a.id, name: a.name, username: a.username, role: a.role,
        zoneId: a.zone_id, acpAreaId: a.acp_area_id, policeStationId: a.police_station_id,
        zoneName: a.zone_name, acpName: a.acp_name, psName: a.ps_name,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { adminLogin, adminMe };