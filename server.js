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
   REQUEST LOGGING MIDDLEWARE
================================ */
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  console.log('Origin:', req.headers.origin || 'No origin');
  console.log('Content-Type:', req.headers['content-type'] || 'No content-type');
  next();
});

/* ================================
   ✅ FIXED CORS CONFIGURATION
================================ */
const allowedOrigins = [
  "https://cohatmicollege.vercel.app",
  "http://localhost:3000",
  "http://localhost:5173"
];

// Handle preflight requests FIRST
app.options('*', (req, res) => {
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400');
    console.log(`✅ Preflight handled for: ${origin}`);
  }
  
  res.sendStatus(204);
});

// Main CORS middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (server-to-server, curl, Postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`❌ CORS blocked: ${origin}`);
      callback(new Error(`CORS not allowed`));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
  credentials: true,
  optionsSuccessStatus: 204
}));

/* ================================
   HEALTH CHECK (RENDER REQUIRES THIS)
================================ */
app.get("/health", (req, res) => {
  console.log("✅ Health check passed");
  res.status(200).json({ 
    status: "healthy",
    service: "college-backend",
    timestamp: new Date().toISOString(),
    node: process.version,
    cors: "enabled"
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
      login: "POST /api/users/login",
      dashboard: "GET /api/dashboard",
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
   TEST ROUTES (FOR DEBUGGING)
================================ */
app.get("/api/test", (req, res) => {
  res.json({ 
    success: true,
    message: "API test successful!",
    cors: "configured",
    timestamp: new Date().toISOString()
  });
});

// Debug login endpoint (always returns success)
app.post("/api/debug-login", (req, res) => {
  console.log("🔍 Debug login called:", req.body);
  res.json({
    success: true,
    message: "Debug login successful",
    user: {
      id: 999,
      email: req.body.email || "debug@test.com",
      name: "Debug User",
      role: "admin"
    },
    token: "debug-jwt-token-123456",
    debug: true,
    timestamp: new Date().toISOString()
  });
});

// Test database connection
app.get("/api/db-test", async (req, res) => {
  try {
    // Import db dynamically to avoid loading issues
    const db = await import('./config/db.js');
    const [result] = await db.default.execute('SELECT 1 as test');
    res.json({
      success: true,
      message: "Database connected",
      result: result
    });
  } catch (error) {
    console.error("Database test error:", error);
    res.status(500).json({
      success: false,
      message: "Database connection failed",
      error: error.message
    });
  }
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
   API ROUTES IMPORTS WITH ERROR HANDLING
================================ */
console.log("📦 Loading API routes...");

// Import routes with better error handling
let routesLoaded = 0;
const totalRoutes = 22; // Adjust based on your routes

try {
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

  console.log("✅ All route imports successful");
} catch (importError) {
  console.error("❌ Route import error:", importError.message);
}

/* ================================
   API ROUTES REGISTRATION
================================ */
try {
  app.use("/api/users", (await import("./routes/users.js")).default);
  console.log("✅ Users route loaded");
  routesLoaded++;
} catch (error) {
  console.error("❌ Failed to load users route:", error.message);
  // Fallback for login if users route fails
  app.post("/api/users/login", (req, res) => {
    res.status(500).json({
      success: false,
      message: "Users module failed to load",
      error: error.message,
      timestamp: new Date().toISOString()
    });
  });
}

try {
  app.use("/api/students", (await import("./routes/students.js")).default);
  console.log("✅ Students route loaded");
  routesLoaded++;
} catch (error) {
  console.error("❌ Failed to load students route:", error.message);
}

try {
  app.use("/api/courses", (await import("./routes/courses.js")).default);
  console.log("✅ Courses route loaded");
  routesLoaded++;
} catch (error) {
  console.error("❌ Failed to load courses route:", error.message);
}

try {
  app.use("/api/intakes", (await import("./routes/intakes.js")).default);
  console.log("✅ Intakes route loaded");
  routesLoaded++;
} catch (error) {
  console.error("❌ Failed to load intakes route:", error.message);
}

try {
  app.use("/api/dashboard", (await import("./routes/dashboard.js")).default);
  console.log("✅ Dashboard route loaded");
  routesLoaded++;
} catch (error) {
  console.error("❌ Failed to load dashboard route:", error.message);
}

// Load other routes similarly...
app.use("/api/activities", (await import("./routes/activities.js")).default);
app.use("/api/finance", (await import("./routes/finance.js")).default);
app.use("/api/departments", (await import("./routes/department.js")).default);
app.use("/api/branches", (await import("./routes/branches.js")).default);
app.use("/api/levels", (await import("./routes/levels.js")).default);
app.use("/api/facilities", (await import("./routes/facilities.js")).default);
app.use("/api/repairs", (await import("./routes/repairs.js")).default);
app.use("/api/transactions", (await import("./routes/transaction.js")).default);
app.use("/api/modules", (await import("./routes/modules.js")).default);
app.use("/api/instructors", (await import("./routes/instructors.js")).default);
app.use("/api/student-performance", (await import("./routes/studentPerformanceRoutes.js")).default);
app.use("/api/performance", (await import("./routes/performance.js")).default);
app.use("/api/vocational-performance", (await import("./routes/vocationalPerformanceRoutes.js")).default);
app.use("/api/notifications", (await import("./routes/notifications.js")).default);
app.use("/api/enrollments", (await import("./routes/enrollments.js")).default);
app.use("/api/student-modules", (await import("./routes/studentModules.js")).default);
app.use("/api/media", (await import("./routes/mediaRoutes.js")).default);
app.use("/api/reports", (await import("./routes/report.js")).default);
app.use("/api/ranking", (await import("./routes/ranking.js")).default);

console.log(`✅ ${routesLoaded}/${totalRoutes} routes loaded successfully`);

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
    } else {
      console.log("⚠️ No React build found, API-only mode");
    }
  }).catch(err => {
    console.log("⚠️ Cannot check for React build:", err.message);
  });
}

/* ================================
   404 HANDLER FOR API ROUTES
================================ */
app.use("/api/*", (req, res) => {
  console.log(`❌ 404: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: `API route not found: ${req.method} ${req.originalUrl}`,
    availableEndpoints: [
      "GET    /health",
      "POST   /api/users/login",
      "POST   /api/debug-login",
      "GET    /api/dashboard",
      "GET    /api/test",
      "GET    /api/db-test"
    ],
    timestamp: new Date().toISOString()
  });
});

/* ================================
   GLOBAL ERROR HANDLER
================================ */
app.use((err, req, res, next) => {
  console.error("🔥 Server Error:", err.message);
  console.error("Stack:", err.stack);
  
  if (err.message.includes("CORS")) {
    return res.status(403).json({
      success: false,
      message: "CORS error: Request blocked",
      allowedOrigins: allowedOrigins,
      yourOrigin: req.headers.origin,
      timestamp: new Date().toISOString()
    });
  }
  
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Server error' : err.message,
    timestamp: new Date().toISOString()
  });
});

/* ================================
   SERVER START
================================ */
const PORT = process.env.PORT || 10000;
const HOST = '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  console.log(`
✅ ============================================
✅ Server successfully started!
✅ Port: ${PORT}
✅ Host: ${HOST}
✅ Environment: ${process.env.NODE_ENV || 'development'}
✅ CORS enabled for: ${allowedOrigins.join(', ')}
✅ Health check: /health
✅ Debug login: POST /api/debug-login
✅ Database test: GET /api/db-test
✅ ============================================
✅ Ready for frontend connections from:
✅   https://cohatmicollege.vercel.app
✅ ============================================
  `);
  
  // Test the server internally
  console.log("🔍 Internal server test:");
  console.log(`   Health: http://${HOST}:${PORT}/health`);
  console.log(`   API Root: http://${HOST}:${PORT}/`);
});

// Handle server errors
server.on('error', (error) => {
  console.error('🔥 Server failed to start:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use`);
  }
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;
