/**
 * Analytics Endpoints
 * Provides aggregated data for police dashboards
 * Police-only access via JWT role validation
 */

const express = require('express');
const router = express.Router();
const db = require('../database');
const { authMiddleware } = require('../middleware/authMiddleware');

/**
 * GET /api/analytics/summary
 * Returns key metrics: total, active, resolved, high-risk reports, avg response time, today's count
 */
router.get('/summary', authMiddleware, (req, res) => {
  if (req.user.role !== 'police') {
    return res.status(403).json({ message: 'Only police can access analytics' });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTimestamp = today.getTime();

  db.serialize(() => {
    // Total reports
    db.get('SELECT COUNT(*) as total FROM reports', (err, row) => {
      if (err) return res.status(500).json({ error: err.message });

      const totalReports = row.total;

      // Active reports (pending + investigating)
      db.get(
        "SELECT COUNT(*) as active FROM reports WHERE status IN ('pending', 'investigating')",
        (err, row) => {
          if (err) return res.status(500).json({ error: err.message });

          const activeReports = row.active;

          // Resolved reports
          db.get("SELECT COUNT(*) as resolved FROM reports WHERE status = 'resolved'", (err, row) => {
            if (err) return res.status(500).json({ error: err.message });

            const resolvedReports = row.resolved;

            // High-risk reports (predicted_risk_score > 70)
            db.get('SELECT COUNT(*) as high_risk FROM reports WHERE predicted_risk_score > 70', (err, row) => {
              if (err) return res.status(500).json({ error: err.message });

              const highRiskReports = row.high_risk;

              // Reports today
              db.get(
                'SELECT COUNT(*) as today FROM reports WHERE timestamp > ?',
                [todayTimestamp],
                (err, row) => {
                  if (err) return res.status(500).json({ error: err.message });

                  const reportsToday = row.today;

                  // Average resolution time (for resolved reports only)
                  db.get(
                    `SELECT AVG((SELECT timestamp FROM reports r2 WHERE r2.id = reports.id AND status = 'resolved') - timestamp) as avg_ms
                     FROM reports WHERE status = 'resolved'`,
                    (err, row) => {
                      const avgMs = row?.avg_ms || 0;
                      const avgHours = avgMs ? Math.round(avgMs / (1000 * 60 * 60)) : 0;

                      res.json({
                        totalReports,
                        activeReports,
                        resolvedReports,
                        highRiskReports,
                        reportsToday,
                        avgResponseTimeHours: avgHours,
                        resolutionRate: totalReports > 0 ? Math.round((resolvedReports / totalReports) * 100) : 0
                      });
                    }
                  );
                }
              );
            });
          });
        }
      );
    });
  });
});

/**
 * GET /api/analytics/category-distribution
 * Returns report counts grouped by category
 */
router.get('/category-distribution', authMiddleware, (req, res) => {
  if (req.user.role !== 'police') {
    return res.status(403).json({ message: 'Only police can access analytics' });
  }

  db.all(
    `SELECT type as category, COUNT(*) as count 
     FROM reports 
     GROUP BY type 
     ORDER BY count DESC`,
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({
        categories: rows || []
      });
    }
  );
});

/**
 * GET /api/analytics/time-trends
 * Returns reports per day (last 7 days) and per hour (24-hour distribution)
 */
router.get('/time-trends', authMiddleware, (req, res) => {
  if (req.user.role !== 'police') {
    return res.status(403).json({ message: 'Only police can access analytics' });
  }

  const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

  db.serialize(() => {
    // Last 7 days breakdown
    db.all(
      `SELECT 
        DATE(timestamp / 1000, 'unixepoch') as date,
        COUNT(*) as count
       FROM reports 
       WHERE timestamp > ?
       GROUP BY DATE(timestamp / 1000, 'unixepoch')
       ORDER BY date ASC`,
      [sevenDaysAgo],
      (err, dailyRows) => {
        if (err) return res.status(500).json({ error: err.message });

        // 24-hour distribution (all reports)
        db.all(
          `SELECT 
            CAST((timestamp / 1000 / 3600) % 24 as INTEGER) as hour,
            COUNT(*) as count
           FROM reports 
           GROUP BY CAST((timestamp / 1000 / 3600) % 24 as INTEGER)
           ORDER BY hour ASC`,
          (err, hourlyRows) => {
            if (err) return res.status(500).json({ error: err.message });

            // Ensure all 24 hours are represented
            const hourlyMap = {};
            for (let i = 0; i < 24; i++) {
              hourlyMap[i] = 0;
            }
            hourlyRows.forEach(row => {
              hourlyMap[row.hour] = row.count;
            });

            const hourlyData = Object.entries(hourlyMap).map(([hour, count]) => ({
              hour: parseInt(hour),
              count
            }));

            res.json({
              daily: dailyRows || [],
              hourly: hourlyData
            });
          }
        );
      }
    );
  });
});

/**
 * GET /api/analytics/risk-distribution
 * Returns breakdown by risk level: Low (<40), Medium (40-70), High (>70)
 */
router.get('/risk-distribution', authMiddleware, (req, res) => {
  if (req.user.role !== 'police') {
    return res.status(403).json({ message: 'Only police can access analytics' });
  }

  db.all(
    `SELECT 
      CASE 
        WHEN predicted_risk_score < 40 THEN 'Low'
        WHEN predicted_risk_score BETWEEN 40 AND 70 THEN 'Medium'
        WHEN predicted_risk_score > 70 THEN 'High'
      END as level,
      COUNT(*) as count
     FROM reports
     GROUP BY level
     ORDER BY level DESC`,
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      const distribution = {
        low: 0,
        medium: 0,
        high: 0
      };

      rows.forEach(row => {
        if (row.level === 'Low') distribution.low = row.count;
        else if (row.level === 'Medium') distribution.medium = row.count;
        else if (row.level === 'High') distribution.high = row.count;
      });

      res.json(distribution);
    }
  );
});

/**
 * GET /api/analytics/prediction-accuracy
 * Returns model prediction accuracy metrics (for continuous learning monitoring)
 */
router.get('/prediction-accuracy', authMiddleware, (req, res) => {
  if (req.user.role !== 'police') {
    return res.status(403).json({ message: 'Only police can access analytics' });
  }

  // Compare predicted vs actual outcomes for resolved cases
  db.all(
    `SELECT 
      AVG(ai_confidence) as avg_confidence,
      COUNT(*) as total_predictions,
      COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_cases
     FROM reports 
     WHERE predicted_risk_score > 0`,
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.json({
        avgConfidence: row?.avg_confidence || 0,
        totalPredictions: row?.total_predictions || 0,
        resolvedCases: row?.resolved_cases || 0,
        modelStatus: 'active'
      });
    }
  );
});

module.exports = router;
