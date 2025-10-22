import pool from "../config/db.js"; // MySQL pool

// Get all branches
export const getBranches = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM branches ORDER BY id ASC");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch branches" });
  }
};

// Get a single branch by ID
export const getBranchById = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query("SELECT * FROM branches WHERE id = ?", [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: "Branch not found" });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch branch" });
  }
};

// Create a new branch
export const createBranch = async (req, res) => {
  const { name, location } = req.body;
  try {
    const [result] = await pool.query(
      "INSERT INTO branches (name, location) VALUES (?, ?)",
      [name, location]
    );
    const [newBranch] = await pool.query("SELECT * FROM branches WHERE id = ?", [result.insertId]);
    res.status(201).json(newBranch[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create branch" });
  }
};

// Update a branch
export const updateBranch = async (req, res) => {
  const { id } = req.params;
  const { name, location } = req.body;
  try {
    const [result] = await pool.query(
      "UPDATE branches SET name = ?, location = ? WHERE id = ?",
      [name, location, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Branch not found" });
    }
    const [updatedBranch] = await pool.query("SELECT * FROM branches WHERE id = ?", [id]);
    res.json(updatedBranch[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update branch" });
  }
};

// Delete a branch
export const deleteBranch = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query("DELETE FROM branches WHERE id = ?", [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Branch not found" });
    }
    res.json({ message: "Branch deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete branch" });
  }
};
