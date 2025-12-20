import express from "express";
import {
  getStudentPerformance,
  addOrUpdateMarks,
  getStudentsForMarks,
  getModulesForMarks,
  deleteStudentPerformance,
  getWelcome,
} from "../controllers/studentPerformanceController.js";


const router = express.Router();
router.delete("/:student_id/:module_id", deleteStudentPerformance);

// GET /api/student-performance - Get student performance (marks) with optional filters
router.get("/", getStudentPerformance);

// POST /api/student-performance - Add or update marks
router.post("/", addOrUpdateMarks);

// GET /api/student-performance/students - Get students for dropdown
router.get("/students", getStudentsForMarks);

// GET /api/student-performance/modules - Get modules for dropdown
router.get("/modules", getModulesForMarks);

// GET /api/student-performance/welcome - Get welcome message with logging
router.get("/welcome", getWelcome);

export default router;
