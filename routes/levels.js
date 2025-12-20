import express from "express";
import { getLevels, createLevel, updateLevel, deleteLevel } from "../controllers/levelsController.js";

const router = express.Router();

router.get("/", getLevels);
router.post("/", createLevel);
router.put("/:id", updateLevel);
router.delete("/:id", deleteLevel);

export default router;
