const jwt       = require('jsonwebtoken');
const { query } = require('../config/db');

const adminProtect = async (req, res, next) => {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No admin token provided.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    } catch (err) {
      const msg = err.name === 'TokenExpiredError'
        ? 'Session expired. Please log in again.'
        : 'Invalid token.';
      return res.status(401).json({ success: false, message: msg });
    }

    const result = await query(
      `SELECT id, name, role, is_active, zone_id, acp_area_id, police_station_id
       FROM admins WHERE id = $1`,
      [decoded.id]
    );

    if (result.rows.length === 0 || !result.rows[0].is_active) {
      return res.status(401).json({ success: false, message: 'Admin account not found or deactivated.' });
    }

    req.admin = result.rows[0];
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { adminProtect };