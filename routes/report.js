import express from 'express';
import {
  getDashboardStatistics,
  getDepartmentPerformance,
  getCoursePerformance,
  getFinancialReport,
  getStudentProgressReport,
  getMonthlyTrends,
  getTopPerformers,
  exportReportData,
  getReportsWelcome
} from '../controllers/reportController.js';

const router = express.Router();

// Welcome route
router.get('/', getReportsWelcome);

// Dashboard statistics (all KPIs)
router.get('/dashboard', getDashboardStatistics);

// Department performance
router.get('/department-performance', getDepartmentPerformance);

// Course performance
router.get('/course-performance', getCoursePerformance);

// Financial reports
router.get('/financial', getFinancialReport);

// Student progress reports
router.get('/student-progress', getStudentProgressReport);

// Monthly trends
router.get('/monthly-trends', getMonthlyTrends);

// Top performers
router.get('/top-performers', getTopPerformers);

// Export data
router.get('/export', exportReportData);

export default router;