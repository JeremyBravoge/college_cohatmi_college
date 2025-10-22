import pool from "../config/db.js";

// Get all departments
export const getDepartments = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM departments ORDER BY id');
    res.json(rows);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get department by ID
export const getDepartmentById = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query('SELECT * FROM departments WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Department not found' });
    res.json(rows[0]);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: 'Server error' });
  }
};

// Create a new department
export const createDepartment = async (req, res) => {
  const { name, fee_charge } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT INTO departments (name, fee_charge) VALUES (?, ?)',
      [name, fee_charge]
    );
    const [rows] = await pool.query('SELECT * FROM departments WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update a department
export const updateDepartment = async (req, res) => {
  const { id } = req.params;
  const { name, fee_charge } = req.body;
  try {
    const [result] = await pool.query(
      'UPDATE departments SET name = ?, fee_charge = ? WHERE id = ?',
      [name, fee_charge, id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Department not found' });
    const [rows] = await pool.query('SELECT * FROM departments WHERE id = ?', [id]);
    res.json(rows[0]);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: 'Server error' });
  }
};

// Delete a department
export const deleteDepartment = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query('DELETE FROM departments WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Department not found' });
    res.json({ message: 'Department deleted successfully' });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: 'Server error' });
  }
};
