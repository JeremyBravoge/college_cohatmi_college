import pool from './config/db.js';

async function updateGrades() {
  try {
    // First, alter the grade column to accommodate longer strings
    await pool.query(`ALTER TABLE student_performance MODIFY COLUMN grade VARCHAR(15) DEFAULT NULL;`);
    console.log('Grade column altered successfully.');

    // Then, update the grades based on average marks
    await pool.query(`
      UPDATE student_performance
      SET grade = CASE
        WHEN (theory_marks + practical_marks) / 2 < 50 THEN 'FAIL'
        WHEN (theory_marks + practical_marks) / 2 >= 50 AND (theory_marks + practical_marks) / 2 < 70 THEN 'PASS'
        WHEN (theory_marks + practical_marks) / 2 >= 70 AND (theory_marks + practical_marks) / 2 < 80 THEN 'CREDIT'
        WHEN (theory_marks + practical_marks) / 2 >= 80 THEN 'DISTINCTION'
        ELSE 'FAIL'
      END;
    `);
    console.log('Grades updated successfully.');

  } catch (err) {
    console.error('Error updating grades:', err);
  } finally {
    process.exit();
  }
}

updateGrades();
