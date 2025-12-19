const Report = require("../models/Report");
const { classifyReport, riskScore } = require("../utils/aiClassifier");

// CREATE REPORT WITH AI
exports.createReport = async (req, res) => {
  try {
    const { title, description, location } = req.body;

    // 🧠 AI CLASSIFICATION
    const category = classifyReport(description);
    const risk = riskScore(category);

    const report = await Report.create({
      user: req.user.id,
      title,
      description,
      location,
      category,
      riskScore: risk
    });

    res.status(201).json({
      message: "Report created successfully",
      report
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET LOGGED-IN USER REPORTS
exports.getMyReports = async (req, res) => {
  try {
    const reports = await Report.find({ user: req.user.id });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

