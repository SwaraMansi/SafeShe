const express = require('express');
const router = express.Router();
const db = require('../database');
const { authMiddleware, adminOnly } = require('../middleware/authMiddleware');
const smsService = require('../services/sms');

// Create new SOS alert
router.post('/', authMiddleware, (req, res) => {
  const { latitude, longitude, timestamp } = req.body;
  const user_id = req.user.id;
  if (latitude == null || longitude == null) return res.status(400).json({ message: 'Invalid coordinates' });
  const ts = timestamp || Date.now();
  const stmt = db.prepare('INSERT INTO sos_alerts (user_id, latitude, longitude, timestamp) VALUES (?,?,?,?)');
  stmt.run(user_id, latitude, longitude, ts, function (err) {
    if (err) return res.status(500).json({ message: 'DB error', error: err.message });
    const alertId = this.lastID;
    // record initial location in sos_locations
    const locStmt = db.prepare('INSERT INTO sos_locations (alert_id, latitude, longitude, timestamp) VALUES (?,?,?,?)');
    locStmt.run(alertId, latitude, longitude, ts, () => locStmt.finalize());
    
    // Prepare alert object for WebSocket broadcast
    const alert = {
      id: alertId,
      user_id: user_id,
      name: req.user.name,
      email: req.user.email,
      latitude: latitude,
      longitude: longitude,
      timestamp: ts,
      status: 'active'
    };

    // Notify primary contact via SMS (detailed alert and 'help' message)
    const primaryContact = req.user.primaryContact; // Assuming primary contact is stored in user object
    const detailedMessage = `Emergency Alert! ${req.user.name} has triggered an SOS. Location: (${latitude}, ${longitude}).`;
    const helpMessage = 'help';

    if (primaryContact) {
      // Send detailed alert
      smsService.sendSMS(primaryContact, detailedMessage)
        .then(() => console.log(`📩 Detailed SMS sent to primary contact: ${primaryContact}`))
        .catch(err => console.error(`⚠️ Failed to send detailed SMS: ${err.message}`));
      // Send simple 'help' message
      smsService.sendSMS(primaryContact, helpMessage)
        .then(() => console.log(`📩 'help' SMS sent to primary contact: ${primaryContact}`))
        .catch(err => console.error(`⚠️ Failed to send 'help' SMS: ${err.message}`));
    } else {
      console.warn('⚠️ No primary contact found for user');
    }

    if (global.wsManager) {
      global.wsManager.broadcastNewAlert(alert);
    }

    console.log(`🚨 SOS Alert #${alertId} created for ${req.user.name}`);

    res.status(201).json({ message: 'SOS created', alertId, alert });
  });
  stmt.finalize();
});

router.post('/update', authMiddleware, (req, res) => {
  const { alertId, latitude, longitude, timestamp } = req.body;
  if (!alertId || latitude == null || longitude == null) return res.status(400).json({ message: 'Missing data' });
  const ts = timestamp || Date.now();
  db.get('SELECT * FROM sos_alerts WHERE id = ?', [alertId], (err, row) => {
    if (err) return res.status(500).json({ message: 'DB error', error: err.message });
    if (!row) return res.status(404).json({ message: 'Alert not found' });
    // Insert location point
    const locStmt = db.prepare('INSERT INTO sos_locations (alert_id, latitude, longitude, timestamp) VALUES (?,?,?,?)');
    locStmt.run(alertId, latitude, longitude, ts, () => locStmt.finalize());
    // Update latest coordinates on alert
    db.run('UPDATE sos_alerts SET latitude = ?, longitude = ?, timestamp = ? WHERE id = ?', [latitude, longitude, ts, alertId], function (uerr) {
      if (uerr) return res.status(500).json({ message: 'DB error', error: uerr.message });
      
      // Broadcast location update to WebSocket clients
      if (global.wsManager) {
        const updateData = { alertId, latitude, longitude, timestamp: ts };
        const message = JSON.stringify({
          type: 'location_update',
          data: updateData,
          timestamp: Date.now()
        });
        
        // Get wss from wsManager and send to all clients
        if (global.wsManager.wss && global.wsManager.wss.clients) {
          global.wsManager.wss.clients.forEach((client) => {
            if (client.readyState === 1) { // WebSocket.OPEN
              client.send(message);
            }
          });
        }
      }

      res.json({ message: 'Location updated' });
    });
  });
});

// Stop/resolve alert and send SMS notifications
router.patch('/:id/resolve', authMiddleware, (req, res) => {
  const id = req.params.id;
  db.run('UPDATE sos_alerts SET status = ? WHERE id = ?', ['resolved', id], function (err) {
    if (err) return res.status(500).json({ message: 'DB error', error: err.message });
    
    // Broadcast status change to WebSocket clients
    if (global.wsManager) {
      global.wsManager.broadcastStatusChange(id, 'resolved');
    }
    
    console.log(`✅ Alert #${id} marked as resolved`);
    res.json({ message: 'Alert resolved' });
  });
});

// Get active alerts (for dashboard)
router.get('/', authMiddleware, (req, res) => {
  db.all("SELECT sa.*, u.name, u.email FROM sos_alerts sa LEFT JOIN users u ON sa.user_id = u.id WHERE sa.status = 'active'", [], (err, rows) => {
    if (err) return res.status(500).json({ message: 'DB error', error: err.message });
    res.json({ alerts: rows });
  });
});

// Admin: get all alerts
router.get('/all', authMiddleware, adminOnly, (req, res) => {
  db.all('SELECT sa.*, u.name, u.email FROM sos_alerts sa LEFT JOIN users u ON sa.user_id = u.id', [], (err, rows) => {
    if (err) return res.status(500).json({ message: 'DB error', error: err.message });
    res.json({ alerts: rows });
  });
});

// Get locations for an alert
router.get('/:id/locations', authMiddleware, (req, res) => {
  const id = req.params.id;
  db.all('SELECT latitude, longitude, timestamp FROM sos_locations WHERE alert_id = ? ORDER BY timestamp ASC', [id], (err, rows) => {
    if (err) return res.status(500).json({ message: 'DB error', error: err.message });
    res.json({ locations: rows });
  });
});

// Test SMS endpoint (development only)
router.post('/test/sms', authMiddleware, async (req, res) => {
  const { phoneNumber, message } = req.body;
  if (!phoneNumber || !message) return res.status(400).json({ message: 'Phone and message required' });
  
  const result = await smsService.sendSMS(phoneNumber, message);
  res.json(result);
});

// Get mock SMS log (development only)
router.get('/test/sms-log', authMiddleware, (req, res) => {
  const log = smsService.getMockSmsLog();
  res.json({ mockSmsLog: log, usesRealTwilio: smsService.isTwilioConfigured() });
});

module.exports = router;


