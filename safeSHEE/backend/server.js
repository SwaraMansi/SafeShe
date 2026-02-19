require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const http = require("http");
const wsManager = require("./services/websocket");
const mlModel = require("./services/ml-model");
const authRoutes = require("./routes/auth");
require("./database");

const app = express();
const server = http.createServer(app);

// Make wsManager globally accessible to routes
global.wsManager = wsManager;

// CORS configuration for development and production
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests from localhost (any port) and environment variable URLs
    const allowedOrigins = [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:3002",
      "http://localhost:3003",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:3001",
      "http://127.0.0.1:3002",
      "http://127.0.0.1:3003",
      process.env.FRONTEND_URL,
    ];

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(express.json());

app.get("/ping", (req, res) => res.json({ message: "pong" }));

app.use("/auth", authRoutes);
// Import reports routes
const reportRoutes = require("./routes/reports");
app.use("/reports", reportRoutes);
// Import contacts routes
const contactRoutes = require("./routes/contacts");
app.use("/contacts", contactRoutes);
// Import analytics routes
const analyticsRoutes = require("./routes/analytics");
app.use("/analytics", analyticsRoutes);
// Register redzones route
const redzonesRoutes = require("./routes/redzones");
app.use("/redzones", redzonesRoutes);
app.use("/api/redzones", redzonesRoutes);
// Import SOS routes AFTER wsManager is set globally
const sosRoutes = require("./routes/sos");
app.use("/sos", sosRoutes);

// Initialize WebSocket server
wsManager.initialize(server);

// Initialize ML Model weights from database
mlModel
  .loadWeights()
  .catch((err) => console.error("Failed to load ML weights:", err));

// serve uploads statically
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`safeSHEE backend running on port ${PORT}`);
  console.log(`WebSocket server available on ws://localhost:${PORT}`);
});
