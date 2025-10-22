import express from "express";
import {
  getAllCourses,
  addCourse,
  updateCourse,
  deleteCourse,
} from "../controllers/coursesController.js";

const router = express.Router();

router.get("/", getAllCourses);
router.post("/", addCourse);
router.put("/:id", updateCourse);
router.delete("/:id", deleteCourse);

export default router;
