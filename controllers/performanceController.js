import pool from "../config/db.js";

// Get performance data for a specific module
export const getModulePerformance = async (req, res) => {
  try {
    const { moduleId } = req.params;
    console.log(`Fetching performance data for module ${moduleId}...`);
    
    const [rows] = await pool.query(`
      SELECT 
        sp.id,
        sp.student_id,
        sp.module_id,
        sp.theory_marks,
        sp.practical_marks,
        (sp.theory_marks + sp.practical_marks) as total_marks,
        sp.grade,
        m.title as module_name,
        c.name as course_name,
        CONCAT(s.first_name, ' ', s.last_name) as student_name
      FROM student_performance sp
      JOIN modules m ON sp.module_id = m.id
      JOIN courses c ON m.course_id = c.id
      JOIN students s ON sp.student_id = s.id
      WHERE sp.module_id = ?
      ORDER BY total_marks DESC
    `, [moduleId]);
    
    console.log(`Found ${rows.length} performance records for module ${moduleId}`);
    res.json({
      success: true,
      data: rows,
      count: rows.length
    });
  } catch (error) {
    console.error('Performance API Error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};

// Get overall performance summary
export const getPerformanceSummary = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        COUNT(DISTINCT student_id) as total_students_assessed,
        COUNT(*) as total_assessments,
        ROUND(AVG(theory_marks + practical_marks), 2) as average_score,
        ROUND(AVG((theory_marks + practical_marks) / 100 * 100), 2) as average_percentage,
        COUNT(CASE WHEN (theory_marks + practical_marks) >= 80 THEN 1 END) as distinctions,
        COUNT(CASE WHEN (theory_marks + practical_marks) >= 70 AND (theory_marks + practical_marks) < 80 THEN 1 END) as credits,
        COUNT(CASE WHEN (theory_marks + practical_marks) >= 50 AND (theory_marks + practical_marks) < 70 THEN 1 END) as passes,
        COUNT(CASE WHEN (theory_marks + practical_marks) < 50 THEN 1 END) as fails
      FROM student_performance
    `);
    
    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error('Performance Summary API Error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};

// Get performance by student
export const getStudentPerformance = async (req, res) => {
  try {
    const { studentId } = req.params;
    
    const [rows] = await pool.query(`
      SELECT 
        sp.student_id,
        sp.module_id,
        m.title as module_name,
        c.name as course_name,
        l.name as level_name,
        sp.theory_marks,
        sp.practical_marks,
        (sp.theory_marks + sp.practical_marks) as total_marks,
        sp.grade,
        ROUND(((sp.theory_marks + sp.practical_marks) / 100 * 100), 2) as percentage
      FROM student_performance sp
      JOIN modules m ON sp.module_id = m.id
      JOIN courses c ON m.course_id = c.id
      JOIN levels l ON m.level_id = l.id
      WHERE sp.student_id = ?
      ORDER BY c.name, m.title
    `, [studentId]);
    
    res.json({
      success: true,
      data: rows,
      count: rows.length
    });
  } catch (error) {
    console.error('Student Performance API Error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};

// Get performance by course
export const getCoursePerformance = async (req, res) => {
  try {
    const { courseId } = req.params;
    
    const [rows] = await pool.query(`
      SELECT 
        m.id as module_id,
        m.title as module_name,
        l.name as level_name,
        COUNT(DISTINCT sp.student_id) as students_assessed,
        ROUND(AVG(sp.theory_marks + sp.practical_marks), 2) as average_score,
        ROUND(AVG((sp.theory_marks + sp.practical_marks) / 100 * 100), 2) as average_percentage,
        COUNT(CASE WHEN (sp.theory_marks + sp.practical_marks) >= 80 THEN 1 END) as distinctions,
        COUNT(CASE WHEN (sp.theory_marks + sp.practical_marks) >= 70 AND (sp.theory_marks + sp.practical_marks) < 80 THEN 1 END) as credits,
        COUNT(CASE WHEN (sp.theory_marks + sp.practical_marks) >= 50 AND (sp.theory_marks + sp.practical_marks) < 70 THEN 1 END) as passes,
        COUNT(CASE WHEN (sp.theory_marks + sp.practical_marks) < 50 THEN 1 END) as fails
      FROM modules m
      LEFT JOIN student_performance sp ON m.id = sp.module_id
      LEFT JOIN levels l ON m.level_id = l.id
      WHERE m.course_id = ?
      GROUP BY m.id, m.title, l.name
      ORDER BY l.name, m.title
    `, [courseId]);
    
    res.json({
      success: true,
      data: rows,
      count: rows.length
    });
  } catch (error) {
    console.error('Course Performance API Error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};

// Get modules by course and level - ADD THIS FUNCTION
export const getModulesByCourseAndLevel = async (req, res) => {
  try {
    const { courseId, levelId } = req.params;
    console.log(`Fetching modules for course ${courseId} and level ${levelId}...`);
    
    const [rows] = await pool.query(`
      SELECT 
        m.id,
        m.title,
        m.course_id,
        m.level_id,
        c.name as course_name,
        l.name as level_name,
        l.duration as level_duration,
        COUNT(DISTINCT sp.student_id) as students_assessed
      FROM modules m
      JOIN courses c ON m.course_id = c.id
      JOIN levels l ON m.level_id = l.id
      LEFT JOIN student_performance sp ON m.id = sp.module_id
      WHERE m.course_id = ? AND m.level_id = ?
      GROUP BY m.id, m.title, m.course_id, m.level_id, c.name, l.name, l.duration
      ORDER BY m.title
    `, [courseId, levelId]);
    
    console.log(`Found ${rows.length} modules for course ${courseId}, level ${levelId}`);
    res.json({
      success: true,
      data: rows,
      count: rows.length
    });
  } catch (error) {
    console.error('Modules API Error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};