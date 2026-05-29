const router = require('express').Router();
const db = require('../config/database');
const { auth, adminAuth } = require('../middleware/auth');

const notify = async (userId, title, message, type, relatedId = null) => {
  await db.query(
    'INSERT INTO notifications (user_id, title, message, type, related_id) VALUES (?, ?, ?, ?, ?)',
    [userId, title, message, type, relatedId]
  );
};

router.post('/', auth, async (req, res) => {
  try {
    const { car_id, amount } = req.body;
    if (!car_id || !amount) return res.status(400).json({ message: 'Car ID and amount required' });

    const [car] = await db.query('SELECT * FROM cars WHERE id = ?', [car_id]);
    if (!car.length) return res.status(404).json({ message: 'Car not found' });
    if (car[0].status === 'sold') return res.status(400).json({ message: 'Car already sold' });

    const [result] = await db.query(
      'INSERT INTO bids (user_id, car_id, amount) VALUES (?, ?, ?)',
      [req.user.id, car_id, amount]
    );

    await db.query('UPDATE cars SET current_bid = GREATEST(COALESCE(current_bid, 0), ?) WHERE id = ?', [amount, car_id]);

    const [bid] = await db.query(
      `SELECT b.*, c.make, c.model, c.year, c.lot_number FROM bids b JOIN cars c ON c.id = b.car_id WHERE b.id = ?`,
      [result.insertId]
    );

    await notify(req.user.id, 'Bid Submitted', `Your bid of ¥${Number(amount).toLocaleString()} on ${car[0].make} ${car[0].model} has been submitted.`, 'bid', result.insertId);

    res.status(201).json(bid[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/my', auth, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    let where = 'b.user_id = ?';
    const params = [req.user.id];

    if (status) { where += ' AND b.status = ?'; params.push(status); }

    const offset = (page - 1) * limit;
    const [[{ total }]] = await db.query(`SELECT COUNT(*) as total FROM bids b WHERE ${where}`, params);
    const [rows] = await db.query(
      `SELECT b.*, c.make, c.model, c.year, c.lot_number, c.chassis_number, c.status as car_status,
              a.name as auction_name, a.auction_date,
              ci.image_path as car_image
       FROM bids b
       JOIN cars c ON c.id = b.car_id
       LEFT JOIN auctions a ON a.id = c.auction_id
       LEFT JOIN car_images ci ON ci.car_id = c.id AND ci.is_primary = 1
       WHERE ${where}
       ORDER BY b.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );
    res.json({ bids: rows, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/', adminAuth, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    let where = '1=1';
    const params = [];
    if (status) { where += ' AND b.status = ?'; params.push(status); }
    const offset = (page - 1) * limit;
    const [[{ total }]] = await db.query(`SELECT COUNT(*) as total FROM bids b WHERE ${where}`, params);
    const [rows] = await db.query(
      `SELECT b.*, u.name as user_name, u.email as user_email, u.country as user_country,
              c.make, c.model, c.year, c.lot_number,
              a.name as auction_name, a.auction_date,
              ci.image_path as car_image
       FROM bids b
       JOIN users u ON u.id = b.user_id
       JOIN cars c ON c.id = b.car_id
       LEFT JOIN auctions a ON a.id = c.auction_id
       LEFT JOIN car_images ci ON ci.car_id = c.id AND ci.is_primary = 1
       WHERE ${where}
       ORDER BY b.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );
    res.json({ bids: rows, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', adminAuth, async (req, res) => {
  try {
    const { status, admin_note } = req.body;
    const [existing] = await db.query(
      `SELECT b.*, c.make, c.model, u.id as user_id FROM bids b JOIN cars c ON c.id = b.car_id JOIN users u ON u.id = b.user_id WHERE b.id = ?`,
      [req.params.id]
    );
    if (!existing.length) return res.status(404).json({ message: 'Bid not found' });

    await db.query('UPDATE bids SET status = ?, admin_note = ? WHERE id = ?', [status, admin_note, req.params.id]);

    const car = `${existing[0].make} ${existing[0].model}`;
    const messages = {
      approved: `Your bid of ¥${Number(existing[0].amount).toLocaleString()} on ${car} has been approved!`,
      rejected: `Your bid on ${car} was not accepted. ${admin_note || ''}`,
      won: `Congratulations! You won the bid for ${car}. Our team will contact you shortly.`,
      lost: `Your bid on ${car} was unsuccessful. Better luck next time!`,
    };

    if (messages[status]) {
      await notify(existing[0].user_id, `Bid ${status.charAt(0).toUpperCase() + status.slice(1)}`, messages[status], 'bid', req.params.id);
    }

    const [updated] = await db.query('SELECT * FROM bids WHERE id = ?', [req.params.id]);
    res.json(updated[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
