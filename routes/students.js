import express from "express";
import {
  getAllStudents,
  getStudentById,
  registerStudent,
  deleteStudent,
  updateStudent
} from "../controllers/studentsController.js"; // ✅ import all needed functions
import { upload } from "../middlewares/multer.js";

const router = express.Router();

// GET /api/students
router.get("/", getAllStudents);

// GET /api/students/:id - Get student by ID
router.get("/:id", getStudentById);

// POST /api/students/register
router.post("/register", upload.single("photo"), registerStudent);

// DELETE /api/students/:id
router.delete("/:id", deleteStudent);

// PUT /api/students/:id
router.put("/:id", updateStudent);

export default router;
