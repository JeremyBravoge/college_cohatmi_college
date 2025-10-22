import express from "express";
import { getAllIntakes } from "../controllers/intakesController.js";

const router = express.Router();
router.get("/intakes", getAllIntakes);
export default router;
