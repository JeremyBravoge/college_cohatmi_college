import pool from "../config/db.js";
import fs from "fs";

// UPLOAD MEDIA
export const uploadMedia = async (req, res) => {
  const file = req.file;
  const category = req.body.category;
  const folder = req.body.folder || null;

  if (!file) return res.status(400).json({ message: "No file uploaded" });

  const sql = `
        INSERT INTO media_files (file_name, file_path, category, file_type, folder)
        VALUES (?, ?, ?, ?, ?)
    `;

  const values = [
    file.filename,
    "/uploads/" + file.filename,
    category,
    file.mimetype,
    folder,
  ];

  try {
    await pool.query(sql, values);
    res.json({ message: "File uploaded successfully" });
  } catch (err) {
    res.status(500).json({ error: "Database error", details: err });
  }
};

// GET ALL MEDIA (for general dashboard)
export const getAllMedia = async (req, res) => {
  const { page = 1, limit = 20, category, folder, search } = req.query;
  const offset = (page - 1) * limit;

  let sql = "SELECT * FROM media_files WHERE 1=1";
  let countSql = "SELECT COUNT(*) as total FROM media_files WHERE 1=1";
  const values = [];
  const countValues = [];

  if (category) {
    sql += " AND category = ?";
    countSql += " AND category = ?";
    values.push(category);
    countValues.push(category);
  }

  if (folder) {
    sql += " AND folder = ?";
    countSql += " AND folder = ?";
    values.push(folder);
    countValues.push(folder);
  }

  if (search) {
    sql += " AND file_name LIKE ?";
    countSql += " AND file_name LIKE ?";
    values.push(`%${search}%`);
    countValues.push(`%${search}%`);
  }

  sql += " ORDER BY uploaded_at DESC LIMIT ? OFFSET ?";
  values.push(parseInt(limit), parseInt(offset));

  try {
    const [rows] = await pool.query(sql, values);
    const [countResult] = await pool.query(countSql, countValues);
    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    res.json({
      files: rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalFiles: total,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch media", details: err });
  }
};

// GET BY CATEGORY (with pagination and folder support)
export const getByCategory = async (req, res) => {
  const category = req.params.category;
  const { page = 1, limit = 20, folder, search, fileType, dateFrom, dateTo, sortBy = 'uploaded_at', sortOrder = 'DESC' } = req.query;
  const offset = (page - 1) * limit;

  let sql = "SELECT * FROM media_files WHERE category = ?";
  let countSql = "SELECT COUNT(*) as total FROM media_files WHERE category = ?";
  const values = [category];
  const countValues = [category];

  if (folder) {
    sql += " AND folder = ?";
    countSql += " AND folder = ?";
    values.push(folder);
    countValues.push(folder);
  }

  if (search) {
    sql += " AND file_name LIKE ?";
    countSql += " AND file_name LIKE ?";
    values.push(`%${search}%`);
    countValues.push(`%${search}%`);
  }

  if (fileType) {
    sql += " AND file_type LIKE ?";
    countSql += " AND file_type LIKE ?";
    values.push(`${fileType}%`);
    countValues.push(`${fileType}%`);
  }

  if (dateFrom) {
    sql += " AND uploaded_at >= ?";
    countSql += " AND uploaded_at >= ?";
    values.push(dateFrom);
    countValues.push(dateFrom);
  }

  if (dateTo) {
    sql += " AND uploaded_at <= ?";
    countSql += " AND uploaded_at <= ?";
    values.push(dateTo + ' 23:59:59');
    countValues.push(dateTo + ' 23:59:59');
  }

  sql += ` ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`;
  values.push(parseInt(limit), parseInt(offset));

  try {
    const [rows] = await pool.query(sql, values);
    const [countResult] = await pool.query(countSql, countValues);
    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    res.json({
      files: rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalFiles: total,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Failed", details: err });
  }
};

// RENAME MEDIA
export const renameMedia = async (req, res) => {
	const id = req.params.id;
	const { newName } = req.body;

	if (!newName) return res.status(400).json({ message: "New name is required" });

	try {
		// Get current file details
		const [rows] = await pool.query("SELECT file_name, file_path FROM media_files WHERE id = ?", [id]);
		if (rows.length === 0) return res.status(404).json({ message: "File not found" });

		const oldFileName = rows[0].file_name;
		const oldFilePath = rows[0].file_path;
		const newFilePath = "/uploads/" + newName;

		// Rename physical file
		const oldFullPath = "." + oldFilePath;
		const newFullPath = "." + newFilePath;
		fs.renameSync(oldFullPath, newFullPath);

		// Update database
		const sql = "UPDATE media_files SET file_name = ?, file_path = ? WHERE id = ?";
		const [result] = await pool.query(sql, [newName, newFilePath, id]);

		if (result.affectedRows === 0) {
			return res.status(404).json({ message: "File not found" });
		}

		res.json({ message: "File renamed successfully" });
	} catch (err) {
		res.status(500).json({ error: "Rename failed", details: err });
	}
};

// DELETE MEDIA
export const deleteMedia = async (req, res) => {
  const id = req.params.id;

  try {
    // Find file first
    const [rows] = await db.query("SELECT file_path FROM media_files WHERE id = ?", [id]);
    if (rows.length === 0) return res.status(404).json({ message: "File not found" });

    const filePath = "." + rows[0].file_path; // local path

    // Delete from DB
    await db.query("DELETE FROM media_files WHERE id = ?", [id]);

    // Delete physical file
    fs.unlink(filePath, (unlinkErr) => {
      if (unlinkErr) console.error("Error deleting file:", unlinkErr);
    });

    res.json({ message: "File deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Delete failed", details: err });
  }
};

// GET FOLDERS BY CATEGORY
export const getFoldersByCategory = async (req, res) => {
  const category = req.params.category;

  try {
    const [rows] = await db.query(
      "SELECT DISTINCT folder FROM media_files WHERE category = ? AND folder IS NOT NULL ORDER BY folder",
      [category]
    );
    const folders = rows.map(row => row.folder);
    res.json(folders);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch folders", details: err });
  }
};

// MOVE MEDIA TO FOLDER
export const moveMedia = async (req, res) => {
  const id = req.params.id;
  const { folder } = req.body;

  if (!folder) return res.status(400).json({ message: "Folder name is required" });

  try {
    const sql = "UPDATE media_files SET folder = ? WHERE id = ?";
    const [result] = await db.query(sql, [folder, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "File not found" });
    }

    res.json({ message: "File moved successfully" });
  } catch (err) {
    res.status(500).json({ error: "Move failed", details: err });
  }
};

// BULK DELETE MEDIA
export const bulkDeleteMedia = async (req, res) => {
  const { ids } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ message: "File IDs array is required" });
  }

  try {
    // Get file paths first
    const placeholders = ids.map(() => '?').join(',');
    const [rows] = await db.query(
      `SELECT file_path FROM media_files WHERE id IN (${placeholders})`,
      ids
    );

    // Delete from database
    const [result] = await db.query(
      `DELETE FROM media_files WHERE id IN (${placeholders})`,
      ids
    );

    // Delete physical files
    rows.forEach(row => {
      const filePath = "." + row.file_path;
      fs.unlink(filePath, (unlinkErr) => {
        if (unlinkErr) console.error("Error deleting file:", unlinkErr);
      });
    });

    res.json({ message: `${result.affectedRows} files deleted successfully` });
  } catch (err) {
    res.status(500).json({ error: "Bulk delete failed", details: err });
  }
};

// BULK MOVE MEDIA
export const bulkMoveMedia = async (req, res) => {
  const { ids, folder } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ message: "File IDs array is required" });
  }

  if (!folder) return res.status(400).json({ message: "Folder name is required" });

  try {
    const placeholders = ids.map(() => '?').join(',');
    const [result] = await db.query(
      `UPDATE media_files SET folder = ? WHERE id IN (${placeholders})`,
      [folder, ...ids]
    );

    res.json({ message: `${result.affectedRows} files moved successfully` });
  } catch (err) {
    res.status(500).json({ error: "Bulk move failed", details: err });
  }
};

// GET FILE METADATA
export const getFileMetadata = async (req, res) => {
  const id = req.params.id;

  try {
    const [rows] = await db.query("SELECT * FROM media_files WHERE id = ?", [id]);
    if (rows.length === 0) return res.status(404).json({ message: "File not found" });

    const file = rows[0];
    const filePath = "." + file.file_path;

    // Get file stats
    const stats = fs.statSync(filePath);

    const metadata = {
      id: file.id,
      file_name: file.file_name,
      file_path: file.file_path,
      category: file.category,
      file_type: file.file_type,
      folder: file.folder,
      uploaded_at: file.uploaded_at,
      size: stats.size,
      size_formatted: formatFileSize(stats.size),
      last_modified: stats.mtime,
      created: stats.birthtime || stats.ctime,
    };

    res.json(metadata);
  } catch (err) {
    res.status(500).json({ error: "Failed to get file metadata", details: err });
  }
};

// Helper function to format file size
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
