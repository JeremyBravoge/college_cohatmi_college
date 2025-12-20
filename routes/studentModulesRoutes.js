import express from "express";
import { getStudentModules } from "../controllers/studentModules.controller.js";

const router = express.Router();

router.get("/:student_id/:course_id", getStudentModules);

export default router;
