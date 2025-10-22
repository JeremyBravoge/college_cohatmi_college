import express from "express";
import {
  getBranches,
  getBranchById,
  createBranch,
  updateBranch,
  deleteBranch
} from "../controllers/branchesController.js"

const router = express.Router();

// Routes
router.get("/", getBranches);          // GET all branches
router.get("/:id", getBranchById);    // GET a single branch
router.post("/", createBranch);       // CREATE a branch
router.put("/:id", updateBranch);     // UPDATE a branch
router.delete("/:id", deleteBranch);  // DELETE a branch

export default router;
