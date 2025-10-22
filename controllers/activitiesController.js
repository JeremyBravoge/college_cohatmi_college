import pool from "../config/db.js";

export const getRecentActivity = async (req, res) => {
  try {
   const [rows] = await pool.query(`
  SELECT
    a.id,
    CONCAT(COALESCE(s.first_name, ''), ' ', COALESCE(s.last_name, '')) AS student,
    a.action,
    a.course,
    a.created_at AS time,
    a.type
  FROM activities a
  JOIN students s ON a.student_id = s.id
  WHERE a.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
  ORDER BY a.created_at DESC
  LIMIT 5
`);

    res.json(rows);
  } catch (err) {
    console.error("RecentActivity API error:", err);
    res.status(500).json({ error: err.message });
  }
};
