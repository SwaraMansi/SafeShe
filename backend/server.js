require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

// Mount routers (if present)
try {
  const reportRouter = require('./routes/report');
  const authRouter = require('./routes/auth');
  app.use('/api/report', reportRouter);
  app.use('/api/auth', authRouter);
} catch (err) {
  // in case routes were removed temporarily
  console.warn('Routes not mounted:', err.message);
}

// Simple health check
app.get('/ping', (req, res) => res.send('PONG'));

// SOS (kept for backwards compatibility)
app.post('/api/report/sos', (req, res) => {
  console.log('🚨 SOS HIT');
  res.json({ ok: true });
});

// DB connect helper for tests
async function connectDB(uri) {
  const MONGO = uri || process.env.MONGO_URI || 'mongodb://localhost:27017/safeshee';
  await mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true });
  return mongoose;
}

if (require.main === module) {
  (async () => {
    try {
      await connectDB();
      const PORT = process.env.PORT || 5000;
      app.listen(PORT, () => console.log(`SERVER RUNNING ON ${PORT}`));
    } catch (err) {
      console.error('Failed to start server', err);
      process.exit(1);
    }
  })();
}

module.exports = { app, connectDB };
