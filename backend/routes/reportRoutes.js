const express = require("express");
const router = express.Router();

const {
  createReport,
  getMyReports
} = require("../controllers/reportController");

const authMiddleware = require("../middleware/authMiddleware");

// CREATE report
router.post("/create", authMiddleware, createReport);

// GET my reports
router.get("/my", authMiddleware, getMyReports);

module.exports = router;
