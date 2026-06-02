const router = require('express').Router();
const db = require('../config/database');
const { auth, adminAuth } = require('../middleware/auth');
const { uploadCarImages, resolveUploadedFiles } = require('../middleware/upload');
const path = require('path');

router.get('/auctions', async (req, res) => {
  try {
    const { status } = req.query;
    let query = 'SELECT *, (SELECT COUNT(*) FROM cars WHERE auction_id = auctions.id) as car_count FROM auctions';
    const params = [];
    if (status) { query += ' WHERE status = ?'; params.push(status); }
    query += ' ORDER BY auction_date ASC';
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/auctions/:id', async (req, res) => {
  try {
    const [auction] = await db.query('SELECT * FROM auctions WHERE id = ?', [req.params.id]);
    if (!auction.length) return res.status(404).json({ message: 'Auction not found' });
    const [cars] = await db.query(
      `SELECT c.*, ci.image_path as primary_image
       FROM cars c
       LEFT JOIN car_images ci ON ci.car_id = c.id AND ci.is_primary = 1
       WHERE c.auction_id = ?
       ORDER BY c.lot_number ASC`,
      [req.params.id]
    );
    res.json({ ...auction[0], cars });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { make, model, year_min, year_max, price_min, price_max, status, auction_id, search, page = 1, limit = 20 } = req.query;
    let where = ['1=1'];
    const params = [];

    if (make) { where.push('c.make LIKE ?'); params.push(`%${make}%`); }
    if (model) { where.push('c.model LIKE ?'); params.push(`%${model}%`); }
    if (year_min) { where.push('c.year >= ?'); params.push(year_min); }
    if (year_max) { where.push('c.year <= ?'); params.push(year_max); }
    if (price_min) { where.push('c.starting_price >= ?'); params.push(price_min); }
    if (price_max) { where.push('c.starting_price <= ?'); params.push(price_max); }
    if (status) { where.push('c.status = ?'); params.push(status); }
    if (auction_id) { where.push('c.auction_id = ?'); params.push(auction_id); }
    if (search) { where.push('(c.make LIKE ? OR c.model LIKE ? OR c.chassis_number LIKE ?)'); params.push(`%${search}%`, `%${search}%`, `%${search}%`); }

    const offset = (page - 1) * limit;
    const [[{ total }]] = await db.query(`SELECT COUNT(*) as total FROM cars c WHERE ${where.join(' AND ')}`, params);

    const [rows] = await db.query(
      `SELECT c.*, a.name as auction_name, a.auction_date, a.location as auction_location,
              ci.image_path as primary_image
       FROM cars c
       LEFT JOIN auctions a ON a.id = c.auction_id
       LEFT JOIN car_images ci ON ci.car_id = c.id AND ci.is_primary = 1
       WHERE ${where.join(' AND ')}
       ORDER BY a.auction_date ASC, c.lot_number ASC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    res.json({ cars: rows, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT c.*, a.name as auction_name, a.auction_date, a.location as auction_location, a.auction_house, a.status as auction_status
       FROM cars c LEFT JOIN auctions a ON a.id = c.auction_id
       WHERE c.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Car not found' });
    const [images] = await db.query('SELECT * FROM car_images WHERE car_id = ? ORDER BY is_primary DESC, sort_order ASC', [req.params.id]);
    const [bids] = await db.query('SELECT COUNT(*) as count, MAX(amount) as highest FROM bids WHERE car_id = ?', [req.params.id]);
    res.json({ ...rows[0], images, bid_count: bids[0].count, highest_bid: bids[0].highest });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/auctions', adminAuth, async (req, res) => {
  try {
    const { name, location, auction_house, auction_date, description } = req.body;
    const [result] = await db.query(
      'INSERT INTO auctions (name, location, auction_house, auction_date, description) VALUES (?, ?, ?, ?, ?)',
      [name, location, auction_house, auction_date, description]
    );
    const [rows] = await db.query('SELECT * FROM auctions WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/auctions/:id', adminAuth, async (req, res) => {
  try {
    const { name, location, auction_house, auction_date, status, description } = req.body;
    await db.query(
      'UPDATE auctions SET name=?, location=?, auction_house=?, auction_date=?, status=?, description=? WHERE id=?',
      [name, location, auction_house, auction_date, status, description, req.params.id]
    );
    const [rows] = await db.query('SELECT * FROM auctions WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', adminAuth, async (req, res) => {
  try {
    const { auction_id, lot_number, make, model, year, mileage, grade, chassis_number, engine, transmission, color, doors, seats, fuel_type, drive, starting_price, description } = req.body;
    const [result] = await db.query(
      `INSERT INTO cars (auction_id, lot_number, make, model, year, mileage, grade, chassis_number, engine, transmission, color, doors, seats, fuel_type, drive, starting_price, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [auction_id, lot_number, make, model, year, mileage, grade, chassis_number, engine, transmission, color, doors, seats, fuel_type, drive, starting_price, description]
    );
    const [rows] = await db.query('SELECT * FROM cars WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', adminAuth, async (req, res) => {
  try {
    const { auction_id, lot_number, make, model, year, mileage, grade, chassis_number, engine, transmission, color, doors, seats, fuel_type, drive, starting_price, current_bid, status, description } = req.body;
    await db.query(
      `UPDATE cars SET auction_id=?, lot_number=?, make=?, model=?, year=?, mileage=?, grade=?, chassis_number=?, engine=?, transmission=?, color=?, doors=?, seats=?, fuel_type=?, drive=?, starting_price=?, current_bid=?, status=?, description=? WHERE id=?`,
      [auction_id, lot_number, make, model, year, mileage, grade, chassis_number, engine, transmission, color, doors, seats, fuel_type, drive, starting_price, current_bid, status, description, req.params.id]
    );
    const [rows] = await db.query('SELECT * FROM cars WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/images', adminAuth, uploadCarImages.array('images', 20), async (req, res) => {
  try {
    const { id } = req.params;
    const { setPrimary } = req.body;
    const files = req.files;
    if (!files?.length) return res.status(400).json({ message: 'No images uploaded' });

    const [existing] = await db.query('SELECT COUNT(*) as count FROM car_images WHERE car_id = ?', [id]);
    const hasPrimary = existing[0].count === 0 || setPrimary === '0';

    const paths = await resolveUploadedFiles(files, 'nipponbid/car-images');
    const values = paths.map((p, i) => [id, p, i === 0 && hasPrimary, i]);
    await db.query('INSERT INTO car_images (car_id, image_path, is_primary, sort_order) VALUES ?', [values]);
    if (setPrimary && setPrimary !== '0') {
      await db.query('UPDATE car_images SET is_primary = 0 WHERE car_id = ?', [id]);
      await db.query('UPDATE car_images SET is_primary = 1 WHERE car_id = ? AND sort_order = 0', [id]);
    }
    const [images] = await db.query('SELECT * FROM car_images WHERE car_id = ?', [id]);
    res.json(images);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', adminAuth, async (req, res) => {
  try {
    await db.query('DELETE FROM cars WHERE id = ?', [req.params.id]);
    res.json({ message: 'Car deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/meta/makes', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT DISTINCT make FROM cars ORDER BY make ASC');
    res.json(rows.map(r => r.make));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
