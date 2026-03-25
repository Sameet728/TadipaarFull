const { query }       = require('../config/db');
const { cloudinary }  = require('../config/cloudinary');
const { haversineKm } = require('../utils/geoUtils');
const { verifyFace }  = require('../services/faceVerification');

// ─────────────────────────────────────────────────────────────────
// POST /api/tadipaar/checkin
// ─────────────────────────────────────────────────────────────────
const checkIn = async (req, res, next) => {
  try {
    const criminalId = req.criminal.id;

    // 1. Selfie required
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Selfie image is required.' });
    }

    // 2. GPS required
    const { latitude, longitude, accuracy } = req.body;
    if (!latitude || !longitude) {
      await cloudinary.uploader.destroy(req.file.filename).catch(() => {});
      return res.status(400).json({ success: false, message: 'Latitude and longitude are required.' });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      await cloudinary.uploader.destroy(req.file.filename).catch(() => {});
      return res.status(400).json({ success: false, message: 'Invalid GPS coordinates.' });
    }

    // 3. No duplicate check-in today
    const dupe = await query(
      "SELECT id FROM checkins WHERE criminal_id=$1 AND checked_in_at::date = CURRENT_DATE",
      [criminalId]
    );
    if (dupe.rows.length > 0) {
      await cloudinary.uploader.destroy(req.file.filename).catch(() => {});
      return res.status(409).json({ success: false, message: 'You have already checked in today.' });
    }

    // 4. Get registered photo
    const criminalResult = await query(
      'SELECT photo_url FROM criminals WHERE id = $1',
      [criminalId]
    );
    const registeredPhotoUrl = criminalResult.rows[0]?.photo_url;

    if (!registeredPhotoUrl) {
      await cloudinary.uploader.destroy(req.file.filename).catch(() => {});
      return res.status(400).json({
        success: false,
        message: 'No registered photo on file. Contact your officer.',
      });
    }

    // 5. Face verification
    const selfieUrl = req.file.path;
    let faceCheck;

    try {
      faceCheck = await verifyFace(registeredPhotoUrl, selfieUrl);
    } catch (err) {
      await cloudinary.uploader.destroy(req.file.filename).catch(() => {});
      return res.status(500).json({ success: false, message: 'Face verification service error. Please try again.' });
    }

    // Block if face check failed — delete selfie and return with faceCheckStatus
    if (!faceCheck.verified) {
      await cloudinary.uploader.destroy(req.file.filename).catch(() => {});
      return res.status(
        faceCheck.faceCheckStatus === 'mismatch' ? 403 : 400
      ).json({
        success:         false,
        faceCheckStatus: faceCheck.faceCheckStatus,
        message:         'Check-in rejected.',
        reason:          faceCheck.reason,
      });
    }

    // 6. Geo compliance check
    const areasResult = await query(
      'SELECT area_name, latitude, longitude, radius_km FROM restricted_areas WHERE criminal_id = $1',
      [criminalId]
    );

    let status          = 'compliant';
    let violationReason = null;

    for (const area of areasResult.rows) {
      const dist = haversineKm(lat, lng, parseFloat(area.latitude), parseFloat(area.longitude));
      if (dist <= parseFloat(area.radius_km)) {
        status          = 'non_compliant';
        violationReason = `Found inside restricted zone: "${area.area_name}" (${dist.toFixed(2)} km from center, limit: ${area.radius_km} km)`;
        break;
      }
    }

    // 7. Save check-in
    const result = await query(
      `INSERT INTO checkins
         (criminal_id, selfie_url, selfie_public_id,
          latitude, longitude, accuracy,
          status, violation_reason,
          face_similarity, face_check_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING id, checked_in_at, status, violation_reason, face_similarity, face_check_status`,
      [
        criminalId,
        selfieUrl,
        req.file.filename,
        lat, lng,
        accuracy ? parseFloat(accuracy) : null,
        status,
        violationReason,
        faceCheck.similarity,
        faceCheck.faceCheckStatus,
      ]
    );

    const checkin     = result.rows[0];
    const isCompliant = status === 'compliant';

    return res.status(201).json({
      success:         true,
      compliant:       isCompliant,
      status:          checkin.status,
      faceCheckStatus: checkin.face_check_status,
      faceSimilarity:  checkin.face_similarity,
      message:         isCompliant
        ? 'Check-in successful. You are compliant today.'
        : 'Check-in recorded. You are marked NON-COMPLIANT — you are inside a restricted zone.',
      violationReason: checkin.violation_reason,
      checkIn: {
        _id:             checkin.id,
        status:          checkin.status,
        checkedInAt:     checkin.checked_in_at,
        violationReason: checkin.violation_reason,
        faceSimilarity:  checkin.face_similarity,
        faceCheckStatus: checkin.face_check_status,
      },
    });

  } catch (err) {
    if (req.file?.filename) await cloudinary.uploader.destroy(req.file.filename).catch(() => {});
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────
// GET /api/tadipaar/history
// ─────────────────────────────────────────────────────────────────
const getHistory = async (req, res, next) => {
  try {
    const criminalId = req.criminal.id;
    const page   = Math.max(1, parseInt(req.query.page  || '1'));
    const limit  = Math.min(50, parseInt(req.query.limit || '20'));
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT id, selfie_url, latitude, longitude, status,
              violation_reason, face_similarity, face_check_status, checked_in_at
       FROM checkins
       WHERE criminal_id = $1
       ORDER BY checked_in_at DESC
       LIMIT $2 OFFSET $3`,
      [criminalId, limit, offset]
    );

    const countResult = await query(
      'SELECT COUNT(*) FROM checkins WHERE criminal_id = $1',
      [criminalId]
    );

    return res.status(200).json({
      success: true,
      checkIns: result.rows.map((r) => ({
        _id:             r.id,
        selfieUrl:       r.selfie_url,
        latitude:        r.latitude,
        longitude:       r.longitude,
        status:          r.status,
        violationReason: r.violation_reason,
        faceSimilarity:  r.face_similarity,
        faceCheckStatus: r.face_check_status,
        checkInTime:     r.checked_in_at,
      })),
      pagination: {
        total: parseInt(countResult.rows[0].count),
        page, limit,
        pages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
      },
    });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────
// GET /api/tadipaar/my-areas
// ─────────────────────────────────────────────────────────────────
const getMyAreas = async (req, res, next) => {
  try {
    const criminalId = req.criminal.id;

    const areasResult = await query(
      `SELECT id, area_name, latitude, longitude, radius_km, created_at
       FROM restricted_areas WHERE criminal_id = $1 ORDER BY created_at DESC`,
      [criminalId]
    );

    const orderResult = await query(
      `SELECT order_id, start_date, end_date, issued_by, notes
       FROM externment_orders
       WHERE criminal_id = $1 AND is_active = TRUE
       ORDER BY start_date DESC LIMIT 1`,
      [criminalId]
    );

    const order = orderResult.rows[0] || null;

    return res.status(200).json({
      success: true,
      areas: areasResult.rows.map((r) => ({
        _id:       r.id,
        areaName:  r.area_name,
        latitude:  parseFloat(r.latitude),
        longitude: parseFloat(r.longitude),
        radiusKm:  parseFloat(r.radius_km),
        createdAt: r.created_at,
      })),
      orderId:   order?.order_id   || null,
      startDate: order?.start_date || null,
      endDate:   order?.end_date   || null,
      issuedBy:  order?.issued_by  || null,
    });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────
// GET /api/tadipaar/checkin/today
// ─────────────────────────────────────────────────────────────────
const getTodayStatus = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, status, violation_reason, face_similarity, face_check_status, checked_in_at
       FROM checkins
       WHERE criminal_id=$1 AND checked_in_at::date=CURRENT_DATE
       LIMIT 1`,
      [req.criminal.id]
    );

    if (result.rows.length === 0) {
      return res.status(200).json({ success: true, checkedInToday: false, checkIn: null });
    }

    const r = result.rows[0];
    return res.status(200).json({
      success:        true,
      checkedInToday: true,
      compliant:      r.status === 'compliant',
      checkIn: {
        _id:             r.id,
        status:          r.status,
        violationReason: r.violation_reason,
        faceSimilarity:  r.face_similarity,
        faceCheckStatus: r.face_check_status,
        checkedInAt:     r.checked_in_at,
      },
    });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────
// ADMIN — POST /api/admin/areas
// ─────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────
// ADMIN — DELETE /api/admin/areas/:id
// ─────────────────────────────────────────────────────────────────
const deleteRestrictedArea = async (req, res, next) => {
  try {
    const result = await query('DELETE FROM restricted_areas WHERE id=$1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Area not found.' });
    return res.status(200).json({ success: true, message: 'Restricted area deleted.' });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────
// ADMIN — GET /api/admin/checkins
// ─────────────────────────────────────────────────────────────────
const getAllCheckIns = async (req, res, next) => {
  try {
    const { status, criminalId } = req.query;
    const page   = Math.max(1, parseInt(req.query.page  || '1'));
    const limit  = Math.min(100, parseInt(req.query.limit || '30'));
    const offset = (page - 1) * limit;

    const conditions = [];
    const values     = [];
    let idx = 1;

    if (status)     { conditions.push(`ci.status = $${idx++}`);      values.push(status); }
    if (criminalId) { conditions.push(`ci.criminal_id = $${idx++}`); values.push(parseInt(criminalId)); }

    const where      = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const dataValues = [...values, limit, offset];

    const result = await query(
      `SELECT ci.id, ci.selfie_url, ci.latitude, ci.longitude,
              ci.status, ci.violation_reason,
              ci.face_similarity, ci.face_check_status,
              ci.checked_in_at,
              c.name AS criminal_name, c.login_id AS criminal_login_id, c.case_number
       FROM checkins ci
       JOIN criminals c ON c.id = ci.criminal_id
       ${where}
       ORDER BY ci.checked_in_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      dataValues
    );

    const countResult = await query(
      'SELECT COUNT(*) FROM checkins ci ' + where,
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

// ─────────────────────────────────────────────────────────────────
// ADMIN — GET /api/admin/compliance-report
// ─────────────────────────────────────────────────────────────────
const complianceReport = async (req, res, next) => {
  try {
    const { criminalId } = req.query;
    const conditions = criminalId ? 'WHERE ci.criminal_id = $1' : '';
    const values     = criminalId ? [parseInt(criminalId)] : [];

    const result = await query(
      `SELECT
         c.id AS criminal_id, c.name, c.login_id, c.case_number,
         COUNT(ci.id)                                               AS total_checkins,
         COUNT(ci.id) FILTER (WHERE ci.status = 'compliant')       AS compliant_count,
         COUNT(ci.id) FILTER (WHERE ci.status = 'non_compliant')   AS non_compliant_count,
         ROUND(AVG(ci.face_similarity)::numeric, 2)                AS avg_face_similarity,
         MAX(ci.checked_in_at)                                      AS last_checkin
       FROM criminals c
       LEFT JOIN checkins ci ON ci.criminal_id = c.id
       ${conditions}
       GROUP BY c.id, c.name, c.login_id, c.case_number
       ORDER BY non_compliant_count DESC`,
      values
    );

    return res.status(200).json({ success: true, report: result.rows });
  } catch (err) { next(err); }
};

module.exports = {
  checkIn, getHistory, getMyAreas, getTodayStatus,
  addRestrictedArea, deleteRestrictedArea,
  getAllCheckIns, complianceReport,
};