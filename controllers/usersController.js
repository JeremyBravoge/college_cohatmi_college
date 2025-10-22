// controllers/usersController.js
import pool from "../config/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { authenticateToken } from "../middlewares/auth.js";


// GET current user
export const getCurrentUser = async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await pool.query(
      `SELECT 
         u.id, u.full_name, u.username, u.email, u.role, u.phone, u.status,
         u.branch_id, u.profile_image, u.created_at, u.updated_at,
         b.name AS branch_name
       FROM users u
       LEFT JOIN branches b ON u.branch_id = b.id
       WHERE u.id = ?`,
      [userId]
    );

    if (rows.length === 0) return res.status(404).json({ error: "User not found" });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ Register User with image upload
export const registerUser = async (req, res) => {
  try {
    const { full_name, username, email, password, role, branch_id, phone } = req.body;
    const profile_image = req.file ? req.file.filename : null; // save filename

    // Check if email already exists
    const [existingUser] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
    if (existingUser.length > 0) {
      return res.status(400).json({ error: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      `INSERT INTO users (full_name, username, email, password, role, branch_id, phone, profile_image)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [full_name, username, email, hashedPassword, role, branch_id, phone, profile_image]
    );

    res.status(201).json({ message: "User registered successfully", userId: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// ✅ Get All Users
// ✅ Get All Users
export const getAllUsers = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT 
         u.id, 
         u.full_name, 
         u.username, 
         u.email, 
         u.role, 
         u.phone, 
         u.status, 
         u.branch_id, 
         u.profile_image, 
         u.created_at, 
         u.updated_at,
         b.name AS branch_name
       FROM users u
       LEFT JOIN branches b ON u.branch_id = b.id`
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "No users found" });
    }

    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
// ✅ Login User
export const loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;
    const [rows] = await pool.query("SELECT * FROM users WHERE username = ?", [username]);

    if (rows.length === 0) return res.status(400).json({ error: "User not found" });

    const user = rows[0];
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { id: user.id, role: user.role },
      "secretkey", // ⚠️ use process.env.JWT_SECRET later
      { expiresIn: "1d" }
    );

    res.json({ message: "Login successful", token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
// GET /api/users/:id
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT 
         u.id, u.full_name, u.username, u.email, u.role, u.phone, u.status,
         u.branch_id, u.profile_image, u.created_at, u.updated_at,
         b.name AS branch_name
       FROM users u
       LEFT JOIN branches b ON u.branch_id = b.id
       WHERE u.id = ?`,
      [id]
    );

    if (rows.length === 0) return res.status(404).json({ error: "User not found" });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
// PUT /api/users/:id
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, username, email, role, branch_id, phone, status, password } = req.body;
    const profile_image = req.file ? req.file.filename : req.body.profile_image; // handle new upload or existing

    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // Build dynamic query based on provided fields
    let updateFields = [];
    let updateValues = [];

    if (full_name !== undefined) {
      updateFields.push("full_name = ?");
      updateValues.push(full_name);
    }
    if (username !== undefined) {
      updateFields.push("username = ?");
      updateValues.push(username);
    }
    if (email !== undefined) {
      updateFields.push("email = ?");
      updateValues.push(email);
    }
    if (role !== undefined) {
      updateFields.push("role = ?");
      updateValues.push(role);
    }
    if (branch_id !== undefined) {
      updateFields.push("branch_id = ?");
      updateValues.push(branch_id);
    }
    if (phone !== undefined) {
      updateFields.push("phone = ?");
      updateValues.push(phone);
    }
    if (status !== undefined) {
      updateFields.push("status = ?");
      updateValues.push(status);
    }
    if (profile_image !== undefined) {
      updateFields.push("profile_image = ?");
      updateValues.push(profile_image);
    }
    if (hashedPassword) {
      updateFields.push("password = ?");
      updateValues.push(hashedPassword);
    }

    updateFields.push("updated_at = NOW()");

    if (updateFields.length === 1) {
      return res.status(400).json({ error: "No fields to update" });
    }

    const query = `UPDATE users SET ${updateFields.join(", ")} WHERE id = ?`;
    updateValues.push(id);

    const [result] = await pool.query(query, updateValues);

    if (result.affectedRows === 0) return res.status(404).json({ error: "User not found" });

    // Return updated user
    const [updatedUser] = await pool.query(
      `SELECT
         u.id, u.full_name, u.username, u.email, u.role, u.phone, u.status,
         u.branch_id, u.profile_image, u.created_at, u.updated_at,
         b.name AS branch_name
       FROM users u
       LEFT JOIN branches b ON u.branch_id = b.id
       WHERE u.id = ?`,
      [id]
    );
    res.json(updatedUser[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
// DELETE /api/users/:id
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query("DELETE FROM users WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


