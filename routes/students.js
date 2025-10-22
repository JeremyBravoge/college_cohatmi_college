import express from "express";
import {
  getAllStudents,
  registerStudent,
  deleteStudent,
  updateStudent
} from "../controllers/studentsController.js"; // ✅ import all needed functions

const router = express.Router();

// GET /api/students
router.get("/", getAllStudents);

// DELETE /api/students/:id
router.delete("/:id", deleteStudent);

// PUT /api/students/:id
router.put("/:id", updateStudent);

// POST /api/students/register
router.post("/register", registerStudent);

export default router;
