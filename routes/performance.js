import express from 'express';
import {
  getModulePerformance,
  getPerformanceSummary,
  getStudentPerformance,
  getCoursePerformance,
  getModulesByCourseAndLevel  // ADD THIS IMPORT
} from '../controllers/performanceController.js';

const router = express.Router();

// GET /api/performance/summary - Overall performance summary
router.get('/summary', getPerformanceSummary);

// GET /api/performance/modules/:moduleId/performance - Performance for specific module
router.get('/modules/:moduleId/performance', getModulePerformance);

// GET /api/performance/students/:studentId - Performance for specific student
router.get('/students/:studentId', getStudentPerformance);

// GET /api/performance/courses/:courseId - Performance for specific course
router.get('/courses/:courseId', getCoursePerformance);

// ADD THIS NEW ROUTE - Get modules by course and level
router.get('/courses/:courseId/levels/:levelId/modules', getModulesByCourseAndLevel);

// Use default export to match your server.js import
export default router;