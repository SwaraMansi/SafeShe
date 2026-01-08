const mongoose = require("mongoose");

const ReportSchema = new mongoose.Schema({
  title: String,
  description: { type: String, required: true },
  category: String,
  riskScore: Number,
  userId: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports =
  mongoose.models.Report || mongoose.model("Report", ReportSchema);

