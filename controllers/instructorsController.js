import pool from "../config/db.js";

// ✅ Get all instructors
export const getAllInstructors = async (req, res) => {
  try {
    const query = "SELECT * FROM instructors ORDER BY id DESC";
    const [rows] = await pool.query(query);
    res.status(200).json(rows);
  } catch (err) {
    console.error("❌ Error fetching instructors:", err);
    res.status(500).json({ error: "Failed to fetch instructors", details: err.message });
  }
};

// ✅ Get instructor by ID
export const getInstructorById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query("SELECT * FROM instructors WHERE id = ?", [id]);
    if (rows.length === 0) return res.status(404).json({ error: "Instructor not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error("❌ Error fetching instructor by ID:", err);
    res.status(500).json({ error: "Failed to fetch instructor", details: err.message });
  }
};

// ✅ Register new instructor
export const registerInstructor = async (req, res) => {
  try {
    const { first_name, last_name, email, phone, department } = req.body;

    if (!first_name || !last_name || !email || !department) {
      return res.status(400).json({ error: "first_name, last_name, email, and department are required" });
    }

    // Get department_id from department name
    const [deptRows] = await pool.query("SELECT id FROM departments WHERE name = ?", [department]);
    if (deptRows.length === 0) {
      return res.status(400).json({ error: "Invalid department name" });
    }
    const department_id = deptRows[0].id;

    const name = `${first_name} ${last_name}`;

    const query = `
      INSERT INTO instructors (name, email, phone, department_id, hire_date)
      VALUES (?, ?, ?, ?, NOW())
    `;
    await pool.query(query, [name, email, phone || null, department_id]);

    res.status(201).json({ message: "✅ Instructor registered successfully" });
  } catch (err) {
    console.error("❌ Error registering instructor:", err);
    res.status(500).json({ error: "Failed to register instructor", details: err.message });
  }
};

// ✅ Update instructor
export const updateInstructor = async (req, res) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, email, phone, department } = req.body;

    const [existing] = await pool.query("SELECT * FROM instructors WHERE id = ?", [id]);
    if (existing.length === 0) return res.status(404).json({ error: "Instructor not found" });

    let department_id = existing[0].department_id;
    if (department) {
      const [deptRows] = await pool.query("SELECT id FROM departments WHERE name = ?", [department]);
      if (deptRows.length === 0) {
        return res.status(400).json({ error: "Invalid department name" });
      }
      department_id = deptRows[0].id;
    }

    const name = first_name && last_name ? `${first_name} ${last_name}` : existing[0].name;

    await pool.query(
      `UPDATE instructors
       SET name = ?, email = ?, phone = ?, department_id = ?
       WHERE id = ?`,
      [name, email || existing[0].email, phone || existing[0].phone, department_id, id]
    );

    res.json({ message: "✅ Instructor updated successfully" });
  } catch (err) {
    console.error("❌ Error updating instructor:", err);
    res.status(500).json({ error: "Failed to update instructor", details: err.message });
  }
};

// ✅ Delete instructor
export const deleteInstructor = async (req, res) => {
  try {
    const { id } = req.params;
    const [existing] = await pool.query("SELECT * FROM instructors WHERE id = ?", [id]);
    if (existing.length === 0) return res.status(404).json({ error: "Instructor not found" });

    await pool.query("DELETE FROM instructors WHERE id = ?", [id]);
    res.json({ message: "🗑️ Instructor deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting instructor:", err);
    res.status(500).json({ error: "Failed to delete instructor", details: err.message });
  }
};
