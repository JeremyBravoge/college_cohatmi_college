// routes/activities.js
import express from "express";
import { getRecentActivity } from "../controllers/activitiesController.js";

const router = express.Router();

// GET /api/activities/recent
router.get("/recent", getRecentActivity);

export default router;
