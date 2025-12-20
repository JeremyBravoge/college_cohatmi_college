import pool from "../db.js";

export const getStudentModules = async (req, res) => {
  const { student_id, course_id } = req.params;

  try {
    const [rows] = await pool.query(
      `
      SELECT 
        sm.module_id,
        m.title,
        l.name AS level_name
      FROM student_modules sm
      JOIN modules m ON sm.module_id = m.id
      JOIN levels l ON m.level_id = l.id
      WHERE sm.student_id = ? AND m.course_id = ?
      `,
      [student_id, course_id]
    );

    res.json(rows);
  } catch (error) {
    console.error("Error fetching student modules:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
