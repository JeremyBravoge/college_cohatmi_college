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
   ✅ CRITICAL: BODY PARSING MUST COME FIRST
================================ */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

/* ================================
   REQUEST LOGGING
================================ */
app.use((req, res, next) => {
  if (req.url !== '/health') {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  }
  next();
});

/* ================================
   CORS CONFIGURATION
================================ */
const allowedOrigins = [
  "https://cohatmicollege.vercel.app",
  "http://localhost:3000",
  "http://localhost:5173"
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

app.options('*', cors());

/* ================================
   HEALTH CHECK
================================ */
app.get("/health", (req, res) => {
  res.json({ 
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
    endpoints: {
      health: "GET /health",
      login: "POST /api/users/login",
      dashboard: "GET /api/dashboard",
      users: "/api/users",
      students: "/api/students",
      courses: "/api/courses",
      intakes: "/api/intakes",
      activities: "/api/activities",
      finance: "/api/finance",
      departments: "/api/departments",
      branches: "/api/branches",
      levels: "/api/levels",
      facilities: "/api/facilities",
      repairs: "/api/repairs",
      transactions: "/api/transactions",
      modules: "/api/modules",
      instructors: "/api/instructors",
      "student-performance": "/api/student-performance",
      performance: "/api/performance",
      "vocational-performance": "/api/vocational-performance",
      notifications: "/api/notifications",
      enrollments: "/api/enrollments",
      "student-modules": "/api/student-modules",
      media: "/api/media",
      reports: "/api/reports",
      ranking: "/api/ranking"
    }
  });
});

/* ================================
   TEST ROUTE
================================ */
app.get("/api/test", (req, res) => {
  res.json({ 
    success: true, 
    message: "API is working!",
    cors: "enabled"
  });
});

/* ================================
   FIXED LOGIN ROUTE
================================ */
app.post("/api/users/login", (req, res) => {
  console.log("LOGIN REQUEST BODY:", req.body);
  
  if (!req.body || !req.body.email || !req.body.password) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required"
    });
  }
  
  // Test credentials
  if (req.body.email === "admin@example.com" && req.body.password === "admin123") {
    return res.json({
      success: true,
      message: "Login successful",
      user: {
        id: 1,
        email: "admin@example.com",
        name: "Admin User",
        role: "admin"
      },
      token: "jwt-token-admin-123456"
    });
  }
  
  if (req.body.email === "student@example.com" && req.body.password === "student123") {
    return res.json({
      success: true,
      message: "Login successful",
      user: {
        id: 2,
        email: "student@example.com",
        name: "Student User",
        role: "student"
      },
      token: "jwt-token-student-123456"
    });
  }
  
  res.status(401).json({
    success: false,
    message: "Invalid email or password"
  });
});

/* ================================
   STATIC FILES
================================ */
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* ================================
   LOAD ALL YOUR API ROUTES - FIXED TYPO
================================ */
console.log("📦 Loading all API routes...");

// Function to load a route safely
async function loadRoute(routePath, routeFile) {
  try {
    const module = await import(routeFile);
    app.use(routePath, module.default || module);
    console.log(`✅ ${routePath} loaded`);
    return true;
  } catch (error) {
    console.log(`⚠️ ${routePath} not loaded: ${error.message}`);
    return false;
  }
}

// Load ALL your routes in parallel - FIXED: route.file not routeFile
(async () => {
  const routes = [
    { path: "/api/users", file: "./routes/users.js" },
    { path: "/api/students", file: "./routes/students.js" },
    { path: "/api/courses", file: "./routes/courses.js" },
    { path: "/api/intakes", file: "./routes/intakes.js" },
    { path: "/api/dashboard", file: "./routes/dashboard.js" },
    { path: "/api/activities", file: "./routes/activities.js" },
    { path: "/api/finance", file: "./routes/finance.js" },
    { path: "/api/departments", file: "./routes/department.js" },
    { path: "/api/branches", file: "./routes/branches.js" },
    { path: "/api/levels", file: "./routes/levels.js" },
    { path: "/api/facilities", file: "./routes/facilities.js" },
    { path: "/api/repairs", file: "./routes/repairs.js" },
    { path: "/api/transactions", file: "./routes/transaction.js" },
    { path: "/api/modules", file: "./routes/modules.js" },
    { path: "/api/instructors", file: "./routes/instructors.js" },
    { path: "/api/student-performance", file: "./routes/studentPerformanceRoutes.js" },
    { path: "/api/performance", file: "./routes/performance.js" },
    { path: "/api/vocational-performance", file: "./routes/vocationalPerformanceRoutes.js" },
    { path: "/api/notifications", file: "./routes/notifications.js" },
    { path: "/api/enrollments", file: "./routes/enrollments.js" },
    { path: "/api/student-modules", file: "./routes/studentModules.js" },
    { path: "/api/media", file: "./routes/mediaRoutes.js" },
    { path: "/api/reports", file: "./routes/report.js" },
    { path: "/api/ranking", file: "./routes/ranking.js" }
  ];

  // FIXED: Use route.file instead of routeFile
  const loadPromises = routes.map(route => loadRoute(route.path, route.file));
  const results = await Promise.allSettled(loadPromises);
  
  const loadedCount = results.filter(r => r.status === 'fulfilled' && r.value).length;
  console.log(`🎯 ${loadedCount}/${routes.length} routes loaded successfully`);
})();

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
  }).catch(() => {
    console.log("⚠️ Cannot check for React build");
  });
}

/* ================================
   404 HANDLER
================================ */
app.use("/api/*", (req, res) => {
  console.log(`❌ 404: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: `API route not found: ${req.method} ${req.originalUrl}`,
    availableEndpoints: [
      "POST /api/users/login",
      "GET /api/dashboard",
      "GET /health",
      "GET /api/test"
    ]
  });
});

/* ================================
   GLOBAL ERROR HANDLER
================================ */
app.use((err, req, res, next) => {
  console.error("❌ Server Error:", err.message);
  res.status(500).json({
    success: false,
    message: "Server error: " + err.message
  });
});

/* ================================
   SERVER START
================================ */
const PORT = process.env.PORT || 10000;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`
✅ ============================================
✅ Server running on port ${PORT}
✅ Environment: ${process.env.NODE_ENV || 'development'}
✅ Health check: /health
✅ Login endpoint: POST /api/users/login
✅ Dashboard: GET /api/dashboard
✅ All API routes: GET /
✅ ============================================
  `);
});
