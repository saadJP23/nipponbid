const router = require('express').Router();
const db = require('../config/database');
const { auth } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const [[{ total }]] = await db.query('SELECT COUNT(*) as total FROM notifications WHERE user_id = ?', [req.user.id]);
    const [[{ unread }]] = await db.query('SELECT COUNT(*) as unread FROM notifications WHERE user_id = ? AND is_read = 0', [req.user.id]);
    const [rows] = await db.query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [req.user.id, parseInt(limit), offset]
    );
    res.json({ notifications: rows, total, unread, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id/read', auth, async (req, res) => {
  try {
    await db.query('UPDATE notifications SET is_read = 1 WHERE notification_id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/read-all', auth, async (req, res) => {
  try {
    await db.query('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user.id]);
    res.json({ message: 'All marked as read' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM notifications WHERE notification_id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Notification deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
