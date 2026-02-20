const express = require("express");
const router = express.Router();
const db = require("../database");
const { authMiddleware } = require("../middleware/authMiddleware");
const mlModel = require("../services/ml-model");
const fs = require("fs");
const path = require("path");
const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// --- [POST REPORT ROUTE - NO CHANGES] ---
router.post("/", authMiddleware, async (req, res) => {
  const { type, description, latitude, longitude, image_base64 } = req.body;
  const user_id = req.user.id;
  const timestamp = Date.now();

  if (!type || !description) {
    return res.status(400).json({ message: "Type and description required" });
  }

  const mlPrediction = await mlModel.predictRisk({
    type,
    description,
    timestamp,
    latitude,
    longitude,
  });

  const stmt = db.prepare(
    "INSERT INTO reports (user_id, type, description, latitude, longitude, timestamp, status, risk_score, predicted_risk_score, ai_confidence, image_path) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
  );

  let image_path = null;
  if (image_base64) {
    try {
      const matches = image_base64.match(/^data:(.+);base64,(.+)$/);
      let ext = "jpg";
      let data = image_base64;
      if (matches) {
        const mime = matches[1];
        const base64Data = matches[2];
        ext = mime.split("/")[1] || ext;
        data = base64Data;
      }
      const filename = `report_${Date.now()}.${ext}`;
      const filepath = path.join(uploadsDir, filename);
      fs.writeFileSync(filepath, Buffer.from(data, "base64"));
      image_path = `/uploads/${filename}`;
    } catch (e) {
      console.error("Failed to save image", e);
    }
  }

  stmt.run(
    user_id,
    type,
    description,
    latitude || null,
    longitude || null,
    timestamp,
    "pending",
    mlPrediction.predicted_risk_score,
    mlPrediction.predicted_risk_score,
    mlPrediction.ai_confidence,
    image_path,
    function (err) {
      if (err)
        return res
          .status(500)
          .json({ message: "DB error", error: err.message });
      const report = {
        id: this.lastID,
        user_id,
        type,
        description,
        latitude,
        longitude,
        timestamp,
        status: "pending",
        risk_score: mlPrediction.predicted_risk_score,
        predicted_risk_score: mlPrediction.predicted_risk_score,
        ai_confidence: mlPrediction.ai_confidence,
        ai_explanation: mlPrediction.explanation,
        scoreBreakdown: mlPrediction.scoreBreakdown,
        image_path,
      };
      if (
        global.wsManager &&
        typeof global.wsManager.broadcastNewAlert === "function"
      ) {
        global.wsManager.broadcastNewAlert(report);
      }
      res.status(201).json({ message: "Report created", report });
    },
  );
  stmt.finalize();
});

// --- [GET ALL REPORTS FOR POLICE - NO CHANGES] ---
router.get("/", authMiddleware, (req, res) => {
  if (req.user.role !== "police") {
    return res
      .status(403)
      .json({ message: "Only police can view all reports" });
  }
  const officerId = req.user.id;
  db.all(
    `SELECT r.*, u.name, u.email,
      COALESCE(ra.status, r.status, 'pending') as status
     FROM reports r
     LEFT JOIN users u ON r.user_id = u.id
     LEFT JOIN report_actions ra
       ON r.id = ra.report_id AND ra.officer_id = ?
     ORDER BY r.predicted_risk_score DESC`,
    [officerId],
    (err, rows) => {
      if (err)
        return res
          .status(500)
          .json({ message: "DB error", error: err.message });
      const now = Date.now();
      const updatedRows = rows.map((r) => {
        const minutesUnresolved = Math.floor((now - r.timestamp) / (1000 * 60));
        return {
          ...r,
          minutesUnresolved,
          aiPriorityLevel:
            r.predicted_risk_score > 85
              ? "Critical"
              : r.predicted_risk_score > 70
                ? "High"
                : r.predicted_risk_score > 40
                  ? "Medium"
                  : "Low",
        };
      });
      res.json({ reports: updatedRows });
    },
  );
});

// --- [GET LOCATIONS - UPDATED WITH OFFICER FILTER] ---
router.get("/locations", authMiddleware, (req, res) => {
  if (req.user.role !== "police") {
    return res
      .status(403)
      .json({ message: "Only police can access location data" });
  }

  const officerId = req.user.id;
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  // ✅ Filtering by officer's specific status (from report_actions)
  // This ensures if Officer A resolves a report, it disappears from HIS map but stays for others.
  db.all(
    `SELECT 
      r.latitude, 
      r.longitude, 
      r.predicted_risk_score as risk_score,
      r.type as category,
      r.timestamp,
      COALESCE(ra.status, r.status, 'pending') as current_status
     FROM reports r
     LEFT JOIN report_actions ra ON r.id = ra.report_id AND ra.officer_id = ?
     WHERE (current_status IN ('pending', 'investigating'))
     AND r.timestamp > ?
     AND r.latitude IS NOT NULL 
     AND r.longitude IS NOT NULL
     ORDER BY r.timestamp DESC`,
    [officerId, thirtyDaysAgo],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({
        locations: rows || [],
        count: rows ? rows.length : 0,
      });
    },
  );
});

// --- [GET USER REPORTS - NO CHANGES] ---
router.get("/user", authMiddleware, (req, res) => {
  const user_id = req.user.id;
  db.all(
    "SELECT * FROM reports WHERE user_id = ? ORDER BY timestamp DESC",
    [user_id],
    (err, rows) => {
      if (err)
        return res
          .status(500)
          .json({ message: "DB error", error: err.message });
      res.json({ reports: rows || [] });
    },
  );
});

// --- [UPDATE STATUS - NO CHANGES] ---
router.put("/:id/status", authMiddleware, (req, res) => {
  if (req.user.role !== "police") {
    return res
      .status(403)
      .json({ message: "Only police can update report status" });
  }
  const reportId = req.params.id;
  const officerId = req.user.id;
  const { status } = req.body;

  if (status === "resolved") {
    db.get("SELECT * FROM reports WHERE id = ?", [reportId], (err, row) => {
      if (row) {
        const resolutionTimeHours =
          (Date.now() - row.timestamp) / (1000 * 60 * 60);
        mlModel.updateWeights({
          type: row.type,
          resolution_time_hours: resolutionTimeHours,
          predicted_risk_score: row.predicted_risk_score,
        });
      }
    });
  }

  db.run(
    `INSERT INTO report_actions (report_id, officer_id, status, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(report_id, officer_id)
     DO UPDATE SET status=excluded.status, updated_at=excluded.updated_at`,
    [reportId, officerId, status, Date.now()],
    function (err) {
      if (err)
        return res
          .status(500)
          .json({ message: "DB error", error: err.message });
      res.json({ message: `Report status updated to ${status}` });
    },
  );
});

// --- [WEARABLE SOS - NO CHANGES] ---
router.post("/wearable-alert", authMiddleware, async (req, res) => {
  let { user_id, metadata } = req.body;
  user_id = user_id || req.user.id;
  const timestamp = Date.now();
  const type = "wearable_sos";
  const description = `Wearable alert triggered: ${JSON.stringify(metadata || {})}`;
  const prediction = await mlModel.predictRisk({ type, description });

  db.run(
    `INSERT INTO reports (user_id, type, description, latitude, longitude, timestamp, risk_score, predicted_risk_score, ai_confidence) VALUES (?,?,?,?,?,?,?,?,?)`,
    [
      user_id,
      type,
      description,
      null,
      null,
      timestamp,
      0,
      prediction.predicted_risk_score,
      prediction.ai_confidence,
    ],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (
        global.wsManager &&
        typeof global.wsManager.broadcast === "function"
      ) {
        global.wsManager.broadcast({
          type: "sos",
          reportId: this.lastID,
          predicted_risk_score: prediction.predicted_risk_score,
        });
      }
      res.json({
        id: this.lastID,
        predicted_risk_score: prediction.predicted_risk_score,
        ai_confidence: prediction.ai_confidence,
      });
    },
  );
});

module.exports = router;
