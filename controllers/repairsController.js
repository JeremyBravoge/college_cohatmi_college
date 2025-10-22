// controllers/repairsController.js
import pool from "../config/db.js";

// Get all repairs
export const getRepairs = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT fr.id, f.name AS facility, fr.issue_reported, fr.status, fr.repair_date
       FROM facility_repairs fr
       JOIN facilities f ON fr.facility_id = f.id
       ORDER BY fr.id DESC`
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get repairs for one facility
export const getFacilityRepairs = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query(
      "SELECT * FROM facility_repairs WHERE facility_id=? ORDER BY id DESC",
      [id]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Add new repair
export const addRepair = async (req, res) => {
  const { facility_id, issue_reported, status } = req.body;
  try {
    const [result] = await pool.query(
      "INSERT INTO facility_repairs (facility_id, issue_reported, status) VALUES (?, ?, ?)",
      [facility_id, issue_reported, status || "Pending"]
    );
    res.json({ id: result.insertId, facility_id, issue_reported, status });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update repair status
export const updateRepair = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    await pool.query(
      "UPDATE facility_repairs SET status=?, repair_date=CURDATE() WHERE id=?",
      [status, id]
    );
    res.json({ id, status });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete repair
export const deleteRepair = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM facility_repairs WHERE id=?", [id]);
    res.json({ message: "Repair deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
