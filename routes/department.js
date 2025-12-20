import express from "express";
import {
  getDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getDepartmentPerformance,
  getPerformanceTrend,
  getDepartmentDetails,
  getCoursePerformance,
  updateCourseFeesFromDepartment,    // ADD THIS
  fixCourseEnrollment,              // ADD THIS
  getEnrollmentDiscrepancy          // ADD THIS
} from "../controllers/departmentController.js";

const router = express.Router();

// Define routes
router.get("/", getDepartments);
router.get("/:id", getDepartmentById);
router.post("/", createDepartment);
router.put("/:id", updateDepartment);
router.delete("/:id", deleteDepartment);

// ADD THESE NEW ROUTES FOR PERFORMANCE ANALYTICS
router.get("/analytics/performance", getDepartmentPerformance);
router.get("/analytics/trend", getPerformanceTrend);
router.get("/analytics/departments/:id/details", getDepartmentDetails);
router.get("/analytics/courses/performance", getCoursePerformance);

// NEW FIX ROUTES
router.post("/fix/fees/:department_id", updateCourseFeesFromDepartment);
router.post("/fix/enrollment/:course_id", fixCourseEnrollment);
router.get("/fix/enrollment-discrepancy", getEnrollmentDiscrepancy);

export default router;