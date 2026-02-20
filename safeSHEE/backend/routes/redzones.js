const express = require("express");
const router = express.Router();
const db = require("../database");
const { authMiddleware } = require("../middleware/authMiddleware");

// Create red_zones table if it doesn't exist
db.run(
  `
  CREATE TABLE IF NOT EXISTS red_zones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    radius_meters REAL DEFAULT 500,
    risk_level TEXT DEFAULT 'high',
    description TEXT,
    created_by INTEGER,
    created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    is_active INTEGER DEFAULT 1
  )
`,
  (err) => {
    if (err) console.error("Error creating red_zones table:", err);
    else console.log("✅ red_zones table ready");
  },
);

// GET /redzones — return manual red zones + auto-generated clusters from reports
router.get("/", authMiddleware, (req, res) => {
  // First get manual red zones
  db.all(
    `SELECT * FROM red_zones WHERE is_active = 1`,
    [],
    (err, manualZones) => {
      if (err) return res.status(500).json({ error: err.message });

      // Format manual zones to match expected structure
      const formattedManual = (manualZones || []).map((zone) => ({
        id: zone.id,
        name: zone.name,
        center: { latitude: zone.latitude, longitude: zone.longitude },
        radiusMeters: zone.radius_meters,
        riskLevel: zone.risk_level,
        description: zone.description,
        type: "manual",
        avgRisk:
          zone.risk_level === "critical"
            ? 90
            : zone.risk_level === "high"
              ? 75
              : 50,
        count: 1,
      }));

      // Also get auto-generated clusters from reports
      const days = parseInt(req.query.days || "30", 10);
      const since = Date.now() - 1000 * 60 * 60 * 24 * days;

      db.all(
        `SELECT latitude, longitude, predicted_risk_score FROM reports 
         WHERE timestamp > ? AND latitude IS NOT NULL AND longitude IS NOT NULL`,
        [since],
        (err2, rows) => {
          if (err2) {
            // If reports query fails, still return manual zones
            return res.json(formattedManual);
          }

          const clusters = [];
          if (rows && rows.length > 0) {
            const buckets = {};
            rows.forEach((r) => {
              const lat = Math.round(r.latitude * 1000) / 1000;
              const lng = Math.round(r.longitude * 1000) / 1000;
              const key = `${lat}_${lng}`;
              if (!buckets[key])
                buckets[key] = { latSum: 0, lngSum: 0, count: 0, scoreSum: 0 };
              buckets[key].latSum += r.latitude;
              buckets[key].lngSum += r.longitude;
              buckets[key].count += 1;
              buckets[key].scoreSum += r.predicted_risk_score || 0;
            });

            Object.keys(buckets).forEach((k) => {
              const b = buckets[k];
              clusters.push({
                center: {
                  latitude: b.latSum / b.count,
                  longitude: b.lngSum / b.count,
                },
                count: b.count,
                avgRisk: b.scoreSum / b.count,
                radiusMeters: Math.min(500, 50 + b.count * 10),
                type: "auto",
              });
            });
            clusters.sort((a, b) => b.avgRisk - a.avgRisk);
          }

          // Combine manual + auto clusters
          res.json([...formattedManual, ...clusters.slice(0, 50)]);
        },
      );
    },
  );
});

// POST /redzones — police creates a manual red zone
router.post("/", authMiddleware, (req, res) => {
  // Only police can create red zones
  if (req.user.role !== "police") {
    return res
      .status(403)
      .json({ message: "Only police can create red zones" });
  }

  const { name, latitude, longitude, radius_meters, risk_level, description } =
    req.body;

  if (!name || !latitude || !longitude) {
    return res
      .status(400)
      .json({ message: "name, latitude, and longitude are required" });
  }

  db.run(
    `INSERT INTO red_zones (name, latitude, longitude, radius_meters, risk_level, description, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      name,
      parseFloat(latitude),
      parseFloat(longitude),
      parseFloat(radius_meters) || 500,
      risk_level || "high",
      description || "",
      req.user.id,
      Date.now(),
    ],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });

      const zoneId = this.lastID;
      const riskScore =
        risk_level === "critical" ? 90 : risk_level === "high" ? 75 : 50;

      // Also insert into reports table so it shows in Incident Management & Analytics
      db.run(
        `INSERT INTO reports (type, description, latitude, longitude, status, timestamp, predicted_risk_score, ai_confidence)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          "red_zone",
          `🚩 Red Zone Marked: ${name}${description ? ". " + description : ""}`,
          parseFloat(latitude),
          parseFloat(longitude),
          "investigating",
          Date.now(),
          riskScore,
          0.95,
        ],
        function (reportErr) {
          if (reportErr) console.error("Report insert error:", reportErr);
        },
      );

      res.status(201).json({
        message: "Red zone created successfully",
        zone: {
          id: zoneId,
          name,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          radius_meters: parseFloat(radius_meters) || 500,
          risk_level: risk_level || "high",
          description,
        },
      });
    },
  );
});

// DELETE /redzones/:id — police deletes a red zone
router.delete("/:id", authMiddleware, (req, res) => {
  if (req.user.role !== "police") {
    return res
      .status(403)
      .json({ message: "Only police can delete red zones" });
  }

  db.run(
    `UPDATE red_zones SET is_active = 0 WHERE id = ?`,
    [req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0)
        return res.status(404).json({ message: "Red zone not found" });
      res.json({ message: "Red zone deleted successfully" });
    },
  );
});

module.exports = router;
