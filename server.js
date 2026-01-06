import 'dotenv/config'; // ADD THIS LINE

import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

/* ================================
   ROUTES IMPORTS
================================ */
import coursesRoutes from "./routes/courses.js";
import usersRoutes from "./routes/users.js";
import studentsRoutes from "./routes/students.js";
import intakesRoutes from "./routes/intakes.js";
import dashboardRoutes from "./routes/dashboard.js";
import activitiesRoutes from "./routes/activities.js";
import financeRoutes from "./routes/finance.js";
import departmentRoutes from "./routes/department.js";
import branchRoutes from "./routes/branches.js";
import levelsRoutes from "./routes/levels.js";
import facilitiesRoutes from "./routes/facilities.js";
import repairsRoutes from "./routes/repairs.js";
import transactionRoutes from "./routes/transaction.js";
import vocationalPerformanceRoutes from "./routes/vocationalPerformanceRoutes.js";
import modulesRoutes from "./routes/modules.js";
import instructorRoutes from "./routes/instructors.js";
import studentPerformanceRoutes from "./routes/studentPerformanceRoutes.js";
import notificationsRoutes from "./routes/notifications.js";
import enrollmentsRoutes from "./routes/enrollments.js";
import studentModulesRoutes from "./routes/studentModules.js";
import mediaRoutes from "./routes/mediaRoutes.js";
import performanceRouter from "./routes/performance.js";
import reportRouter from "./routes/report.js";
import rankingRoutes from "./routes/ranking.js";

/* ================================
   PATH SETUP
================================ */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

/* ================================
   REQUEST LOGGING MIDDLEWARE
================================ */
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  console.log('Origin:', req.headers.origin);
  console.log('User-Agent:', req.headers['user-agent']?.substring(0, 50));
  next();
});

/* ================================
   ✅ IMPROVED CORS CONFIGURATION
================================ */
const allowedOrigins = [
  "https://cohatmicollege.vercel.app",
  "http://localhost:3000",
  "http://localhost:5173"
];

app.use(cors({
  origin: function (origin, callback) {
    console.log(`🌍 CORS check for origin: ${origin}`);
    
    // Allow requests with no origin
    if (!origin) {
      console.log("✅ Allowing request with no origin");
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      console.log(`✅ CORS allowed for: ${origin}`);
      callback(null, true);
    } else {
      console.log(`❌ CORS blocked: ${origin}`);
      callback(new Error(`CORS not allowed for origin: ${origin}`));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: [
    "Content-Type", 
    "Authorization", 
    "X-Requested-With",
    "Accept",
    "Origin",
    "Access-Control-Request-Method",
    "Access-Control-Request-Headers"
  ],
  credentials: true,
  optionsSuccessStatus: 204
}));

// Handle preflight requests
app.options('*', cors());

/* ================================
   HEALTH CHECK (REQUIRED FOR RENDER)
================================ */
app.get("/health", (req, res) => {
  console.log("✅ Health check passed");
  res.status(200).json({ 
    status: "healthy",
    service: "college-backend",
    timestamp: new Date().toISOString(),
    node: process.version
  });
});

/* ================================
   TEST ROUTE
================================ */
app.get("/api/test", (req, res) => {
  console.log("✅ Test route hit");
  res.json({ 
    message: "API is working!",
    timestamp: new Date().toISOString(),
    cors: "configured",
    allowedOrigins: allowedOrigins
  });
});

/* ================================
   BODY PARSING
================================ */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

/* ================================
   STATIC FILES
================================ */
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* ================================
   API ROUTES
================================ */
app.use("/api/users", usersRoutes);
app.use("/api/students", studentsRoutes);
app.use("/api/courses", coursesRoutes);
app.use("/api/intakes", intakesRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/activities", activitiesRoutes);
app.use("/api/finance", financeRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/branches", branchRoutes);
app.use("/api/levels", levelsRoutes);
app.use("/api/facilities", facilitiesRoutes);
app.use("/api/repairs", repairsRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/modules", modulesRoutes);
app.use("/api/instructors", instructorRoutes);
app.use("/api/student-performance", studentPerformanceRoutes);
app.use("/api/performance", performanceRouter);
app.use("/api/vocational-performance", vocationalPerformanceRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/enrollments", enrollmentsRoutes);
app.use("/api/student-modules", studentModulesRoutes);
app.use("/api/media", mediaRoutes);
app.use("/api/reports", reportRouter);
app.use("/api/ranking", rankingRoutes);

/* ================================
   REACT FRONTEND SERVING (PRODUCTION)
================================ */
if (process.env.NODE_ENV === "production") {
  const buildPath = path.join(__dirname, "client", "dist");
  console.log("🏗️ Serving React from:", buildPath);
  
  // Check if build exists
  import('fs').then(fs => {
    if (fs.existsSync(buildPath)) {
      app.use(express.static(buildPath));
      app.get("/*", (req, res) => {
        res.sendFile(path.join(buildPath, "index.html"));
      });
      console.log("✅ React frontend serving enabled");
    } else {
      console.log("⚠️ No React build found, API-only mode");
    }
  });
}

/* ================================
   404 HANDLER
================================ */
app.use((req, res) => {
  console.log(`❌ 404: ${req.method} ${req.url}`);
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.url}`
  });
});

/* ================================
   GLOBAL ERROR HANDLER
================================ */
app.use((err, req, res, next) => {
  console.error("🔥 Server Error:", {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    origin: req.headers.origin
  });
  
  // Handle CORS errors specifically
  if (err.message.includes("CORS")) {
    return res.status(403).json({
      success: false,
      message: err.message,
      allowedOrigins: allowedOrigins
    });
  }
  
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' 
      ? 'Server error' 
      : err.message
  });
});

/* ================================
   SERVER START
================================ */
const PORT = process.env.PORT || 10000;
const HOST = '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  console.log(`
✅ ==================================
✅ Server running successfully!
✅ Port: ${PORT}
✅ Host: ${HOST}
✅ Environment: ${process.env.NODE_ENV || 'development'}
✅ Allowed Origins: ${allowedOrigins.join(', ')}
✅ Health: http://${HOST}:${PORT}/health
✅ Test: http://${HOST}:${PORT}/api/test
✅ Dashboard: http://${HOST}:${PORT}/api/dashboard
✅ ==================================
  `);
});

server.on('error', (error) => {
  console.error('🔥 Server failed to start:', error);
  process.exit(1);
});
