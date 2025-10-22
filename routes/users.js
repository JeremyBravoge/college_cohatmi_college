import express from "express";
import { upload } from "../middlewares/multer.js";
import { 
  registerUser, 
  getAllUsers, 
  loginUser, 
  getUserById, 
  updateUser, 
  deleteUser, 
  getCurrentUser  // ✅ import the controller
} from "../controllers/usersController.js";

import { authenticateToken } from "../middlewares/auth.js"; // ✅ import auth

const router = express.Router();

router.post("/register", upload.single("profile_image"), registerUser);
router.get("/", getAllUsers);
router.post("/login", loginUser);

// ✅ Current user route
router.get("/me", authenticateToken, getCurrentUser);  

router.get("/:id", getUserById);
router.put("/:id", upload.single("profile_image"), updateUser);
router.delete("/:id", deleteUser);  

export default router;
