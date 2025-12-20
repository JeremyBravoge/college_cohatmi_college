import pool from "../config/db.js";

/**
 * ✅ GET Student Overall Performance with Rankings
 */
export const getStudentOverallPerformance = async (req, res) => {
  try {
    const { 
      student_id, 
      course_id, 
      department_id, 
      level_id,
      sort_by = 'overall_rank',
      sort_order = 'asc',
      page = 1,
      limit = 50,
      performance_category,
      min_gpa,
      max_gpa
    } = req.query;
    
    const offset = (page - 1) * limit;
    
    // Base query for student performance with rankings
    let query = `
      WITH student_data AS (
        SELECT 
          spr.*,
          cr.course_rank,
          cr.total_students_in_course,
          cr.course_percentile,
          dr.department_rank,
          dr.total_students_in_department,
          dr.department_percentile,
          orr.overall_rank,
          orr.total_students,
          orr.overall_percentile,
          
          -- Calculate performance trends (if we had historical data)
          NULL as performance_trend,
          
          -- Calculate improvement rate
          NULL as improvement_rate,
          
          -- Calculate consistency score (standard deviation of marks)
          COALESCE(
            (SELECT STDDEV(sp2.theory_marks + sp2.practical_marks)
             FROM student_performance sp2 
             WHERE sp2.student_id = spr.student_id), 
            0
          ) as marks_consistency,
          
          -- Calculate completion speed (modules per month)
          CASE 
            WHEN spr.days_enrolled > 0 THEN 
              ROUND(spr.completed_modules * 30.0 / spr.days_enrolled, 2)
            ELSE 0
          END as completion_speed,
          
          -- Calculate success rate
          ROUND(
            (spr.distinction_count + spr.credit_count + spr.pass_count) * 100.0 /
            NULLIF(spr.modules_with_marks, 0), 
            2
          ) as success_rate,
          
          -- Calculate theory vs practical performance ratio
          CASE 
            WHEN spr.avg_practical_marks > 0 THEN 
              ROUND(spr.avg_theory_marks / spr.avg_practical_marks, 2)
            ELSE 0
          END as theory_practical_ratio,
          
          -- Star rating based on performance
          CASE 
            WHEN spr.overall_percentage >= 90 THEN 5
            WHEN spr.overall_percentage >= 80 THEN 4
            WHEN spr.overall_percentage >= 70 THEN 3
            WHEN spr.overall_percentage >= 60 THEN 2
            ELSE 1
          END as star_rating
          
        FROM student_performance_ranking spr
        LEFT JOIN course_rankings cr ON spr.student_id = cr.student_id AND spr.course_id = cr.course_id
        LEFT JOIN department_rankings dr ON spr.student_id = dr.student_id AND spr.department_id = dr.department_id
        LEFT JOIN overall_rankings orr ON spr.student_id = orr.student_id
        WHERE spr.overall_percentage IS NOT NULL
    `;
    
    const params = [];
    const conditions = [];
    
    // Apply filters
    if (student_id) {
      conditions.push("spr.student_id = ?");
      params.push(student_id);
    }
    
    if (course_id) {
      conditions.push("spr.course_id = ?");
      params.push(course_id);
    }
    
    if (department_id) {
      conditions.push("spr.department_id = ?");
      params.push(department_id);
    }
    
    if (level_id) {
      conditions.push("spr.level_id = ?");
      params.push(level_id);
    }
    
    if (performance_category) {
      conditions.push("spr.performance_category = ?");
      params.push(performance_category);
    }
    
    if (min_gpa) {
      conditions.push("spr.gpa >= ?");
      params.push(min_gpa);
    }
    
    if (max_gpa) {
      conditions.push("spr.gpa <= ?");
      params.push(max_gpa);
    }
    
    if (conditions.length > 0) {
      query += " AND " + conditions.join(" AND ");
    }
    
    query += `)
      SELECT * FROM student_data`;
    
    // Apply sorting
    const validSortColumns = [
      'overall_rank', 'course_rank', 'department_rank', 
      'overall_percentage', 'average_marks', 'gpa', 'weighted_score',
      'module_completion_rate', 'completion_speed', 'success_rate',
      'student_name', 'course_name', 'department_name'
    ];
    
    const sortColumn = validSortColumns.includes(sort_by) ? sort_by : 'overall_rank';
    const order = sort_order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
    
    query += ` ORDER BY ${sortColumn} ${order}`;
    
    // Apply pagination
    query += ` LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));
    
    // Execute main query
    const [students] = await pool.query(query, params);
    
    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total_count
      FROM student_performance_ranking spr
      WHERE spr.overall_percentage IS NOT NULL
    `;
    
    const countParams = [];
    const countConditions = [];
    
    if (student_id) {
      countConditions.push("spr.student_id = ?");
      countParams.push(student_id);
    }
    
    if (course_id) {
      countConditions.push("spr.course_id = ?");
      countParams.push(course_id);
    }
    
    if (department_id) {
      countConditions.push("spr.department_id = ?");
      countParams.push(department_id);
    }
    
    if (level_id) {
      countConditions.push("spr.level_id = ?");
      countParams.push(level_id);
    }
    
    if (performance_category) {
      countConditions.push("spr.performance_category = ?");
      countParams.push(performance_category);
    }
    
    if (min_gpa) {
      countConditions.push("spr.gpa >= ?");
      countParams.push(min_gpa);
    }
    
    if (max_gpa) {
      countConditions.push("spr.gpa <= ?");
      countParams.push(max_gpa);
    }
    
    if (countConditions.length > 0) {
      countQuery += " AND " + countConditions.join(" AND ");
    }
    
    const [[countResult]] = await pool.query(countQuery, countParams);
    
    // Get summary statistics
    const [summary] = await pool.query(`
      SELECT 
        COUNT(DISTINCT spr.student_id) as total_students,
        COUNT(DISTINCT spr.course_id) as total_courses,
        COUNT(DISTINCT spr.department_id) as total_departments,
        ROUND(AVG(spr.overall_percentage), 2) as avg_overall_percentage,
        ROUND(AVG(spr.gpa), 2) as avg_gpa,
        ROUND(AVG(spr.module_completion_rate), 2) as avg_completion_rate,
        MIN(spr.overall_percentage) as min_percentage,
        MAX(spr.overall_percentage) as max_percentage,
        
        -- Performance category distribution
        COUNT(CASE WHEN spr.performance_category = 'Excellent' THEN 1 END) as excellent_count,
        COUNT(CASE WHEN spr.performance_category = 'Very Good' THEN 1 END) as very_good_count,
        COUNT(CASE WHEN spr.performance_category = 'Good' THEN 1 END) as good_count,
        COUNT(CASE WHEN spr.performance_category = 'Average' THEN 1 END) as average_count,
        COUNT(CASE WHEN spr.performance_category = 'Below Average' THEN 1 END) as below_average_count,
        COUNT(CASE WHEN spr.performance_category = 'Poor' THEN 1 END) as poor_count,
        
        -- GPA distribution
        COUNT(CASE WHEN spr.gpa >= 3.5 THEN 1 END) as gpa_35_plus,
        COUNT(CASE WHEN spr.gpa >= 3.0 AND spr.gpa < 3.5 THEN 1 END) as gpa_30_34,
        COUNT(CASE WHEN spr.gpa >= 2.5 AND spr.gpa < 3.0 THEN 1 END) as gpa_25_29,
        COUNT(CASE WHEN spr.gpa >= 2.0 AND spr.gpa < 2.5 THEN 1 END) as gpa_20_24,
        COUNT(CASE WHEN spr.gpa < 2.0 THEN 1 END) as gpa_below_20
      FROM student_performance_ranking spr
      WHERE spr.overall_percentage IS NOT NULL
    `);
    
    // Get top performers
    const [topPerformers] = await pool.query(`
      SELECT 
        student_id,
        student_name,
        course_name,
        department_name,
        overall_percentage,
        gpa,
        overall_rank,
        performance_category,
        star_rating
      FROM (
        SELECT 
          spr.*,
          orr.overall_rank,
          CASE 
            WHEN spr.overall_percentage >= 90 THEN 5
            WHEN spr.overall_percentage >= 80 THEN 4
            WHEN spr.overall_percentage >= 70 THEN 3
            WHEN spr.overall_percentage >= 60 THEN 2
            ELSE 1
          END as star_rating
        FROM student_performance_ranking spr
        LEFT JOIN overall_rankings orr ON spr.student_id = orr.student_id
        WHERE spr.overall_percentage IS NOT NULL
        ORDER BY spr.overall_percentage DESC
        LIMIT 10
      ) top_students
    `);
    
    // Get department-wise statistics
    const [departmentStats] = await pool.query(`
      SELECT 
        department_id,
        department_name,
        COUNT(DISTINCT student_id) as student_count,
        ROUND(AVG(overall_percentage), 2) as avg_percentage,
        ROUND(AVG(gpa), 2) as avg_gpa,
        MAX(overall_percentage) as top_percentage,
        MIN(overall_percentage) as lowest_percentage,
        ROUND(AVG(module_completion_rate), 2) as avg_completion_rate,
        COUNT(CASE WHEN performance_category = 'Excellent' THEN 1 END) as excellent_students
      FROM student_performance_ranking
      WHERE overall_percentage IS NOT NULL
      GROUP BY department_id, department_name
      ORDER BY avg_percentage DESC
    `);
    
    // Get course-wise statistics
    const [courseStats] = await pool.query(`
      SELECT 
        course_id,
        course_name,
        department_name,
        COUNT(DISTINCT student_id) as student_count,
        ROUND(AVG(overall_percentage), 2) as avg_percentage,
        ROUND(AVG(gpa), 2) as avg_gpa,
        MAX(overall_percentage) as top_percentage,
        ROUND(AVG(module_completion_rate), 2) as avg_completion_rate,
        COUNT(CASE WHEN performance_category = 'Excellent' THEN 1 END) as excellent_students
      FROM student_performance_ranking
      WHERE overall_percentage IS NOT NULL
      GROUP BY course_id, course_name, department_name
      ORDER BY avg_percentage DESC
    `);

    res.json({
      success: true,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult.total_count,
        total_pages: Math.ceil(countResult.total_count / limit)
      },
      summary: summary[0],
      students: students.map(student => ({
        ...student,
        // Format numeric values
        overall_percentage: parseFloat(student.overall_percentage) || 0,
        average_marks: parseFloat(student.average_marks) || 0,
        gpa: parseFloat(student.gpa) || 0,
        weighted_score: parseFloat(student.weighted_score) || 0,
        module_completion_rate: parseFloat(student.module_completion_rate) || 0,
        success_rate: parseFloat(student.success_rate) || 0,
        marks_consistency: parseFloat(student.marks_consistency) || 0,
        completion_speed: parseFloat(student.completion_speed) || 0,
        theory_practical_ratio: parseFloat(student.theory_practical_ratio) || 0,
        
        // Calculate rank badges
        rank_badge: student.overall_rank <= 3 ? 
          (student.overall_rank === 1 ? '🥇' : 
           student.overall_rank === 2 ? '🥈' : '🥉') : '',
        
        // Performance color coding
        performance_color: student.overall_percentage >= 80 ? 'success' :
                          student.overall_percentage >= 60 ? 'warning' : 'danger',
        
        // Progress bar value
        progress_value: student.module_completion_rate
      })),
      top_performers: topPerformers,
      department_stats: departmentStats,
      course_stats: courseStats,
      filters_applied: {
        student_id,
        course_id,
        department_id,
        level_id,
        performance_category,
        min_gpa,
        max_gpa,
        sort_by,
        sort_order
      }
    });
    
  } catch (err) {
    console.error("❌ Error fetching student overall performance:", err);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch student overall performance", 
      details: err.message 
    });
  }
};

/**
 * ✅ GET Individual Student Detailed Performance
 */
export const getStudentDetailedPerformance = async (req, res) => {
  try {
    const { student_id } = req.params;
    
    if (!student_id) {
      return res.status(400).json({ 
        success: false, 
        error: "Student ID is required" 
      });
    }
    
    // Get student basic info with rankings
    const [studentInfo] = await pool.query(`
      SELECT 
        spr.*,
        cr.course_rank,
        cr.total_students_in_course,
        cr.course_percentile,
        dr.department_rank,
        dr.total_students_in_department,
        dr.department_percentile,
        orr.overall_rank,
        orr.total_students,
        orr.overall_percentile
      FROM student_performance_ranking spr
      LEFT JOIN course_rankings cr ON spr.student_id = cr.student_id AND spr.course_id = cr.course_id
      LEFT JOIN department_rankings dr ON spr.student_id = dr.student_id AND spr.department_id = dr.department_id
      LEFT JOIN overall_rankings orr ON spr.student_id = orr.student_id
      WHERE spr.student_id = ?
    `, [student_id]);
    
    if (studentInfo.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: "Student not found or no performance data available" 
      });
    }
    
    const student = studentInfo[0];
    
    // Get module-wise performance
    const [modulePerformance] = await pool.query(`
      SELECT 
        m.id as module_id,
        m.title as module_title,
        m.code as module_code,
        l.name as level_name,
        l.level_order,
        sm.status as module_status,
        sm.enrollment_date,
        sm.completion_date,
        sp.theory_marks,
        sp.practical_marks,
        (sp.theory_marks + sp.practical_marks) as total_marks,
        sp.grade,
        CASE 
          WHEN (sp.theory_marks + sp.practical_marks) >= 80 THEN 'Distinction'
          WHEN (sp.theory_marks + sp.practical_marks) >= 65 THEN 'Credit'
          WHEN (sp.theory_marks + sp.practical_marks) >= 50 THEN 'Pass'
          ELSE 'Fail'
        END as grade_category,
        DATEDIFF(sm.completion_date, sm.enrollment_date) as completion_days
      FROM student_modules sm
      JOIN modules m ON sm.module_id = m.id
      JOIN levels l ON m.level_id = l.id
      LEFT JOIN student_performance sp ON sm.student_id = sp.student_id AND sm.module_id = sp.module_id
      WHERE sm.student_id = ?
      ORDER BY l.level_order, m.title
    `, [student_id]);
    
    // Get performance by level
    const [levelPerformance] = await pool.query(`
      SELECT 
        l.id as level_id,
        l.name as level_name,
        l.level_order,
        COUNT(DISTINCT sm.module_id) as total_modules,
        COUNT(DISTINCT CASE WHEN sm.status = 'Completed' THEN sm.module_id END) as completed_modules,
        ROUND(AVG(sp.theory_marks + sp.practical_marks), 2) as avg_marks,
        ROUND(
          COUNT(DISTINCT CASE WHEN sm.status = 'Completed' THEN sm.module_id END) * 100.0 /
          NULLIF(COUNT(DISTINCT sm.module_id), 0), 
          2
        ) as completion_rate
      FROM student_modules sm
      JOIN modules m ON sm.module_id = m.id
      JOIN levels l ON m.level_id = l.id
      LEFT JOIN student_performance sp ON sm.student_id = sp.student_id AND sm.module_id = sp.module_id
      WHERE sm.student_id = ?
      GROUP BY l.id, l.name, l.level_order
      ORDER BY l.level_order
    `, [student_id]);
    
    // Get performance trend over time
    const [performanceTrend] = await pool.query(`
      SELECT 
        DATE_FORMAT(sm.completion_date, '%Y-%m') as month,
        COUNT(DISTINCT sm.module_id) as modules_completed,
        ROUND(AVG(sp.theory_marks + sp.practical_marks), 2) as avg_marks,
        ROUND(
          AVG(sp.theory_marks + sp.practical_marks) - 
          LAG(AVG(sp.theory_marks + sp.practical_marks)) OVER (ORDER BY MIN(sm.completion_date)), 
          2
        ) as marks_change
      FROM student_modules sm
      LEFT JOIN student_performance sp ON sm.student_id = sp.student_id AND sm.module_id = sp.module_id
      WHERE sm.student_id = ? AND sm.completion_date IS NOT NULL
      GROUP BY DATE_FORMAT(sm.completion_date, '%Y-%m')
      ORDER BY month
    `, [student_id]);
    
    // Get comparison with course average
    const [courseComparison] = await pool.query(`
      SELECT 
        c.name as course_name,
        s.overall_percentage as student_percentage,
        ROUND(AVG(s2.overall_percentage), 2) as course_avg_percentage,
        ROUND(s.overall_percentage - AVG(s2.overall_percentage), 2) as difference_from_avg,
        CASE 
          WHEN s.overall_percentage > AVG(s2.overall_percentage) THEN 'Above Average'
          WHEN s.overall_percentage < AVG(s2.overall_percentage) THEN 'Below Average'
          ELSE 'At Average'
        END as comparison_status
      FROM student_performance_ranking s
      CROSS JOIN student_performance_ranking s2
      WHERE s.student_id = ? 
        AND s2.course_id = s.course_id 
        AND s2.student_id != s.student_id
      GROUP BY c.name, s.overall_percentage
    `, [student_id]);
    
    // Get strengths and weaknesses (based on module performance)
    const [strengthsWeaknesses] = await pool.query(`
      SELECT 
        'Strength' as type,
        m.title as module_name,
        (sp.theory_marks + sp.practical_marks) as marks,
        sp.grade
      FROM student_performance sp
      JOIN modules m ON sp.module_id = m.id
      WHERE sp.student_id = ? 
        AND (sp.theory_marks + sp.practical_marks) >= 70
      ORDER BY (sp.theory_marks + sp.practical_marks) DESC
      LIMIT 5
      
      UNION ALL
      
      SELECT 
        'Weakness' as type,
        m.title as module_name,
        (sp.theory_marks + sp.practical_marks) as marks,
        sp.grade
      FROM student_performance sp
      JOIN modules m ON sp.module_id = m.id
      WHERE sp.student_id = ? 
        AND (sp.theory_marks + sp.practical_marks) < 50
      ORDER BY (sp.theory_marks + sp.practical_marks) ASC
      LIMIT 5
    `, [student_id, student_id]);
    
    // Get attendance data (if available)
    const [attendanceData] = await pool.query(`
      SELECT 
        DATE(a.date) as attendance_date,
        COUNT(*) as total_sessions,
        SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) as present_count,
        ROUND(
          SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) * 100.0 / 
          NULLIF(COUNT(*), 0), 
          2
        ) as attendance_rate
      FROM attendance a
      WHERE a.student_id = ?
        AND a.date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY DATE(a.date)
      ORDER BY attendance_date DESC
      LIMIT 30
    `, [student_id]);
    
    // Calculate overall statistics
    const totalModules = modulePerformance.length;
    const completedModules = modulePerformance.filter(m => m.module_status === 'Completed').length;
    const passedModules = modulePerformance.filter(m => 
      m.grade_category === 'Distinction' || 
      m.grade_category === 'Credit' || 
      m.grade_category === 'Pass'
    ).length;
    
    res.json({
      success: true,
      student: {
        ...student,
        overall_percentage: parseFloat(student.overall_percentage) || 0,
        average_marks: parseFloat(student.average_marks) || 0,
        gpa: parseFloat(student.gpa) || 0,
        weighted_score: parseFloat(student.weighted_score) || 0,
        module_completion_rate: parseFloat(student.module_completion_rate) || 0,
        
        // Additional calculated fields
        total_modules: totalModules,
        completed_modules: completedModules,
        passed_modules: passedModules,
        pass_rate: totalModules > 0 ? (passedModules / totalModules * 100).toFixed(2) : 0,
        
        // Rank badges and colors
        rank_badge: student.overall_rank <= 3 ? 
          (student.overall_rank === 1 ? '🥇' : 
           student.overall_rank === 2 ? '🥈' : '🥉') : '',
        
        performance_color: student.overall_percentage >= 80 ? 'success' :
                          student.overall_percentage >= 60 ? 'warning' : 'danger',
      },
      module_performance: modulePerformance,
      level_performance: levelPerformance,
      performance_trend: performanceTrend,
      course_comparison: courseComparison[0] || {},
      strengths_weaknesses: strengthsWeaknesses,
      attendance_data: attendanceData,
      statistics: {
        total_modules: totalModules,
        completed_modules: completedModules,
        passed_modules: passedModules,
        pass_rate: totalModules > 0 ? (passedModules / totalModules * 100).toFixed(2) : 0,
        avg_completion_days: modulePerformance
          .filter(m => m.completion_days)
          .reduce((sum, m) => sum + m.completion_days, 0) / 
          (modulePerformance.filter(m => m.completion_days).length || 1),
        theory_avg: modulePerformance
          .filter(m => m.theory_marks !== null)
          .reduce((sum, m) => sum + m.theory_marks, 0) / 
          (modulePerformance.filter(m => m.theory_marks !== null).length || 1),
        practical_avg: modulePerformance
          .filter(m => m.practical_marks !== null)
          .reduce((sum, m) => sum + m.practical_marks, 0) / 
          (modulePerformance.filter(m => m.practical_marks !== null).length || 1)
      }
    });
    
  } catch (err) {
    console.error("❌ Error fetching student detailed performance:", err);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch student detailed performance", 
      details: err.message 
    });
  }
};

/**
 * ✅ GET Performance Leaderboards
 */
export const getPerformanceLeaderboards = async (req, res) => {
  try {
    const { type = 'overall', limit = 20 } = req.query;
    
    let query = '';
    
    switch(type) {
      case 'overall':
        query = `
          SELECT 
            spr.student_id,
            spr.student_name,
            spr.department_name,
            spr.course_name,
            spr.overall_percentage,
            spr.gpa,
            orr.overall_rank,
            spr.performance_category,
            CASE 
              WHEN spr.overall_percentage >= 90 THEN 5
              WHEN spr.overall_percentage >= 80 THEN 4
              WHEN spr.overall_percentage >= 70 THEN 3
              WHEN spr.overall_percentage >= 60 THEN 2
              ELSE 1
            END as star_rating
          FROM student_performance_ranking spr
          LEFT JOIN overall_rankings orr ON spr.student_id = orr.student_id
          WHERE spr.overall_percentage IS NOT NULL
          ORDER BY spr.overall_percentage DESC
          LIMIT ?
        `;
        break;
        
      case 'by_department':
        query = `
          SELECT 
            spr.department_name,
            COUNT(DISTINCT spr.student_id) as student_count,
            ROUND(AVG(spr.overall_percentage), 2) as avg_percentage,
            ROUND(AVG(spr.gpa), 2) as avg_gpa,
            MAX(spr.overall_percentage) as top_percentage,
            MIN(spr.overall_percentage) as lowest_percentage,
            COUNT(CASE WHEN spr.performance_category = 'Excellent' THEN 1 END) as excellent_students,
            ROUND(
              COUNT(CASE WHEN spr.performance_category IN ('Excellent', 'Very Good', 'Good') THEN 1 END) * 100.0 /
              COUNT(DISTINCT spr.student_id), 
              2
            ) as success_rate
          FROM student_performance_ranking spr
          WHERE spr.overall_percentage IS NOT NULL
          GROUP BY spr.department_name
          ORDER BY avg_percentage DESC
          LIMIT ?
        `;
        break;
        
      case 'by_course':
        query = `
          SELECT 
            spr.course_name,
            spr.department_name,
            COUNT(DISTINCT spr.student_id) as student_count,
            ROUND(AVG(spr.overall_percentage), 2) as avg_percentage,
            ROUND(AVG(spr.gpa), 2) as avg_gpa,
            MAX(spr.overall_percentage) as top_percentage,
            ROUND(AVG(spr.module_completion_rate), 2) as avg_completion_rate
          FROM student_performance_ranking spr
          WHERE spr.overall_percentage IS NOT NULL
          GROUP BY spr.course_name, spr.department_name
          ORDER BY avg_percentage DESC
          LIMIT ?
        `;
        break;
        
      case 'improvement':
        // This would require historical data tracking
        query = `
          SELECT 
            spr.student_id,
            spr.student_name,
            spr.course_name,
            spr.overall_percentage as current_percentage,
            spr.gpa as current_gpa,
            NULL as previous_percentage,
            NULL as improvement_rate,
            orr.overall_rank
          FROM student_performance_ranking spr
          LEFT JOIN overall_rankings orr ON spr.student_id = orr.student_id
          WHERE spr.overall_percentage IS NOT NULL
          ORDER BY spr.overall_percentage DESC
          LIMIT ?
        `;
        break;
        
      case 'completion_speed':
        query = `
          SELECT 
            spr.student_id,
            spr.student_name,
            spr.course_name,
            spr.completed_modules,
            spr.total_modules,
            spr.module_completion_rate,
            CASE 
              WHEN spr.days_enrolled > 0 THEN 
                ROUND(spr.completed_modules * 30.0 / spr.days_enrolled, 2)
              ELSE 0
            END as modules_per_month,
            orr.overall_rank
          FROM student_performance_ranking spr
          LEFT JOIN overall_rankings orr ON spr.student_id = orr.student_id
          WHERE spr.completed_modules > 0
          ORDER BY modules_per_month DESC
          LIMIT ?
        `;
        break;
        
      default:
        return res.status(400).json({ 
          success: false, 
          error: "Invalid leaderboard type" 
        });
    }
    
    const [leaderboard] = await pool.query(query, [parseInt(limit)]);
    
    res.json({
      success: true,
      leaderboard_type: type,
      data: leaderboard,
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error("❌ Error fetching performance leaderboards:", err);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch performance leaderboards", 
      details: err.message 
    });
  }
};

/**
 * ✅ GET Performance Analytics and Insights
 */
export const getPerformanceAnalytics = async (req, res) => {
  try {
    const { department_id, course_id, level_id } = req.query;
    
    // Get overall statistics
    const [overallStats] = await pool.query(`
      SELECT 
        COUNT(DISTINCT student_id) as total_students,
        ROUND(AVG(overall_percentage), 2) as avg_percentage,
        ROUND(AVG(gpa), 2) as avg_gpa,
        ROUND(AVG(module_completion_rate), 2) as avg_completion_rate,
        MIN(overall_percentage) as min_percentage,
        MAX(overall_percentage) as max_percentage,
        STDDEV(overall_percentage) as percentage_stddev,
        
        -- Performance distribution
        COUNT(CASE WHEN overall_percentage >= 90 THEN 1 END) as percentage_90_100,
        COUNT(CASE WHEN overall_percentage >= 80 AND overall_percentage < 90 THEN 1 END) as percentage_80_89,
        COUNT(CASE WHEN overall_percentage >= 70 AND overall_percentage < 80 THEN 1 END) as percentage_70_79,
        COUNT(CASE WHEN overall_percentage >= 60 AND overall_percentage < 70 THEN 1 END) as percentage_60_69,
        COUNT(CASE WHEN overall_percentage >= 50 AND overall_percentage < 60 THEN 1 END) as percentage_50_59,
        COUNT(CASE WHEN overall_percentage < 50 THEN 1 END) as percentage_below_50,
        
        -- GPA distribution
        COUNT(CASE WHEN gpa >= 3.5 THEN 1 END) as gpa_35_plus,
        COUNT(CASE WHEN gpa >= 3.0 AND gpa < 3.5 THEN 1 END) as gpa_30_34,
        COUNT(CASE WHEN gpa >= 2.5 AND gpa < 3.0 THEN 1 END) as gpa_25_29,
        COUNT(CASE WHEN gpa >= 2.0 AND gpa < 2.5 THEN 1 END) as gpa_20_24,
        COUNT(CASE WHEN gpa < 2.0 THEN 1 END) as gpa_below_20
      FROM student_performance_ranking
      WHERE overall_percentage IS NOT NULL
    `);
    
    // Get department comparison
    const [departmentComparison] = await pool.query(`
      SELECT 
        department_name,
        COUNT(DISTINCT student_id) as student_count,
        ROUND(AVG(overall_percentage), 2) as avg_percentage,
        ROUND(AVG(gpa), 2) as avg_gpa,
        ROUND(AVG(module_completion_rate), 2) as avg_completion_rate,
        MAX(overall_percentage) as top_percentage,
        MIN(overall_percentage) as lowest_percentage,
        ROUND(STDDEV(overall_percentage), 2) as percentage_stddev,
        COUNT(CASE WHEN performance_category = 'Excellent' THEN 1 END) as excellent_count
      FROM student_performance_ranking
      WHERE overall_percentage IS NOT NULL
      GROUP BY department_name
      ORDER BY avg_percentage DESC
    `);
    
    // Get course comparison
    const [courseComparison] = await pool.query(`
      SELECT 
        course_name,
        department_name,
        COUNT(DISTINCT student_id) as student_count,
        ROUND(AVG(overall_percentage), 2) as avg_percentage,
        ROUND(AVG(gpa), 2) as avg_gpa,
        ROUND(AVG(module_completion_rate), 2) as avg_completion_rate,
        MAX(overall_percentage) as top_percentage,
        ROUND(STDDEV(overall_percentage), 2) as percentage_stddev
      FROM student_performance_ranking
      WHERE overall_percentage IS NOT NULL
      GROUP BY course_name, department_name
      ORDER BY avg_percentage DESC
      LIMIT 10
    `);
    
    // Get monthly performance trend
    const [monthlyTrend] = await pool.query(`
      SELECT 
        DATE_FORMAT(enrollment_date, '%Y-%m') as enrollment_month,
        COUNT(DISTINCT student_id) as new_students,
        ROUND(AVG(overall_percentage), 2) as avg_percentage
      FROM student_performance_ranking
      WHERE overall_percentage IS NOT NULL
        AND enrollment_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(enrollment_date, '%Y-%m')
      ORDER BY enrollment_month
    `);
    
    // Get correlation analysis (if we have more data)
    const [correlationAnalysis] = await pool.query(`
      SELECT 
        'Theory vs Practical' as analysis,
        ROUND(CORR(avg_theory_marks, avg_practical_marks), 4) as correlation_coefficient,
        COUNT(*) as sample_size
      FROM student_performance_ranking
      WHERE avg_theory_marks IS NOT NULL AND avg_practical_marks IS NOT NULL
      
      UNION ALL
      
      SELECT 
        'Completion Rate vs Performance' as analysis,
        ROUND(CORR(module_completion_rate, overall_percentage), 4) as correlation_coefficient,
        COUNT(*) as sample_size
      FROM student_performance_ranking
      WHERE module_completion_rate IS NOT NULL AND overall_percentage IS NOT NULL
      
      UNION ALL
      
      SELECT 
        'Attendance vs Performance' as analysis,
        NULL as correlation_coefficient,
        0 as sample_size
      FROM dual
    `);
    
    // Get top insights
    const insights = [
      {
        title: "Top Performing Department",
        value: departmentComparison[0]?.department_name || "N/A",
        metric: `${departmentComparison[0]?.avg_percentage || 0}% average`,
        type: "success"
      },
      {
        title: "Overall Performance Trend",
        value: "Stable",
        metric: monthlyTrend.length > 1 ? 
          `${((monthlyTrend[monthlyTrend.length-1]?.avg_percentage || 0) - (monthlyTrend[0]?.avg_percentage || 0)).toFixed(1)}% change` : 
          "Insufficient data",
        type: monthlyTrend.length > 1 && 
              (monthlyTrend[monthlyTrend.length-1]?.avg_percentage || 0) > (monthlyTrend[0]?.avg_percentage || 0) ? 
              "success" : "warning"
      },
      {
        title: "Performance Consistency",
        value: overallStats[0]?.percentage_stddev ? 
          (overallStats[0].percentage_stddev < 10 ? "High" : 
           overallStats[0].percentage_stddev < 20 ? "Moderate" : "Low") : "N/A",
        metric: overallStats[0]?.percentage_stddev ? 
          `Std Dev: ${overallStats[0].percentage_stddev.toFixed(1)}%` : "N/A",
        type: overallStats[0]?.percentage_stddev && overallStats[0].percentage_stddev < 15 ? 
              "success" : "warning"
      },
      {
        title: "Students Needing Support",
        value: overallStats[0]?.percentage_below_50 || 0,
        metric: `${((overallStats[0]?.percentage_below_50 || 0) * 100 / (overallStats[0]?.total_students || 1)).toFixed(1)}% of total`,
        type: "danger"
      }
    ];
    
    res.json({
      success: true,
      overall_statistics: overallStats[0],
      department_comparison: departmentComparison,
      course_comparison: courseComparison,
      monthly_trend: monthlyTrend,
      correlation_analysis: correlationAnalysis,
      insights: insights,
      filters_applied: {
        department_id,
        course_id,
        level_id
      }
    });
    
  } catch (err) {
    console.error("❌ Error fetching performance analytics:", err);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch performance analytics", 
      details: err.message 
    });
  }
};

/**
 * ✅ GET Export Student Performance Report
 */
export const exportStudentPerformanceReport = async (req, res) => {
  try {
    const { format = 'csv', type = 'detailed' } = req.query;
    
    let query = '';
    let filename = '';
    
    switch(type) {
      case 'summary':
        query = `
          SELECT 
            spr.student_id as "Student ID",
            spr.student_name as "Student Name",
            spr.department_name as "Department",
            spr.course_name as "Course",
            spr.level_name as "Level",
            spr.overall_percentage as "Overall Percentage",
            spr.average_marks as "Average Marks",
            spr.gpa as "GPA",
            spr.module_completion_rate as "Completion Rate",
            spr.performance_category as "Performance Category",
            cr.course_rank as "Course Rank",
            dr.department_rank as "Department Rank",
            orr.overall_rank as "Overall Rank"
          FROM student_performance_ranking spr
          LEFT JOIN course_rankings cr ON spr.student_id = cr.student_id AND spr.course_id = cr.course_id
          LEFT JOIN department_rankings dr ON spr.student_id = dr.student_id AND spr.department_id = dr.department_id
          LEFT JOIN overall_rankings orr ON spr.student_id = orr.student_id
          WHERE spr.overall_percentage IS NOT NULL
          ORDER BY orr.overall_rank
        `;
        filename = `student_performance_summary_${new Date().toISOString().split('T')[0]}`;
        break;
        
      case 'detailed':
        query = `
          SELECT 
            spr.student_id as "Student ID",
            spr.student_name as "Student Name",
            spr.department_name as "Department",
            spr.course_name as "Course",
            spr.level_name as "Level",
            spr.total_modules as "Total Modules",
            spr.completed_modules as "Completed Modules",
            spr.overall_percentage as "Overall Percentage",
            spr.average_marks as "Average Marks",
            spr.avg_theory_marks as "Theory Average",
            spr.avg_practical_marks as "Practical Average",
            spr.gpa as "GPA",
            spr.weighted_score as "Weighted Score",
            spr.distinction_count as "Distinctions",
            spr.credit_count as "Credits",
            spr.pass_count as "Passes",
            spr.fail_count as "Fails",
            spr.module_completion_rate as "Completion Rate",
            spr.performance_category as "Performance Category",
            cr.course_rank as "Course Rank",
            dr.department_rank as "Department Rank",
            orr.overall_rank as "Overall Rank",
            spr.amount_paid as "Amount Paid",
            spr.total_fee as "Total Fee",
            spr.payment_status as "Payment Status",
            spr.days_enrolled as "Days Enrolled"
          FROM student_performance_ranking spr
          LEFT JOIN course_rankings cr ON spr.student_id = cr.student_id AND spr.course_id = cr.course_id
          LEFT JOIN department_rankings dr ON spr.student_id = dr.student_id AND spr.department_id = dr.department_id
          LEFT JOIN overall_rankings orr ON spr.student_id = orr.student_id
          WHERE spr.overall_percentage IS NOT NULL
          ORDER BY orr.overall_rank
        `;
        filename = `student_performance_detailed_${new Date().toISOString().split('T')[0]}`;
        break;
        
      case 'leaderboard':
        query = `
          SELECT 
            spr.student_id as "Student ID",
            spr.student_name as "Student Name",
            spr.department_name as "Department",
            spr.course_name as "Course",
            spr.overall_percentage as "Overall Percentage",
            spr.gpa as "GPA",
            orr.overall_rank as "Rank",
            spr.performance_category as "Category",
            CASE 
              WHEN spr.overall_percentage >= 90 THEN '5 Stars'
              WHEN spr.overall_percentage >= 80 THEN '4 Stars'
              WHEN spr.overall_percentage >= 70 THEN '3 Stars'
              WHEN spr.overall_percentage >= 60 THEN '2 Stars'
              ELSE '1 Star'
            END as "Star Rating"
          FROM student_performance_ranking spr
          LEFT JOIN overall_rankings orr ON spr.student_id = orr.student_id
          WHERE spr.overall_percentage IS NOT NULL
          ORDER BY orr.overall_rank
          LIMIT 100
        `;
        filename = `performance_leaderboard_${new Date().toISOString().split('T')[0]}`;
        break;
        
      default:
        return res.status(400).json({ 
          success: false, 
          error: "Invalid export type" 
        });
    }
    
    const [rows] = await pool.query(query);
    
    if (format.toLowerCase() === 'csv') {
      // Set headers for CSV download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      
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
    } else if (format.toLowerCase() === 'json') {
      res.json({
        success: true,
        data: rows,
        metadata: {
          exported_at: new Date().toISOString(),
          total_records: rows.length,
          export_type: type
        }
      });
    } else {
      return res.status(400).json({ 
        success: false, 
        error: "Invalid export format. Use 'csv' or 'json'" 
      });
    }
    
  } catch (err) {
    console.error("❌ Error exporting student performance report:", err);
    res.status(500).json({ 
      success: false,
      error: "Failed to export student performance report", 
      details: err.message 
    });
  }
};

/**
 * ✅ GET Welcome message for ranking API
 */
export const getRankingWelcome = async (req, res) => {
  try {
    res.json({
      success: true,
      message: "Welcome to the Student Performance Ranking API",
      version: "1.0.0",
      available_endpoints: {
        "GET /api/ranking/overall": "Get overall student performance with rankings",
        "GET /api/ranking/student/:student_id": "Get detailed performance for a specific student",
        "GET /api/ranking/leaderboards": "Get performance leaderboards",
        "GET /api/ranking/analytics": "Get performance analytics and insights",
        "GET /api/ranking/export": "Export performance reports"
      },
      features: [
        "Multi-level rankings (Overall, Department, Course)",
        "Advanced performance metrics (GPA, Weighted Score, Completion Rate)",
        "Performance categories and star ratings",
        "Strengths and weaknesses analysis",
        "Performance trends and analytics",
        "Export to CSV/JSON",
        "Pagination and advanced filtering",
        "Comparison with course/department averages"
      ],
      filters_available: {
        student: "student_id",
        course: "course_id",
        department: "department_id",
        level: "level_id",
        performance_category: "Excellent/Very Good/Good/Average/Below Average/Poor",
        gpa_range: "min_gpa, max_gpa",
        sorting: "sort_by, sort_order",
        pagination: "page, limit"
      }
    });
  } catch (err) {
    console.error("❌ Error in ranking welcome:", err);
    res.status(500).json({ 
      success: false,
      error: "Failed to load ranking API info", 
      details: err.message 
    });
  }
};