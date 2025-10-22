// controllers/financeController.js
import pool from "../config/db.js";

// Get all finance records
export const getFinance = async (req, res) => {
  try {
    const query = `
      SELECT 
        f.id,
        f.student_id,
        f.total_amount,
        f.amount_paid,
        f.amount_pending,
        f.is_paid,
        f.payment_method,
        f.payment_date,
        s.first_name,
        s.last_name
      FROM fees f
      LEFT JOIN students s ON f.student_id = s.id
      ORDER BY f.id ASC
    `;
    const [rows] = await pool.query(query);

    const data = rows.map(record => ({
      id: record.id,
      student_name: `${record.first_name} ${record.last_name}`,
      total_amount: parseFloat(record.total_amount),
      amount_paid: parseFloat(record.amount_paid),
      amount_pending: parseFloat(record.amount_pending),
      status: record.is_paid ? "Paid" : "Pending",
      payment_method: record.payment_method,
      payment_date: record.payment_date ? record.payment_date.toISOString().split("T")[0] : null
    }));

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET all fees with student info
export const getFees = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT f.id AS fee_id, s.id AS student_id, s.first_name, s.last_name,
             d.fee_charge AS course_fee, f.amount_paid, f.amount_pending, f.is_paid
      FROM fees f
      JOIN students s ON s.id = f.student_id
      JOIN departments d ON d.id = s.department_id
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error fetching fees" });
  }
};

// POST a new payment
export const payFee = async (req, res) => {
  const { student_id, amount_paid, payment_method, reference } = req.body;

  if (!student_id || !amount_paid) {
    return res.status(400).json({ error: "Student ID and amount paid are required" });
  }

  try {
    // ✅ Only update allowed columns
    await pool.query(
      `UPDATE fees
       SET amount_paid = amount_paid + ?, 
           payment_method = ?, 
           payment_date = NOW()
       WHERE student_id = ?`,
      [amount_paid, payment_method || null, student_id]
    );

    // ✅ Record transaction
    await pool.query(
      `INSERT INTO transactions (student_id, amount, payment_method, reference)
       VALUES (?, ?, ?, ?)`,
      [student_id, amount_paid, payment_method || null, reference || null]
    );

    res.json({ message: "Payment recorded successfully" });
  } catch (err) {
    console.error("❌ Payment Error:", err);
    res.status(500).json({ error: "Server error recording payment" });
  }
};


// Node.js + Express example
export const getFeesSummary = async (req, res) => {
  const query = `
    SELECT d.name AS department, 
           SUM(f.total_amount) AS total_amount, 
           SUM(f.amount_paid) AS amount_paid,
           SUM(f.total_amount - f.amount_paid) AS amount_pending
    FROM fees f
    JOIN students s ON f.student_id = s.id
    JOIN departments d ON s.department_id = d.id
    GROUP BY d.id;
  `;
  try {
    const [rows] = await pool.query(query);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};


// Stub functions for add/update/delete to prevent route breakage
export const addFinance = async (req, res) => res.json({ message: "addFinance stub" });
export const updateFinance = async (req, res) => res.json({ message: "updateFinance stub" });
export const deleteFinance = async (req, res) => res.json({ message: "deleteFinance stub" });
