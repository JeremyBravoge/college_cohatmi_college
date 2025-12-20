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
   ✅ GLOBAL CORS (PRODUCTION SAFE)
================================ */
const allowedOrigins = [
  "https://cohatmicollege.vercel.app"
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // server-to-server or Postman
    if (allowedOrigins.includes(origin)) callback(null, true);
    else callback(new Error("CORS not allowed"));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

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
  const buildPath = path.join(__dirname, "client", "dist"); // adjust if your React build folder differs
  app.use(express.static(buildPath));

  // ✅ Catch-all route for React SPA
  app.get("*", (req, res) => {
    res.sendFile(path.join(buildPath, "index.html"));
  });
}

/* ================================
   GLOBAL ERROR HANDLER
================================ */
app.use((err, req, res, next) => {
  console.error("❌ Error:", err.message);
  res.status(500).json({
    success: false,
    message: "Server error"
  });
});

/* ================================
   SERVER START
================================ */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
