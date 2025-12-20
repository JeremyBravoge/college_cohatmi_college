import express from "express";
import pool from "../config/db.js";

const router = express.Router();

// GET /api/student-modules/:student_id/:course_id/:level_id or /:student_id/:course_id
const getStudentModules = async (req, res) => {
  try {
    const { student_id, course_id, level_id } = req.params;

    let query = `
      SELECT sm.module_id, m.title, l.name AS level_name
      FROM student_modules sm
      JOIN modules m ON sm.module_id = m.id
      JOIN levels l ON sm.level_id = l.id
      WHERE sm.student_id = ?
        AND sm.course_id = ?
        AND sm.status = 'Enrolled'
    `;
    const params = [student_id, course_id];

    if (level_id) {
      query += " AND sm.level_id = ?";
      params.push(level_id);
    }

    query += " ORDER BY l.id, m.id";

    const [rows] = await pool.query(query, params);

    res.json(rows);
  } catch (error) {
    console.error("Error fetching student modules:", error);
    res.status(500).json({ error: "Failed to fetch student modules" });
  }
};

router.get("/:student_id/:course_id/:level_id", getStudentModules);
router.get("/:student_id/:course_id", getStudentModules);

export default router;
