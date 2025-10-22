// controllers/facilitiesController.js
import pool from "../config/db.js";

// Get all facilities
export const getFacilities = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM facilities ORDER BY id DESC");
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Add new facility
export const addFacility = async (req, res) => {
  const { name, description, status, image_url } = req.body;
  try {
    const [result] = await pool.query(
      "INSERT INTO facilities (name, description, status, image_url) VALUES (?, ?, ?, ?)",
      [name, description, status || "Good", image_url || null]
    );
    res.json({ id: result.insertId, name, description, status, image_url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update facility
export const updateFacility = async (req, res) => {
  const { id } = req.params;
  const { name, description, status, image_url } = req.body;
  try {
    await pool.query(
      "UPDATE facilities SET name=?, description=?, status=?, image_url=? WHERE id=?",
      [name, description, status, image_url, id]
    );
    res.json({ id, name, description, status, image_url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete facility
export const deleteFacility = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM facilities WHERE id=?", [id]);
    res.json({ message: "Facility deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
