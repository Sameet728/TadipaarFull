const express = require('express');
const router  = express.Router();

const { adminLogin, adminMe }  = require('../controllers/admin.auth.controller');
const { adminProtect: adminAuth } = require('../middleware/adminAuth');
const {
  getHierarchy, getCriminals, getCriminalById,
  getDashboard, getViolations, getMissedCheckIns,
  addRestrictedArea, deleteRestrictedArea, getAllCheckIns, addAdmin,
} = require('../controllers/admin.controller');
const { uploadCriminalPhoto } = require('../config/cloudinary');
const { register }            = require('../controllers/criminal.controller');

// Safety check — helpful error if middleware file is missing/broken
if (typeof adminAuth !== 'function') {
  throw new Error(
    'adminAuth is not a function. ' +
    'Make sure middleware/adminAuth.js exists and exports { adminProtect }.'
  );
}

// ── Public: admin login ───────────────────────────────────
router.post('/auth/login', adminLogin);
router.get ('/auth/me',    adminMe);

// ── All routes below require valid admin JWT ──────────────
router.use(adminAuth);

// Meta / hierarchy
router.get('/hierarchy', getHierarchy);

// Dashboard
router.get('/dashboard', getDashboard);

// Criminal management
router.post('/criminal/register', uploadCriminalPhoto.single('photo'), register);
router.get ('/criminals',         getCriminals);
router.get ('/criminals/:id',     getCriminalById);

// Restricted areas
router.post  ('/areas',     addRestrictedArea);
router.delete('/areas/:id', deleteRestrictedArea);

// Admin management (CP only)
router.post('/add-admin', adminAuth, addAdmin);

// Check-in views
router.get('/checkins',        getAllCheckIns);
router.get('/violations',      getViolations);
router.get('/missed-checkins', getMissedCheckIns);

module.exports = router;