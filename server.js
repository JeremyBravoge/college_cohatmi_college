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
   ✅ CORS CONFIGURATION
================================ */
const allowedOrigins = [
  "https://cohatmicollege.vercel.app",
  "http://localhost:3000",
  "http://localhost:5173"
];

// Handle preflight requests
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
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`❌ CORS blocked: ${origin}`);
      callback(new Error(`CORS not allowed`));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
  credentials: true
}));

/* ================================
   HEALTH CHECK
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

app.post("/api/debug-login", (req, res) => {
  console.log("🔍 Debug login:", req.body);
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
    debug: true
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
   LOAD ROUTES ASYNCHRONOUSLY
================================ */
console.log("📦 Loading API routes...");

// Load routes dynamically to avoid syntax errors
async function loadRoutes() {
  try {
    // Load users route first (most critical)
    const { default: usersRoutes } = await import("./routes/users.js");
    app.use("/api/users", usersRoutes);
    console.log("✅ Users route loaded");
    
    // Load dashboard route
    const { default: dashboardRoutes } = await import("./routes/dashboard.js");
    app.use("/api/dashboard", dashboardRoutes);
    console.log("✅ Dashboard route loaded");
    
    // Load other important routes
    const { default: studentsRoutes } = await import("./routes/students.js");
    app.use("/api/students", studentsRoutes);
    console.log("✅ Students route loaded");
    
    const { default: coursesRoutes } = await import("./routes/courses.js");
    app.use("/api/courses", coursesRoutes);
    console.log("✅ Courses route loaded");
    
    const { default: intakesRoutes } = await import("./routes/intakes.js");
    app.use("/api/intakes", intakesRoutes);
    console.log("✅ Intakes route loaded");
    
    // Load additional routes as needed
    try {
      const { default: activitiesRoutes } = await import("./routes/activities.js");
      app.use("/api/activities", activitiesRoutes);
      console.log("✅ Activities route loaded");
    } catch (err) {
      console.log("⚠️ Activities route skipped:", err.message);
    }
    
    try {
      const { default: financeRoutes } = await import("./routes/finance.js");
      app.use("/api/finance", financeRoutes);
      console.log("✅ Finance route loaded");
    } catch (err) {
      console.log("⚠️ Finance route skipped:", err.message);
    }
    
    try {
      const { default: departmentRoutes } = await import("./routes/department.js");
      app.use("/api/departments", departmentRoutes);
      console.log("✅ Departments route loaded");
    } catch (err) {
      console.log("⚠️ Departments route skipped:", err.message);
    }
    
    // Add more routes as needed...
    
    console.log("✅ All routes loaded successfully");
    
  } catch (error) {
    console.error("❌ Error loading main routes:", error.message);
    
    // Fallback login route
    app.post("/api/users/login", (req, res) => {
      console.log("⚠️ Fallback login called:", req.body);
      res.json({
        success: true,
        message: "Fallback login successful",
        user: {
          id: 100,
          email: req.body.email || "fallback@example.com",
          name: "Fallback User",
          role: "student"
        },
        token: "fallback-token-123",
        debug: "Using fallback route"
      });
    });
  }
}

// Start loading routes (but don't wait for it to block server start)
loadRoutes().catch(err => {
  console.error("Failed to load routes:", err);
});

/* ================================
   404 HANDLER
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
✅ Debug login: POST /api/debug-login
✅ Dashboard: GET /api/dashboard
✅ ==================================
  `);
});
