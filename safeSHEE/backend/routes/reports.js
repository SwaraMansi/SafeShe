const express = require('express');
const router = express.Router();
const db = require('../database');
const { authMiddleware } = require('../middleware/authMiddleware');
const mlModel = require('../services/ml-model');
const fs = require('fs');
const path = require('path');
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

router.post('/', authMiddleware, async (req, res) => {
  const { type, description, latitude, longitude, image_base64 } = req.body;
  const user_id = req.user.id;
  const timestamp = Date.now();

  if (!type || !description) {
    return res.status(400).json({ message: 'Type and description required' });
  }

  const mlPrediction = await mlModel.predictRisk({
    type,
    description,
    timestamp,
    latitude,
    longitude
  });
  
  const stmt = db.prepare(
    'INSERT INTO reports (user_id, type, description, latitude, longitude, timestamp, status, risk_score, predicted_risk_score, ai_confidence, image_path) VALUES (?,?,?,?,?,?,?,?,?,?,?)'
  );
  let image_path = null;
  if (image_base64) {
    try {
      const matches = image_base64.match(/^data:(.+);base64,(.+)$/);
      let ext = 'jpg';
      let data = image_base64;
      if (matches) {
        const mime = matches[1];
        const base64Data = matches[2];
        const mimeExt = mime.split('/')[1];
        ext = mimeExt || ext;
        data = base64Data;
      }
      const filename = `report_${Date.now()}.${ext}`;
      const filepath = path.join(uploadsDir, filename);
      fs.writeFileSync(filepath, Buffer.from(data, 'base64'));
      image_path = `/uploads/${filename}`;
    } catch (e) {
      console.error('Failed to save image', e);
    }
  }
  stmt.run(
    user_id,
    type,
    description,
    latitude || null,
    longitude || null,
    timestamp,
    'pending',
    mlPrediction.predicted_risk_score,
    mlPrediction.predicted_risk_score,
    mlPrediction.ai_confidence,
    image_path,
    function (err) {
      if (err) {
        return res.status(500).json({ message: 'DB error', error: err.message });
      }
      const report = {
        id: this.lastID,
        user_id,
        type,
        description,
        latitude,
        longitude,
        timestamp,
        status: 'pending',
        risk_score: mlPrediction.predicted_risk_score,
        predicted_risk_score: mlPrediction.predicted_risk_score,
        ai_confidence: mlPrediction.ai_confidence,
        ai_explanation: mlPrediction.explanation,
        scoreBreakdown: mlPrediction.scoreBreakdown,
        image_path
      };
      console.log(`📊 Report #${this.lastID} | Category: ${type} | Risk Score: ${mlPrediction.predicted_risk_score}/100 | Confidence: ${(mlPrediction.ai_confidence * 100).toFixed(0)}%`);
      if (global.wsManager && typeof global.wsManager.broadcastNewAlert === 'function') {
        global.wsManager.broadcastNewAlert(report);
      }
      res.status(201).json({ message: 'Report created', report });
    }
  );
  stmt.finalize();
});
router.get('/', authMiddleware, (req, res) => {
  if (req.user.role !== 'police') {
    return res.status(403).json({ message: 'Only police can view all reports' });
  }
  db.all(
    'SELECT r.*, u.name, u.email FROM reports r LEFT JOIN users u ON r.user_id = u.id WHERE r.status != "resolved"',
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ message: 'DB error', error: err.message });
      }
      const now = Date.now();
      const updatedRows = rows.map(r => {
        const hoursUnresolved = Math.floor((now - r.timestamp) / (1000 * 60 * 60));
        const minutesUnresolved = Math.floor((now - r.timestamp) / (1000 * 60));
        return {
          ...r,
          hoursUnresolved,
          minutesUnresolved,
          aiPriorityLevel: r.predicted_risk_score > 85 ? 'Critical' : r.predicted_risk_score > 70 ? 'High' : r.predicted_risk_score > 40 ? 'Medium' : 'Low'
        };
      });
      updatedRows.sort((a, b) => b.predicted_risk_score - a.predicted_risk_score);
      res.json({ reports: updatedRows });
    }
  );
});
router.get('/user', authMiddleware, (req, res) => {
  const user_id = req.user.id;
  db.all(
    'SELECT * FROM reports WHERE user_id = ? ORDER BY timestamp DESC',
    [user_id],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ message: 'DB error', error: err.message });
      }
      res.json({ reports: rows || [] });
    }
  );
});
router.get('/:id', authMiddleware, (req, res) => {
  const reportId = req.params.id;
  db.get('SELECT r.*, u.name, u.email FROM reports r LEFT JOIN users u ON r.user_id = u.id WHERE r.id = ?', [reportId], (err, row) => {
    if (err) {
      return res.status(500).json({ message: 'DB error', error: err.message });
    }
    if (!row) {
      return res.status(404).json({ message: 'Report not found' });
    }
    if (req.user.role !== 'police' && row.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    res.json({ report: row });
  });
});
router.put('/:id/status', authMiddleware, (req, res) => {
  if (req.user.role !== 'police') {
    return res.status(403).json({ message: 'Only police can update report status' });
  }
  const reportId = req.params.id;
  const { status } = req.body;
  if (!['pending', 'investigating', 'resolved'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }
  if (status === 'resolved') {
    db.get('SELECT * FROM reports WHERE id = ?', [reportId], (err, row) => {
      if (row) {
        const resolutionTimeMs = Date.now() - row.timestamp;
        const resolutionTimeHours = resolutionTimeMs / (1000 * 60 * 60);
        mlModel.updateWeights({
          type: row.type,
          resolution_time_hours: resolutionTimeHours,
          predicted_risk_score: row.predicted_risk_score
        });
        console.log(`🤖 Continuous learning: ${row.type} resolved in ${resolutionTimeHours.toFixed(1)} hours`);
      }
    });
  }
  db.run('UPDATE reports SET status = ? WHERE id = ?', [status, reportId], function (err) {
    if (err) {
      return res.status(500).json({ message: 'DB error', error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ message: 'Report not found' });
    }
    console.log(`✅ Report #${reportId} status updated to ${status}`);
    res.json({ message: `Report status updated to ${status}` });
  });
});
router.get('/locations', authMiddleware, (req, res) => {
  if (req.user.role !== 'police') {
    return res.status(403).json({ message: 'Only police can access location data' });
  }
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  db.all(
    `SELECT 
      latitude, 
      longitude, 
      predicted_risk_score as risk_score,
      type as category,
      timestamp,
      status
     FROM reports 
     WHERE status IN ('pending', 'investigating')
     AND timestamp > ?
     AND latitude IS NOT NULL 
     AND longitude IS NOT NULL
     ORDER BY timestamp DESC`,
    [thirtyDaysAgo],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({
        locations: rows || [],
        count: rows ? rows.length : 0
      });
    }
  );
});
router.post('/wearable-alert', authMiddleware, async (req, res) => {
  let { user_id, source = 'wearable', metadata } = req.body;
  user_id = user_id || req.user.id;
  const timestamp = Date.now();
  const type = 'wearable_sos';
  const description = `Wearable alert triggered: ${JSON.stringify(metadata || {})}`;
  const prediction = await mlModel.predictRisk({ type, description });
  const predicted_risk_score = prediction.predicted_risk_score;
  const ai_confidence = prediction.ai_confidence;
  db.run(
    `INSERT INTO reports (user_id, type, description, latitude, longitude, timestamp, risk_score, predicted_risk_score, ai_confidence) VALUES (?,?,?,?,?,?,?,?,?)`,
    [user_id, type, description, null, null, timestamp, 0, predicted_risk_score, ai_confidence],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (global.wsManager && typeof global.wsManager.broadcast === 'function') {
        global.wsManager.broadcast({ type: 'sos', reportId: this.lastID, predicted_risk_score });
      }
      res.json({ id: this.lastID, predicted_risk_score, ai_confidence });
    }
  );
});
module.exports = router;
