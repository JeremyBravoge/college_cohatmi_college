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

    // --- ENHANCED: Performance Analytics ---
    const [[performanceStats]] = await pool.query(`
      SELECT 
        COUNT(DISTINCT sp.student_id) as students_assessed,
        COALESCE(ROUND(AVG((sp.theory_marks + sp.practical_marks)), 2), 0) as avg_performance_score,
        COALESCE(ROUND((AVG((sp.theory_marks + sp.practical_marks)) / 100) * 100, 2), 0) as avg_performance_percentage,
        COUNT(CASE WHEN (sp.theory_marks + sp.practical_marks) >= 80 THEN 1 END) as distinctions,
        COUNT(CASE WHEN (sp.theory_marks + sp.practical_marks) >= 70 AND (sp.theory_marks + sp.practical_marks) < 80 THEN 1 END) as credits,
        COUNT(CASE WHEN (sp.theory_marks + sp.practical_marks) >= 50 AND (sp.theory_marks + sp.practical_marks) < 70 THEN 1 END) as passes,
        COUNT(CASE WHEN (sp.theory_marks + sp.practical_marks) < 50 THEN 1 END) as fails,
        COUNT(*) as total_assessments
      FROM student_performance sp
    `);

    // --- Average Performance (Keep original for compatibility) ---
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
      SELECT c.name AS course, COALESCE(AVG((sp.theory_marks + sp.practical_marks)), 0) AS avg_grade, 12 AS growth
      FROM courses c
      LEFT JOIN enrollments e ON c.id = e.course_id
      LEFT JOIN student_performance sp ON e.student_id = sp.student_id
      GROUP BY c.id
      ORDER BY avg_grade DESC
      LIMIT 1
    `);

    // --- Pending Payments ---
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

    // --- ✅ Gender Distribution ---
    const [genderStats] = await pool.query(`
      SELECT 
        gender,
        COUNT(*) AS count
      FROM students
      GROUP BY gender
    `);

    // Format gender data into a clear object
    const genderData = {
      male: genderStats.find(g => g.gender?.toLowerCase() === "male")?.count || 0,
      female: genderStats.find(g => g.gender?.toLowerCase() === "female")?.count || 0,
      others: genderStats.find(g => !["male", "female"].includes(g.gender?.toLowerCase()))?.count || 0,
    };

    // ✅ Final response - MAINTAINING EXACT STRUCTURE with enhancements
    res.json({
      students: students.total,
      courses: courses.total,
      users: users.total,
      intakes: intakes.total,
      instructors: instructors.total,
      enrollments: enrollments.total,

      revenueThisMonth: fees.total_paid,
      averagePerformance: avgPerf.average_performance, // Keep original
      departments,
      topCourse:
        topCourse.length > 0
          ? { 
              name: topCourse[0].course, 
              avgScore: Math.round(topCourse[0].avg_grade),
              percentage: Math.round((topCourse[0].avg_grade / 100) * 100),
              growth: topCourse[0].growth 
            }
          : { name: "N/A", avgScore: 0, percentage: 0, growth: 0 },
      pendingPayments,
      enrollmentRate: Number(enrollmentRate.completion_rate) || 0,

      finance: {
        total_fees: fees.total_fees,
        total_paid: fees.total_paid,
        total_pending: fees.total_pending,
      },

      // ✅ Include gender stats in the same response
      genderStats: genderData,

      // ✅ ENHANCED: Add performance analytics without breaking structure
      performance: {
        averageScore: performanceStats.avg_performance_score,
        averagePercentage: performanceStats.avg_performance_percentage,
        studentsAssessed: performanceStats.students_assessed,
        gradeDistribution: {
          distinctions: performanceStats.distinctions,
          credits: performanceStats.credits,
          passes: performanceStats.passes,
          fails: performanceStats.fails
        },
        totalAssessments: performanceStats.total_assessments
      }
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({ error: err.message });
  }
};

// Keep your existing getRecentActivity function
export const getRecentActivity = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        a.id,
        CONCAT(COALESCE(s.first_name, ''), ' ', COALESCE(s.last_name, '')) AS student,
        a.action,
        a.course,
        a.created_at AS time,
        a.type
      FROM activities a
      JOIN students s ON a.student_id = s.id
      WHERE a.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      ORDER BY a.created_at DESC
      LIMIT 5
    `);

    res.json(rows);
  } catch (err) {
    console.error("RecentActivity API error:", err);
    res.status(500).json({ error: err.message });
  }
};