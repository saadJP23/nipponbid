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

router.post('/', auth, uploadDocument.single('receipt'), async (req, res) => {
  try {
    const { sender_name, deposit_amount, tt_date, remarks } = req.body;
    if (!deposit_amount) return res.status(400).json({ message: 'deposit_amount is required' });

    const ref_no = await genRefNo();
    const receipt_url = req.file ? `/uploads/documents/${req.file.filename}` : null;

    const [result] = await db.query(
      `INSERT INTO remittances (user_id, ref_no, sender_name, deposit_amount, tt_date, receipt_url, remarks)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, ref_no, sender_name || null, deposit_amount, tt_date || null, receipt_url, remarks || null]
    );

    const [row] = await db.query('SELECT * FROM remittances WHERE remittance_id = ?', [result.insertId]);
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
    const [[{ total_confirmed }]] = await db.query(
      "SELECT COALESCE(SUM(deposit_amount), 0) AS total_confirmed FROM remittances WHERE user_id = ? AND status = 'confirmed'",
      [req.user.id]
    );
    const [[{ total_pending }]] = await db.query(
      "SELECT COALESCE(SUM(deposit_amount), 0) AS total_pending FROM remittances WHERE user_id = ? AND status = 'pending'",
      [req.user.id]
    );
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
      `SELECT r.*, u.name AS user_name, u.email AS user_email
       FROM remittances r JOIN users u ON u.user_id = r.user_id
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
    const { deposit_amount, remarks } = req.body;
    const [existing] = await db.query('SELECT * FROM remittances WHERE remittance_id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ message: 'Remittance not found' });

    await db.query(
      "UPDATE remittances SET status='confirmed', deposit_amount=?, remarks=?, confirmed_at=NOW() WHERE remittance_id=?",
      [deposit_amount || existing[0].deposit_amount, remarks || existing[0].remarks, req.params.id]
    );

    await notify(existing[0].user_id, 'Remittance Confirmed',
      `Your remittance ${existing[0].ref_no} of ¥${Number(existing[0].deposit_amount).toLocaleString()} has been confirmed.`,
      'general', req.params.id
    );

    const [updated] = await db.query('SELECT * FROM remittances WHERE remittance_id = ?', [req.params.id]);
    res.json(updated[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', adminAuth, async (req, res) => {
  try {
    await db.query('DELETE FROM remittances WHERE remittance_id = ?', [req.params.id]);
    res.json({ message: 'Remittance deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/admin-create', adminAuth, async (req, res) => {
  try {
    const { user_id, sender_name, deposit_amount, tt_date, remarks, status } = req.body;
    if (!user_id || !deposit_amount) return res.status(400).json({ message: 'user_id and deposit_amount required' });

    const ref_no = await genRefNo();
    const isConfirmed = status === 'confirmed';
    const [result] = await db.query(
      `INSERT INTO remittances (user_id, ref_no, sender_name, deposit_amount, tt_date, remarks, status, confirmed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [user_id, ref_no, sender_name || null, deposit_amount, tt_date || null, remarks || null,
       isConfirmed ? 'confirmed' : 'pending', isConfirmed ? new Date() : null]
    );
    const [row] = await db.query('SELECT * FROM remittances WHERE remittance_id = ?', [result.insertId]);
    res.status(201).json(row[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
