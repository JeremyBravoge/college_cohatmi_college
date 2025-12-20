import express from "express";
import { getAllIntakes, createIntake, updateIntake, deleteIntake } from "../controllers/intakesController.js";

const router = express.Router();
router.get("/", getAllIntakes);
router.post("/", createIntake);
router.put("/:id", updateIntake);
router.delete("/:id", deleteIntake);
export default router;
