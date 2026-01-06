import 'dotenv/config';

import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

/* ================================
   PATH SETUP
================================ */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

/* ================================
   REQUEST LOGGING
================================ */
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  console.log('Origin:', req.headers.origin);
  next();
});

/* ================================
   ✅ CORS CONFIGURATION
================================ */
const allowedOrigins = [
  "https://cohatmicollege.vercel.app",
  "http://localhost:3000",
  "http://localhost:5173"
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`❌ CORS blocked: ${origin}`);
      callback(new Error(`CORS not allowed`));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

// Handle preflight
app.options("*", cors());

/* ================================
   HEALTH CHECK (RENDER REQUIRES THIS)
================================ */
app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "healthy",
    service: "college-backend",
    timestamp: new Date().toISOString()
  });
});

/* ================================
   ROOT ROUTE
================================ */
app.get("/", (req, res) => {
  res.json({
    message: "College Management System API",
    version: "1.0.0",
    status: "running",
    endpoints: {
      health: "/health",
      test: "/api/test",
      dashboard: "/api/dashboard",
      users: "/api/users",
      students: "/api/students",
      courses: "/api/courses"
    },
    cors: {
      allowedOrigins: allowedOrigins,
      enabled: true
    },
    timestamp: new Date().toISOString()
  });
});

/* ================================
   TEST ROUTE
================================ */
app.get("/api/test", (req, res) => {
  res.json({ 
    message: "API test successful!",
    cors: "configured"
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
   API ROUTES IMPORTS
================================ */
// Import all your routes
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
   API ROUTES
================================ */
console.log("📦 Loading API routes...");
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
console.log("✅ All API routes loaded");

/* ================================
   REACT FRONTEND SERVING (OPTIONAL)
================================ */
// Only if you have React build in client/dist
if (process.env.NODE_ENV === "production") {
  import('fs').then(fs => {
    const buildPath = path.join(__dirname, "client", "dist");
    if (fs.existsSync(buildPath)) {
      console.log("🌐 Serving React frontend from:", buildPath);
      app.use(express.static(buildPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(buildPath, "index.html"));
      });
    }
  });
}

/* ================================
   404 HANDLER FOR API ROUTES
================================ */
app.use("/api/*", (req, res) => {
  res.status(404).json({
    success: false,
    message: `API route not found: ${req.method} ${req.originalUrl}`
  });
});

/* ================================
   GLOBAL ERROR HANDLER
================================ */
app.use((err, req, res, next) => {
  console.error("❌ Error:", err.message);
  
  if (err.message.includes("CORS")) {
    return res.status(403).json({
      success: false,
      message: "CORS error: Request blocked",
      allowedOrigins: allowedOrigins,
      yourOrigin: req.headers.origin
    });
  }
  
  res.status(500).json({
    success: false,
    message: "Server error"
  });
});

/* ================================
   SERVER START
================================ */
const PORT = process.env.PORT || 10000;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`
✅ ==================================
✅ Server running on port ${PORT}
✅ Environment: ${process.env.NODE_ENV || 'development'}
✅ CORS enabled for: ${allowedOrigins.join(', ')}
✅ Health check: /health
✅ Root API: /
✅ Dashboard: /api/dashboard
✅ ==================================
  `);
});
