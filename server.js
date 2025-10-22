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
import intakeRoutes from "./routes/intakes.js";
import facilitiesRoutes from "./routes/facilities.js";
import repairsRoutes from "./routes/repairs.js";
import transactionRoutes from "./routes/transaction.js";  // ✅ check path
import vocationalPerformanceRoutes from "./routes/vocationalPerformanceRoutes.js";
import modulesRoutes from "./routes/modules.js";
import path from "path";
const app = express();

app.use(cors());
app.use(express.json());

// Routes
// Mount the finance routes
app.use("/uploads", express.static(path.join(path.resolve(), "uploads")));app.use("/api/transactions", transactionRoutes);
app.use("/api/repairs", repairsRoutes); // 👈 new
app.use("/api/facilities", facilitiesRoutes);
app.use("/api/performance", vocationalPerformanceRoutes);
app.use("/api/branches", branchRoutes);
app.use('/api/departments', departmentRoutes);  // <-- mount department rout
app.use("/api/finance", financeRoutes);// ✅ finance route
app.use("/api/activities", activitiesRoutes);
app.use("/api", intakeRoutes);
app.use("/api/students", studentsRoutes);
app.use("/api/courses", coursesRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/dashboard", dashboardRoutes);  // ✅ dashboard route
app.use("/api/modules", modulesRoutes);  // ✅ modules route

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
