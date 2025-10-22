// controllers/intakesController.js
import pool from "../config/db.js";

export const getAllIntakes = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT id, intake_name, year, term, start_date, end_date
      FROM intakes
      ORDER BY year DESC, term ASC
    `);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching intakes:", err);
    res.status(500).json({ error: "Failed to fetch intakes" });
  }
};
