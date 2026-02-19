const express = require("express");
const router = express.Router();
const db = require("../database");
const { authMiddleware, adminOnly } = require("../middleware/authMiddleware");
const smsService = require("../services/sms");

router.post("/", authMiddleware, async (req, res) => {
  const { latitude, longitude, timestamp } = req.body;
  const user_id = req.user.id;

  if (latitude == null || longitude == null) {
    return res.status(400).json({ message: "Invalid coordinates" });
  }

  const ts = timestamp || Date.now();

  // 1. SOS Alert record insert karna
  const stmt = db.prepare(
    "INSERT INTO sos_alerts (user_id, latitude, longitude, timestamp) VALUES (?,?,?,?)",
  );

  stmt.run(user_id, latitude, longitude, ts, function (err) {
    if (err) {
      return res.status(500).json({ message: "DB error", error: err.message });
    }

    const alertId = this.lastID;

    // 2. Location details insert karna
    const locStmt = db.prepare(
      "INSERT INTO sos_locations (alert_id, latitude, longitude, timestamp) VALUES (?,?,?,?)",
    );
    locStmt.run(alertId, latitude, longitude, ts, () => locStmt.finalize());

    const alert = {
      id: alertId,
      user_id: user_id,
      name: req.user.name,
      email: req.user.email,
      latitude: latitude,
      longitude: longitude,
      timestamp: ts,
      status: "active",
    };

    // 3. Database se contacts nikal kar SMS bhejna
    db.all(
      "SELECT * FROM emergency_contacts WHERE user_id = ?",
      [user_id],
      async (err, contacts) => {
        if (err) {
          console.error("❌ Error fetching contacts:", err.message);
        } else if (contacts && contacts.length > 0) {
          try {
            console.log(
              `📡 Found ${contacts.length} contacts for user ${user_id}. Sending SMS...`,
            );

            await smsService.sendSOSAlert(
              req.user.name,
              req.user.email,
              latitude,
              longitude,
              contacts,
            );

            console.log("✅ SMS Process completed.");
          } catch (smsErr) {
            console.error("❌ Twilio/SMS Error:", smsErr.message);
          }
        } else {
          console.log("⚠️ No emergency contacts found in DB for this user.");
        }

        // 4. WebSocket Notification
        if (global.wsManager) {
          global.wsManager.broadcastNewAlert(alert);
        }

        // Final Response
        res.status(201).json({ message: "SOS created", alertId, alert });
      },
    );
  });
  stmt.finalize();
});

// Baki ke routes (update, resolve, get) as it is niche paste kar raha hu...
router.post("/update", authMiddleware, (req, res) => {
  const { alertId, latitude, longitude, timestamp } = req.body;
  if (!alertId || latitude == null || longitude == null)
    return res.status(400).json({ message: "Missing data" });
  const ts = timestamp || Date.now();
  db.get("SELECT * FROM sos_alerts WHERE id = ?", [alertId], (err, row) => {
    if (err)
      return res.status(500).json({ message: "DB error", error: err.message });
    if (!row) return res.status(404).json({ message: "Alert not found" });

    const locStmt = db.prepare(
      "INSERT INTO sos_locations (alert_id, latitude, longitude, timestamp) VALUES (?,?,?,?)",
    );
    locStmt.run(alertId, latitude, longitude, ts, () => locStmt.finalize());

    db.run(
      "UPDATE sos_alerts SET latitude = ?, longitude = ?, timestamp = ? WHERE id = ?",
      [latitude, longitude, ts, alertId],
      function (uerr) {
        if (uerr)
          return res
            .status(500)
            .json({ message: "DB error", error: uerr.message });
        res.json({ message: "Location updated" });
      },
    );
  });
});

router.patch("/:id/resolve", authMiddleware, (req, res) => {
  const id = req.params.id;
  db.run(
    "UPDATE sos_alerts SET status = ? WHERE id = ?",
    ["resolved", id],
    function (err) {
      if (err)
        return res
          .status(500)
          .json({ message: "DB error", error: err.message });
      res.json({ message: "Alert resolved" });
    },
  );
});

router.get("/", authMiddleware, (req, res) => {
  db.all(
    "SELECT sa.*, u.name, u.email FROM sos_alerts sa LEFT JOIN users u ON sa.user_id = u.id WHERE sa.status = 'active'",
    [],
    (err, rows) => {
      if (err)
        return res
          .status(500)
          .json({ message: "DB error", error: err.message });
      res.json({ alerts: rows });
    },
  );
});

module.exports = router;
