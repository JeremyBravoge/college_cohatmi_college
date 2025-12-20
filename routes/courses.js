import express from "express";
import {
  getAllCourses,
  addCourse,
  updateCourse,
  deleteCourse,
  getLevelsForCourse,
  getCourseLevelPerformance,
} from "../controllers/coursesController.js";

const router = express.Router();

router.get("/", getAllCourses);
router.post("/", addCourse);
router.put("/:id", updateCourse);
router.delete("/:id", deleteCourse);

// New nested routes for course performance
router.get("/:courseId/levels", getLevelsForCourse);
router.get("/:courseId/levels/:levelId/performance", getCourseLevelPerformance);

export default router;
