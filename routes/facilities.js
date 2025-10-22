// routes/facilities.js
import express from "express";
import {
  getFacilities,
  addFacility,
  updateFacility,
  deleteFacility,
} from "../controllers/facilitiesController.js";

const router = express.Router();

router.get("/", getFacilities);
router.post("/", addFacility);
router.put("/:id", updateFacility);
router.delete("/:id", deleteFacility);

export default router;
