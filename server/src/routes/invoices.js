const router = require('express').Router();
const db = require('../config/database');
const { auth, adminAuth } = require('../middleware/auth');

const notify = async (userId, title, message, type, relatedId = null) => {
  await db.query('INSERT INTO notifications (user_id, title, message, type, related_id) VALUES (?, ?, ?, ?, ?)', [userId, title, message, type, relatedId]);
};

const genProformaNo = async () => {
  const [[{ max }]] = await db.query("SELECT MAX(CAST(SUBSTRING(invoice_no, 5) AS UNSIGNED)) as max FROM proforma_invoices WHERE invoice_no LIKE 'PRO-%'");
  return `PRO-${String((max || 0) + 1).padStart(5, '0')}`;
};

const genFinalNo = async () => {
  const [[{ max }]] = await db.query("SELECT MAX(CAST(SUBSTRING(invoice_no, 6) AS UNSIGNED)) as max FROM final_invoices WHERE invoice_no LIKE 'FINV-%'");
  return `FINV-${String((max || 0) + 1).padStart(5, '0')}`;
};

router.get('/proforma/my', auth, async (req, res) => {
  try {
    const { status } = req.query;
    let where = 'user_id = ?';
    const params = [req.user.id];
    if (status) { where += ' AND status = ?'; params.push(status); }
    const [rows] = await db.query(
      `SELECT * FROM proforma_invoices WHERE ${where} ORDER BY invoice_date DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/proforma', adminAuth, async (req, res) => {
  try {
    const { status, page = 1, limit = 25 } = req.query;
    let where = '1=1';
    const params = [];
    if (status) { where += ' AND pi.status = ?'; params.push(status); }
    const offset = (page - 1) * limit;
    const [[{ total }]] = await db.query(`SELECT COUNT(*) as total FROM proforma_invoices pi WHERE ${where}`, params);
    const [rows] = await db.query(
      `SELECT pi.*, u.name AS user_name, u.email AS user_email
       FROM proforma_invoices pi JOIN users u ON u.user_id = pi.user_id
       WHERE ${where} ORDER BY pi.invoice_date DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );
    res.json({ invoices: rows, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/proforma', adminAuth, async (req, res) => {
  try {
    const { user_id, purchase_id, invoice_date, due_date, sold_to, consigned_to, amount, notes } = req.body;
    if (!user_id || !invoice_date || !amount) return res.status(400).json({ message: 'user_id, invoice_date, amount required' });
    const invoice_no = await genProformaNo();
    const [result] = await db.query(
      'INSERT INTO proforma_invoices (user_id, purchase_id, invoice_no, invoice_date, due_date, sold_to, consigned_to, amount, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [user_id, purchase_id || null, invoice_no, invoice_date, due_date || null, sold_to || null, consigned_to || null, amount, notes || null]
    );
    await notify(user_id, 'New Proforma Invoice', `Proforma invoice ${invoice_no} of ¥${Number(amount).toLocaleString()} has been issued.`, 'invoice', result.insertId);
    const [row] = await db.query('SELECT * FROM proforma_invoices WHERE proforma_id = ?', [result.insertId]);
    res.status(201).json(row[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/proforma/:id', adminAuth, async (req, res) => {
  try {
    const { invoice_date, due_date, sold_to, consigned_to, amount, paid_amount, status, notes } = req.body;
    await db.query(
      'UPDATE proforma_invoices SET invoice_date=?, due_date=?, sold_to=?, consigned_to=?, amount=?, paid_amount=?, status=?, notes=? WHERE proforma_id=?',
      [invoice_date, due_date || null, sold_to || null, consigned_to || null, amount, paid_amount || 0, status, notes || null, req.params.id]
    );
    const [row] = await db.query('SELECT * FROM proforma_invoices WHERE proforma_id = ?', [req.params.id]);
    if (!row.length) return res.status(404).json({ message: 'Invoice not found' });
    res.json(row[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/proforma/:id', adminAuth, async (req, res) => {
  try {
    await db.query('DELETE FROM proforma_invoices WHERE proforma_id = ?', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/final/my', auth, async (req, res) => {
  try {
    const { status } = req.query;
    let where = "user_id = ? AND status != 'archived'";
    const params = [req.user.id];
    if (status === 'archived') { where = 'user_id = ? AND status = ?'; params.push('archived'); }
    else if (status) { where += ' AND status = ?'; params.push(status); }
    const [rows] = await db.query(
      `SELECT * FROM final_invoices WHERE ${where} ORDER BY invoice_date DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/final', adminAuth, async (req, res) => {
  try {
    const { status, page = 1, limit = 25 } = req.query;
    let where = '1=1';
    const params = [];
    if (status) { where += ' AND fi.status = ?'; params.push(status); }
    const offset = (page - 1) * limit;
    const [[{ total }]] = await db.query(`SELECT COUNT(*) as total FROM final_invoices fi WHERE ${where}`, params);
    const [rows] = await db.query(
      `SELECT fi.*, u.name AS user_name, u.email AS user_email
       FROM final_invoices fi JOIN users u ON u.user_id = fi.user_id
       WHERE ${where} ORDER BY fi.invoice_date DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );
    res.json({ invoices: rows, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/final', adminAuth, async (req, res) => {
  try {
    const { user_id, purchase_id, shipping_id, invoice_date, due_date, amount, notes } = req.body;
    if (!user_id || !invoice_date || !amount) return res.status(400).json({ message: 'user_id, invoice_date, amount required' });
    const invoice_no = await genFinalNo();
    const [result] = await db.query(
      'INSERT INTO final_invoices (user_id, purchase_id, shipping_id, invoice_no, invoice_date, due_date, amount, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [user_id, purchase_id || null, shipping_id || null, invoice_no, invoice_date, due_date || null, amount, notes || null]
    );
    await notify(user_id, 'New Final Invoice', `Final invoice ${invoice_no} of ¥${Number(amount).toLocaleString()} has been issued.`, 'invoice', result.insertId);
    const [row] = await db.query('SELECT * FROM final_invoices WHERE final_invoice_id = ?', [result.insertId]);
    res.status(201).json(row[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/final/:id', adminAuth, async (req, res) => {
  try {
    const { invoice_date, due_date, amount, paid_amount, status, notes } = req.body;
    await db.query(
      'UPDATE final_invoices SET invoice_date=?, due_date=?, amount=?, paid_amount=?, status=?, notes=? WHERE final_invoice_id=?',
      [invoice_date, due_date || null, amount, paid_amount || 0, status, notes || null, req.params.id]
    );
    const [row] = await db.query('SELECT * FROM final_invoices WHERE final_invoice_id = ?', [req.params.id]);
    if (!row.length) return res.status(404).json({ message: 'Invoice not found' });
    res.json(row[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/final/:id', adminAuth, async (req, res) => {
  try {
    await db.query('DELETE FROM final_invoices WHERE final_invoice_id = ?', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
