const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { auth } = require('../middleware/auth');

const sign = (user) =>
  jwt.sign({ id: user.user_id, email: user.email, role: user.role, type: user.type }, process.env.JWT_SECRET, { expiresIn: '7d' });

const USER_FIELDS = 'user_id, name, email, role, type, status, contact_number, country, city, created_at';

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, contact_number, country, city } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'Name, email and password required' });

    const [existing] = await db.query('SELECT user_id FROM users WHERE email = ?', [email]);
    if (existing.length) return res.status(409).json({ message: 'Email already registered' });

    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      'INSERT INTO users (name, email, password, contact_number, country, city) VALUES (?, ?, ?, ?, ?, ?)',
      [name, email, hash, contact_number || null, country || null, city || null]
    );

    const [rows] = await db.query(`SELECT ${USER_FIELDS} FROM users WHERE user_id = ?`, [result.insertId]);
    res.status(201).json({ token: sign(rows[0]), user: rows[0] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const [rows] = await db.query('SELECT * FROM users WHERE LOWER(email) = LOWER(?) AND status = ?', [email, 'active']);
    if (!rows.length) return res.status(401).json({ message: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, rows[0].password);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

    const { password: _, ...user } = rows[0];
    res.json({ token: sign(user), user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/me', auth, async (req, res) => {
  try {
    const [rows] = await db.query(`SELECT ${USER_FIELDS} FROM users WHERE user_id = ?`, [req.user.id]);
    if (!rows.length) return res.status(404).json({ message: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/profile', auth, async (req, res) => {
  try {
    const { name, contact_number, country, city } = req.body;
    await db.query(
      'UPDATE users SET name = ?, contact_number = ?, country = ?, city = ? WHERE user_id = ?',
      [name, contact_number, country, city, req.user.id]
    );
    const [rows] = await db.query(`SELECT ${USER_FIELDS} FROM users WHERE user_id = ?`, [req.user.id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const [rows] = await db.query('SELECT password FROM users WHERE user_id = ?', [req.user.id]);
    const valid = await bcrypt.compare(currentPassword, rows[0].password);
    if (!valid) return res.status(400).json({ message: 'Current password is incorrect' });
    const hash = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password = ? WHERE user_id = ?', [hash, req.user.id]);
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
