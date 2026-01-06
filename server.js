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
  console.log('Origin:', req.headers.origin || 'No origin');
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

// Handle preflight requests explicitly
app.options('*', (req, res) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  res.sendStatus(204);
});

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
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
  credentials: true,
  optionsSuccessStatus: 204
}));

/* ================================
   HEALTH CHECK (RENDER REQUIRES THIS)
================================ */
app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "healthy",
    service: "college-backend",
    timestamp: new Date().toISOString(),
    node: process.version
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
   TEST ROUTES
================================ */
app.get("/api/test", (req, res) => {
  res.json({ 
    success: true,
    message: "API test successful!",
    cors: "configured"
  });
});

// Debug login endpoint (always works)
app.post("/api/debug-login", (req, res) => {
  console.log("🔍 Debug login called:", req.body);
  res.json({
    success: true,
    message: "Debug login successful",
    user: {
      id: 999,
      email: req.body.email || "debug@example.com",
      name: "Debug User",
      role: "admin"
    },
    token: "debug-jwt-token-123456",
    debug: true,
    timestamp: new Date().toISOString()
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
   API ROUTES IMPORTS WITH ERROR HANDLING
================================ */
console.log("📦 Loading API routes...");

let routesLoaded = 0;
const totalRoutes = 22; // Adjust based on your routes

// Try to import all routes with better error handling
try {
  // Import routes
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
  
  // Register routes
  app.use("/api/users", usersRoutes);
  routesLoaded++;
  
  app.use("/api/students", studentsRoutes);
  routesLoaded++;
  
  app.use("/api/courses", coursesRoutes);
  routesLoaded++;
  
  app.use("/api/intakes", intakesRoutes);
  routesLoaded++;
  
  app.use("/api/dashboard", dashboardRoutes);
  routesLoaded++;
  
  app.use("/api/activities", activitiesRoutes);
  routesLoaded++;
  
  app.use("/api/finance", financeRoutes);
  routesLoaded++;
  
  app.use("/api/departments", departmentRoutes);
  routesLoaded++;
  
  app.use("/api/branches", branchRoutes);
  routesLoaded++;
  
  app.use("/api/levels", levelsRoutes);
  routesLoaded++;
  
  app.use("/api/facilities", facilitiesRoutes);
  routesLoaded++;
  
  app.use("/api/repairs", repairsRoutes);
  routesLoaded++;
  
  app.use("/api/transactions", transactionRoutes);
  routesLoaded++;
  
  app.use("/api/modules", modulesRoutes);
  routesLoaded++;
  
  app.use("/api/instructors", instructorRoutes);
  routesLoaded++;
  
  app.use("/api/student-performance", studentPerformanceRoutes);
  routesLoaded++;
  
  app.use("/api/performance", performanceRouter);
  routesLoaded++;
  
  app.use("/api/vocational-performance", vocationalPerformanceRoutes);
  routesLoaded++;
  
  app.use("/api/notifications", notificationsRoutes);
  routesLoaded++;
  
  app.use("/api/enrollments", enrollmentsRoutes);
  routesLoaded++;
  
  app.use("/api/student-modules", studentModulesRoutes);
  routesLoaded++;
  
  app.use("/api/media", mediaRoutes);
  routesLoaded++;
  
  app.use("/api/reports", reportRouter);
  routesLoaded++;
  
  app.use("/api/ranking", rankingRoutes);
  routesLoaded++;
  
  console.log(`✅ ${routesLoaded}/${totalRoutes} routes loaded successfully`);
  
} catch (error) {
  console.error("❌ Error loading routes:", error.message);
  
  // Create fallback routes for critical endpoints
  console.log("🔄 Setting up fallback routes...");
  
  // Fallback login route
  app.post("/api/users/login", (req, res) => {
    console.log("⚠️ Fallback login route called:", req.body);
    res.status(200).json({
      success: true,
      message: "Fallback login successful",
      user: {
        id: 100,
        email: req.body.email || "fallback@example.com",
        name: "Fallback User",
        role: "student"
      },
      token: "fallback-jwt-token-789",
      debug: {
        note: "Using fallback route. Check route imports.",
        error: error.message
      }
    });
  });
  
  // Fallback dashboard route
  app.get("/api/dashboard", (req, res) => {
    res.json({
      success: true,
      message: "Dashboard data (fallback)",
      stats: {
        students: 0,
        courses: 0,
        users: 0,
        revenue: "0.00"
      },
      debug: "Using fallback dashboard route"
    });
  });
}

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
      "GET    /api/test"
    ]
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
✅ Dashboard: GET /api/dashboard
✅ ============================================
✅ Ready for frontend connections from:
✅   https://cohatmicollege.vercel.app
✅ ============================================
  `);
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
