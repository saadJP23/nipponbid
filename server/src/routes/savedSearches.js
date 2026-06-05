const router = require('express').Router();
const db = require('../config/database');
const { auth } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT s.*, u.name AS creator_name FROM saved_searches s
       JOIN users u ON u.user_id = s.user_id
       WHERE s.user_id = ? ORDER BY s.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, filters } = req.body;
    if (!name || !filters) return res.status(400).json({ message: 'Name and filters required' });
    const [result] = await db.query(
      'INSERT INTO saved_searches (user_id, name, filters) VALUES (?, ?, ?)',
      [req.user.id, name, JSON.stringify(filters)]
    );
    const [row] = await db.query('SELECT * FROM saved_searches WHERE saved_search_id = ?', [result.insertId]);
    res.status(201).json(row[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM saved_searches WHERE saved_search_id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
