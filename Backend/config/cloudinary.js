const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
require('dotenv').config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── Storage for daily check-in selfies ────────────────────
const checkinStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:          'tadipaar/checkins',
    allowed_formats: ['jpg', 'jpeg', 'png'],
    transformation: [
      { width: 600, height: 600, crop: 'fill', gravity: 'face' },
      { quality: 'auto:good' },
    ],
    public_id: (req, file) => {
      const cid = req.criminal ? req.criminal.id : 'unknown';
      return 'checkin_' + cid + '_' + Date.now();
    },
  },
});

// ── Storage for criminal registration photos ──────────────
const criminalPhotoStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:          'tadipaar/criminals',
    allowed_formats: ['jpg', 'jpeg', 'png'],
    transformation: [
      { width: 400, height: 400, crop: 'fill', gravity: 'face' },
      { quality: 'auto:good' },
    ],
    public_id: (req, file) => {
      const loginId = req.body.loginId || 'criminal';
      return 'criminal_' + loginId + '_' + Date.now();
    },
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG and PNG images are allowed'), false);
  }
};

const upload = multer({
  storage: checkinStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter,
});

const uploadCriminalPhoto = multer({
  storage: criminalPhotoStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter,
});

module.exports = { cloudinary, upload, uploadCriminalPhoto };