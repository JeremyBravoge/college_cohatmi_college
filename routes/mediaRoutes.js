import express from "express";
import { upload } from "../middlewares/multer.js";
import {
  uploadMedia,
  getAllMedia,
  getByCategory,
  renameMedia,
  deleteMedia,
  getFoldersByCategory,
  moveMedia,
  bulkDeleteMedia,
  bulkMoveMedia,
  getFileMetadata,
} from "../controllers/mediaController.js";

const router = express.Router();

// Upload file
router.post("/upload", upload.single("file"), uploadMedia);

// Get all media (with pagination, filters)
router.get("/", getAllMedia);

// Get by category (with pagination, folder, search)
router.get("/category/:category", getByCategory);

// Get folders by category
router.get("/folders/:category", getFoldersByCategory);

// Get file metadata
router.get("/metadata/:id", getFileMetadata);

// Rename file
router.put("/rename/:id", renameMedia);

// Move file to folder
router.put("/move/:id", moveMedia);

// Bulk delete files
router.delete("/bulk", bulkDeleteMedia);

// Bulk move files
router.put("/bulk/move", bulkMoveMedia);

// Delete file
router.delete("/:id", deleteMedia);

export default router;
