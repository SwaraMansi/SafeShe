const express = require('express');
const router = express.Router();
const db = require('../database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

router.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password required' });
  
  // Validate role - only 'user' or 'police' allowed
  let userRole = (role || 'user').toLowerCase();
  if (!['user', 'police'].includes(userRole)) userRole = 'user';
  
  try {
    const hashed = await bcrypt.hash(password, 10);
    const stmt = db.prepare('INSERT INTO users (name, email, password, role) VALUES (?,?,?,?)');
    stmt.run(name || '', email, hashed, userRole, function (err) {
      if (err) return res.status(400).json({ message: 'User exists or invalid data', error: err.message });
      const user = { id: this.lastID, name, email, role: userRole };
      const token = jwt.sign(user, SECRET, { expiresIn: '7d' });
      res.json({ token, user, message: `Registered as ${userRole}` });
    });
    stmt.finalize();
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, row) => {
    if (err) return res.status(500).json({ message: 'DB error', error: err.message });
    if (!row) return res.status(401).json({ message: 'Invalid credentials' });
    const match = await bcrypt.compare(password, row.password);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });
    const user = { id: row.id, name: row.name, email: row.email, role: row.role };
    const token = jwt.sign(user, SECRET, { expiresIn: '7d' });
    res.json({ token, user });
  });
});

module.exports = router;
