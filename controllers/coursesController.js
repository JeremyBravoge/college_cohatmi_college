import pool from "../config/db.js";

// ✅ GET all courses
export const getAllCourses = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        c.id,
        c.name,
        d.name AS department,
        CONCAT(c.duration_months, ' months') AS duration,
        d.fee_charge AS fee, -- ✅ always from department
        (
          SELECT COUNT(*) 
          FROM enrollments e 
          WHERE e.course_id = c.id
        ) AS enrolled,
        c.capacity,
        COALESCE(GROUP_CONCAT(DISTINCT i.name SEPARATOR ', '), '') AS instructor,
        c.start_date AS startDate,
        c.status,
        c.description
      FROM courses c
      LEFT JOIN departments d ON c.department_id = d.id
      LEFT JOIN instructor_courses ic ON c.id = ic.course_id
      LEFT JOIN instructors i ON ic.instructor_id = i.id
      GROUP BY 
        c.id, c.name, d.name, c.duration_months, d.fee_charge, 
        c.capacity, c.start_date, c.status, c.description
      ORDER BY c.name ASC
    `);

    res.json(rows);
  } catch (err) {
    console.error("❌ Error fetching courses:", err);
    res.status(500).json({ error: "Failed to fetch courses", details: err.message });
  }
};

// ✅ GET levels for a specific course
export const getLevelsForCourse = async (req, res) => {
  const { courseId } = req.params;
  try {
    const [rows] = await pool.query(`
      SELECT DISTINCT l.id, l.name
      FROM levels l
      JOIN modules m ON l.id = m.level_id
      WHERE m.course_id = ?
      ORDER BY l.name ASC
    `, [courseId]);
    res.json(rows);
  } catch (err) {
    console.error("❌ Error fetching levels for course:", err);
    res.status(500).json({ error: "Failed to fetch levels", details: err.message });
  }
};

// ✅ GET performance for a specific course and level
export const getCourseLevelPerformance = async (req, res) => {
  const { courseId, levelId } = req.params;
  try {
    const [rows] = await pool.query(`
      SELECT 
        COUNT(DISTINCT sp.student_id) as entries,
        ROUND(AVG((sp.theory_marks + sp.practical_marks)/2), 2) as meanMarks,
        CASE 
          WHEN AVG((sp.theory_marks + sp.practical_marks)/2) >= 80 THEN 'Distinction'
          WHEN AVG((sp.theory_marks + sp.practical_marks)/2) >= 65 THEN 'Pass'
          WHEN AVG((sp.theory_marks + sp.practical_marks)/2) >= 50 THEN 'Pass'
          ELSE 'Fail'
        END as grade,
        COALESCE(GROUP_CONCAT(DISTINCT i.name SEPARATOR ', '), 'N/A') as teacher
      FROM student_performance sp
      JOIN modules m ON sp.module_id = m.id
      LEFT JOIN instructor_courses ic ON m.course_id = ic.course_id
      LEFT JOIN instructors i ON ic.instructor_id = i.id
      WHERE m.course_id = ? AND m.level_id = ?
    `, [courseId, levelId]);

    const data = rows[0];
    if (!data || data.entries === 0) {
      return res.json([]);
    }

    res.json([{
      levelId: parseInt(levelId),
      entries: data.entries,
      meanMarks: data.meanMarks,
      grade: data.grade,
      teacher: data.teacher
    }]);
  } catch (err) {
    console.error("❌ Error fetching performance:", err);
    res.status(500).json({ error: "Failed to fetch performance", details: err.message });
  }
};

// ✅ ADD a new course
export const addCourse = async (req, res) => {
  try {
    const { name, department_id, duration_months, fee, capacity, start_date, status, description } = req.body;

    if (!name || !department_id) {
      return res.status(400).json({ error: "Name and department_id are required" });
    }

    const [result] = await pool.query(
      `INSERT INTO courses 
        (name, department_id, duration_months, fee, capacity, start_date, status, description) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        department_id,
        duration_months || 3,
        fee || null,
        capacity || 30,
        start_date || null,
        status || "Upcoming",
        description || null,
      ]
    );

    res.status(201).json({ message: "✅ Course added successfully", id: result.insertId });
  } catch (err) {
    console.error("❌ Error adding course:", err);
    res.status(500).json({ error: "Failed to add course", details: err.message });
  }
};

// ✅ UPDATE an existing course
export const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, department_id, duration_months, fee, capacity, start_date, status, description } = req.body;

    const [result] = await pool.query(
      `UPDATE courses 
       SET name = COALESCE(?, name),
           department_id = COALESCE(?, department_id),
           duration_months = COALESCE(?, duration_months),
           fee = COALESCE(?, fee),
           capacity = COALESCE(?, capacity),
           start_date = COALESCE(?, start_date),
           status = COALESCE(?, status),
           description = COALESCE(?, description)
       WHERE id = ?`,
      [name, department_id, duration_months, fee, capacity, start_date, status, description, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Course not found" });
    }

    res.json({ message: "✅ Course updated successfully" });
  } catch (err) {
    console.error("❌ Error updating course:", err);
    res.status(500).json({ error: "Failed to update course", details: err.message });
  }
};

// ✅ DELETE a course
export const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.query(`DELETE FROM courses WHERE id = ?`, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Course not found" });
    }

    res.json({ message: "✅ Course deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting course:", err);
    res.status(500).json({ error: "Failed to delete course", details: err.message });
  }
};
