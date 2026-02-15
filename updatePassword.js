import pool from "./config/db.js";

const hash = "$2b$10$I/B/Kq4sR3xH5PrFceiXfukZeVdE9p3Kx/KYXICO2H0oCjaqklXcS";
const username = "Bravoge";

try {
  const result = await pool.query(
    "UPDATE users SET password = ? WHERE username = ?",
    [hash, username]
  );
  console.log(`✅ Updated password for user: ${username}`);
  console.log(`Rows affected: ${result[0].affectedRows}`);
  process.exit(0);
} catch (error) {
  console.error("❌ Error:", error.message);
  process.exit(1);
}
