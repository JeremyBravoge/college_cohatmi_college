// controllers/dashboardController.js
import pool from "../config/db.js";

export const getDashboardStats = async (req, res) => {
  try {
    // --- Basic Counts ---
    const [[students]] = await pool.query("SELECT COUNT(*) AS total FROM students");
    const [[courses]] = await pool.query("SELECT COUNT(*) AS total FROM courses");
    const [[users]] = await pool.query("SELECT COUNT(*) AS total FROM users");
    const [[intakes]] = await pool.query("SELECT COUNT(*) AS total FROM intakes");
    const [[instructors]] = await pool.query("SELECT COUNT(*) AS total FROM instructors");
    const [[enrollments]] = await pool.query("SELECT COUNT(*) AS total FROM enrollments");

    // --- Finance ---
    const [[fees]] = await pool.query(`
      SELECT 
        COALESCE(SUM(total_amount), 0) AS total_fees,
        COALESCE(SUM(amount_paid), 0) AS total_paid,
        COALESCE(SUM(amount_pending), 0) AS total_pending
      FROM fees
    `);

    // --- Average Performance (optional table "results") ---
    const [[avgPerf]] = await pool.query(`
      SELECT COALESCE(AVG(grade), 0) AS average_performance 
      FROM results
    `);

    // --- Departments with student count ---
    const [departments] = await pool.query(`
      SELECT d.name AS department, COUNT(s.id) AS total_students
      FROM departments d
      LEFT JOIN students s ON d.id = s.department_id
      GROUP BY d.name
    `);

    // --- Top Course by average grade ---
    const [topCourse] = await pool.query(`
      SELECT c.name AS course, AVG(r.grade) AS avg_grade, 12 AS growth
      FROM courses c
      JOIN results r ON c.id = r.course_id
      GROUP BY c.id
      ORDER BY avg_grade DESC
      LIMIT 1
    `);

   const [pendingPayments] = await pool.query(`
  SELECT 
    CONCAT(s.first_name, ' ', s.last_name) AS student_name,
    f.total_amount,
    f.amount_paid,
    f.amount_pending
  FROM fees f
  JOIN students s ON f.student_id = s.id
  WHERE f.amount_pending > 0
`);

    // --- Enrollment Rate ---
    const [[enrollmentRate]] = await pool.query(`
      SELECT
        COALESCE((SUM(CASE WHEN status = 'Enrolled' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0)) * 100, 0)
        AS completion_rate
      FROM enrollments
    `);

    // ✅ Final response
    res.json({
      students: students.total,
      courses: courses.total,
      users: users.total,
      intakes: intakes.total,
      instructors: instructors.total,
      enrollments: enrollments.total,

      revenueThisMonth: fees.total_paid, // (can refine later by filtering date)
      averagePerformance: avgPerf.average_performance,
      departments,
      topCourse: topCourse.length > 0 ? { name: topCourse[0].course, avgScore: Math.round(topCourse[0].avg_grade), growth: topCourse[0].growth } : { name: "N/A", avgScore: 0, growth: 0 },
      pendingPayments,
      enrollmentRate: Number(enrollmentRate.completion_rate) || 0,

      finance: {
        total_fees: fees.total_fees,
        total_paid: fees.total_paid,
        total_pending: fees.total_pending,
      },
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({ error: err.message });
  }
};
