const jwt      = require('jsonwebtoken');
const { query } = require('../config/db');

const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided. Please log in.',
      });
    }

    const token = header.split(' ')[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      const msg = err.name === 'TokenExpiredError'
        ? 'Session expired. Please log in again.'
        : 'Invalid token. Please log in.';
      return res.status(401).json({ success: false, message: msg });
    }

    const result = await query(
      'SELECT id, name, login_id, phone, email, is_active FROM criminals WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Account not found.' });
    }

    const criminal = result.rows[0];

    if (!criminal.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Account deactivated. Contact your officer.',
      });
    }

    req.criminal = criminal;
    next();
  } catch (err) {
    console.error('[auth]', err);
    res.status(500).json({ success: false, message: 'Authentication error.' });
  }
};

module.exports = { protect };
