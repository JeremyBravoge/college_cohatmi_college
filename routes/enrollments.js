import express from "express";
import pool from "../config/db.js";

// Helper: check whether a student has any incomplete modules for a given course
async function hasIncompleteModules(conn, studentId, courseId) {
  const [rows] = await conn.query(
    `SELECT 1
     FROM student_modules sm
     WHERE sm.student_id = ?
       AND sm.course_id = ?
       AND sm.status != 'Completed'
     LIMIT 1`,
    [studentId, courseId]
  );
  return rows.length > 0;
}

// Helper: mark modules completed when there's a matching performance record
async function syncModuleCompletionFromPerformance(conn, studentId, courseId) {
  await conn.query(
    `UPDATE student_modules sm
     JOIN student_performance sp
       ON sm.student_id = sp.student_id AND sm.module_id = sp.module_id
     SET sm.status = 'Completed'
     WHERE sm.status != 'Completed'
       AND sm.student_id = ?
       AND sm.course_id = ?
       AND sp.grade IS NOT NULL`,
    [studentId, courseId]
  );
}

// Helper: ensure student may enroll in a course (no active incomplete modules or enrollments)
async function ensureCanEnroll(conn, studentId, courseId) {
  // First sync module completion from performance table (if any)
  await syncModuleCompletionFromPerformance(conn, studentId, courseId);

  // Check for incomplete modules in the same course
  const incompleteSameCourse = await hasIncompleteModules(conn, studentId, courseId);
  if (incompleteSameCourse) {
    throw new Error('Student must complete current course before enrolling in another');
  }

  // Also check enrollments: do we have existing non-completed enrollment for the same course?
  const [enr] = await conn.query(
    `SELECT id, status FROM enrollments WHERE student_id = ? AND course_id = ? LIMIT 1`,
    [studentId, courseId]
  );
  if (enr.length > 0 && enr[0].status !== 'Completed') {
    // There is an active enrollment for the same course — business decision: update instead of insert
    return { existingEnrollmentId: enr[0].id };
  }

  return { existingEnrollmentId: null };
}

const router = express.Router();

// POST /api/enrollments/create
router.post("/create", async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { student_id, course_id, level_id, module_ids, intake_id, branch_id } = req.body;

    // Validate required fields
    if (!student_id || !course_id || !level_id || !intake_id || !branch_id) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Ensure student can enroll (checks for incomplete modules)
    const allowed = await ensureCanEnroll(conn, student_id, course_id);

    let enrollmentId;
    if (allowed.existingEnrollmentId) {
      // Update existing enrollment
      await conn.query(
        `UPDATE enrollments SET intake_id = ?, branch_id = ?, enrollment_date = CURDATE(), status = 'Enrolled' WHERE id = ?`,
        [intake_id, branch_id, allowed.existingEnrollmentId]
      );
      enrollmentId = allowed.existingEnrollmentId;
    } else {
      // Insert new enrollment
      const [result] = await conn.query(
        `INSERT INTO enrollments (student_id, course_id, intake_id, branch_id, enrollment_date, status)
         VALUES (?, ?, ?, ?, CURDATE(), 'Enrolled')`,
        [student_id, course_id, intake_id, branch_id]
      );
      enrollmentId = result.insertId;
    }

    // Insert module enrollments if modules are selected
    if (module_ids && module_ids.length > 0) {
      const moduleValues = module_ids.map(module_id => [student_id, course_id, level_id, module_id, new Date().toISOString().split('T')[0], 'Enrolled']);
      await conn.query(
        `INSERT INTO student_modules (student_id, course_id, level_id, module_id, enrollment_date, status) VALUES ?`,
        [moduleValues]
      );
    }

    await conn.commit();
    res.status(201).json({ message: "Enrollment created successfully", enrollmentId });
  } catch (error) {
    await conn.rollback();
    console.error("Error creating enrollment:", error);
    res.status(500).json({ error: error.message || "Failed to create enrollment" });
  } finally {
    conn.release();
  }
});

export default router;
