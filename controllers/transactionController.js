import pool from "../config/db.js";

// ✅ Get all transactions (from the view `transaction_details`)
export const getTransactions = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM transaction_details ORDER BY date DESC"
    );
    res.json(rows);
  } catch (err) {
    console.error("Error fetching transactions:", err);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
};

// ✅ Get transaction by ID
export const getTransactionById = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM transaction_details WHERE transaction_no = ?", 
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("Error fetching transaction:", err);
    res.status(500).json({ error: "Failed to fetch transaction" });
  }
};

// ✅ Create new transaction
export const createTransaction = async (req, res) => {
  try {
    const { student_id, amount, payment_method, reference } = req.body;

    if (!student_id || !amount || !payment_method) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const [result] = await pool.query(
      "INSERT INTO transactions (student_id, amount, payment_method, reference) VALUES (?, ?, ?, ?)",
      [student_id, amount, payment_method, reference]
    );

    res
      .status(201)
      .json({ message: "Transaction created successfully", transactionId: result.insertId });
  } catch (err) {
    console.error("Error creating transaction:", err);
    res.status(500).json({ error: "Failed to create transaction" });
  }
};

// ✅ Delete transaction
export const deleteTransaction = async (req, res) => {
  try {
    const [result] = await pool.query(
      "DELETE FROM transactions WHERE id = ?", 
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    res.json({ message: "Transaction deleted successfully" });
  } catch (err) {
    console.error("Error deleting transaction:", err);
    res.status(500).json({ error: "Failed to delete transaction" });
  }
};
