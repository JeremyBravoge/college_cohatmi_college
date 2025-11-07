import pool from "../config/db.js";

// ✅ GET all students
export const getAllStudents = async (req, res) => {
  try {
    const [students] = await pool.query(
      `SELECT
        s.id AS student_id,
        COALESCE(CONCAT_WS(' ', s.first_name, s.last_name), 'No Name') AS name,
        s.email,
        COALESCE(s.phone, 'N/A') AS phone,
        COALESCE(s.gender, 'N/A') AS gender,
        COALESCE(ANY_VALUE(d.name), 'No Department') AS department,   -- ✅ fix here
        COALESCE(GROUP_CONCAT(DISTINCT c.name SEPARATOR ', '), 'No Course') AS course,
        DATE_FORMAT(s.admission_date, '%Y-%m-%d') AS admission_date,
        COALESCE(s.status, 'Inactive') AS status,
        IFNULL(ROUND(SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) / COUNT(a.id) * 100, 2), 0) AS attendance,
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



// ✅ POST /api/students/register
export const registerStudent = async (req, res) => {
  try {
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
      programChoice,   // course_id or slug
      intakeYear,      // intake_id
      totalFees = 0,   // total course fees
      amountPaid = 0   // initial payment
    } = req.body;

    // Generate unique student ID
    const [rows] = await pool.query(
      "SELECT MAX(CAST(SUBSTRING(id, 4) AS UNSIGNED)) AS maxId FROM students"
    );
    const nextNumber = (rows[0].maxId || 0) + 1;
    const studentId = `STU${String(nextNumber).padStart(3, "0")}`;

    // Insert student
    await pool.query(
      `INSERT INTO students 
       (id, first_name, last_name, email, phone, age, gender, department_id, admission_date, status, branch_id, guardian_name, guardian_contact)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        studentId,
        firstName || null,
        lastName || null,
        email,
        phone || null,
        age || null,
        gender || null,
        department_id || null,
        admission_date || new Date(),
        status || "Active",
        branch_id || null,
        guardian_name || null,
        guardian_contact || null,
      ]
    );

    // Insert enrollment if course selected
    if (programChoice && intakeYear) {
      const courseMap = {
        "computer-science": 1,
        "business-admin": 2,
        "engineering": 3,
        "medicine": 4,
        "law": 5,
      };
      const courseId = courseMap[programChoice] || parseInt(programChoice);
      if (courseId) {
        await pool.query(
          `INSERT INTO enrollments (student_id, course_id, intake_id, enrollment_date, status)
           VALUES (?, ?, ?, CURDATE(), 'Enrolled')`,
          [studentId, courseId, intakeYear]
        );

        // Log enrollment activity
        await pool.query(
          `INSERT INTO activities (student_id, action, course, type, created_at)
           VALUES (?, 'Enrolled in', (SELECT name FROM courses WHERE id = ?), 'enrollment', NOW())`,
          [studentId, courseId]
        );
      }
    }

    // Insert initial fee record
    if (totalFees > 0) {
      await pool.query(
        `INSERT INTO fees (student_id, total_amount, amount_paid, payment_date)
         VALUES (?, ?, ?, CURDATE())`,
        [studentId, totalFees, amountPaid]
      );
    }

    res.status(201).json({
      message: "Student registered successfully",
      student: {
        student_id: studentId,
        name: `${firstName || ""} ${lastName || ""}`.trim() || "No Name",
        email,
        phone,
        gender,
        department: department_id || "No Department",
        course: programChoice || "No Course",
        admission_date: admission_date || new Date(),
        status: status || "Active",
        totalPaid: amountPaid,
        totalFees,
        feesPending: totalFees - amountPaid,
        performanceScore: 0,
        performance: "Poor",
      }
    });

  } catch (error) {
    console.error("❌ DB Insert Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Delete student by student_id
export const deleteStudent = async (req, res) => {
  const { id } = req.params; // student ID

  try {
    // Delete dependent rows first
    await pool.query("DELETE FROM enrollments WHERE student_id = ?", [id]);
    await pool.query("DELETE FROM fees WHERE student_id = ?", [id]);
    await pool.query("DELETE FROM activities WHERE student_id = ?", [id]);

    // Delete the student
    const [result] = await pool.query("DELETE FROM students WHERE id = ?", [id]);

    if (result.affectedRows === 0) 
      return res.status(404).json({ message: "Student not found" });

    res.status(200).json({ message: "Student deleted successfully" });
  } catch (err) {
    console.error("Delete Error:", err);
    res.status(500).json({ message: "Failed to delete student" });
  }
};


export const updateStudent = async (req, res) => {
  const { id } = req.params;
  const {
    firstName,
    lastName,
    email,
    phone,
    age,
    gender,
    status,
    department_id,
    id_number,
    date_of_birth,
    address,
    county,
    nationality,
    guardian_name,
    guardian_contact,
    branch_id,
    admission_date,
    programChoice,
    intakeYear
  } = req.body;

  try {
    const fields = [];
    const values = [];

    if (firstName !== undefined) { fields.push("first_name = ?"); values.push(firstName); }
    if (lastName !== undefined) { fields.push("last_name = ?"); values.push(lastName); }
    if (email !== undefined) { fields.push("email = ?"); values.push(email); }
    if (phone !== undefined) { fields.push("phone = ?"); values.push(phone); }
    if (age !== undefined) { fields.push("age = ?"); values.push(age); }
    if (gender !== undefined) { fields.push("gender = ?"); values.push(gender); }
    if (status !== undefined) { fields.push("status = ?"); values.push(status); }
    if (department_id !== undefined) { fields.push("department_id = ?"); values.push(department_id === '' ? null : department_id); }
    if (id_number !== undefined) { fields.push("id_number = ?"); values.push(id_number); }
    if (date_of_birth !== undefined) { fields.push("date_of_birth = ?"); values.push(date_of_birth); }
    if (address !== undefined) { fields.push("address = ?"); values.push(address); }
    if (county !== undefined) { fields.push("county = ?"); values.push(county); }
    if (nationality !== undefined) { fields.push("nationality = ?"); values.push(nationality); }
    if (guardian_name !== undefined) { fields.push("guardian_name = ?"); values.push(guardian_name); }
    if (guardian_contact !== undefined) { fields.push("guardian_contact = ?"); values.push(guardian_contact); }
    if (branch_id !== undefined) {
      // ✅ Validate branch_id exists
      const [branchCheck] = await pool.query("SELECT id FROM branches WHERE id = ?", [branch_id]);
      if (branchCheck.length === 0) {
        return res.status(400).json({ message: `Branch ID ${branch_id} does not exist` });
      }
      fields.push("branch_id = ?");
      values.push(branch_id);
    }
    if (admission_date !== undefined) { fields.push("admission_date = ?"); values.push(admission_date); }

    if (fields.length === 0 && !programChoice) {
      return res.status(400).json({ message: "No fields to update" });
    }

    if (fields.length > 0) {
      const sql = `UPDATE students SET ${fields.join(", ")} WHERE id = ?`;
      values.push(id);

      const [result] = await pool.query(sql, values);
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Student not found" });
      }
    }

    if (programChoice && intakeYear) {
      const courseMap = {
        "computer-science": 1,
        "business-admin": 2,
        "engineering": 3,
        "medicine": 4,
        "law": 5,
        "computer-packages": 1,
        "graphics-designs": 2,
        "web-design": 3,
        "photography": 5
      };

      const courseId = courseMap[programChoice] || parseInt(programChoice);

      if (!courseId || isNaN(courseId)) {
        console.error("Invalid programChoice:", programChoice);
        return res.status(400).json({ message: "Invalid programChoice" });
      }

      if (!intakeYear || isNaN(parseInt(intakeYear))) {
        console.error("Invalid intakeYear:", intakeYear);
        return res.status(400).json({ message: "Invalid intakeYear" });
      }

      const [enrollment] = await pool.query(
        `SELECT id FROM enrollments WHERE student_id = ? LIMIT 1`,
        [id]
      );

      if (enrollment.length > 0) {
        await pool.query(
          `UPDATE enrollments
           SET course_id = ?, intake_id = ?, status = 'Enrolled'
           WHERE student_id = ?`,
          [courseId, intakeYear, id]
        );
      } else {
        await pool.query(
          `INSERT INTO enrollments (student_id, course_id, intake_id, enrollment_date, status)
           VALUES (?, ?, ?, CURDATE(), 'Enrolled')`,
          [id, courseId, intakeYear]
        );
      }

      await pool.query(
        `UPDATE students s
         JOIN courses c ON c.id = ?
         SET s.department_id = c.department_id
         WHERE s.id = ?`,
        [courseId, id]
      );
    }

    res.status(200).json({ message: "Student updated successfully" });
  } catch (err) {
    console.error("Update Error:", err);
    res.status(500).json({ message: "Failed to update student" });
  }
};
