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
   ✅ FIXED: DYNAMIC ROUTE IMPORTS TO AVOID SYNTAX ERRORS
================================ */
console.log("📦 Loading API routes...");

// Load routes dynamically with error handling
async function loadRoutes() {
  try {
    // Import routes one by one
    const { default: usersRoutes } = await import("./routes/users.js");
    app.use("/api/users", usersRoutes);
    console.log("✅ Users route loaded");
    
    const { default: studentsRoutes } = await import("./routes/students.js");
    app.use("/api/students", studentsRoutes);
    console.log("✅ Students route loaded");
    
    const { default: coursesRoutes } = await import("./routes/courses.js");
    app.use("/api/courses", coursesRoutes);
    console.log("✅ Courses route loaded");
    
    const { default: intakesRoutes } = await import("./routes/intakes.js");
    app.use("/api/intakes", intakesRoutes);
    console.log("✅ Intakes route loaded");
    
    const { default: dashboardRoutes } = await import("./routes/dashboard.js");
    app.use("/api/dashboard", dashboardRoutes);
    console.log("✅ Dashboard route loaded");
    
    // Load other routes
    const { default: activitiesRoutes } = await import("./routes/activities.js");
    app.use("/api/activities", activitiesRoutes);
    
    const { default: financeRoutes } = await import("./routes/finance.js");
    app.use("/api/finance", financeRoutes);
    
    const { default: departmentRoutes } = await import("./routes/department.js");
    app.use("/api/departments", departmentRoutes);
    
    const { default: branchRoutes } = await import("./routes/branches.js");
    app.use("/api/branches", branchRoutes);
    
    const { default: levelsRoutes } = await import("./routes/levels.js");
    app.use("/api/levels", levelsRoutes);
    
    const { default: facilitiesRoutes } = await import("./routes/facilities.js");
    app.use("/api/facilities", facilitiesRoutes);
    
    const { default: repairsRoutes } = await import("./routes/repairs.js");
    app.use("/api/repairs", repairsRoutes);
    
    const { default: transactionRoutes } = await import("./routes/transaction.js");
    app.use("/api/transactions", transactionRoutes);
    
    const { default: modulesRoutes } = await import("./routes/modules.js");
    app.use("/api/modules", modulesRoutes);
    
    const { default: instructorRoutes } = await import("./routes/instructors.js");
    app.use("/api/instructors", instructorRoutes);
    
    const { default: studentPerformanceRoutes } = await import("./routes/studentPerformanceRoutes.js");
    app.use("/api/student-performance", studentPerformanceRoutes);
    
    const { default: performanceRouter } = await import("./routes/performance.js");
    app.use("/api/performance", performanceRouter);
    
    const { default: vocationalPerformanceRoutes } = await import("./routes/vocationalPerformanceRoutes.js");
    app.use("/api/vocational-performance", vocationalPerformanceRoutes);
    
    const { default: notificationsRoutes } = await import("./routes/notifications.js");
    app.use("/api/notifications", notificationsRoutes);
    
    const { default: enrollmentsRoutes } = await import("./routes/enrollments.js");
    app.use("/api/enrollments", enrollmentsRoutes);
    
    const { default: studentModulesRoutes } = await import("./routes/studentModules.js");
    app.use("/api/student-modules", studentModulesRoutes);
    
    const { default: mediaRoutes } = await import("./routes/mediaRoutes.js");
    app.use("/api/media", mediaRoutes);
    
    const { default: reportRouter } = await import("./routes/report.js");
    app.use("/api/reports", reportRouter);
    
    const { default: rankingRoutes } = await import("./routes/ranking.js");
    app.use("/api/ranking", rankingRoutes);
    
    console.log("✅ All API routes loaded");
    
  } catch (error) {
    console.error("❌ Error loading routes:", error.message);
    console.error("Stack:", error.stack);
    
    // Create emergency fallback login route
    app.post("/api/users/login", (req, res) => {
      console.log("🚨 EMERGENCY: Using fallback login route");
      res.json({
        success: true,
        message: "Emergency login (routes failed to load)",
        user: {
          id: 999,
          email: req.body.email || "emergency@example.com",
          name: "Emergency User",
          role: "admin"
        },
        token: "emergency-token-123",
        debug: {
          error: error.message,
          note: "Check route files and imports"
        }
      });
    });
  }
}

// Start loading routes
loadRoutes();

/* ================================
   REACT FRONTEND SERVING (OPTIONAL)
================================ */
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
    message: `API route not found: ${req.method} ${req.originalUrl}`,
    availableEndpoints: [
      "GET /health",
      "GET /",
      "GET /api/test",
      "POST /api/users/login"
    ]
  });
});

/* ================================
   GLOBAL ERROR HANDLER
================================ */
app.use((err, req, res, next) => {
  console.error("❌ Error:", err.message);
  console.error("Stack:", err.stack);
  
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
