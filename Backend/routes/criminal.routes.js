const express     = require('express');
const router      = express.Router();
const { protect } = require('../middleware/auth');
const validateRequest = require('../middleware/validate');
const { loginSchema, registerSchema } = require('../validators/schemas');
const { uploadCriminalPhoto } = require('../config/cloudinary');
const { login, getProfile, register, getZonesAndStations } = require('../controllers/criminal.controller');

// Public
router.post('/login',          validateRequest(loginSchema), login);
router.post('/register',       uploadCriminalPhoto.single('photo'), validateRequest(registerSchema), register);
router.get ('/meta/zones-stations', getZonesAndStations);

// Protected
router.get('/:id', protect, getProfile);

module.exports = router;