import express from "express";
import {
  getModules,
  createModule,
  updateModule,
  deleteModule,
  enrollStudentInModules
} from "../controllers/modulesController.js";

const router = express.Router();

// GET /api/modules - Get all modules (optional filters: course_id, level_id)
router.get("/", getModules);

// GET /api/modules/:course_id/:level_id - Get modules for specific course and level
router.get("/:course_id/:level_id", getModules);

// POST /api/modules - Create a new module
router.post("/", createModule);

// PUT /api/modules/:id - Update a module
router.put("/:id", updateModule);

// DELETE /api/modules/:id - Delete a module
router.delete("/:id", deleteModule);

// POST /api/modules/enroll - Enroll student in modules
router.post("/enroll", enrollStudentInModules);

export default router;
