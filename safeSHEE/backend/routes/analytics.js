const express = require("express");
const router = express.Router();
const db = require("../database");
const { authMiddleware } = require("../middleware/authMiddleware");

router.get("/summary", authMiddleware, (req, res) => {
  if (req.user.role !== "police") {
    return res
      .status(403)
      .json({ message: "Only police can access analytics" });
  }

  const officerId = req.user.id;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTimestamp = today.getTime();

  db.serialize(() => {
    // 1. Total
    db.get("SELECT COUNT(*) as total FROM reports", (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      const totalReports = row.total;

      // 2. Active (Per-officer status check)
      db.get(
        `SELECT COUNT(*) as active FROM reports r
         LEFT JOIN report_actions ra ON r.id = ra.report_id AND ra.officer_id = ?
         WHERE COALESCE(ra.status, r.status) IN ('pending', 'investigating')`,
        [officerId],
        (err, row) => {
          if (err) return res.status(500).json({ error: err.message });
          const activeReports = row.active;

          // 3. Resolved (Per-officer status check)
          db.get(
            `SELECT COUNT(*) as resolved FROM reports r
             LEFT JOIN report_actions ra ON r.id = ra.report_id AND ra.officer_id = ?
             WHERE COALESCE(ra.status, r.status) = 'resolved'`,
            [officerId],
            (err, row) => {
              if (err) return res.status(500).json({ error: err.message });
              const resolvedReports = row.resolved;

              // 4. High Risk
              db.get(
                "SELECT COUNT(*) as high_risk FROM reports WHERE predicted_risk_score > 70",
                (err, row) => {
                  if (err) return res.status(500).json({ error: err.message });
                  const highRiskReports = row.high_risk;

                  // 5. Today
                  db.get(
                    "SELECT COUNT(*) as today FROM reports WHERE timestamp > ?",
                    [todayTimestamp],
                    (err, row) => {
                      if (err)
                        return res.status(500).json({ error: err.message });
                      const reportsToday = row.today;

                      // 6. Avg Response Time
                      db.get(
                        `SELECT AVG(ra.updated_at - r.timestamp) as avg_ms
                     FROM reports r
                     JOIN report_actions ra ON r.id = ra.report_id
                     WHERE ra.status = 'resolved' AND ra.officer_id = ?`,
                        [officerId],
                        (err, row) => {
                          const avgMs = row?.avg_ms || 0;
                          const avgHours = avgMs
                            ? Math.round(avgMs / (1000 * 60 * 60))
                            : 0;
                          res.json({
                            totalReports,
                            activeReports,
                            resolvedReports,
                            highRiskReports,
                            reportsToday,
                            avgResponseTimeHours: avgHours,
                            resolutionRate:
                              totalReports > 0
                                ? Math.round(
                                    (resolvedReports / totalReports) * 100,
                                  )
                                : 0,
                          });
                        },
                      );
                    },
                  );
                },
              );
            },
          );
        },
      );
    });
  });
});

// ✅ 📊 Category Distribution (Pie Chart data)
router.get("/category-distribution", authMiddleware, (req, res) => {
  if (req.user.role !== "police")
    return res.status(403).json({ message: "Forbidden" });
  db.all(
    `SELECT type as category, COUNT(*) as count FROM reports GROUP BY type ORDER BY count DESC`,
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ categories: rows || [] });
    },
  );
});

// ✅ 📈 Time Trends (Line Chart data)
router.get("/time-trends", authMiddleware, (req, res) => {
  if (req.user.role !== "police")
    return res.status(403).json({ message: "Forbidden" });
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  db.serialize(() => {
    db.all(
      `SELECT DATE(timestamp / 1000, 'unixepoch') as date, COUNT(*) as count
       FROM reports WHERE timestamp > ? GROUP BY date ORDER BY date ASC`,
      [sevenDaysAgo],
      (err, dailyRows) => {
        if (err) return res.status(500).json({ error: err.message });
        db.all(
          `SELECT CAST((timestamp / 1000 / 3600) % 24 as INTEGER) as hour, COUNT(*) as count
           FROM reports GROUP BY hour ORDER BY hour ASC`,
          (err, hourlyRows) => {
            if (err) return res.status(500).json({ error: err.message });
            const hourlyData = Array.from({ length: 24 }, (_, i) => ({
              hour: i,
              count: 0,
            }));
            hourlyRows.forEach((row) => {
              if (hourlyData[row.hour]) hourlyData[row.hour].count = row.count;
            });
            res.json({ daily: dailyRows || [], hourly: hourlyData });
          },
        );
      },
    );
  });
});

// ✅ 🛡️ Risk Distribution (Bar Chart data)
router.get("/risk-distribution", authMiddleware, (req, res) => {
  if (req.user.role !== "police")
    return res.status(403).json({ message: "Forbidden" });
  db.all(
    `SELECT 
      CASE 
        WHEN predicted_risk_score < 40 THEN 'Low'
        WHEN predicted_risk_score BETWEEN 40 AND 70 THEN 'Medium'
        WHEN predicted_risk_score > 70 THEN 'High'
      END as level, COUNT(*) as count
     FROM reports GROUP BY level`,
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      const dist = { low: 0, medium: 0, high: 0 };
      rows.forEach((r) => {
        if (r.level) dist[r.level.toLowerCase()] = r.count;
      });
      res.json(dist);
    },
  );
});

// ✅ 🤖 ML Prediction Accuracy
router.get("/prediction-accuracy", authMiddleware, (req, res) => {
  if (req.user.role !== "police")
    return res.status(403).json({ message: "Forbidden" });
  const officerId = req.user.id;
  db.get(
    `SELECT AVG(ai_confidence) as avg_confidence, COUNT(*) as total_predictions,
     COUNT(CASE WHEN ra.status = 'resolved' THEN 1 END) as resolved_cases
     FROM reports r
     LEFT JOIN report_actions ra ON r.id = ra.report_id AND ra.officer_id = ?
     WHERE r.predicted_risk_score > 0`,
    [officerId],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({
        avgConfidence: row?.avg_confidence || 0,
        totalPredictions: row?.total_predictions || 0,
        resolvedCases: row?.resolved_cases || 0,
        modelStatus: "active",
      });
    },
  );
});

module.exports = router;
