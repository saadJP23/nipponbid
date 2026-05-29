const router = require('express').Router();
const db = require('../config/database');
const { auth } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const { visibility } = req.query;
    let where = '(user_id = ?';
    const params = [req.user.id];
    if (!visibility || visibility === 'shared') {
      where += " OR visibility = 'shared'";
    }
    where += ')';
    if (visibility === 'self') { where = 'user_id = ? AND visibility = ?'; params.push('self'); }
    const [rows] = await db.query(
      `SELECT s.*, u.name as creator_name FROM saved_searches s JOIN users u ON u.id = s.user_id WHERE ${where} ORDER BY s.created_at DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, filters, visibility } = req.body;
    if (!name || !filters) return res.status(400).json({ message: 'Name and filters required' });
    const [result] = await db.query(
      'INSERT INTO saved_searches (user_id, name, filters, visibility) VALUES (?, ?, ?, ?)',
      [req.user.id, name, JSON.stringify(filters), visibility || 'self']
    );
    const [row] = await db.query('SELECT * FROM saved_searches WHERE id = ?', [result.insertId]);
    res.status(201).json(row[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM saved_searches WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
