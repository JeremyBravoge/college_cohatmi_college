import express from "express";
import { 
  getTransactions, 
  getTransactionById, 
  createTransaction, 
  deleteTransaction 
} from "../controllers/transactionController.js";

const router = express.Router();

router.get("/", getTransactions);       // GET all
router.get("/:id", getTransactionById); // GET one
router.post("/", createTransaction);    // POST new
router.delete("/:id", deleteTransaction); // DELETE one

export default router;
