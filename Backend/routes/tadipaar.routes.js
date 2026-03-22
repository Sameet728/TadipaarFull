const express     = require('express');
const router      = express.Router();
const { protect } = require('../middleware/auth');
const { upload }  = require('../config/cloudinary');
const {
  checkIn,
  getHistory,
  getMyAreas,
  getTodayStatus,
} = require('../controllers/tadipaar.controller');

// All routes require authentication
router.use(protect);

router.post('/checkin',       upload.single('selfie'), checkIn);
router.get ('/history',       getHistory);
router.get ('/my-areas',      getMyAreas);
router.get ('/checkin/today', getTodayStatus);

module.exports = router;