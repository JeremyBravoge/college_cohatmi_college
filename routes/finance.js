import express from "express";
import { getFinance, getFees, payFee, getFeesSummary, addFinance, updateFinance, deleteFinance } from "../controllers/financeController.js";

const router = express.Router();

router.get("/", getFinance);
router.get("/fees", getFees);
router.post("/fees/pay", payFee);
router.get("/fees-summary", getFeesSummary);
      // POST payment

export default router;
