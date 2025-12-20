import pool from "../config/db.js";

// Get all levels
export const getLevels = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT id, name, duration, description FROM levels ORDER BY id ASC");
    res.json(rows);
  } catch (err) {
    console.error("Error fetching levels:", err);
    res.status(500).json({ error: "Failed to fetch levels" });
  }
};

// Create a new level
export const createLevel = async (req, res) => {
  try {
    const { name, duration, description } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }
    const [result] = await pool.query(
      "INSERT INTO levels (name, duration, description) VALUES (?, ?, ?)",
      [name, duration || '', description || '']
    );
    res.status(201).json({ id: result.insertId, name, duration, description });
  } catch (err) {
    console.error("Error creating level:", err);
    res.status(500).json({ error: "Failed to create level" });
  }
};

// Update an existing level
export const updateLevel = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, duration, description } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }
    const [result] = await pool.query(
      "UPDATE levels SET name = ?, duration = ?, description = ? WHERE id = ?",
      [name, duration || '', description || '', id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Level not found" });
    }
    res.json({ id: Number(id), name, duration, description });
  } catch (err) {
    console.error("Error updating level:", err);
    res.status(500).json({ error: "Failed to update level" });
  }
};

// Delete a level
export const deleteLevel = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query("DELETE FROM levels WHERE id = ?", [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Level not found" });
    }
    res.json({ message: "Level deleted successfully" });
  } catch (err) {
    console.error("Error deleting level:", err);
    res.status(500).json({ error: "Failed to delete level" });
  }
};
