import express from "express";
import cors from "cors";
import coursesRoutes from "./routes/courses.js";
import usersRoutes from "./routes/users.js";
import studentsRoutes from "./routes/students.js"
import intakesRoutes from "./routes/intakes.js";
import dashboardRoutes from "./routes/dashboard.js";
import activitiesRoutes from "./routes/activities.js";
import financeRoutes from "./routes/finance.js";
import departmentRoutes from './routes/department.js';; // <-- add this
import branchRoutes from "./routes/branches.js";
import levelsRoutes from "./routes/levels.js";
import facilitiesRoutes from "./routes/facilities.js";
import repairsRoutes from "./routes/repairs.js";
import transactionRoutes from "./routes/transaction.js";  // ✅ check path
import vocationalPerformanceRoutes from "./routes/vocationalPerformanceRoutes.js";
import modulesRoutes from "./routes/modules.js";
import instructorRoutes from "./routes/instructors.js"
import studentPerformanceRoutes from "./routes/studentPerformanceRoutes.js";
import notificationsRoutes from "./routes/notifications.js";
import enrollmentsRoutes from "./routes/enrollments.js";
import studentModulesRoutes from "./routes/studentModules.js";
import mediaRoutes from "./routes/mediaRoutes.js";
import performanceRouter from './routes/performance.js';
import reportRouter from "./routes/report.js";
import rankingRoutes from './routes/ranking.js';
import path from "path";
import { fileURLToPath } from 'url';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());
app.use('/api/performance', performanceRouter);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/repairs", repairsRoutes); // 👈 new
app.use("/api/facilities", facilitiesRoutes);
app.use("/api/performance", vocationalPerformanceRoutes);
app.use("/api/instructors", instructorRoutes);
app.use("/api/branches", branchRoutes);
app.use("/api/levels", levelsRoutes);
app.use('/api/departments', departmentRoutes);  // <-- mount department rout
app.use("/api/finance", financeRoutes);// ✅ finance route
app.use("/api/activities", activitiesRoutes);
app.use("/api/intakes", intakesRoutes);
app.use("/api/students", studentsRoutes);
app.use("/api/courses", coursesRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/dashboard", dashboardRoutes);  // ✅ dashboard route
app.use("/api/modules", modulesRoutes);  // ✅ modules route
app.use("/api/student-performance", studentPerformanceRoutes);  // ✅ student performance route
app.use("/api/notifications", notificationsRoutes);  // ✅ notifications route
app.use("/api/enrollments", enrollmentsRoutes);  // ✅ enrollments route
app.use("/api/student-modules", studentModulesRoutes);  // ✅ student modules route
app.use("/api/media", mediaRoutes);
app.use("/api/transactions", transactionRoutes);  // ✅ transactions route
app.use('/api/reports', reportRouter);
app.use('/api/ranking', rankingRoutes);


const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
