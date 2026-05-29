const router = require('express').Router();
const db = require('../config/database');
const { auth, adminAuth } = require('../middleware/auth');

router.get('/my', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM sub_clients WHERE user_id = ? ORDER BY name ASC',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/my', auth, async (req, res) => {
  try {
    const { name, username, email, mobile, address, country, city, contact_person, port, company_name, ship_terms, currency, lcc } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });
    const [result] = await db.query(
      `INSERT INTO sub_clients (user_id, name, username, email, mobile, address, country, city, contact_person, port, company_name, ship_terms, currency, lcc)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, name, username || null, email || null, mobile || null, address || null, country || null, city || null, contact_person || null, port || null, company_name || null, ship_terms || null, currency || 'JPY', lcc || null]
    );
    const [row] = await db.query('SELECT * FROM sub_clients WHERE id = ?', [result.insertId]);
    res.status(201).json(row[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/my/:id', auth, async (req, res) => {
  try {
    const { name, username, email, mobile, address, country, city, contact_person, port, company_name, ship_terms, currency, lcc, is_active } = req.body;
    const [existing] = await db.query('SELECT id FROM sub_clients WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!existing.length) return res.status(404).json({ message: 'Sub-client not found' });
    await db.query(
      `UPDATE sub_clients SET name=?, username=?, email=?, mobile=?, address=?, country=?, city=?, contact_person=?, port=?, company_name=?, ship_terms=?, currency=?, lcc=?, is_active=? WHERE id=?`,
      [name, username || null, email || null, mobile || null, address || null, country || null, city || null, contact_person || null, port || null, company_name || null, ship_terms || null, currency || 'JPY', lcc || null, is_active !== undefined ? is_active : 1, req.params.id]
    );
    const [row] = await db.query('SELECT * FROM sub_clients WHERE id = ?', [req.params.id]);
    res.json(row[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/my/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM sub_clients WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/', adminAuth, async (req, res) => {
  try {
    const { user_id } = req.query;
    let where = '1=1';
    const params = [];
    if (user_id) { where += ' AND sc.user_id = ?'; params.push(user_id); }
    const [rows] = await db.query(
      `SELECT sc.*, u.name as owner_name, u.email as owner_email
       FROM sub_clients sc JOIN users u ON u.id = sc.user_id
       WHERE ${where} ORDER BY u.name, sc.name`,
      params
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
