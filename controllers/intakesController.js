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

// Create a new intake
export const createIntake = async (req, res) => {
  try {
    const { intake_name, year, term, start_date, end_date } = req.body;
    if (!intake_name || !year || !term || !start_date || !end_date) {
      return res.status(400).json({ error: "All fields are required" });
    }
    const [result] = await pool.query(
      "INSERT INTO intakes (intake_name, year, term, start_date, end_date) VALUES (?, ?, ?, ?, ?)",
      [intake_name, year, term, start_date, end_date]
    );
    res.status(201).json({ id: result.insertId, intake_name, year, term, start_date, end_date });
  } catch (err) {
    console.error("Error creating intake:", err);
    res.status(500).json({ error: "Failed to create intake" });
  }
};

// Update an existing intake
export const updateIntake = async (req, res) => {
  try {
    const { id } = req.params;
    const { intake_name, year, term, start_date, end_date } = req.body;
    if (!intake_name || !year || !term || !start_date || !end_date) {
      return res.status(400).json({ error: "All fields are required" });
    }
    const [result] = await pool.query(
      "UPDATE intakes SET intake_name = ?, year = ?, term = ?, start_date = ?, end_date = ? WHERE id = ?",
      [intake_name, year, term, start_date, end_date, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Intake not found" });
    }
    res.json({ id: Number(id), intake_name, year, term, start_date, end_date });
  } catch (err) {
    console.error("Error updating intake:", err);
    res.status(500).json({ error: "Failed to update intake" });
  }
};

// Delete an intake
export const deleteIntake = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query("DELETE FROM intakes WHERE id = ?", [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Intake not found" });
    }
    res.json({ message: "Intake deleted successfully" });
  } catch (err) {
    console.error("Error deleting intake:", err);
    res.status(500).json({ error: "Failed to delete intake" });
  }
};
