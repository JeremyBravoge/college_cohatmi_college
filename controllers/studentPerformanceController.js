import pool from "../config/db.js";

/**
 * ✅ GET student performance (marks)
 * Optional filters: student_id, module_id
 */
export const getStudentPerformance = async (req, res) => {
  try {
    const { student_id, module_id } = req.query;

    let query = `
      SELECT sp.id, sp.student_id, sp.module_id, sp.theory_marks, sp.practical_marks, sp.grade,
             s.first_name, s.last_name, s.photo, s.department_id,
             m.title AS module_title, m.code AS module_code,
             l.name AS level_name, c.name AS course_name,
             sm.status AS enrollment_status
      FROM student_performance sp
      JOIN students s ON sp.student_id = s.id
      JOIN modules m ON sp.module_id = m.id
      JOIN levels l ON m.level_id = l.id
      JOIN courses c ON m.course_id = c.id
      LEFT JOIN student_modules sm ON sm.student_id = sp.student_id AND sm.module_id = sp.module_id
    `;
    const params = [];
    const conditions = [];

    if (student_id) {
      conditions.push("sp.student_id = ?");
      params.push(student_id);
    }
    if (module_id) {
      conditions.push("sp.module_id = ?");
      params.push(module_id);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY sp.id DESC";

    const [rows] = await pool.query(query, params);

    // Return the raw list of marks as expected by the frontend
    res.json(rows);
  } catch (err) {
    console.error("❌ Error fetching student performance:", err);
    res.status(500).json({ error: "Failed to fetch student performance", details: err.message });
  }
};

/**
 * ✅ ADD or UPDATE student marks with enhanced validation
 */
export const addOrUpdateMarks = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { student_id, module_id, theory_marks, practical_marks } = req.body;

    // 1️⃣ Validate input fields
    if (!student_id || !module_id || theory_marks === undefined || practical_marks === undefined) {
      await connection.rollback();
      return res.status(400).json({
        error: "Missing required fields: student_id, module_id, theory_marks, and practical_marks are required",
      });
    }

    // 2️⃣ Validate marks (0–50)
    if (theory_marks < 0 || theory_marks > 50 || practical_marks < 0 || practical_marks > 50) {
      await connection.rollback();
      return res.status(400).json({ error: "Marks must be between 0 and 50" });
    }

    // 3️⃣ Ensure student exists
    const [[student]] = await connection.query("SELECT id, first_name, last_name FROM students WHERE id = ?", [student_id]);
    if (!student) {
      await connection.rollback();
      return res.status(400).json({ error: "Invalid student_id" });
    }

    // 4️⃣ Ensure module exists and get details
    const [[module]] = await connection.query(
      "SELECT id, title, code, course_id FROM modules WHERE id = ?", 
      [module_id]
    );
    if (!module) {
      await connection.rollback();
      return res.status(400).json({ error: "Invalid module_id" });
    }

    // 5️⃣ Check if student is enrolled in this specific module
    const [moduleEnrollment] = await connection.query(
      `SELECT sm.id, sm.status, sm.course_id
       FROM student_modules sm
       WHERE sm.student_id = ? AND sm.module_id = ?
       LIMIT 1`,
      [student_id, module_id]
    );

    if (moduleEnrollment.length === 0) {
      // Check if student is enrolled in the course at all
      const [courseEnrollment] = await connection.query(
        `SELECT e.id, e.status 
         FROM enrollments e
         WHERE e.student_id = ? AND e.course_id = ?
         LIMIT 1`,
        [student_id, module.course_id]
      );
      
      if (courseEnrollment.length === 0) {
        await connection.rollback();
        return res.status(400).json({ 
          error: `Student "${student.first_name} ${student.last_name}" is not enrolled in the course that contains module "${module.title}"`
        });
      } else {
        await connection.rollback();
        return res.status(400).json({ 
          error: `Student "${student.first_name} ${student.last_name}" is enrolled in the course but not registered for module "${module.title}". Please enroll the student in this module first.`
        });
      }
    }

    // 6️⃣ Verify the enrollment is active
    const enrollment = moduleEnrollment[0];
    if (enrollment.status === 'Completed' || enrollment.status === 'Failed') {
      await connection.rollback();
      return res.status(400).json({ 
        error: `Cannot enter marks for module "${module.title}" because it is already marked as "${enrollment.status}". Please contact administration if you need to update marks.`
      });
    }

    // 7️⃣ Calculate total and grade
    const total = Number(theory_marks) + Number(practical_marks);
    let grade =
      total >= 80 ? "Distinction" :
      total >= 65 ? "Credit" :
      total >= 50 ? "Pass" :
      "Fail";

    // 8️⃣ Insert or update marks
    const [result] = await connection.query(
      `INSERT INTO student_performance (student_id, module_id, theory_marks, practical_marks, grade)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         theory_marks = VALUES(theory_marks),
         practical_marks = VALUES(practical_marks),
         grade = VALUES(grade)`,
      [student_id, module_id, theory_marks, practical_marks, grade]
    );

    // 9️⃣ Update student_modules status based on marks
    let newStatus = 'Completed';
    if (total < 50) {
      newStatus = 'Failed';
    }
    
    await connection.query(
      `UPDATE student_modules 
       SET status = ?, completion_date = CURDATE()
       WHERE student_id = ? AND module_id = ?`,
      [newStatus, student_id, module_id]
    );

    // 🔟 Log activity
    await connection.query(
      `INSERT INTO activities (student_id, action, course, type, created_at)
       VALUES (?, ?, ?, 'result', NOW())`,
      [student_id, `Marks entered for "${module.title}" (Grade: ${grade})`, `Module: ${module.code}`]
    );

    // Commit transaction
    await connection.commit();

    res.status(201).json({
      message: "✅ Marks added or updated successfully",
      data: { 
        student_id, 
        module_id, 
        theory_marks, 
        practical_marks, 
        total,
        grade,
        module_title: module.title,
        new_status: newStatus
      },
      affectedRows: result.affectedRows,
    });
  } catch (err) {
    // Rollback transaction on error
    if (connection) {
      await connection.rollback();
    }
    
    console.error("❌ Error adding/updating marks:", err);
    
    // Handle specific database errors
    if (err.code === 'ER_SIGNAL_EXCEPTION') {
      return res.status(400).json({ 
        error: "Database validation error: " + err.sqlMessage 
      });
    }
    
    res.status(500).json({ 
      error: "Failed to add/update marks", 
      details: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

/**
 * ✅ GET students for marks entry with their enrolled courses
 */
export const getStudentsForMarks = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT DISTINCT 
        s.id, 
        s.first_name, 
        s.last_name, 
        s.photo,
        e.course_id, 
        c.name AS course_name,
        d.name AS department_name,
        COUNT(DISTINCT sm.module_id) as enrolled_modules_count,
        COUNT(DISTINCT sp.module_id) as completed_modules_count
      FROM students s
      JOIN enrollments e ON s.id = e.student_id
      JOIN courses c ON e.course_id = c.id
      JOIN departments d ON c.department_id = d.id
      LEFT JOIN student_modules sm ON s.id = sm.student_id AND sm.course_id = e.course_id
      LEFT JOIN student_performance sp ON s.id = sp.student_id
      WHERE e.status IN ('Enrolled', 'Ongoing')
      GROUP BY s.id, s.first_name, s.last_name, e.course_id, c.name, d.name
      HAVING enrolled_modules_count > 0
      ORDER BY s.first_name ASC, s.last_name ASC
    `);
    res.json(rows);
  } catch (err) {
    console.error("❌ Error fetching students:", err);
    res.status(500).json({ error: "Failed to fetch students", details: err.message });
  }
};

/**
 * ✅ GET enrolled modules for a specific student (for marks entry dropdown)
 */
export const getEnrolledModulesForStudent = async (req, res) => {
  try {
    const { student_id, course_id } = req.query;
    
    if (!student_id) {
      return res.status(400).json({ error: "student_id is required" });
    }
    
    let query = `
      SELECT 
        m.id, 
        m.title, 
        m.code, 
        l.name AS level_name,
        l.level_order,
        sm.status AS enrollment_status,
        sp.grade,
        sp.theory_marks,
        sp.practical_marks,
        sp.id as marks_id,
        CASE 
          WHEN sp.id IS NOT NULL THEN TRUE 
          ELSE FALSE 
        END as marks_entered,
        c.name AS course_name
      FROM student_modules sm
      JOIN modules m ON sm.module_id = m.id
      JOIN levels l ON m.level_id = l.id
      JOIN courses c ON m.course_id = c.id
      LEFT JOIN student_performance sp ON sp.student_id = sm.student_id AND sp.module_id = sm.module_id
      WHERE sm.student_id = ?
        AND sm.status IN ('Enrolled', 'Ongoing', 'Completed', 'Failed')
    `;
    
    const params = [student_id];
    
    if (course_id) {
      query += " AND m.course_id = ?";
      params.push(course_id);
    }
    
    query += " ORDER BY l.level_order, m.title ASC";
    
    const [rows] = await pool.query(query, params);
    
    res.json(rows);
  } catch (err) {
    console.error("❌ Error fetching enrolled modules:", err);
    res.status(500).json({ error: "Failed to fetch enrolled modules", details: err.message });
  }
};

/**
 * ✅ GET all modules (legacy function - maintains backward compatibility)
 */
export const getModulesForMarks = async (req, res) => {
  try {
    const { course_id, student_id } = req.query;
    
    // If student_id is provided, return only enrolled modules
    if (student_id) {
      const [studentModules] = await pool.query(
        `SELECT DISTINCT m.id, m.title, m.code, l.name AS level_name
         FROM student_modules sm
         JOIN modules m ON sm.module_id = m.id
         JOIN levels l ON m.level_id = l.id
         WHERE sm.student_id = ?
           AND sm.status IN ('Enrolled', 'Ongoing', 'Completed', 'Failed')
         ORDER BY m.title ASC`,
        [student_id]
      );
      return res.json(studentModules);
    }
    
    // Original logic for backward compatibility
    let query = `
      SELECT m.id, m.title, m.code, l.name AS level_name
      FROM modules m
      JOIN levels l ON m.level_id = l.id
    `;
    const params = [];
    const conditions = [];

    if (course_id) {
      conditions.push("m.course_id = ?");
      params.push(course_id);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY m.title ASC";

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error("❌ Error fetching modules:", err);
    res.status(500).json({ error: "Failed to fetch modules", details: err.message });
  }
};

// ✅ DELETE student performance with validation
export const deleteStudentPerformance = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { student_id, module_id } = req.params;

    // 1. Check if record exists
    const [[record]] = await connection.query(
      "SELECT * FROM student_performance WHERE student_id = ? AND module_id = ?",
      [student_id, module_id]
    );

    if (!record) {
      await connection.rollback();
      return res.status(404).json({ error: "Record not found" });
    }

    // 2. Get module details for logging
    const [[module]] = await connection.query(
      "SELECT title, code FROM modules WHERE id = ?",
      [module_id]
    );

    // 3. Get student details for logging
    const [[student]] = await connection.query(
      "SELECT first_name, last_name FROM students WHERE id = ?",
      [student_id]
    );

    // 4. Delete the record
    const [result] = await connection.query(
      "DELETE FROM student_performance WHERE student_id = ? AND module_id = ?",
      [student_id, module_id]
    );

    // 5. Reset student_modules status back to 'Enrolled'
    await connection.query(
      `UPDATE student_modules 
       SET status = 'Enrolled', completion_date = NULL
       WHERE student_id = ? AND module_id = ?`,
      [student_id, module_id]
    );

    // 6. Log activity
    await connection.query(
      `INSERT INTO activities (student_id, action, course, type, created_at)
       VALUES (?, ?, ?, 'result', NOW())`,
      [student_id, `Marks deleted for "${module?.title || 'module'}"`, `Module: ${module?.code || module_id}`]
    );

    // Commit transaction
    await connection.commit();

    res.json({ 
      message: "✅ Record deleted successfully",
      details: {
        student: `${student?.first_name} ${student?.last_name}`,
        module: module?.title,
        marks_deleted: true,
        status_reset: true
      }
    });
  } catch (err) {
    // Rollback transaction on error
    if (connection) {
      await connection.rollback();
    }
    
    console.error("❌ Error deleting record:", err);
    res.status(500).json({ error: "Failed to delete record", details: err.message });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

/**
 * ✅ GET student progress summary
 */
export const getStudentProgressSummary = async (req, res) => {
  try {
    const { student_id } = req.query;
    
    if (!student_id) {
      return res.status(400).json({ error: "student_id is required" });
    }
    
    const [summary] = await pool.query(`
      SELECT 
        c.name AS course_name,
        COUNT(DISTINCT sm.module_id) as total_enrolled_modules,
        COUNT(DISTINCT CASE WHEN sm.status = 'Completed' THEN sm.module_id END) as completed_modules,
        COUNT(DISTINCT CASE WHEN sm.status = 'Failed' THEN sm.module_id END) as failed_modules,
        COUNT(DISTINCT CASE WHEN sm.status IN ('Enrolled', 'Ongoing') THEN sm.module_id END) as pending_modules,
        ROUND(
          COUNT(DISTINCT CASE WHEN sm.status = 'Completed' THEN sm.module_id END) * 100.0 / 
          COUNT(DISTINCT sm.module_id), 
          2
        ) as completion_rate
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      LEFT JOIN student_modules sm ON e.student_id = sm.student_id AND e.course_id = sm.course_id
      WHERE e.student_id = ? AND e.status IN ('Enrolled', 'Ongoing')
      GROUP BY c.id, c.name
    `, [student_id]);
    
    res.json(summary);
  } catch (err) {
    console.error("❌ Error fetching student progress:", err);
    res.status(500).json({ error: "Failed to fetch student progress", details: err.message });
  }
};

/**
 * ✅ GET welcome message with logging
 */
export const getWelcome = async (req, res) => {
  try {
    // Log request metadata
    console.log(`Request received: ${req.method} ${req.path}`);

    res.json({ 
      message: "Welcome to the Vocational Training System API",
      version: "2.0.0",
      features: [
        "Student performance management",
        "Enhanced validation with database triggers",
        "Transaction-based operations",
        "Backward compatible endpoints"
      ]
    });
  } catch (err) {
    console.error("❌ Error handling welcome request:", err);
    res.status(500).json({ error: "Failed to process request", details: err.message });
  }
};