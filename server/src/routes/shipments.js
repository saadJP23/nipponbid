const router = require('express').Router();
const db = require('../config/database');
const { auth, adminAuth } = require('../middleware/auth');
const { uploadDocument, resolveUploadedFile, resolveUploadedFiles } = require('../middleware/upload');
const { normalizeDate } = require('../utils/dates');

// ── User: my shipments ────────────────────────────────────────────────────────
router.get('/my', auth, async (req, res) => {
  try {
    const { page = 1, limit = 15 } = req.query;
    const offset = (page - 1) * limit;
    const [[{ total }]] = await db.query(
      'SELECT COUNT(*) as total FROM shipping WHERE user_id = ?', [req.user.id]
    );
    const [rows] = await db.query(
      `SELECT s.*, p.file_code_no, p.lot_no, p.destination,
              c.make, c.model, c.year, c.chassis_no, c.color, c.grade,
              a.auction_name,
              ci.url AS car_image,
              bl.port_of_loading, bl.port_of_discharge, bl.status AS bl_status
       FROM shipping s
       JOIN purchases p ON p.purchase_id = s.purchase_id
       JOIN cars c ON c.car_id = p.car_id
       LEFT JOIN auctions a ON a.auction_id = p.auction_id
       LEFT JOIN car_images ci ON ci.car_id = c.car_id AND ci.is_primary = 1
       LEFT JOIN bl ON bl.shipping_id = s.shipping_id
       WHERE s.user_id = ?
       ORDER BY s.eta ASC
       LIMIT ? OFFSET ?`,
      [req.user.id, parseInt(limit), offset]
    );
    res.json({ shipments: rows, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Admin: all shipments ──────────────────────────────────────────────────────
router.get('/', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const [[{ total }]] = await db.query('SELECT COUNT(*) as total FROM shipping');
    const [rows] = await db.query(
      `SELECT s.*, p.file_code_no, p.lot_no, p.destination,
              c.make, c.model, c.year, c.chassis_no,
              u.name AS user_name, u.country AS user_country,
              bl.port_of_loading, bl.port_of_discharge, bl.status AS bl_status
       FROM shipping s
       JOIN purchases p ON p.purchase_id = s.purchase_id
       JOIN cars c ON c.car_id = p.car_id
       JOIN users u ON u.user_id = s.user_id
       LEFT JOIN bl ON bl.shipping_id = s.shipping_id
       ORDER BY s.created_at DESC
       LIMIT ? OFFSET ?`,
      [parseInt(limit), offset]
    );
    res.json({ shipments: rows, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Admin: create shipment ────────────────────────────────────────────────────
router.post('/', adminAuth, async (req, res) => {
  try {
    const { purchase_id, user_id, shipping_company, ship_name, route, etd, eta, result_of_inspection } = req.body;
    if (!purchase_id || !user_id) return res.status(400).json({ message: 'purchase_id and user_id required' });
    const [result] = await db.query(
      'INSERT INTO shipping (purchase_id, user_id, shipping_company, ship_name, route, etd, eta, result_of_inspection) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [purchase_id, user_id, shipping_company || null, ship_name || null, route || null,
       normalizeDate(etd), normalizeDate(eta), result_of_inspection || null]
    );
    const [row] = await db.query('SELECT * FROM shipping WHERE shipping_id = ?', [result.insertId]);
    res.status(201).json(row[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Admin: update shipment ────────────────────────────────────────────────────
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const { shipping_company, ship_name, route, etd, eta, result_of_inspection } = req.body;
    await db.query(
      'UPDATE shipping SET shipping_company=?, ship_name=?, route=?, etd=?, eta=?, result_of_inspection=? WHERE shipping_id=?',
      [shipping_company || null, ship_name || null, route || null,
       normalizeDate(etd), normalizeDate(eta), result_of_inspection || null, req.params.id]
    );
    const [row] = await db.query('SELECT * FROM shipping WHERE shipping_id = ?', [req.params.id]);
    if (!row.length) return res.status(404).json({ message: 'Shipment not found' });
    res.json(row[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Admin: delete shipment ────────────────────────────────────────────────────
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    await db.query('DELETE FROM shipping WHERE shipping_id = ?', [req.params.id]);
    res.json({ message: 'Shipment deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── BL routes ─────────────────────────────────────────────────────────────────
router.get('/bl-requests', adminAuth, async (req, res) => {
  try {
    const { status, purchase_id } = req.query;
    let where = '1=1';
    const params = [];
    if (status)      { where += ' AND bl.status = ?';      params.push(status); }
    if (purchase_id) { where += ' AND bl.purchase_id = ?'; params.push(+purchase_id); }
    const [rows] = await db.query(
      `SELECT bl.*, c.make, c.model, c.year, ci.url AS car_image,
              u.name AS user_name, u.country AS user_country,
              p.file_code_no, p.lot_no,
              s.ship_name, s.shipping_company, s.etd, s.eta
       FROM bl
       LEFT JOIN purchases p ON p.purchase_id = bl.purchase_id
       LEFT JOIN cars c ON c.car_id = p.car_id
       LEFT JOIN car_images ci ON ci.car_id = c.car_id AND ci.is_primary = 1
       LEFT JOIN users u ON u.user_id = bl.user_id
       LEFT JOIN shipping s ON s.shipping_id = bl.shipping_id
       WHERE ${where} ORDER BY bl.created_at DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/bl-requests', adminAuth, async (req, res) => {
  try {
    const { purchase_id, car_id, user_id, shipping_id, port_of_loading, port_of_discharge, route, status } = req.body;
    const [result] = await db.query(
      'INSERT INTO bl (purchase_id, car_id, user_id, shipping_id, port_of_loading, port_of_discharge, route, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [purchase_id || null, car_id || null, user_id || null, shipping_id || null,
       port_of_loading || null, port_of_discharge || null, route || null, status || 'pending']
    );
    const [row] = await db.query('SELECT * FROM bl WHERE bl_id = ?', [result.insertId]);
    res.status(201).json(row[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/bl-requests/:id', adminAuth, async (req, res) => {
  try {
    const { port_of_loading, port_of_discharge, route, status, shipping_id } = req.body;
    await db.query(
      'UPDATE bl SET port_of_loading=?, port_of_discharge=?, route=?, status=?, shipping_id=? WHERE bl_id=?',
      [port_of_loading || null, port_of_discharge || null, route || null, status || 'pending', shipping_id || null, req.params.id]
    );
    const [row] = await db.query('SELECT * FROM bl WHERE bl_id = ?', [req.params.id]);
    res.json(row[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/document', adminAuth, uploadDocument.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file provided' });
    const [ship] = await db.query('SELECT purchase_id, user_id FROM shipping WHERE shipping_id=?', [req.params.id]);
    if (!ship.length) return res.status(404).json({ message: 'Shipment not found' });
    const fileUrl = await resolveUploadedFile(req.file, 'nipponbid/documents');
    const [result] = await db.query(
      'INSERT INTO documents (purchase_id, user_id, name, type, url, uploaded_by) VALUES (?, ?, ?, ?, ?, ?)',
      [ship[0].purchase_id, ship[0].user_id, req.file.originalname, 'user_and_admin', fileUrl, req.user.id]
    );
    const [doc] = await db.query('SELECT * FROM documents WHERE document_id = ?', [result.insertId]);
    res.status(201).json(doc[0]);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/bl-requests/:id/document', adminAuth, uploadDocument.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file provided' });
    const [[blRow]] = await db.query('SELECT purchase_id, user_id FROM bl WHERE bl_id=?', [req.params.id]);
    if (!blRow) return res.status(404).json({ message: 'BL not found' });
    const fileUrl = await resolveUploadedFile(req.file, 'nipponbid/documents');
    const [result] = await db.query(
      'INSERT INTO documents (purchase_id, user_id, name, type, url, uploaded_by) VALUES (?, ?, ?, ?, ?, ?)',
      [blRow.purchase_id, blRow.user_id, req.file.originalname, 'user_and_admin', fileUrl, req.user.id]
    );
    await db.query('UPDATE bl SET document_id = ? WHERE bl_id = ?', [result.insertId, req.params.id]);
    const [doc] = await db.query('SELECT * FROM documents WHERE document_id = ?', [result.insertId]);
    res.status(201).json(doc[0]);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/bl-requests/:id', adminAuth, async (req, res) => {
  try {
    await db.query('DELETE FROM bl WHERE bl_id = ?', [req.params.id]);
    res.json({ message: 'BL record deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/bl-requests/:id/document', adminAuth, async (req, res) => {
  try {
    await db.query('UPDATE bl SET document_id = NULL WHERE bl_id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
