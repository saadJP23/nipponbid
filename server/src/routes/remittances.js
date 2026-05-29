const router = require('express').Router();
const db = require('../config/database');
const { auth, adminAuth } = require('../middleware/auth');
const { uploadDocument } = require('../middleware/upload');
const path = require('path');

const notify = async (userId, title, message, type, relatedId = null) => {
  await db.query('INSERT INTO notifications (user_id, title, message, type, related_id) VALUES (?, ?, ?, ?, ?)', [userId, title, message, type, relatedId]);
};

const genRefNo = async () => {
  const [[{ max }]] = await db.query("SELECT MAX(CAST(SUBSTRING(ref_no, 4) AS UNSIGNED)) as max FROM remittances WHERE ref_no LIKE 'REM%'");
  return `REM${String((max || 0) + 1).padStart(5, '0')}`;
};

router.post('/', auth, uploadDocument.single('copy'), async (req, res) => {
  try {
    const { name, transfer_amount, deposit_amount, currency, exchange_pair, exchange_rate, bank_charge_1, bank_charge_2, payment_mode, remark, tt_date } = req.body;
    if (!transfer_amount) return res.status(400).json({ message: 'Transfer amount is required' });

    const ref_no = await genRefNo();
    const copy_path = req.file ? `/uploads/documents/${req.file.filename}` : null;

    const [result] = await db.query(
      `INSERT INTO remittances (user_id, ref_no, name, transfer_amount, deposit_amount, currency, exchange_pair, exchange_rate, bank_charge_1, bank_charge_2, payment_mode, remark, copy_path, tt_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, ref_no, name || null, transfer_amount, deposit_amount || 0, currency || 'JPY', exchange_pair || 'USD/JPY', exchange_rate || 0, bank_charge_1 || 0, bank_charge_2 || 0, payment_mode || 'bank', remark || null, copy_path, tt_date || null]
    );

    const [row] = await db.query('SELECT * FROM remittances WHERE id = ?', [result.insertId]);
    res.status(201).json(row[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/my', auth, async (req, res) => {
  try {
    const { status } = req.query;
    let where = 'user_id = ?';
    const params = [req.user.id];
    if (status) { where += ' AND status = ?'; params.push(status); }
    const [rows] = await db.query(`SELECT * FROM remittances WHERE ${where} ORDER BY created_at DESC`, params);
    const [[{ total_confirmed }]] = await db.query("SELECT COALESCE(SUM(deposit_amount), 0) as total_confirmed FROM remittances WHERE user_id = ? AND status = 'confirmed'", [req.user.id]);
    const [[{ total_pending }]] = await db.query("SELECT COALESCE(SUM(transfer_amount), 0) as total_pending FROM remittances WHERE user_id = ? AND status = 'pending'", [req.user.id]);
    res.json({ remittances: rows, total_confirmed, total_pending });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/', adminAuth, async (req, res) => {
  try {
    const { status, page = 1, limit = 25 } = req.query;
    let where = '1=1';
    const params = [];
    if (status) { where += ' AND r.status = ?'; params.push(status); }
    const offset = (page - 1) * limit;
    const [[{ total }]] = await db.query(`SELECT COUNT(*) as total FROM remittances r WHERE ${where}`, params);
    const [rows] = await db.query(
      `SELECT r.*, u.name as user_name, u.email as user_email
       FROM remittances r JOIN users u ON u.id = r.user_id
       WHERE ${where} ORDER BY r.created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );
    res.json({ remittances: rows, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id/confirm', adminAuth, async (req, res) => {
  try {
    const { deposit_amount, bank_charge_1, bank_charge_2, exchange_rate } = req.body;
    const [existing] = await db.query('SELECT * FROM remittances WHERE id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ message: 'Remittance not found' });

    await db.query(
      "UPDATE remittances SET status='confirmed', deposit_amount=?, bank_charge_1=?, bank_charge_2=?, exchange_rate=?, confirmed_at=NOW() WHERE id=?",
      [deposit_amount || existing[0].deposit_amount, bank_charge_1 || existing[0].bank_charge_1, bank_charge_2 || existing[0].bank_charge_2, exchange_rate || existing[0].exchange_rate, req.params.id]
    );

    await notify(existing[0].user_id, 'Remittance Confirmed', `Your remittance ${existing[0].ref_no} of ${existing[0].currency} ${Number(existing[0].transfer_amount).toLocaleString()} has been confirmed.`, 'general', req.params.id);

    const [updated] = await db.query('SELECT * FROM remittances WHERE id = ?', [req.params.id]);
    res.json(updated[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', adminAuth, async (req, res) => {
  try {
    await db.query('DELETE FROM remittances WHERE id = ?', [req.params.id]);
    res.json({ message: 'Remittance deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/admin-create', adminAuth, async (req, res) => {
  try {
    const {
      user_id, name, transfer_amount, deposit_amount, currency, exchange_pair,
      exchange_rate, bank_charge_1, bank_charge_2, payment_mode, remark, tt_date, status,
    } = req.body;
    if (!user_id || !transfer_amount) return res.status(400).json({ message: 'user_id and transfer_amount required' });

    const ref_no = await genRefNo();
    const [result] = await db.query(
      `INSERT INTO remittances
         (user_id, ref_no, name, transfer_amount, deposit_amount, currency, exchange_pair,
          exchange_rate, bank_charge_1, bank_charge_2, payment_mode, remark, tt_date, status,
          confirmed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user_id, ref_no, name || null, transfer_amount,
        deposit_amount || transfer_amount,
        currency || 'JPY', exchange_pair || 'USD/JPY',
        exchange_rate || 0, bank_charge_1 || 0, bank_charge_2 || 0,
        payment_mode || 'bank', remark || null, tt_date || null,
        status === 'confirmed' ? 'confirmed' : 'pending',
        status === 'confirmed' ? new Date() : null,
      ]
    );
    const [row] = await db.query('SELECT * FROM remittances WHERE id = ?', [result.insertId]);
    res.status(201).json(row[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
