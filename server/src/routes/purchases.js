const router = require('express').Router();
const db = require('../config/database');
const { auth, adminAuth } = require('../middleware/auth');
const { uploadDocument, resolveUploadedFile } = require('../middleware/upload');

const notify = async (userId, title, message, type, relatedId = null) => {
  await db.query('INSERT INTO notifications (user_id, title, message, type, related_id) VALUES (?, ?, ?, ?, ?)', [userId, title, message, type, relatedId]);
};

router.get('/my', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const [[{ total }]] = await db.query('SELECT COUNT(*) as total FROM purchases WHERE user_id = ?', [req.user.id]);
    const [rows] = await db.query(
      `SELECT p.*, c.make, c.model, c.year, c.chassis_number, c.lot_number,
              a.name as auction_name, a.auction_date,
              ci.image_path as car_image,
              (SELECT COUNT(*) FROM documents d WHERE d.purchase_id = p.id) as doc_count
       FROM purchases p
       JOIN cars c ON c.id = p.car_id
       LEFT JOIN auctions a ON a.id = c.auction_id
       LEFT JOIN car_images ci ON ci.car_id = c.id AND ci.is_primary = 1
       WHERE p.user_id = ?
       ORDER BY p.purchased_at DESC
       LIMIT ? OFFSET ?`,
      [req.user.id, parseInt(limit), offset]
    );
    res.json({ purchases: rows, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT p.*, c.make, c.model, c.year, c.chassis_number, c.lot_number, c.color, c.mileage, c.grade, c.engine, c.transmission,
              a.name as auction_name, a.auction_date, a.location as auction_location,
              u.name as user_name, u.email as user_email, u.country as user_country, u.phone as user_phone,
              b.amount as bid_amount
       FROM purchases p
       JOIN cars c ON c.id = p.car_id
       LEFT JOIN auctions a ON a.id = c.auction_id
       JOIN users u ON u.id = p.user_id
       LEFT JOIN bids b ON b.id = p.bid_id
       WHERE p.id = ? ${req.user.role !== 'admin' ? 'AND p.user_id = ?' : ''}`,
      req.user.role !== 'admin' ? [req.params.id, req.user.id] : [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Purchase not found' });

    const [images] = await db.query('SELECT * FROM car_images WHERE car_id = ? ORDER BY is_primary DESC', [rows[0].car_id]);
    const [documents] = await db.query('SELECT * FROM documents WHERE purchase_id = ? ORDER BY uploaded_at DESC', [req.params.id]);

    res.json({ ...rows[0], images, documents });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/', adminAuth, async (req, res) => {
  try {
    const { shipping_status, page = 1, limit = 15 } = req.query;
    let where = '1=1';
    const params = [];
    if (shipping_status) { where += ' AND p.shipping_status = ?'; params.push(shipping_status); }
    const offset = (page - 1) * limit;
    const [[{ total }]] = await db.query(`SELECT COUNT(*) as total FROM purchases p WHERE ${where}`, params);
    const [rows] = await db.query(
      `SELECT p.*, c.make, c.model, c.year, u.name as user_name, u.email as user_email, u.country as user_country,
              ci.image_path as car_image,
              (SELECT COUNT(*) FROM documents d WHERE d.purchase_id = p.id) as doc_count
       FROM purchases p
       JOIN cars c ON c.id = p.car_id
       JOIN users u ON u.id = p.user_id
       LEFT JOIN car_images ci ON ci.car_id = c.id AND ci.is_primary = 1
       WHERE ${where}
       ORDER BY p.purchased_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );
    res.json({ purchases: rows, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', adminAuth, async (req, res) => {
  try {
    const { user_id, car_id, bid_id, final_amount, shipping_fee, insurance_fee, inspection_fee, destination_country, destination_port, notes } = req.body;
    const [result] = await db.query(
      `INSERT INTO purchases (user_id, car_id, bid_id, final_amount, shipping_fee, insurance_fee, inspection_fee, destination_country, destination_port, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [user_id, car_id, bid_id || null, final_amount, shipping_fee || 0, insurance_fee || 0, inspection_fee || 0, destination_country, destination_port, notes]
    );
    await db.query('UPDATE cars SET status = ? WHERE id = ?', ['sold', car_id]);
    if (bid_id) await db.query('UPDATE bids SET status = ? WHERE id = ?', ['won', bid_id]);

    const [car] = await db.query('SELECT make, model, year FROM cars WHERE id = ?', [car_id]);
    await notify(user_id, 'Purchase Confirmed!', `Your purchase of ${car[0].make} ${car[0].model} ${car[0].year} has been confirmed. Total: ¥${Number(final_amount).toLocaleString()}`, 'purchase', result.insertId);

    const [purchase] = await db.query('SELECT * FROM purchases WHERE id = ?', [result.insertId]);
    res.status(201).json(purchase[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id/shipping', adminAuth, async (req, res) => {
  try {
    const { shipping_status, tracking_number, vessel_name, eta, notes } = req.body;
    const [purchase] = await db.query('SELECT * FROM purchases WHERE id = ?', [req.params.id]);
    if (!purchase.length) return res.status(404).json({ message: 'Purchase not found' });

    await db.query(
      'UPDATE purchases SET shipping_status=?, tracking_number=?, vessel_name=?, eta=?, notes=? WHERE id=?',
      [shipping_status, tracking_number, vessel_name, eta, notes, req.params.id]
    );

    const statusLabels = { processing: 'Processing', in_transit: 'In Transit', at_port: 'At Port', customs: 'In Customs', delivered: 'Delivered' };
    await notify(purchase[0].user_id, `Shipping Update: ${statusLabels[shipping_status] || shipping_status}`, `Your vehicle shipping status has been updated to "${statusLabels[shipping_status]}". ${tracking_number ? `Tracking: ${tracking_number}` : ''}`, 'purchase', req.params.id);

    const [updated] = await db.query('SELECT * FROM purchases WHERE id = ?', [req.params.id]);
    res.json(updated[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/documents', adminAuth, uploadDocument.single('document'), async (req, res) => {
  try {
    const { type, name } = req.body;
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const [purchase] = await db.query('SELECT * FROM purchases WHERE id = ?', [req.params.id]);
    if (!purchase.length) return res.status(404).json({ message: 'Purchase not found' });

    const [result] = await db.query(
      'INSERT INTO documents (purchase_id, type, name, file_path, file_size, uploaded_by) VALUES (?, ?, ?, ?, ?, ?)',
      [req.params.id, type, name || req.file.originalname, await resolveUploadedFile(req.file, 'nipponbid/documents'), req.file.size, req.user.id]
    );

    const typeLabels = { auction_sheet: 'Auction Sheet', export_certificate: 'Export Certificate', bill_of_lading: 'Bill of Lading', inspection_report: 'Inspection Report', deregistration: 'Deregistration', customs_clearance: 'Customs Clearance', other: 'Document' };
    await notify(purchase[0].user_id, 'New Document Available', `A new document (${typeLabels[type] || type}) has been uploaded to your purchase.`, 'document', req.params.id);

    const [doc] = await db.query('SELECT * FROM documents WHERE id = ?', [result.insertId]);
    res.status(201).json(doc[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:purchaseId/documents/:docId', adminAuth, async (req, res) => {
  try {
    await db.query('DELETE FROM documents WHERE id = ? AND purchase_id = ?', [req.params.docId, req.params.purchaseId]);
    res.json({ message: 'Document deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
