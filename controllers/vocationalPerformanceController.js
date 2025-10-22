import pool from "../config/db.js"; // adjust path if needed

// ======================
// Controller Functions
// ======================

// @desc Get full student performance by admission number + level
export const getVocationalPerformance = async (req, res) => {
  const { admissionNo, level } = req.query;

  if (!admissionNo) {
    return res.status(400).json({ message: "Admission number is required" });
  }

  try {
    // 1️⃣ Get level id for the selected level
    const [levelRows] = await pool.query(`SELECT id FROM levels WHERE name = ?`, [level]);
    if (levelRows.length === 0) {
      return res.status(400).json({ message: "Invalid level selected" });
    }
    const levelId = levelRows[0].id;

    // 2️⃣ Get student basic info
    const [studentRows] = await pool.query(
      `SELECT s.first_name, s.last_name, s.id AS student_id,
              s.course_id, c.name AS tradeArea,
              b.name AS trainingCenter, l.name AS level_name,
              s.admission_date, s.status
       FROM students s
       LEFT JOIN courses c ON s.course_id = c.id
       LEFT JOIN branches b ON s.branch_id = b.id
       LEFT JOIN levels l ON s.level_id = l.id
       WHERE s.id = ? OR s.id_number = ? OR s.email = ? OR s.id = ? OR s.id LIKE ?`,
      [admissionNo, admissionNo, admissionNo, admissionNo, `%${admissionNo}%`]
    );

    if (studentRows.length === 0) {
      return res.status(404).json({ message: "Student not found" });
    }

    const student = studentRows[0];

    // 3️⃣ Get performance (theory, practical, marks) filtered by level
    const [performanceRows] = await pool.query(
      `SELECT
          COUNT(*) AS totalModules,
          ROUND(AVG(sp.theory_marks), 0) AS avgTheory,
          ROUND(AVG(sp.practical_marks), 0) AS avgPractical,
          ROUND(AVG((sp.theory_marks + sp.practical_marks) / 2), 0) AS averageMark
       FROM student_performance sp
       INNER JOIN modules m ON sp.module_id = m.id
       WHERE sp.student_id = ? AND m.level_id = ?`,
      [student.student_id, levelId]
    );

    const performance = performanceRows[0];
    const averageMark = performance.averageMark || 0;
    const examStatus = averageMark >= 50 ? "Pass" : "Fail";

    // 4️⃣ Attendance summary (keeping as is, since attendance is per student, not per level)
    const [attendanceRows] = await pool.query(
      `SELECT COUNT(*) AS totalClasses,
              SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) AS attended
       FROM attendance
       WHERE student_id = ?`,
      [student.student_id]
    );

    const attendance = attendanceRows[0] || { attended: 0, totalClasses: 0 };

    // 5️⃣ Get modules and marks filtered by level
    const [modules] = await pool.query(
      `SELECT m.code, m.title, sp.theory_marks AS theory, sp.practical_marks AS practical,
              sp.grade
       FROM student_performance sp
       INNER JOIN modules m ON sp.module_id = m.id
       WHERE sp.student_id = ? AND m.level_id = ?`,
      [student.student_id, levelId]
    );

    // 5️⃣ Response
    res.json({
      studentInfo: {
        name: `${student.first_name} ${student.last_name}`,
        admissionNo: admissionNo,
        tradeArea: student.tradeArea,
        trainingCenter: student.trainingCenter,
        level: student.level_name,
        duration: "6 Months",
      },
      performance: {
        totalModules: performance.totalModules,
        completedModules: performance.totalModules, // Since we don't have status, assume all are completed
        averageMark,
        theoryMarks: performance.avgTheory,
        practicalMarks: performance.avgPractical,
        examStatus,
        attendance: attendance.attended,
        totalClasses: attendance.totalClasses,
      },
      modules,
    });

  } catch (err) {
    console.error("Error fetching performance:", err);
    res.status(500).json({ message: "Server error" });
  }
};
