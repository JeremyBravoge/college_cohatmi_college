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
  if (req.url !== '/health') {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  }
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
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  res.sendStatus(204);
});

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
    }
  },
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
      dashboard: "GET /api/dashboard"
    },
    timestamp: new Date().toISOString()
  });
});

/* ================================
   DEBUG ROUTES
================================ */
app.get("/api/test", (req, res) => {
  res.json({ 
    success: true,
    message: "API test successful!"
  });
});

app.post("/api/debug-login", (req, res) => {
  res.json({
    success: true,
    message: "Debug login successful",
    user: {
      id: 999,
      email: req.body.email || "debug@test.com",
      name: "Debug User",
      role: "admin"
    },
    token: "debug-jwt-token-123456"
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
async function loadRoutes() {
  console.log("📦 Loading API routes...");
  
  try {
    // Load routes dynamically
    const { default: usersRoutes } = await import("./routes/users.js");
    app.use("/api/users", usersRoutes);
    console.log("✅ Users route loaded");
    
    const { default: studentsRoutes } = await import("./routes/students.js");
    app.use("/api/students", studentsRoutes);
    console.log("✅ Students route loaded");
    
    const { default: coursesRoutes } = await import("./routes/courses.js");
    app.use("/api/courses", coursesRoutes);
    console.log("✅ Courses route loaded");
    
    const { default: dashboardRoutes } = await import("./routes/dashboard.js");
    app.use("/api/dashboard", dashboardRoutes);
    console.log("✅ Dashboard route loaded");
    
    // Load other routes as needed
    const { default: intakesRoutes } = await import("./routes/intakes.js");
    app.use("/api/intakes", intakesRoutes);
    
    // Add more routes here as needed...
    
    console.log("✅ All routes loaded successfully");
    
  } catch (error) {
    console.error("❌ Error loading routes:", error.message);
    
    // Fallback login route if users route fails
    app.post("/api/users/login", (req, res) => {
      console.log("⚠️ Using fallback login route");
      res.status(500).json({
        success: false,
        message: "Routes failed to load: " + error.message
      });
    });
  }
}

// Start loading routes
loadRoutes().catch(console.error);

/* ================================
   404 HANDLER
================================ */
app.use("/api/*", (req, res) => {
  res.status(404).json({
    success: false,
    message: `API route not found: ${req.method} ${req.url}`
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
      message: "CORS error"
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
✅ ==================================
  `);
});
