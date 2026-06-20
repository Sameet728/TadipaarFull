require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });

const express      = require('express');
const cors         = require('cors');

const errorHandler = require('./middleware/errorHandler');
const { initializePoliceHierarchy } = require('./config/bootstrapHierarchy');
const { initializeGeofencePresets } = require('./config/geofenceBootstrap');
const { initCleanupJob } = require('./jobs/cleanup');

const criminalRoutes = require('./routes/criminal.routes');
const tadipaarRoutes = require('./routes/tadipaar.routes');
const adminRoutes    = require('./routes/admin.routes');

const app  = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-key'],
}));

const helmet       = require('helmet');
const compression  = require('compression');
const rateLimit    = require('express-rate-limit');
const timeout      = require('connect-timeout');

// Handle Uncaught Exceptions
process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION] Shutting down...', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('[UNHANDLED REJECTION] Shutting down...', err);
  process.exit(1);
});

// API Timeout Middleware (15 seconds)
app.use(timeout('15s'));
app.use((req, res, next) => {
  if (!req.timedout) next();
});

// Security headers
app.use(helmet());

// Compression for faster data fetching
app.use(compression());

// Global Rate Limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per `window`
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests from this IP, please try again after 15 minutes' }
});
app.use(globalLimiter);

// Auth Rate Limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 login requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts, please try again after 15 minutes' }
});


app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Project Tadipaar API - Maharashtra Police',
    version: '1.0.0',
    endpoints: {
      login:   'POST /api/criminal/login',
      profile: 'GET  /api/criminal/:id',
      checkin: 'POST /api/tadipaar/checkin',
      history: 'GET  /api/tadipaar/history',
      areas:   'GET  /api/tadipaar/my-areas',
      today:   'GET  /api/tadipaar/checkin/today',
    },
  });
});

const { pool } = require('./config/db');

app.get('/health', async (req, res) => {
  let dbStatus = 'disconnected';
  try {
    const result = await pool.query('SELECT 1 AS ok');
    if (result.rows[0].ok === 1) dbStatus = 'connected';
  } catch (err) {
    dbStatus = 'error';
  }

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    db: dbStatus,
    version: '1.0.0',
    nodeVersion: process.version
  });
});

app.get('/metrics', async (req, res) => {
  const memoryUsage = process.memoryUsage();
  
  let activeConnections = 0;
  try {
    const connResult = await pool.query("SELECT count(*) FROM pg_stat_activity WHERE state = 'active'");
    activeConnections = parseInt(connResult.rows[0].count, 10);
  } catch (e) {
    // Ignore permissions error or disconnected state for metrics
  }

  res.json({
    uptimeSeconds: process.uptime(),
    memory: {
      rssMb: Math.round(memoryUsage.rss / 1024 / 1024),
      heapTotalMb: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      heapUsedMb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      externalMb: Math.round(memoryUsage.external / 1024 / 1024),
    },
    cpuUsage: process.cpuUsage(),
    dbActiveConnections: activeConnections,
    timestamp: new Date().toISOString()
  });
});

// ==========================================
// QR CODE PHOTO CAPTURE ROUTES
// ==========================================
const qrTempStore = require('./utils/qrTempStore');

app.post('/api/public/qr-upload/:uploadId', (req, res) => {
  const { uploadId } = req.params;
  const { image } = req.body;
  if (!image) return res.status(400).json({ success: false, message: 'No image provided' });
  qrTempStore.saveImage(uploadId, image);
  res.json({ success: true, message: 'Image uploaded successfully' });
});

app.get('/api/admin/qr-check/:uploadId', (req, res) => {
  const { uploadId } = req.params;
  const image = qrTempStore.getImage(uploadId);
  if (image) {
    qrTempStore.removeImage(uploadId); // clean up immediately once fetched
    res.json({ success: true, image });
  } else {
    res.json({ success: false, message: 'Image not ready yet' });
  }
});

app.use('/api/criminal/login', authLimiter);
app.use('/api/admin/auth/login', authLimiter);

// Public config endpoint for OTA and APK updates
app.get('/api/public/app-config', (req, res) => {
  res.json({
    success: true,
    min_app_version: process.env.MIN_APP_VERSION || '1.0.0',
    apk_download_url: process.env.APK_DOWNLOAD_URL || 'https://drive.google.com/file/d/YOUR_FILE_ID/view?usp=sharing'
  });
});

app.use('/api/criminal', criminalRoutes);
app.use('/api/tadipaar', tadipaarRoutes);
app.use('/api/admin',    adminRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route ' + req.method + ' ' + req.path + ' not found.',
  });
});

app.use(errorHandler);

const startServer = async () => {
  await initializePoliceHierarchy();
  await initializeGeofencePresets();

  initCleanupJob();

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('==============================================');
    console.log('  Tadipaar API running on port ' + PORT);
    console.log('==============================================');
    console.log('  Base   : http://localhost:' + PORT);
    console.log('  Health : http://localhost:' + PORT + '/health');
    console.log('  Login  : POST http://localhost:' + PORT + '/api/criminal/login');
    console.log('');
  });

  const gracefulShutdown = () => {
    console.log('Received shutdown signal, shutting down gracefully...');
    server.close(async () => {
      console.log('Closed out remaining connections.');
      try {
        await pool.end();
        console.log('Database pool drained successfully.');
        process.exit(0);
      } catch (err) {
        console.error('Error during pool shutdown', err);
        process.exit(1);
      }
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      console.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
};

startServer();

module.exports = app;
