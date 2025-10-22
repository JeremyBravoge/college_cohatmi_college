// routes/repairs.js
import express from "express";
import {
  getRepairs,
  getFacilityRepairs,
  addRepair,
  updateRepair,
  deleteRepair,
} from "../controllers/repairsController.js";

const router = express.Router();

router.get("/", getRepairs);
router.get("/:id", getFacilityRepairs);
router.post("/", addRepair);
router.put("/:id", updateRepair);
router.delete("/:id", deleteRepair);

export default router;
