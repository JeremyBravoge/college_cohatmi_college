import express from "express";
import {
  getModules,
  enrollStudentInModules
} from "../controllers/modulesController.js";

const router = express.Router();

// GET /api/modules - Get all modules (optional filters: course_id, level_id)
router.get("/", getModules);

// POST /api/modules/enroll - Enroll student in modules
router.post("/enroll", enrollStudentInModules);

export default router;
