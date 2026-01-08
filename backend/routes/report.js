const express = require("express");
const router = express.Router();
const { Report, Location } = require("../models");
const computeRisk = require('../utils/riskEngine');

/* 🔹 POST REPORT (create a report, uses risk engine) */
router.post("/", async (req, res) => {
  try {
    console.log("Incoming body:", req.body);

    const description = req.body.description;
    const location = req.body.location;
    const timestamp = req.body.timestamp;

    if (!description || description.trim() === "") {
      return res.status(400).json({ error: "Description required" });
    }

    const risk = computeRisk({ description, location, timestamp });

    const report = await Report.create({
      title: "Harassment Incident",
      description,
      category: risk.category,
      riskScore: risk.riskScore,
      riskReasons: risk.reasons,
      userId: req.body.userId || "anonymous",
      location: location || null,
      createdAt: timestamp || Date.now()
    });

    // store location ping if provided
    if (location && location.lat && location.lng) {
      await Location.create({ userId: req.body.userId || 'anonymous', lat: location.lat, lng: location.lng, timestamp: timestamp || Date.now() });
    }

    res.status(201).json(report);
  } catch (error) {
    console.error("REPORT ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

/* 🔹 GET REPORTS */
router.get("/", async (req, res) => {
  try {
    const reports = await Report.find();
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch reports" });
  }
});

// 🔴 SOS ROUTE — creates a special SOS report and returns computed risk
router.post("/sos", async (req, res) => {
  try {
    const { description = 'SOS', location, userId } = req.body;

    const risk = computeRisk({ description, location, timestamp: Date.now() });

    const sosReport = await Report.create({
      title: 'SOS Alert',
      description,
      category: risk.category,
      riskScore: risk.riskScore,
      riskReasons: risk.reasons,
      isSOS: true,
      userId: userId || 'anonymous',
      location: location || null,
      createdAt: Date.now()
    });

    // store location ping if provided
    if (location && location.lat && location.lng) {
      await Location.create({ userId: userId || 'anonymous', lat: location.lat, lng: location.lng, timestamp: Date.now() });
    }

    // In a real system, here we would broadcast via websockets / push notifications
    console.log('🚨 SOS saved:', sosReport._id);

    res.json({ ok: true, report: sosReport });
  } catch (err) {
    console.error('SOS error', err);
    res.status(500).json({ error: err.message });
  }
});

// Location endpoint — stores periodic location pings and returns local risk estimate
router.post('/location', async (req, res) => {
  try {
    const { lat, lng, userId } = req.body;
    if (typeof lat !== 'number' || typeof lng !== 'number') return res.status(400).json({ error: 'lat and lng required' });

    const location = { lat, lng };
    await Location.create({ userId: userId || 'anonymous', lat, lng });

    // For location ping, risk uses empty description but can be enhanced
    const risk = computeRisk({ description: '', location, timestamp: Date.now() });

    res.json({ ok: true, risk });
  } catch (err) {
    console.error('Location error', err);
    res.status(500).json({ error: err.message });
  }
});
console.log("✅ report routes loaded");


module.exports = router;
