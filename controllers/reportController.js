import pool from "../config/db.js";

/**
 * ✅ GET Comprehensive Dashboard Statistics (All KPIs)
 */
export const getDashboardStatistics = async (req, res) => {
  try {
    // Execute all queries in parallel for better performance
    const [
      [totalStudents],
      [totalRevenue],
      [totalCourses],
      [departmentStats],
      [coursePerformance],
      [studentDistribution],
      [completionRate],
      [monthlyData],
      [financeSummary],
      [activeEnrollments],
      [topPerformingCourses],
      [recentActivities]
    ] = await Promise.all([
      // 1. Total Students
      pool.query(`
        SELECT 
          COUNT(*) as total_students,
          COUNT(CASE WHEN gender = 'Male' THEN 1 END) as male_students,
          COUNT(CASE WHEN gender = 'Female' THEN 1 END) as female_students,
          COUNT(CASE WHEN status = 'Active' THEN 1 END) as active_students,
          COUNT(CASE WHEN status = 'Inactive' THEN 1 END) as inactive_students
        FROM students
      `),

      // 2. Total Revenue
      pool.query(`
        SELECT 
          COALESCE(SUM(total_amount), 0) as total_revenue,
          COALESCE(SUM(amount_paid), 0) as total_paid,
          COALESCE(SUM(amount_pending), 0) as total_pending,
          COALESCE(SUM(overpaid), 0) as total_overpaid
        FROM fees
      `),

      // 3. Total Courses
      pool.query(`
        SELECT 
          COUNT(*) as total_courses,
          COUNT(CASE WHEN status = 'Active' THEN 1 END) as active_courses,
          COUNT(CASE WHEN status = 'Upcoming' THEN 1 END) as upcoming_courses,
          COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completed_courses,
          SUM(enrolled) as total_enrollments,
          SUM(capacity) as total_capacity,
          ROUND(AVG(enrolled * 100.0 / NULLIF(capacity, 0)), 2) as avg_occupancy_rate
        FROM courses
      `),

      // 4. Department Performance Data
      pool.query(`
        SELECT 
          d.id,
          d.name as department_name,
          d.fee_charge,
          COUNT(DISTINCT s.id) as total_students,
          COUNT(DISTINCT c.id) as total_courses,
          COALESCE(SUM(f.total_amount), 0) as total_revenue,
          COALESCE(SUM(f.amount_paid), 0) as revenue_paid,
          ROUND(AVG(c.enrolled * 100.0 / NULLIF(c.capacity, 0)), 2) as avg_occupancy_rate
        FROM departments d
        LEFT JOIN students s ON d.id = s.department_id
        LEFT JOIN courses c ON d.id = c.department_id
        LEFT JOIN enrollments e ON s.id = e.student_id AND c.id = e.course_id
        LEFT JOIN fees f ON s.id = f.student_id
        GROUP BY d.id, d.name, d.fee_charge
        ORDER BY total_revenue DESC
      `),

      // 5. Course Performance Data
      pool.query(`
        SELECT 
          c.id,
          c.name as course_name,
          d.name as department_name,
          c.duration_months,
          c.fee,
          c.capacity,
          c.enrolled,
          ROUND(c.enrolled * 100.0 / NULLIF(c.capacity, 0), 2) as occupancy_rate,
          COUNT(DISTINCT e.student_id) as active_enrollments,
          COUNT(DISTINCT CASE WHEN e.status = 'Completed' THEN e.student_id END) as completed_enrollments,
          COALESCE(AVG(sp.theory_marks + sp.practical_marks), 0) as avg_marks
        FROM courses c
        LEFT JOIN departments d ON c.department_id = d.id
        LEFT JOIN enrollments e ON c.id = e.course_id
        LEFT JOIN student_performance sp ON e.student_id = sp.student_id
        GROUP BY c.id, c.name, d.name, c.duration_months, c.fee, c.capacity, c.enrolled
        ORDER BY c.enrolled DESC
        LIMIT 10
      `),

      // 6. Student Distribution
      pool.query(`
        SELECT 
          'By Gender' as category,
          gender as label,
          COUNT(*) as value
        FROM students
        WHERE gender IS NOT NULL
        GROUP BY gender
        
        UNION ALL
        
        SELECT 
          'By Department' as category,
          d.name as label,
          COUNT(s.id) as value
        FROM students s
        LEFT JOIN departments d ON s.department_id = d.id
        WHERE s.department_id IS NOT NULL
        GROUP BY d.name
        
        UNION ALL
        
        SELECT 
          'By Status' as category,
          status as label,
          COUNT(*) as value
        FROM students
        WHERE status IS NOT NULL
        GROUP BY status
        
        UNION ALL
        
        SELECT 
          'By Age Group' as category,
          CASE
            WHEN age < 20 THEN 'Under 20'
            WHEN age BETWEEN 20 AND 25 THEN '20-25'
            WHEN age BETWEEN 26 AND 30 THEN '26-30'
            WHEN age BETWEEN 31 AND 35 THEN '31-35'
            ELSE 'Above 35'
          END as label,
          COUNT(*) as value
        FROM students
        WHERE age IS NOT NULL
        GROUP BY 
          CASE
            WHEN age < 20 THEN 'Under 20'
            WHEN age BETWEEN 20 AND 25 THEN '20-25'
            WHEN age BETWEEN 26 AND 30 THEN '26-30'
            WHEN age BETWEEN 31 AND 35 THEN '31-35'
            ELSE 'Above 35'
          END
      `),

      // 7. Completion Rate (Average %)
      pool.query(`
        SELECT 
          ROUND(
            COUNT(DISTINCT CASE WHEN sm.status = 'Completed' THEN sm.id END) * 100.0 /
            NULLIF(COUNT(DISTINCT sm.id), 0), 
            2
          ) as overall_completion_rate,
          
          ROUND(
            COUNT(DISTINCT CASE WHEN e.status = 'Completed' THEN e.id END) * 100.0 /
            NULLIF(COUNT(DISTINCT e.id), 0), 
            2
          ) as course_completion_rate,
          
          COUNT(DISTINCT sm.id) as total_module_enrollments,
          COUNT(DISTINCT CASE WHEN sm.status = 'Completed' THEN sm.id END) as completed_modules,
          COUNT(DISTINCT e.id) as total_course_enrollments,
          COUNT(DISTINCT CASE WHEN e.status = 'Completed' THEN e.id END) as completed_courses
        FROM student_modules sm
        LEFT JOIN enrollments e ON sm.student_id = e.student_id AND sm.course_id = e.course_id
      `),

      // 8. Monthly Data (Students/Revenue)
      pool.query(`
        SELECT 
          DATE_FORMAT(s.created_at, '%Y-%m') as month,
          COUNT(s.id) as new_students,
          COALESCE(SUM(f.total_amount), 0) as monthly_revenue,
          COALESCE(SUM(f.amount_paid), 0) as monthly_paid,
          COUNT(DISTINCT e.id) as new_enrollments
        FROM students s
        LEFT JOIN fees f ON s.id = f.student_id 
          AND DATE_FORMAT(f.payment_date, '%Y-%m') = DATE_FORMAT(s.created_at, '%Y-%m')
        LEFT JOIN enrollments e ON s.id = e.student_id 
          AND DATE_FORMAT(e.enrollment_date, '%Y-%m') = DATE_FORMAT(s.created_at, '%Y-%m')
        WHERE s.created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
        GROUP BY DATE_FORMAT(s.created_at, '%Y-%m')
        ORDER BY month DESC
        LIMIT 12
      `),

      // 9. Finance Total Paid & Pending
      pool.query(`
        SELECT 
          'Total Amount' as category,
          COALESCE(SUM(total_amount), 0) as value
        FROM fees
        
        UNION ALL
        
        SELECT 
          'Amount Paid',
          COALESCE(SUM(amount_paid), 0)
        FROM fees
        
        UNION ALL
        
        SELECT 
          'Amount Pending',
          COALESCE(SUM(amount_pending), 0)
        FROM fees
        
        UNION ALL
        
        SELECT 
          'Overpaid Amount',
          COALESCE(SUM(overpaid), 0)
        FROM fees
        
        UNION ALL
        
        SELECT 
          'Fully Paid Students',
          COUNT(DISTINCT CASE WHEN is_paid = 1 THEN student_id END)
        FROM fees
        
        UNION ALL
        
        SELECT 
          'Pending Payment Students',
          COUNT(DISTINCT CASE WHEN amount_pending > 0 THEN student_id END)
        FROM fees
      `),

      // 10. Active Enrollments by Month
      pool.query(`
        SELECT 
          DATE_FORMAT(enrollment_date, '%Y-%m') as month,
          COUNT(*) as enrollments_count,
          COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completed_count,
          COUNT(CASE WHEN status = 'Dropped' THEN 1 END) as dropped_count
        FROM enrollments
        WHERE enrollment_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
        GROUP BY DATE_FORMAT(enrollment_date, '%Y-%m')
        ORDER BY month
      `),

      // 11. Top Performing Courses (by marks)
      pool.query(`
        SELECT 
          c.name as course_name,
          d.name as department_name,
          COUNT(DISTINCT sp.student_id) as students_with_marks,
          ROUND(AVG(sp.theory_marks + sp.practical_marks), 2) as avg_total_marks,
          ROUND(AVG(sp.theory_marks), 2) as avg_theory_marks,
          ROUND(AVG(sp.practical_marks), 2) as avg_practical_marks,
          COUNT(CASE WHEN sp.grade = 'Distinction' THEN 1 END) as distinction_count,
          COUNT(CASE WHEN sp.grade = 'Credit' THEN 1 END) as credit_count,
          COUNT(CASE WHEN sp.grade = 'Pass' THEN 1 END) as pass_count,
          COUNT(CASE WHEN sp.grade = 'Fail' THEN 1 END) as fail_count
        FROM student_performance sp
        JOIN modules m ON sp.module_id = m.id
        JOIN courses c ON m.course_id = c.id
        JOIN departments d ON c.department_id = d.id
        GROUP BY c.id, c.name, d.name
        HAVING students_with_marks > 0
        ORDER BY avg_total_marks DESC
        LIMIT 10
      `),

      // 12. Recent Activities
      pool.query(`
        SELECT 
          a.id,
          a.student_id,
          s.first_name,
          s.last_name,
          a.action,
          a.course,
          a.type,
          DATE_FORMAT(a.created_at, '%Y-%m-%d %H:%i:%s') as created_at
        FROM activities a
        LEFT JOIN students s ON a.student_id = s.id
        ORDER BY a.created_at DESC
        LIMIT 10
      `)
    ]);

    // Format the response
    const response = {
      kpi_cards: {
        total_students: totalStudents[0]?.total_students || 0,
        total_revenue: totalRevenue[0]?.total_revenue || 0,
        total_courses: totalCourses[0]?.total_courses || 0,
        active_students: totalStudents[0]?.active_students || 0,
        total_paid: totalRevenue[0]?.total_paid || 0,
        total_pending: totalRevenue[0]?.total_pending || 0,
        active_courses: totalCourses[0]?.active_courses || 0,
        total_enrollments: totalCourses[0]?.total_enrollments || 0,
        avg_occupancy_rate: totalCourses[0]?.avg_occupancy_rate || 0
      },
      
      gender_distribution: {
        male: totalStudents[0]?.male_students || 0,
        female: totalStudents[0]?.female_students || 0
      },
      
      department_performance: departmentStats,
      course_performance: coursePerformance,
      student_distribution: studentDistribution,
      
      completion_rates: {
        overall_completion_rate: completionRate[0]?.overall_completion_rate || 0,
        course_completion_rate: completionRate[0]?.course_completion_rate || 0,
        completed_modules: completionRate[0]?.completed_modules || 0,
        total_modules: completionRate[0]?.total_module_enrollments || 0,
        completed_courses: completionRate[0]?.completed_courses || 0,
        total_courses: completionRate[0]?.total_course_enrollments || 0
      },
      
      monthly_data: monthlyData,
      finance_summary: financeSummary,
      enrollment_trends: activeEnrollments,
      top_performing_courses: topPerformingCourses,
      recent_activities: recentActivities,
      
      charts_data: {
        monthly_enrollments: monthlyData.map(item => ({
          month: item.month,
          enrollments: item.new_enrollments,
          students: item.new_students,
          revenue: parseFloat(item.monthly_revenue),
          paid: parseFloat(item.monthly_paid)
        })),
        
        department_revenue: departmentStats.map(dept => ({
          department: dept.department_name,
          revenue: parseFloat(dept.total_revenue),
          students: dept.total_students
        })),
        
        course_enrollment: coursePerformance.map(course => ({
          course: course.course_name,
          enrolled: course.enrolled,
          capacity: course.capacity,
          occupancy_rate: parseFloat(course.occupancy_rate)
        }))
      }
    };

    res.json(response);
  } catch (err) {
    console.error("❌ Error fetching dashboard statistics:", err);
    res.status(500).json({ 
      error: "Failed to fetch dashboard statistics", 
      details: err.message 
    });
  }
};

/**
 * ✅ GET Department Performance Report
 */
export const getDepartmentPerformance = async (req, res) => {
  try {
    const { department_id } = req.query;
    
    let query = `
      SELECT 
        d.id,
        d.name as department_name,
        d.fee_charge,
        COUNT(DISTINCT s.id) as total_students,
        COUNT(DISTINCT c.id) as total_courses,
        COALESCE(SUM(f.total_amount), 0) as total_revenue,
        COALESCE(SUM(f.amount_paid), 0) as revenue_paid,
        COALESCE(SUM(f.amount_pending), 0) as revenue_pending,
        ROUND(AVG(c.enrolled * 100.0 / NULLIF(c.capacity, 0)), 2) as avg_occupancy_rate,
        
        -- Performance metrics
        COUNT(DISTINCT CASE WHEN sm.status = 'Completed' THEN sm.student_id END) as students_with_completed_modules,
        COUNT(DISTINCT sm.id) as total_module_enrollments,
        COUNT(DISTINCT CASE WHEN sm.status = 'Completed' THEN sm.id END) as completed_modules,
        ROUND(
          COUNT(DISTINCT CASE WHEN sm.status = 'Completed' THEN sm.id END) * 100.0 /
          NULLIF(COUNT(DISTINCT sm.id), 0), 
          2
        ) as module_completion_rate,
        
        -- Student performance
        ROUND(AVG(sp.theory_marks + sp.practical_marks), 2) as avg_total_marks,
        COUNT(DISTINCT sp.student_id) as students_with_marks,
        
        -- Payment status
        COUNT(DISTINCT CASE WHEN f.is_paid = 1 THEN f.student_id END) as fully_paid_students,
        COUNT(DISTINCT CASE WHEN f.amount_pending > 0 THEN f.student_id END) as pending_payment_students
      FROM departments d
      LEFT JOIN students s ON d.id = s.department_id
      LEFT JOIN courses c ON d.id = c.department_id
      LEFT JOIN enrollments e ON s.id = e.student_id AND c.id = e.course_id
      LEFT JOIN fees f ON s.id = f.student_id
      LEFT JOIN student_modules sm ON s.id = sm.student_id
      LEFT JOIN student_performance sp ON s.id = sp.student_id
    `;
    
    const params = [];
    
    if (department_id) {
      query += " WHERE d.id = ?";
      params.push(department_id);
    }
    
    query += " GROUP BY d.id, d.name, d.fee_charge ORDER BY total_revenue DESC";
    
    const [rows] = await pool.query(query, params);
    
    res.json(rows);
  } catch (err) {
    console.error("❌ Error fetching department performance:", err);
    res.status(500).json({ error: "Failed to fetch department performance", details: err.message });
  }
};

/**
 * ✅ GET Course Performance Report
 */
export const getCoursePerformance = async (req, res) => {
  try {
    const { course_id, department_id } = req.query;
    
    let query = `
      SELECT 
        c.id,
        c.name as course_name,
        d.name as department_name,
        d.fee_charge,
        c.duration_months,
        c.fee,
        c.capacity,
        c.enrolled,
        c.status as course_status,
        ROUND(c.enrolled * 100.0 / NULLIF(c.capacity, 0), 2) as occupancy_rate,
        
        -- Enrollment metrics
        COUNT(DISTINCT e.student_id) as total_enrollments,
        COUNT(DISTINCT CASE WHEN e.status = 'Completed' THEN e.student_id END) as completed_enrollments,
        COUNT(DISTINCT CASE WHEN e.status = 'Dropped' THEN e.student_id END) as dropped_enrollments,
        ROUND(
          COUNT(DISTINCT CASE WHEN e.status = 'Completed' THEN e.student_id END) * 100.0 /
          NULLIF(COUNT(DISTINCT e.student_id), 0), 
          2
        ) as enrollment_completion_rate,
        
        -- Module metrics
        COUNT(DISTINCT m.id) as total_modules,
        COUNT(DISTINCT sm.id) as module_enrollments,
        COUNT(DISTINCT CASE WHEN sm.status = 'Completed' THEN sm.id END) as completed_modules,
        ROUND(
          COUNT(DISTINCT CASE WHEN sm.status = 'Completed' THEN sm.id END) * 100.0 /
          NULLIF(COUNT(DISTINCT sm.id), 0), 
          2
        ) as module_completion_rate,
        
        -- Performance metrics
        COUNT(DISTINCT sp.student_id) as students_with_marks,
        ROUND(AVG(sp.theory_marks + sp.practical_marks), 2) as avg_total_marks,
        ROUND(AVG(sp.theory_marks), 2) as avg_theory_marks,
        ROUND(AVG(sp.practical_marks), 2) as avg_practical_marks,
        
        -- Grade distribution
        COUNT(CASE WHEN sp.grade = 'Distinction' THEN 1 END) as distinction_count,
        COUNT(CASE WHEN sp.grade = 'Credit' THEN 1 END) as credit_count,
        COUNT(CASE WHEN sp.grade = 'Pass' THEN 1 END) as pass_count,
        COUNT(CASE WHEN sp.grade = 'Fail' THEN 1 END) as fail_count,
        
        -- Revenue
        COALESCE(SUM(f.total_amount), 0) as total_revenue,
        COALESCE(SUM(f.amount_paid), 0) as revenue_paid
      FROM courses c
      LEFT JOIN departments d ON c.department_id = d.id
      LEFT JOIN enrollments e ON c.id = e.course_id
      LEFT JOIN modules m ON c.id = m.course_id
      LEFT JOIN student_modules sm ON m.id = sm.module_id AND e.student_id = sm.student_id
      LEFT JOIN student_performance sp ON m.id = sp.module_id AND e.student_id = sp.student_id
      LEFT JOIN fees f ON e.student_id = f.student_id
    `;
    
    const params = [];
    const conditions = [];
    
    if (course_id) {
      conditions.push("c.id = ?");
      params.push(course_id);
    }
    
    if (department_id) {
      conditions.push("c.department_id = ?");
      params.push(department_id);
    }
    
    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }
    
    query += " GROUP BY c.id, c.name, d.name, d.fee_charge, c.duration_months, c.fee, c.capacity, c.enrolled, c.status ORDER BY c.enrolled DESC";
    
    const [rows] = await pool.query(query, params);
    
    res.json(rows);
  } catch (err) {
    console.error("❌ Error fetching course performance:", err);
    res.status(500).json({ error: "Failed to fetch course performance", details: err.message });
  }
};

/**
 * ✅ GET Financial Report
 */
export const getFinancialReport = async (req, res) => {
  try {
    const { year, month } = req.query;
    
    let query = `
      SELECT 
        -- Monthly summary
        DATE_FORMAT(f.payment_date, '%Y-%m') as payment_month,
        COUNT(DISTINCT f.student_id) as paying_students,
        COUNT(DISTINCT f.id) as total_transactions,
        COALESCE(SUM(f.total_amount), 0) as total_amount,
        COALESCE(SUM(f.amount_paid), 0) as amount_paid,
        COALESCE(SUM(f.amount_pending), 0) as amount_pending,
        COALESCE(SUM(f.overpaid), 0) as overpaid_amount,
        
        -- Payment method distribution
        COUNT(CASE WHEN f.payment_method = 'bank-transfer' THEN 1 END) as bank_transfer_count,
        COUNT(CASE WHEN f.payment_method = 'credit-card' THEN 1 END) as credit_card_count,
        COUNT(CASE WHEN f.payment_method = 'mobile-money' THEN 1 END) as mobile_money_count,
        COUNT(CASE WHEN f.payment_method = 'cash' THEN 1 END) as cash_count,
        
        -- Payment status
        COUNT(CASE WHEN f.is_paid = 1 THEN 1 END) as fully_paid_count,
        COUNT(CASE WHEN f.amount_pending > 0 THEN 1 END) as pending_payment_count,
        
        -- Department-wise revenue
        d.name as department_name,
        COUNT(DISTINCT s.id) as department_students
      FROM fees f
      LEFT JOIN students s ON f.student_id = s.id
      LEFT JOIN departments d ON s.department_id = d.id
      WHERE f.payment_date IS NOT NULL
    `;
    
    const params = [];
    
    if (year) {
      query += " AND YEAR(f.payment_date) = ?";
      params.push(year);
    }
    
    if (month) {
      query += " AND MONTH(f.payment_date) = ?";
      params.push(month);
    }
    
    query += `
      GROUP BY DATE_FORMAT(f.payment_date, '%Y-%m'), d.name
      ORDER BY payment_month DESC, total_amount DESC
    `;
    
    const [rows] = await pool.query(query, params);
    
    // Get summary stats
    const [summary] = await pool.query(`
      SELECT 
        'Total Revenue' as metric,
        COALESCE(SUM(total_amount), 0) as value
      FROM fees
      WHERE payment_date IS NOT NULL
      
      UNION ALL
      
      SELECT 
        'Total Paid',
        COALESCE(SUM(amount_paid), 0)
      FROM fees
      WHERE payment_date IS NOT NULL
      
      UNION ALL
      
      SELECT 
        'Total Pending',
        COALESCE(SUM(amount_pending), 0)
      FROM fees
      WHERE payment_date IS NOT NULL
      
      UNION ALL
      
      SELECT 
        'Average Payment',
        COALESCE(AVG(amount_paid), 0)
      FROM fees
      WHERE amount_paid > 0
      
      UNION ALL
      
      SELECT 
        'Total Transactions',
        COUNT(*)
      FROM fees
      WHERE payment_date IS NOT NULL
    `);
    
    res.json({
      monthly_data: rows,
      summary: summary,
      filters: { year, month }
    });
  } catch (err) {
    console.error("❌ Error fetching financial report:", err);
    res.status(500).json({ error: "Failed to fetch financial report", details: err.message });
  }
};

/**
 * ✅ GET Student Progress Report
 */
export const getStudentProgressReport = async (req, res) => {
  try {
    const { student_id, course_id } = req.query;
    
    let query = `
      SELECT 
        s.id as student_id,
        CONCAT(s.first_name, ' ', s.last_name) as student_name,
        s.email,
        s.phone,
        s.gender,
        s.age,
        d.name as department_name,
        c.name as course_name,
        
        -- Enrollment info
        e.enrollment_date,
        e.status as enrollment_status,
        
        -- Module progress
        COUNT(DISTINCT sm.module_id) as total_modules_enrolled,
        COUNT(DISTINCT CASE WHEN sm.status = 'Completed' THEN sm.module_id END) as completed_modules,
        COUNT(DISTINCT CASE WHEN sm.status = 'Dropped' THEN sm.module_id END) as dropped_modules,
        COUNT(DISTINCT CASE WHEN sm.status = 'Failed' THEN sm.module_id END) as failed_modules,
        ROUND(
          COUNT(DISTINCT CASE WHEN sm.status = 'Completed' THEN sm.module_id END) * 100.0 /
          NULLIF(COUNT(DISTINCT sm.module_id), 0), 
          2
        ) as module_completion_rate,
        
        -- Performance
        COUNT(DISTINCT sp.module_id) as modules_with_marks,
        ROUND(AVG(sp.theory_marks + sp.practical_marks), 2) as avg_total_marks,
        ROUND(AVG(sp.theory_marks), 2) as avg_theory_marks,
        ROUND(AVG(sp.practical_marks), 2) as avg_practical_marks,
        
        -- Grade distribution
        COUNT(CASE WHEN sp.grade = 'Distinction' THEN 1 END) as distinction_count,
        COUNT(CASE WHEN sp.grade = 'Credit' THEN 1 END) as credit_count,
        COUNT(CASE WHEN sp.grade = 'Pass' THEN 1 END) as pass_count,
        COUNT(CASE WHEN sp.grade = 'Fail' THEN 1 END) as fail_count,
        
        -- Financial status
        COALESCE(f.total_amount, 0) as total_fee,
        COALESCE(f.amount_paid, 0) as amount_paid,
        COALESCE(f.amount_pending, 0) as amount_pending,
        CASE WHEN f.is_paid = 1 THEN 'Paid' ELSE 'Pending' END as payment_status
      FROM students s
      LEFT JOIN departments d ON s.department_id = d.id
      LEFT JOIN enrollments e ON s.id = e.student_id
      LEFT JOIN courses c ON e.course_id = c.id
      LEFT JOIN student_modules sm ON s.id = sm.student_id
      LEFT JOIN student_performance sp ON s.id = sp.student_id AND sm.module_id = sp.module_id
      LEFT JOIN fees f ON s.id = f.student_id
    `;
    
    const params = [];
    const conditions = [];
    
    if (student_id) {
      conditions.push("s.id = ?");
      params.push(student_id);
    }
    
    if (course_id) {
      conditions.push("c.id = ?");
      params.push(course_id);
    }
    
    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }
    
    query += `
      GROUP BY s.id, s.first_name, s.last_name, s.email, s.phone, s.gender, s.age, 
               d.name, c.name, e.enrollment_date, e.status, f.total_amount, 
               f.amount_paid, f.amount_pending, f.is_paid
      ORDER BY module_completion_rate DESC
    `;
    
    const [rows] = await pool.query(query, params);
    
    res.json(rows);
  } catch (err) {
    console.error("❌ Error fetching student progress report:", err);
    res.status(500).json({ error: "Failed to fetch student progress report", details: err.message });
  }
};

/**
 * ✅ GET Monthly Performance Trends
 */
export const getMonthlyTrends = async (req, res) => {
  try {
    const { months = 12 } = req.query;
    
    const [trends] = await pool.query(`
      SELECT 
        -- Monthly metrics
        m.month,
        COALESCE(s.new_students, 0) as new_students,
        COALESCE(e.new_enrollments, 0) as new_enrollments,
        COALESCE(f.monthly_revenue, 0) as monthly_revenue,
        COALESCE(f.monthly_paid, 0) as monthly_paid,
        COALESCE(c.completed_enrollments, 0) as completed_enrollments,
        COALESCE(p.modules_with_marks, 0) as modules_with_marks,
        COALESCE(p.avg_marks, 0) as avg_marks
        
      FROM (
        SELECT DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL n MONTH), '%Y-%m') as month
        FROM (
          SELECT 0 as n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
          UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9
          UNION SELECT 10 UNION SELECT 11
        ) numbers
        WHERE n < ?
        ORDER BY month
      ) m
      
      LEFT JOIN (
        SELECT 
          DATE_FORMAT(created_at, '%Y-%m') as month,
          COUNT(*) as new_students
        FROM students
        WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
        GROUP BY DATE_FORMAT(created_at, '%Y-%m')
      ) s ON m.month = s.month
      
      LEFT JOIN (
        SELECT 
          DATE_FORMAT(enrollment_date, '%Y-%m') as month,
          COUNT(*) as new_enrollments
        FROM enrollments
        WHERE enrollment_date >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
        GROUP BY DATE_FORMAT(enrollment_date, '%Y-%m')
      ) e ON m.month = e.month
      
      LEFT JOIN (
        SELECT 
          DATE_FORMAT(payment_date, '%Y-%m') as month,
          COALESCE(SUM(total_amount), 0) as monthly_revenue,
          COALESCE(SUM(amount_paid), 0) as monthly_paid
        FROM fees
        WHERE payment_date >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
        GROUP BY DATE_FORMAT(payment_date, '%Y-%m')
      ) f ON m.month = f.month
      
      LEFT JOIN (
        SELECT 
          DATE_FORMAT(updated_at, '%Y-%m') as month,
          COUNT(*) as completed_enrollments
        FROM enrollments
        WHERE status = 'Completed' 
          AND updated_at >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
        GROUP BY DATE_FORMAT(updated_at, '%Y-%m')
      ) c ON m.month = c.month
      
      LEFT JOIN (
        SELECT 
          DATE_FORMAT(NOW(), '%Y-%m') as month, -- Assuming performance entries don't have timestamps
          COUNT(DISTINCT module_id) as modules_with_marks,
          ROUND(AVG(theory_marks + practical_marks), 2) as avg_marks
        FROM student_performance
      ) p ON m.month = p.month
      
      ORDER BY m.month
    `, [months, months, months, months, months]);
    
    res.json(trends);
  } catch (err) {
    console.error("❌ Error fetching monthly trends:", err);
    res.status(500).json({ error: "Failed to fetch monthly trends", details: err.message });
  }
};

/**
 * ✅ GET Top Performers Report
 */
export const getTopPerformers = async (req, res) => {
  try {
    const { limit = 10, department_id, course_id } = req.query;
    
    let query = `
      SELECT 
        s.id as student_id,
        CONCAT(s.first_name, ' ', s.last_name) as student_name,
        s.email,
        s.gender,
        s.age,
        d.name as department_name,
        c.name as course_name,
        
        COUNT(DISTINCT sp.module_id) as modules_taken,
        ROUND(AVG(sp.theory_marks + sp.practical_marks), 2) as avg_total_marks,
        ROUND(AVG(sp.theory_marks), 2) as avg_theory_marks,
        ROUND(AVG(sp.practical_marks), 2) as avg_practical_marks,
        
        COUNT(CASE WHEN sp.grade = 'Distinction' THEN 1 END) as distinction_count,
        COUNT(CASE WHEN sp.grade = 'Credit' THEN 1 END) as credit_count,
        COUNT(CASE WHEN sp.grade = 'Pass' THEN 1 END) as pass_count,
        COUNT(CASE WHEN sp.grade = 'Fail' THEN 1 END) as fail_count,
        
        ROUND(
          COUNT(CASE WHEN sp.grade IN ('Distinction', 'Credit', 'Pass') THEN 1 END) * 100.0 /
          NULLIF(COUNT(DISTINCT sp.module_id), 0), 
          2
        ) as success_rate,
        
        COUNT(DISTINCT sm.module_id) as total_modules_enrolled,
        COUNT(DISTINCT CASE WHEN sm.status = 'Completed' THEN sm.module_id END) as completed_modules,
        ROUND(
          COUNT(DISTINCT CASE WHEN sm.status = 'Completed' THEN sm.module_id END) * 100.0 /
          NULLIF(COUNT(DISTINCT sm.module_id), 0), 
          2
        ) as completion_rate
      FROM students s
      LEFT JOIN departments d ON s.department_id = d.id
      LEFT JOIN enrollments e ON s.id = e.student_id
      LEFT JOIN courses c ON e.course_id = c.id
      LEFT JOIN student_modules sm ON s.id = sm.student_id
      LEFT JOIN student_performance sp ON s.id = sp.student_id AND sm.module_id = sp.module_id
      WHERE sp.id IS NOT NULL
    `;
    
    const params = [];
    const conditions = [];
    
    if (department_id) {
      conditions.push("d.id = ?");
      params.push(department_id);
    }
    
    if (course_id) {
      conditions.push("c.id = ?");
      params.push(course_id);
    }
    
    if (conditions.length > 0) {
      query += " AND " + conditions.join(" AND ");
    }
    
    query += `
      GROUP BY s.id, s.first_name, s.last_name, s.email, s.gender, s.age, d.name, c.name
      HAVING modules_taken >= 3
      ORDER BY avg_total_marks DESC
      LIMIT ?
    `;
    
    params.push(parseInt(limit));
    
    const [rows] = await pool.query(query, params);
    
    res.json(rows);
  } catch (err) {
    console.error("❌ Error fetching top performers:", err);
    res.status(500).json({ error: "Failed to fetch top performers", details: err.message });
  }
};

/**
 * ✅ GET Export Report Data (for CSV/Excel)
 */
export const exportReportData = async (req, res) => {
  try {
    const { report_type, start_date, end_date } = req.query;
    
    let query = "";
    let filename = "";
    
    switch (report_type) {
      case 'students':
        query = `
          SELECT 
            s.id as student_id,
            s.first_name,
            s.last_name,
            s.id_number,
            s.date_of_birth,
            s.age,
            s.gender,
            s.nationality,
            s.county,
            s.address,
            s.email,
            s.phone,
            s.previous_school,
            s.graduation_year,
            s.grade_obtained,
            d.name as department,
            s.admission_date,
            s.status,
            s.guardian_name,
            s.guardian_contact,
            s.created_at
          FROM students s
          LEFT JOIN departments d ON s.department_id = d.id
          WHERE s.created_at BETWEEN ? AND ?
        `;
        filename = `students_report_${new Date().toISOString().split('T')[0]}.csv`;
        break;
        
      case 'enrollments':
        query = `
          SELECT 
            e.id as enrollment_id,
            s.id as student_id,
            CONCAT(s.first_name, ' ', s.last_name) as student_name,
            c.name as course_name,
            d.name as department_name,
            e.enrollment_date,
            e.status as enrollment_status,
            e.branch_id,
            c.fee as course_fee,
            c.duration_months
          FROM enrollments e
          JOIN students s ON e.student_id = s.id
          JOIN courses c ON e.course_id = c.id
          JOIN departments d ON c.department_id = d.id
          WHERE e.enrollment_date BETWEEN ? AND ?
        `;
        filename = `enrollments_report_${new Date().toISOString().split('T')[0]}.csv`;
        break;
        
      case 'financial':
        query = `
          SELECT 
            f.id as fee_id,
            s.id as student_id,
            CONCAT(s.first_name, ' ', s.last_name) as student_name,
            d.name as department_name,
            c.name as course_name,
            f.total_amount,
            f.amount_paid,
            f.amount_pending,
            f.overpaid,
            f.payment_method,
            f.payment_date,
            CASE WHEN f.is_paid = 1 THEN 'Yes' ELSE 'No' END as is_fully_paid,
            f.payment_date as transaction_date
          FROM fees f
          JOIN students s ON f.student_id = s.id
          LEFT JOIN departments d ON s.department_id = d.id
          LEFT JOIN enrollments e ON s.id = e.student_id
          LEFT JOIN courses c ON e.course_id = c.id
          WHERE f.payment_date BETWEEN ? AND ?
        `;
        filename = `financial_report_${new Date().toISOString().split('T')[0]}.csv`;
        break;
        
      case 'performance':
        query = `
          SELECT 
            sp.id as performance_id,
            s.id as student_id,
            CONCAT(s.first_name, ' ', s.last_name) as student_name,
            m.title as module_name,
            m.code as module_code,
            c.name as course_name,
            d.name as department_name,
            sp.theory_marks,
            sp.practical_marks,
            (sp.theory_marks + sp.practical_marks) as total_marks,
            sp.grade,
            sm.status as module_status,
            sm.enrollment_date as module_enrollment_date,
            sm.completion_date as module_completion_date
          FROM student_performance sp
          JOIN students s ON sp.student_id = s.id
          JOIN modules m ON sp.module_id = m.id
          JOIN courses c ON m.course_id = c.id
          JOIN departments d ON c.department_id = d.id
          LEFT JOIN student_modules sm ON sp.student_id = sm.student_id AND sp.module_id = sm.module_id
          WHERE sp.id IS NOT NULL
        `;
        filename = `performance_report_${new Date().toISOString().split('T')[0]}.csv`;
        break;
        
      default:
        return res.status(400).json({ error: "Invalid report type" });
    }
    
    const params = [
      start_date || '1900-01-01',
      end_date || '2999-12-31'
    ];
    
    const [rows] = await pool.query(query, params);
    
    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Convert to CSV
    if (rows.length > 0) {
      const headers = Object.keys(rows[0]).join(',');
      const csvRows = rows.map(row => 
        Object.values(row).map(value => 
          `"${String(value || '').replace(/"/g, '""')}"`
        ).join(',')
      );
      
      const csv = [headers, ...csvRows].join('\n');
      res.send(csv);
    } else {
      res.send('No data available');
    }
  } catch (err) {
    console.error("❌ Error exporting report:", err);
    res.status(500).json({ error: "Failed to export report", details: err.message });
  }
};

/**
 * ✅ GET Welcome message for reports API
 */
export const getReportsWelcome = async (req, res) => {
  try {
    res.json({
      message: "Welcome to the Vocational Training System Reports API",
      version: "1.0.0",
      available_endpoints: {
        "GET /api/reports/dashboard": "Comprehensive dashboard statistics",
        "GET /api/reports/department-performance": "Department performance data",
        "GET /api/reports/course-performance": "Course performance data",
        "GET /api/reports/financial": "Financial reports",
        "GET /api/reports/student-progress": "Student progress reports",
        "GET /api/reports/monthly-trends": "Monthly performance trends",
        "GET /api/reports/top-performers": "Top performing students",
        "GET /api/reports/export": "Export data to CSV"
      },
      filters_available: {
        date_range: "start_date, end_date",
        department: "department_id",
        course: "course_id",
        student: "student_id",
        time_period: "months (for trends)"
      }
    });
  } catch (err) {
    console.error("❌ Error in reports welcome:", err);
    res.status(500).json({ error: "Failed to load reports API info", details: err.message });
  }
};