import express from "express";
import { getVocationalPerformance } from "../controllers/vocationalPerformanceController.js";

const router = express.Router();

// GET /api/performance?admissionNo=VT/2025/004&level=Level 2
router.get("/", getVocationalPerformance);

// ✅ Must have a *default export* when importing as default
export default router;
