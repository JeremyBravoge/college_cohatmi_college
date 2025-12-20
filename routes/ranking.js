import express from 'express';
import {
  getStudentOverallPerformance,
  getStudentDetailedPerformance,
  getPerformanceLeaderboards,
  getPerformanceAnalytics,
  exportStudentPerformanceReport,
  getRankingWelcome
} from '../controllers/rankingController.js';

const router = express.Router();

// Welcome route
router.get('/', getRankingWelcome);

// Overall student performance with rankings
router.get('/overall', getStudentOverallPerformance);

// Individual student detailed performance
router.get('/student/:student_id', getStudentDetailedPerformance);

// Performance leaderboards
router.get('/leaderboards', getPerformanceLeaderboards);

// Performance analytics
router.get('/analytics', getPerformanceAnalytics);

// Export reports
router.get('/export', exportStudentPerformanceReport);

export default router;