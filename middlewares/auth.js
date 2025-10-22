import jwt from "jsonwebtoken";

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  jwt.verify(token, "secretkey", (err, user) => { // replace with process.env.JWT_SECRET
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user; // { id, role }
    next();
  });
};
