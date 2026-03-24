require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });

const express      = require('express');
const cors         = require('cors');

const errorHandler = require('./middleware/errorHandler');

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

// In Node.js
const bcrypt = require('bcrypt')
bcrypt.hash('admin123', 10).then(hash => {
  console.log(hash);
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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

app.listen(PORT,'0.0.0.0', () => {
  console.log('');
  console.log('==============================================');
  console.log('  Tadipaar API running on port ' + PORT);
  console.log('==============================================');
  console.log('  Base   : http://localhost:' + PORT);
  console.log('  Health : http://localhost:' + PORT + '/health');
  console.log('  Login  : POST http://localhost:' + PORT + '/api/criminal/login');
  console.log('');
});

module.exports = app;
