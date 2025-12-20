import express from "express";
import {
  getAllInstructors,
  getInstructorById,
  registerInstructor,
  updateInstructor,
  deleteInstructor
} from "../controllers/instructorsController.js";

const router = express.Router();

// Routes
router.get("/", getAllInstructors);
router.get("/:id", getInstructorById);
router.post("/", registerInstructor);
router.put("/:id", updateInstructor);
router.delete("/:id", deleteInstructor);


export default router; 
