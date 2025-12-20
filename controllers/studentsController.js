import pool from "../config/db.js";
import { upload } from "../middlewares/multer.js";

// Helper: generate next student ID STU###
async function generateStudentId(conn) {
  const [rows] = await conn.query(
    "SELECT MAX(CAST(SUBSTRING(id, 4) AS UNSIGNED)) AS maxId FROM students"
  );
  const nextNumber = (rows[0].maxId || 0) + 1;
  return `STU${String(nextNumber).padStart(3, "0")}`;
}

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

  // If there are incomplete modules for ANY course (depending on business rules)
  // we check modules for the SAME course first (most common); adapt if you need cross-course checks
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

// Create activity log helper
async function createActivity(conn, studentId, action, courseId) {
  await conn.query(
    `INSERT INTO activities (student_id, action, course, type, created_at)
     VALUES (?, ?, (SELECT name FROM courses WHERE id = ?), ?, NOW())`,
    [studentId, action, courseId, 'enrollment']
  );
}

// ------------------------- Controller functions -------------------------

// GET student by ID
export const getStudentById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT s.id, s.first_name, s.last_name, s.email, s.phone, s.age, s.gender,
              s.department_id, s.admission_date, s.status, s.branch_id,
              s.guardian_name, s.guardian_contact, s.photo,
              b.name AS branch_name
       FROM students s
       LEFT JOIN branches b ON s.branch_id = b.id
       WHERE s.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Student not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("Error fetching student:", err);
    res.status(500).json({ error: "Failed to fetch student" });
  }
};

// GET all students with aggregate info
export const getAllStudents = async (req, res) => {
  try {
    const [students] = await pool.query(
      `SELECT
        s.id AS student_id,
        COALESCE(CONCAT_WS(' ', s.first_name, s.last_name), 'No Name') AS name,
        s.email, s.photo AS image_url,
        COALESCE(s.phone, 'N/A') AS phone,
        COALESCE(s.gender, 'N/A') AS gender,
        MAX(COALESCE(d.name, 'No Department')) AS department,
        COALESCE(GROUP_CONCAT(DISTINCT c.name SEPARATOR ', '), 'No Course') AS course,
        DATE_FORMAT(s.admission_date, '%Y-%m-%d') AS admission_date,
        COALESCE(s.status, 'Inactive') AS status,
        IFNULL(ROUND(SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) / NULLIF(COUNT(a.id),0) * 100, 2), 0) AS attendance,
        IFNULL(SUM(f.amount_paid), 0) AS totalPaid,
        IFNULL(SUM(f.total_amount), 0) AS totalFees,
        IFNULL(SUM(f.total_amount) - SUM(f.amount_paid), 0) AS feesPending,
        IFNULL(ROUND(AVG((sp.theory_marks + sp.practical_marks) / 2), 2), 0) AS performanceScore
      FROM students s
      LEFT JOIN enrollments en ON s.id = en.student_id
      LEFT JOIN courses c ON en.course_id = c.id
      LEFT JOIN departments d ON c.department_id = d.id
      LEFT JOIN attendance a ON s.id = a.student_id
      LEFT JOIN fees f ON s.id = f.student_id
      LEFT JOIN student_performance sp ON s.id = sp.student_id
      GROUP BY s.id
      ORDER BY s.first_name ASC`
    );

    const mappedStudents = students.map((student) => {
      let performance = "Average";
      if (student.performanceScore >= 80) performance = "Excellent";
      else if (student.performanceScore >= 70) performance = "Good";
      else if (student.performanceScore >= 60) performance = "Average";
      else performance = "Poor";

      return { ...student, performance };
    });

    res.json(mappedStudents);
  } catch (error) {
    console.error("Error fetching students:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// POST /api/students/register
export const registerStudent = async (req, res) => {
  // file handling (if using multer) - the middleware should run before this handler
  try {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const {
        firstName,
        lastName,
        email,
        phone,
        age,
        gender,
        department_id,
        admission_date,
        status,
        branch_id,
        guardian_name,
        guardian_contact,
        guardianEmail,
        guardianRelationship,
        guardianAddress,
        idNumber,
        dateOfBirth,
        nationality,
        county,
        address,
        courseId,
        intakeId,
        totalFees = 0,
        amountPaid = 0,
      } = req.body;

      const photoPath = req.file ? req.file.path.replace(/\\/g, "/") : null;

      // Generate unique student ID
      const studentId = await generateStudentId(conn);

      // Insert student
      await conn.query(
        `INSERT INTO students
          (id, first_name, last_name, email, phone, age, gender, department_id, admission_date, status, branch_id, guardian_name, guardian_contact, photo, id_number, date_of_birth, nationality, county, address, guardian_email, guardian_relationship, guardian_address)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          studentId,
          firstName || null,
          lastName || null,
          email || null,
          phone || null,
          age || null,
          gender || null,
          department_id || null,
          admission_date || new Date(),
          status || "Active",
          branch_id || null,
          guardian_name || null,
          guardian_contact || null,
          photoPath,
          idNumber || null,
          dateOfBirth || null,
          nationality || null,
          county || null,
          address || null,
          guardianEmail || null,
          guardianRelationship || null,
          guardianAddress || null,
        ]
      );

      // Enroll in course if courseId & intakeId provided
      if (courseId && intakeId) {
        const courseIdInt = parseInt(courseId);
        const intakeIdInt = parseInt(intakeId);
        if (!isNaN(courseIdInt) && !isNaN(intakeIdInt)) {
          // Ensure student is allowed to enroll (checks modules & existing enrollments)
          const allowed = await ensureCanEnroll(conn, studentId, courseIdInt);

          if (allowed.existingEnrollmentId) {
            // there is an existing enrollment row -> update it
            await conn.query(
              `UPDATE enrollments SET intake_id = ?, enrollment_date = CURDATE(), status = 'Enrolled', branch_id = ? WHERE id = ?`,
              [intakeIdInt, branch_id || null, allowed.existingEnrollmentId]
            );
          } else {
            await conn.query(
              `INSERT INTO enrollments (student_id, course_id, intake_id, enrollment_date, status, branch_id)
               VALUES (?, ?, ?, CURDATE(), 'Enrolled', ?)`,
              [studentId, courseIdInt, intakeIdInt, branch_id || null]
            );
          }

          await createActivity(conn, studentId, 'Enrolled in', courseIdInt);

          // Update student department
          await conn.query(
            `UPDATE students s
             JOIN courses c ON c.id = ?
             SET s.department_id = c.department_id
             WHERE s.id = ?`,
            [courseIdInt, studentId]
          );
        }
      }

      // Insert initial fees
      if (totalFees > 0) {
        await conn.query(
          `INSERT INTO fees (student_id, total_amount, amount_paid, payment_date)
           VALUES (?, ?, ?, CURDATE())`,
          [studentId, totalFees, amountPaid]
        );
      }

      await conn.commit();

      res.status(201).json({
        message: "Student registered successfully",
        student: {
          student_id: studentId,
          name: `${firstName || ""} ${lastName || ""}`.trim() || "No Name",
          email,
          phone,
          gender,
          department: department_id || "No Department",
          course: courseId || "No Course",
          admission_date: admission_date || new Date(),
          status: status || "Active",
          totalPaid: amountPaid,
          totalFees,
          feesPending: totalFees - amountPaid,
          performanceScore: 0,
          performance: "Poor",
          photo: photoPath,
        },
      });
    } catch (err) {
      await conn.rollback();
      console.error("❌ DB Insert Error (transaction):", err);
      res.status(500).json({ error: err.message });
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error("Connection Error:", err);
    res.status(500).json({ error: "Failed to register student" });
  }
};

// DELETE student by ID
export const deleteStudent = async (req, res) => {
  const { id } = req.params;

  try {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      await conn.query("DELETE FROM enrollments WHERE student_id = ?", [id]);
      await conn.query("DELETE FROM fees WHERE student_id = ?", [id]);
      await conn.query("DELETE FROM activities WHERE student_id = ?", [id]);

      const [result] = await conn.query("DELETE FROM students WHERE id = ?", [id]);

      await conn.commit();

      if (result.affectedRows === 0)
        return res.status(404).json({ message: "Student not found" });

      res.status(200).json({ message: "Student deleted successfully" });
    } catch (err) {
      await conn.rollback();
      console.error("Delete Error:", err);
      res.status(500).json({ message: "Failed to delete student" });
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error("Connection Error:", err);
    res.status(500).json({ message: "Failed to delete student" });
  }
};

// UPDATE student
export const updateStudent = async (req, res) => {
  const { id } = req.params;
  const fields = [];
  const values = [];

  const updatableFields = [
    "firstName",
    "lastName",
    "email",
    "phone",
    "age",
    "gender",
    "status",
    "department_id",
    "id_number",
    "date_of_birth",
    "address",
    "county",
    "nationality",
    "guardian_name",
    "guardian_contact",
    "branch_id",
    "admission_date",
  ];

  updatableFields.forEach((f) => {
    if (req.body[f] !== undefined) {
      fields.push(`${f.replace(/([A-Z])/g, "_$1").toLowerCase()} = ?`);
      values.push(req.body[f] === "" ? null : req.body[f]);
    }
  });

  try {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      if (fields.length > 0) {
        const sql = `UPDATE students SET ${fields.join(", ")} WHERE id = ?`;
        values.push(id);
        const [result] = await conn.query(sql, values);
        if (result.affectedRows === 0) {
          await conn.rollback();
          return res.status(404).json({ message: "Student not found" });
        }
      }

      // Update enrollment if programChoice & intakeYear
      if (req.body.programChoice && req.body.intakeYear) {
        const courseId = parseInt(req.body.programChoice);
        const intakeId = parseInt(req.body.intakeYear);

        if (!isNaN(courseId) && !isNaN(intakeId)) {
          const [enrollment] = await conn.query(
            `SELECT id FROM enrollments WHERE student_id = ? LIMIT 1`,
            [id]
          );

          if (enrollment.length > 0) {
            await conn.query(
              `UPDATE enrollments SET course_id = ?, intake_id = ?, status = 'Enrolled' WHERE student_id = ?`,
              [courseId, intakeId, id]
            );
          } else {
            await conn.query(
              `INSERT INTO enrollments (student_id, course_id, intake_id, enrollment_date, status)
               VALUES (?, ?, ?, CURDATE(), 'Enrolled')`,
              [id, courseId, intakeId]
            );
          }

          // Update student department
          await conn.query(
            `UPDATE students s JOIN courses c ON c.id = ? SET s.department_id = c.department_id WHERE s.id = ?`,
            [courseId, id]
          );
        }
      }

      await conn.commit();
      res.status(200).json({ message: "Student updated successfully" });
    } catch (err) {
      await conn.rollback();
      console.error("Update Error:", err);
      res.status(500).json({ message: "Failed to update student" });
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error("Connection Error:", err);
    res.status(500).json({ message: "Failed to update student" });
  }
};

// End of file
