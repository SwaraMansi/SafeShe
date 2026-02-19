require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const wsManager = require('./services/websocket');
const mlModel = require('./services/ml-model');
const authRoutes = require('./routes/auth');
require('./database');
const app = express();
const server = http.createServer(app);
global.wsManager = wsManager;
const corsOptions = {
  origin: function(origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:3003',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:3002',
      'http://127.0.0.1:3003',
      process.env.FRONTEND_URL
    ];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));
app.use(express.json());

// Test endpoint to check Twilio configuration
app.get('/api/twilio/status', (req, res) => {
  const smsService = require('./services/sms');
  const isConfigured = smsService.isTwilioConfigured();
  res.json({
    twilio_configured: isConfigured,
    account_sid: process.env.TWILIO_ACCOUNT_SID ? '***' + process.env.TWILIO_ACCOUNT_SID.slice(-4) : 'NOT SET',
    auth_token: process.env.TWILIO_AUTH_TOKEN ? '***' + process.env.TWILIO_AUTH_TOKEN.slice(-4) : 'NOT SET',
    phone_number: process.env.TWILIO_PHONE || 'NOT SET',
    status: isConfigured ? '✅ Ready to send SMS' : '⚠️ Mock mode - using fallback SMS logs'
  });
});

app.get('/ping', (req, res) => res.json({ message: 'pong' }));
app.use('/auth', authRoutes);
const reportRoutes = require('./routes/reports');
app.use('/reports', reportRoutes);
const contactRoutes = require('./routes/contacts');
app.use('/contacts', contactRoutes);
app.use('/api/contact', contactRoutes);  // Also support /api/contact prefix for red zone alerts
app.use('/api/contacts', contactRoutes); // And /api/contacts for consistency
const analyticsRoutes = require('./routes/analytics');
app.use('/analytics', analyticsRoutes);
const redzonesRoutes = require('./routes/redzones');
app.use('/redzones', redzonesRoutes);
app.use('/api/redzones', redzonesRoutes);
const sosRoutes = require('./routes/sos');
app.use('/sos', sosRoutes);
wsManager.initialize(server);
mlModel.loadWeights().catch(err => console.error('Failed to load ML weights:', err));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`safeSHEE backend running on port ${PORT}`);
  console.log(`WebSocket server available on ws://localhost:${PORT}`);
});
