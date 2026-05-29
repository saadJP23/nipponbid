const router = require('express').Router();
const db = require('../config/database');
const { auth } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT w.id as watchlist_id, w.created_at as added_at, c.*, a.name as auction_name, a.auction_date, ci.image_path as primary_image
       FROM watchlist w JOIN cars c ON c.id = w.car_id
       LEFT JOIN auctions a ON a.id = c.auction_id
       LEFT JOIN car_images ci ON ci.car_id = c.id AND ci.is_primary = 1
       WHERE w.user_id = ? ORDER BY w.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:carId', auth, async (req, res) => {
  try {
    await db.query('INSERT IGNORE INTO watchlist (user_id, car_id) VALUES (?, ?)', [req.user.id, req.params.carId]);
    res.json({ message: 'Added to watchlist' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:carId', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM watchlist WHERE user_id = ? AND car_id = ?', [req.user.id, req.params.carId]);
    res.json({ message: 'Removed from watchlist' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/check/:carId', auth, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id FROM watchlist WHERE user_id = ? AND car_id = ?', [req.user.id, req.params.carId]);
    res.json({ watching: rows.length > 0 });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
