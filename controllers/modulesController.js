import pool from "../config/db.js";

// ✅ GET all modules (optionally filter by course_id or level_id)
export const getModules = async (req, res) => {
  try {
    const { course_id, level_id } = req.params || req.query;
    let query = `
      SELECT m.id, m.code, m.title, m.course_id, m.level_id,
             c.name AS course_name, l.name AS level_name
      FROM modules m
      LEFT JOIN courses c ON m.course_id = c.id
      LEFT JOIN levels l ON m.level_id = l.id
    `;
    const params = [];

    if (course_id) {
      query += " WHERE m.course_id = ?";
      params.push(course_id);
    }
    if (level_id) {
      query += course_id ? " AND m.level_id = ?" : " WHERE m.level_id = ?";
      params.push(level_id);
    }

    query += " ORDER BY m.title ASC";

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error("❌ Error fetching modules:", err);
    res.status(500).json({ error: "Failed to fetch modules", details: err.message });
  }
};

// ✅ CREATE a new module
export const createModule = async (req, res) => {
  try {
    const { code, title, course_id, level_id } = req.body;
    if (!code || !title || !course_id || !level_id) {
      return res.status(400).json({ error: "Code, title, course_id, and level_id are required" });
    }
    const [result] = await pool.query(
      "INSERT INTO modules (code, title, course_id, level_id) VALUES (?, ?, ?, ?)",
      [code, title, course_id, level_id]
    );
    res.status(201).json({ id: result.insertId, code, title, course_id, level_id });
  } catch (err) {
    console.error("❌ Error creating module:", err);
    res.status(500).json({ error: "Failed to create module", details: err.message });
  }
};

// ✅ UPDATE an existing module
export const updateModule = async (req, res) => {
  try {
    const { id } = req.params;
    const { code, title, course_id, level_id } = req.body;
    if (!code || !title || !course_id || !level_id) {
      return res.status(400).json({ error: "Code, title, course_id, and level_id are required" });
    }
    const [result] = await pool.query(
      "UPDATE modules SET code = ?, title = ?, course_id = ?, level_id = ? WHERE id = ?",
      [code, title, course_id, level_id, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Module not found" });
    }
    res.json({ id: Number(id), code, title, course_id, level_id });
  } catch (err) {
    console.error("❌ Error updating module:", err);
    res.status(500).json({ error: "Failed to update module", details: err.message });
  }
};

// ✅ DELETE a module
export const deleteModule = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query("DELETE FROM modules WHERE id = ?", [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Module not found" });
    }
    res.json({ message: "Module deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting module:", err);
    res.status(500).json({ error: "Failed to delete module", details: err.message });
  }
};

// ✅ ENROLL student in modules
export const enrollStudentInModules = async (req, res) => {
  try {
    const { student_id, module_ids, level } = req.body;

    if (!student_id || !module_ids || !Array.isArray(module_ids) || module_ids.length === 0 || !level) {
      return res.status(400).json({ error: "student_id, module_ids array, and level are required" });
    }

    // Get level_id from level name
    const [levelRows] = await pool.query("SELECT id FROM levels WHERE name = ?", [level]);
    if (levelRows.length === 0) {
      return res.status(400).json({ error: "Invalid level" });
    }
    const levelId = levelRows[0].id;

    // Insert into student_modules for each module
    const insertPromises = module_ids.map(moduleId =>
      pool.query(
        `INSERT INTO student_modules (student_id, module_id, level_id, enrollment_date, status)
         VALUES (?, ?, ?, CURDATE(), 'Enrolled')
         ON DUPLICATE KEY UPDATE status = 'Enrolled', enrollment_date = CURDATE()`,
        [student_id, moduleId, levelId]
      )
    );

    await Promise.all(insertPromises);

    // Log activity
    await pool.query(
      `INSERT INTO activities (student_id, action, course, type, created_at)
       VALUES (?, 'Enrolled in Modules', ?, 'enrollment', NOW())`,
      [student_id, `${module_ids.length} modules at ${level}`]
    );

    res.status(201).json({ message: "✅ Student enrolled in modules successfully" });
  } catch (err) {
    console.error("❌ Error enrolling student in modules:", err);
    res.status(500).json({ error: "Failed to enroll student in modules", details: err.message });
  }
};
