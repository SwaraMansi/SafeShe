const express = require('express');
const router = express.Router();
const db = require('../database');
const { authMiddleware } = require('../middleware/authMiddleware');

// Returns clusters of high-risk areas (simple grid-based clustering)
router.get('/', authMiddleware, (req, res) => {
  const days = parseInt(req.query.days || '30', 10);
  const since = Date.now() - 1000 * 60 * 60 * 24 * days;

  db.all(
    `SELECT latitude, longitude, predicted_risk_score FROM reports WHERE timestamp > ? AND latitude IS NOT NULL AND longitude IS NOT NULL`,
    [since],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!rows || rows.length === 0) return res.json([]);

      // Simple clustering: bucket by rounded lat/lng to 3 decimal places (~100m)
      const buckets = {};
      rows.forEach((r) => {
        const lat = Math.round(r.latitude * 1000) / 1000;
        const lng = Math.round(r.longitude * 1000) / 1000;
        const key = `${lat}_${lng}`;
        if (!buckets[key]) buckets[key] = { latSum: 0, lngSum: 0, count: 0, scoreSum: 0 };
        buckets[key].latSum += r.latitude;
        buckets[key].lngSum += r.longitude;
        buckets[key].count += 1;
        buckets[key].scoreSum += r.predicted_risk_score || 0;
      });

      const clusters = Object.keys(buckets).map((k) => {
        const b = buckets[k];
        const centerLat = b.latSum / b.count;
        const centerLng = b.lngSum / b.count;
        const avgScore = b.scoreSum / b.count;
        return {
          center: { latitude: centerLat, longitude: centerLng },
          count: b.count,
          avgRisk: avgScore,
          radiusMeters: Math.min(500, 50 + b.count * 10),
        };
      });

      // Sort by avgRisk desc
      clusters.sort((a, b) => b.avgRisk - a.avgRisk);
      res.json(clusters.slice(0, 50));
    }
  );
});

module.exports = router;
