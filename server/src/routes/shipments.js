const router = require('express').Router();
const db = require('../config/database');
const { auth, adminAuth } = require('../middleware/auth');
const { uploadDocument } = require('../middleware/upload');
const { normalizeDate } = require('../utils/dates');

router.get('/my', auth, async (req, res) => {
  try {
    const { ship_name, file_code, bl_code, chassis_number, etd_from, eta_from, page = 1, limit = 15 } = req.query;
    let where = ['p.user_id = ?'];
    const params = [req.user.id];

    if (ship_name) { where.push('s.ship_name LIKE ?'); params.push(`%${ship_name}%`); }
    if (file_code) { where.push('p.file_code LIKE ?'); params.push(`%${file_code}%`); }
    if (bl_code) { where.push('blr.bl_code LIKE ?'); params.push(`%${bl_code}%`); }
    if (chassis_number) { where.push('c.chassis_number LIKE ?'); params.push(`%${chassis_number}%`); }
    if (etd_from) { where.push('s.etd >= ?'); params.push(etd_from); }
    if (eta_from) { where.push('s.eta >= ?'); params.push(eta_from); }

    const offset = (page - 1) * limit;
    const countSql = `SELECT COUNT(*) as total FROM purchases p
      JOIN cars c ON c.id = p.car_id
      LEFT JOIN shipments s ON s.id = p.shipment_id
      LEFT JOIN bl_requests blr ON blr.purchase_id = p.id
      WHERE ${where.join(' AND ')}`;
    const [[{ total }]] = await db.query(countSql, params);

    const [rows] = await db.query(
      `SELECT p.id as purchase_id, p.file_code, p.final_amount, p.shipping_status,
              c.make, c.model, c.year, c.chassis_number, c.lot_number, c.grade, c.color, c.mileage, c.engine,
              a.name as auction_name, a.auction_date,
              s.ship_name, s.shipping_company, s.voyage, s.port_of_loading, s.port_of_discharge, s.etd, s.eta, s.bl_code, s.status as ship_status,
              s.document_path as vessel_doc_path, s.document_name as vessel_doc_name,
              blr.eto, blr.status as bl_status, blr.id as bl_request_id,
              blr.document_path as bl_doc_path, blr.document_name as bl_doc_name,
              ci.image_path as car_image,
              (SELECT COUNT(*) FROM documents d WHERE d.purchase_id = p.id) as doc_count
       FROM purchases p
       JOIN cars c ON c.id = p.car_id
       LEFT JOIN auctions a ON a.id = c.auction_id
       LEFT JOIN shipments s ON s.id = p.shipment_id
       LEFT JOIN bl_requests blr ON blr.purchase_id = p.id
       LEFT JOIN car_images ci ON ci.car_id = c.id AND ci.is_primary = 1
       WHERE ${where.join(' AND ')}
       ORDER BY s.eta ASC, p.purchased_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );
    res.json({ shipments: rows, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/', adminAuth, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM shipments ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', adminAuth, async (req, res) => {
  try {
    const { file_code, bl_code, ship_name, shipping_company, voyage, port_of_loading, port_of_discharge, etd, eta, notes } = req.body;
    const [result] = await db.query(
      'INSERT INTO shipments (file_code, bl_code, ship_name, shipping_company, voyage, port_of_loading, port_of_discharge, etd, eta, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [file_code, bl_code, ship_name, shipping_company, voyage, port_of_loading, port_of_discharge, normalizeDate(etd), normalizeDate(eta), notes]
    );
    const [row] = await db.query('SELECT * FROM shipments WHERE id = ?', [result.insertId]);
    res.status(201).json(row[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', adminAuth, async (req, res) => {
  try {
    const { file_code, bl_code, ship_name, shipping_company, voyage, port_of_loading, port_of_discharge, etd, eta, status, notes } = req.body;
    await db.query(
      'UPDATE shipments SET file_code=?, bl_code=?, ship_name=?, shipping_company=?, voyage=?, port_of_loading=?, port_of_discharge=?, etd=?, eta=?, status=?, notes=? WHERE id=?',
      [file_code || null, bl_code || null, ship_name || null, shipping_company || null, voyage || null, port_of_loading || null, port_of_discharge || null, normalizeDate(etd), normalizeDate(eta), status || null, notes || null, req.params.id]
    );
    if (file_code) {
      await db.query("UPDATE purchases SET shipment_id = ? WHERE file_code = ?", [req.params.id, file_code]);
    }
    const [row] = await db.query('SELECT * FROM shipments WHERE id = ?', [req.params.id]);
    res.json(row[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/by-file-code', adminAuth, async (req, res) => {
  try {
    const { file_code } = req.query;
    if (!file_code) return res.json(null);
    const [rows] = await db.query('SELECT * FROM shipments WHERE file_code = ? ORDER BY created_at DESC LIMIT 1', [file_code]);
    res.json(rows[0] || null);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/bl-requests', adminAuth, async (req, res) => {
  try {
    const { status, purchase_id } = req.query;
    let where = '1=1';
    const params = [];
    if (status)      { where += ' AND blr.status = ?';      params.push(status); }
    if (purchase_id) { where += ' AND blr.purchase_id = ?'; params.push(+purchase_id); }
    const [rows] = await db.query(
      `SELECT blr.*, c.make, c.model, c.year, ci.image_path as car_image,
              u.name as user_name, u.country as user_country, p.file_code, p.final_amount
       FROM bl_requests blr
       LEFT JOIN purchases p ON p.id = blr.purchase_id
       LEFT JOIN cars c ON c.id = p.car_id
       LEFT JOIN car_images ci ON ci.car_id = c.id AND ci.is_primary = 1
       LEFT JOIN users u ON u.id = p.user_id
       WHERE ${where} ORDER BY blr.created_at DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/bl-requests', adminAuth, async (req, res) => {
  try {
    const { purchase_id, file_code, chassis_number, shipping_company, ship_name, voyage, eto, eta, port_of_loading, port_of_discharge, status } = req.body;
    const safeEto = normalizeDate(eto);
    const safeEta = normalizeDate(eta);
    const [result] = await db.query(
      'INSERT INTO bl_requests (purchase_id, file_code, chassis_number, shipping_company, ship_name, voyage, eto, eta, port_of_loading, port_of_discharge, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [purchase_id, file_code || null, chassis_number || null, shipping_company || null, ship_name || null, voyage || null, safeEto, safeEta, port_of_loading || null, port_of_discharge || null, status || 'pending']
    );
    if (purchase_id) {
      await db.query(
        'UPDATE japan_purchases SET bl_status=?, eta=?, ship_name=?, shipping_company=?, voyage=? WHERE id=?',
        [status || 'pending', safeEta, ship_name || null, shipping_company || null, voyage || null, purchase_id]
      );
    }
    const [row] = await db.query('SELECT * FROM bl_requests WHERE id = ?', [result.insertId]);
    res.status(201).json(row[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/bl-requests/:id', adminAuth, async (req, res) => {
  try {
    const { file_code, chassis_number, status, shipping_company, ship_name, voyage, eto, eta, port_of_loading, port_of_discharge } = req.body;
    const safeEto = normalizeDate(eto);
    const safeEta = normalizeDate(eta);
    await db.query(
      'UPDATE bl_requests SET file_code=?, chassis_number=?, status=?, shipping_company=?, ship_name=?, voyage=?, eto=?, eta=?, port_of_loading=?, port_of_discharge=? WHERE id=?',
      [file_code || null, chassis_number || null, status, shipping_company || null, ship_name || null, voyage || null, safeEto, safeEta, port_of_loading || null, port_of_discharge || null, req.params.id]
    );
    const [[blr]] = await db.query('SELECT purchase_id FROM bl_requests WHERE id=?', [req.params.id]);
    if (blr?.purchase_id) {
      await db.query(
        'UPDATE japan_purchases SET bl_status=?, eta=?, ship_name=?, shipping_company=?, voyage=? WHERE id=?',
        [status || null, safeEta, ship_name || null, shipping_company || null, voyage || null, blr.purchase_id]
      );
    }
    const [row] = await db.query('SELECT * FROM bl_requests WHERE id = ?', [req.params.id]);
    res.json(row[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/document', adminAuth, uploadDocument.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file provided' });
    const filePath = `/uploads/documents/${req.file.filename}`;
    await db.query('UPDATE shipments SET document_path=?, document_name=? WHERE id=?',
      [filePath, req.file.originalname, req.params.id]);
    res.json({ document_path: filePath, document_name: req.file.originalname });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/bl-requests/:id/document', adminAuth, uploadDocument.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file provided' });
    const filePath = `/uploads/documents/${req.file.filename}`;
    await db.query('UPDATE bl_requests SET document_path=?, document_name=? WHERE id=?',
      [filePath, req.file.originalname, req.params.id]);
    res.json({ document_path: filePath, document_name: req.file.originalname });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/others', adminAuth, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM admin_others ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/others', adminAuth, uploadDocument.single('file'), async (req, res) => {
  try {
    const { title, category, description } = req.body;
    if (!title) return res.status(400).json({ message: 'Title is required' });
    const filePath = req.file ? `/uploads/documents/${req.file.filename}` : null;
    const fileName = req.file ? req.file.originalname : null;
    const [result] = await db.query(
      'INSERT INTO admin_others (title, category, description, file_path, file_name) VALUES (?, ?, ?, ?, ?)',
      [title, category || 'general', description || null, filePath, fileName]
    );
    const [[row]] = await db.query('SELECT * FROM admin_others WHERE id=?', [result.insertId]);
    res.status(201).json(row);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/others/:id', adminAuth, uploadDocument.single('file'), async (req, res) => {
  try {
    const { title, category, description } = req.body;
    const [[existing]] = await db.query('SELECT * FROM admin_others WHERE id=?', [req.params.id]);
    if (!existing) return res.status(404).json({ message: 'Not found' });
    const filePath = req.file ? `/uploads/documents/${req.file.filename}` : existing.file_path;
    const fileName = req.file ? req.file.originalname : existing.file_name;
    await db.query(
      'UPDATE admin_others SET title=?, category=?, description=?, file_path=?, file_name=? WHERE id=?',
      [title || existing.title, category || existing.category, description ?? existing.description, filePath, fileName, req.params.id]
    );
    const [[row]] = await db.query('SELECT * FROM admin_others WHERE id=?', [req.params.id]);
    res.json(row);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/others/:id', adminAuth, async (req, res) => {
  try {
    await db.query('DELETE FROM admin_others WHERE id=?', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
