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

// ── Admin: all shipments ────────────────────────────────────────────────────────
// Every purchase is implicitly a shipment now — LEFT JOINed so a purchase shows up
// here even before anyone has saved shipping info for it.
router.get('/', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const [[{ total }]] = await db.query('SELECT COUNT(*) as total FROM purchases');
    const [rows] = await db.query(
      `SELECT p.purchase_id, p.file_code_no, p.lot_no, p.destination,
              c.make, c.model, c.year, c.chassis_no,
              u.name AS user_name, u.country AS user_country,
              s.shipping_id, s.shipping_company, s.ship_name, s.voyage, s.route,
              s.etd, s.eta, s.result_of_inspection,
              bl.port_of_loading, bl.port_of_discharge, bl.status AS bl_status
       FROM purchases p
       JOIN cars c ON c.car_id = p.car_id
       JOIN users u ON u.user_id = p.user_id
       LEFT JOIN shipping s ON s.purchase_id = p.purchase_id
       LEFT JOIN bl ON bl.shipping_id = s.shipping_id
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [parseInt(limit), offset]
    );
    res.json({ shipments: rows, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Admin: save shipping info for a purchase (creates its shipping/BL rows the
// first time, updates them after) ───────────────────────────────────────────────
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const purchaseId = req.params.id;
    const { shipping_company, ship_name, voyage, route, etd, eta, result_of_inspection,
            port_of_loading, port_of_discharge, bl_status } = req.body;

    const [[purchase]] = await db.query('SELECT user_id FROM purchases WHERE purchase_id = ?', [purchaseId]);
    if (!purchase) return res.status(404).json({ message: 'Purchase not found' });

    const [[existingShipping]] = await db.query('SELECT shipping_id FROM shipping WHERE purchase_id = ?', [purchaseId]);
    let shippingId = existingShipping?.shipping_id;
    if (shippingId) {
      await db.query(
        'UPDATE shipping SET shipping_company=?, ship_name=?, voyage=?, route=?, etd=?, eta=?, result_of_inspection=? WHERE shipping_id=?',
        [shipping_company || null, ship_name || null, voyage || null, route || null,
         normalizeDate(etd), normalizeDate(eta), result_of_inspection || null, shippingId]
      );
    } else {
      const [result] = await db.query(
        'INSERT INTO shipping (purchase_id, user_id, shipping_company, ship_name, voyage, route, etd, eta, result_of_inspection) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [purchaseId, purchase.user_id, shipping_company || null, ship_name || null, voyage || null, route || null,
         normalizeDate(etd), normalizeDate(eta), result_of_inspection || null]
      );
      shippingId = result.insertId;
    }

    const [[existingBl]] = await db.query('SELECT bl_id FROM bl WHERE shipping_id = ?', [shippingId]);
    if (existingBl) {
      await db.query(
        'UPDATE bl SET port_of_loading=?, port_of_discharge=?, status=? WHERE bl_id=?',
        [port_of_loading || null, port_of_discharge || null, bl_status || 'pending', existingBl.bl_id]
      );
    } else {
      await db.query(
        'INSERT INTO bl (purchase_id, user_id, shipping_id, port_of_loading, port_of_discharge, status) VALUES (?, ?, ?, ?, ?, ?)',
        [purchaseId, purchase.user_id, shippingId, port_of_loading || null, port_of_discharge || null, bl_status || 'pending']
      );
    }

    res.json({ message: 'Saved' });
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

// Single shipment detail, keyed by purchase_id — includes every document uploaded
// for that purchase (whether added here or from the Purchases page) so nothing
// shipping-related is invisible just because of where it was uploaded.
// Placed after the literal `/bl-requests` routes above so it doesn't shadow them.
router.get('/:id', adminAuth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT p.purchase_id, p.file_code_no, p.lot_no, p.destination,
              c.make, c.model, c.year, c.chassis_no,
              u.name AS user_name, u.country AS user_country,
              s.shipping_id, s.shipping_company, s.ship_name, s.voyage, s.route,
              s.etd, s.eta, s.result_of_inspection,
              bl.port_of_loading, bl.port_of_discharge, bl.status AS bl_status
       FROM purchases p
       JOIN cars c ON c.car_id = p.car_id
       JOIN users u ON u.user_id = p.user_id
       LEFT JOIN shipping s ON s.purchase_id = p.purchase_id
       LEFT JOIN bl ON bl.shipping_id = s.shipping_id
       WHERE p.purchase_id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Purchase not found' });
    const [documents] = await db.query(
      'SELECT * FROM documents WHERE purchase_id = ? ORDER BY created_at DESC', [req.params.id]
    );
    res.json({ ...rows[0], documents });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/document', adminAuth, uploadDocument.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file provided' });
    const [[purchase]] = await db.query('SELECT user_id FROM purchases WHERE purchase_id=?', [req.params.id]);
    if (!purchase) return res.status(404).json({ message: 'Purchase not found' });
    const [[ship]] = await db.query('SELECT shipping_id FROM shipping WHERE purchase_id=?', [req.params.id]);
    const fileUrl = await resolveUploadedFile(req.file, 'nipponbid/documents');
    const [result] = await db.query(
      'INSERT INTO documents (purchase_id, user_id, shipping_id, name, type, url, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.params.id, purchase.user_id, ship?.shipping_id || null, req.file.originalname, 'user_and_admin', fileUrl, req.user.id]
    );
    const [doc] = await db.query('SELECT * FROM documents WHERE document_id = ?', [result.insertId]);
    res.status(201).json(doc[0]);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/:id/document/:docId', adminAuth, async (req, res) => {
  try {
    await db.query('DELETE FROM documents WHERE document_id = ? AND purchase_id = ?', [req.params.docId, req.params.id]);
    res.json({ message: 'Document deleted' });
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
