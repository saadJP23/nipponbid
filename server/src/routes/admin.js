const router = require('express').Router();
const db = require('../config/database');
const { adminAuth } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

// ── Stats ─────────────────────────────────────────────────────────────────────
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const { date_from, date_to, user_id, country } = req.query;

    const pWhere = ['1=1'];
    const pParams = [];
    if (date_from) { pWhere.push('p.auction_date >= ?'); pParams.push(date_from); }
    if (date_to)   { pWhere.push('p.auction_date <= ?'); pParams.push(date_to); }
    if (user_id)   { pWhere.push('p.user_id = ?');       pParams.push(+user_id); }
    if (country)   { pWhere.push('u.country = ?');       pParams.push(country); }

    const remWhere = ["r.status = 'confirmed'"];
    const remParams = [];
    const remJoin = country ? 'JOIN users u ON u.user_id = r.user_id' : '';
    if (user_id)   { remWhere.push('r.user_id = ?');                                      remParams.push(+user_id); }
    if (country)   { remWhere.push('u.country = ?');                                      remParams.push(country); }
    if (date_from) { remWhere.push('COALESCE(r.tt_date, DATE(r.confirmed_at)) >= ?');     remParams.push(date_from); }
    if (date_to)   { remWhere.push('COALESCE(r.tt_date, DATE(r.confirmed_at)) <= ?');     remParams.push(date_to); }

    const invWhere = user_id ? 'AND user_id = ?' : '';
    const invParams = user_id ? [+user_id] : [];

    const [[{ total_users }]] = await db.query("SELECT COUNT(*) AS total_users FROM users WHERE role = 'user'");
    const [[{ pending_bids }]] = await db.query("SELECT COUNT(*) AS pending_bids FROM bids WHERE status = 'pending'");
    const [[{ total_parts }]] = await db.query(`SELECT COUNT(*) AS total_parts FROM parts_purchases WHERE 1=1 ${invWhere}`, invParams);
    const [[{ proforma_unpaid }]] = await db.query(
      `SELECT COALESCE(SUM(amount - paid_amount), 0) AS proforma_unpaid FROM proforma_invoices WHERE status != 'paid' ${invWhere}`, invParams
    );
    const [[{ final_unpaid }]] = await db.query(
      `SELECT COALESCE(SUM(amount - paid_amount), 0) AS final_unpaid FROM final_invoices WHERE status NOT IN ('paid','archived') ${invWhere}`, invParams
    );
    const [[{ total_purchases }]] = await db.query(
      `SELECT COUNT(*) AS total_purchases FROM purchases p JOIN users u ON u.user_id = p.user_id WHERE ${pWhere.join(' AND ')}`, pParams
    );
    const [[{ car_billed_total }]] = await db.query(
      `SELECT COALESCE(SUM(pd.total), 0) AS car_billed_total
       FROM purchase_details pd JOIN purchases p ON p.purchase_id = pd.purchase_id
       JOIN users u ON u.user_id = p.user_id WHERE ${pWhere.join(' AND ')}`, pParams
    );
    // Include parts_purchases in total billed (same as buildLedger)
    const ppWhere = ['pp.bid_price > 0'];
    const ppParams = [];
    if (user_id) { ppWhere.push('pp.user_id = ?'); ppParams.push(+user_id); }
    if (country) { ppWhere.push('u.country = ?');  ppParams.push(country); }
    const ppJoin = country ? 'JOIN users u ON u.user_id = pp.user_id' : '';
    const [[{ parts_billed_total }]] = await db.query(
      `SELECT COALESCE(SUM(COALESCE(bid_price,0) + COALESCE(delivery_charges,0) + COALESCE(commission,0)), 0) AS parts_billed_total
       FROM parts_purchases pp ${ppJoin} WHERE ${ppWhere.join(' AND ')}`, ppParams
    );
    const total_billed = Number(car_billed_total) + Number(parts_billed_total);
    const [[{ total_received }]] = await db.query(
      `SELECT COALESCE(SUM(r.deposit_amount), 0) AS total_received FROM remittances r ${remJoin} WHERE ${remWhere.join(' AND ')}`, remParams
    );
    const [[{ in_transit_count }]] = await db.query(
      `SELECT COUNT(*) AS in_transit_count FROM shipping s
       JOIN purchases p ON p.purchase_id = s.purchase_id
       JOIN users u ON u.user_id = p.user_id
       WHERE s.eta > CURDATE() AND ${pWhere.join(' AND ')}`, pParams
    );

    // Recent purchases
    const [recent_purchases] = await db.query(
      `SELECT p.purchase_id, p.file_code_no, p.auction_date, p.created_at,
              c.make, c.model, c.year, c.chassis_no,
              u.name AS user_name, u.country AS user_country,
              pd.total AS admin_total,
              ci.url AS car_image
       FROM purchases p
       JOIN cars c ON c.car_id = p.car_id
       JOIN users u ON u.user_id = p.user_id
       JOIN purchase_details pd ON pd.purchase_id = p.purchase_id
       LEFT JOIN car_images ci ON ci.car_id = c.car_id AND ci.is_primary = 1
       WHERE ${pWhere.join(' AND ')}
       ORDER BY p.created_at DESC LIMIT 5`, pParams
    );

    // Monthly billed
    const monthlyWhere = [...pWhere, 'p.auction_date IS NOT NULL'];
    if (!date_from && !date_to) {
      monthlyWhere.push("p.auction_date >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 11 MONTH), '%Y-%m-01')");
    }
    const [monthly_billed] = await db.query(
      `SELECT DATE_FORMAT(p.auction_date, '%Y-%m') AS month,
              COALESCE(SUM(pd.total), 0) AS billed, COUNT(*) AS sales
       FROM purchases p
       JOIN purchase_details pd ON pd.purchase_id = p.purchase_id
       JOIN users u ON u.user_id = p.user_id
       WHERE ${monthlyWhere.join(' AND ')}
       GROUP BY month ORDER BY month ASC`, pParams
    );

    // Monthly received
    const [monthly_received] = await db.query(
      `SELECT DATE_FORMAT(r.tt_date, '%Y-%m') AS month,
              COALESCE(SUM(r.deposit_amount), 0) AS received, COUNT(*) AS payments
       FROM remittances r ${remJoin}
       WHERE ${remWhere.join(' AND ')}
         AND r.tt_date >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 11 MONTH), '%Y-%m-01')
       GROUP BY month ORDER BY month ASC`, remParams
    );

    // Recent pending bids
    const [recent_bids] = await db.query(
      `SELECT b.bid_id, b.amount, b.status, b.created_at,
              u.name AS user_name, c.make, c.model, c.year
       FROM bids b
       JOIN users u ON u.user_id = b.user_id
       JOIN cars c ON c.car_id = b.car_id
       WHERE b.status = 'pending' ORDER BY b.created_at DESC LIMIT 5`
    );

    // In transit
    const [in_transit] = await db.query(
      `SELECT p.purchase_id, p.file_code_no,
              c.make, c.model, c.year, c.chassis_no,
              u.name AS user_name,
              s.ship_name, s.etd, s.eta, s.route
       FROM purchases p
       JOIN cars c ON c.car_id = p.car_id
       JOIN users u ON u.user_id = p.user_id
       JOIN shipping s ON s.purchase_id = p.purchase_id
       WHERE s.eta > CURDATE() AND ${pWhere.join(' AND ')}
       ORDER BY s.eta ASC LIMIT 20`, pParams
    );

    // Customer summary
    const [customer_rows] = await db.query(
      `SELECT u.user_id, u.name, u.country, u.type,
              COUNT(DISTINCT p.purchase_id) AS purchases,
              COALESCE(SUM(pd.total), 0) AS car_billed
       FROM purchases p
       JOIN users u ON u.user_id = p.user_id
       JOIN purchase_details pd ON pd.purchase_id = p.purchase_id
       WHERE ${pWhere.join(' AND ')}
       GROUP BY u.user_id ORDER BY car_billed DESC`, pParams
    );
    // Parts purchases billed per user
    const [partsBilled] = await db.query(
      `SELECT user_id, COALESCE(SUM(COALESCE(bid_price,0) + COALESCE(delivery_charges,0) + COALESCE(commission,0)), 0) AS parts_billed
       FROM parts_purchases WHERE bid_price > 0 GROUP BY user_id`
    );
    const partsMap = {};
    partsBilled.forEach(r => { partsMap[r.user_id] = Number(r.parts_billed); });
    const [perUserRec] = await db.query(
      `SELECT r.user_id, COALESCE(SUM(r.deposit_amount), 0) AS received
       FROM remittances r ${remJoin} WHERE ${remWhere.join(' AND ')}
       GROUP BY r.user_id`, remParams
    );
    const receivedMap = {};
    perUserRec.forEach(r => { receivedMap[r.user_id] = Number(r.received); });
    const customer_summary = customer_rows.map(row => ({
      ...row,
      total_billed:   Number(row.car_billed) + (partsMap[row.user_id] || 0),
      total_received: receivedMap[row.user_id] || 0,
      balance:        (receivedMap[row.user_id] || 0) - Number(row.car_billed) - (partsMap[row.user_id] || 0),
    }));

    const [users_list] = await db.query("SELECT user_id, name, country FROM users WHERE role = 'user' ORDER BY name");
    const [countries_list] = await db.query("SELECT DISTINCT country FROM users WHERE role = 'user' AND country IS NOT NULL AND country != '' ORDER BY country");

    res.json({
      stats: {
        total_users, pending_bids, total_purchases, total_parts,
        in_transit_count, proforma_unpaid, final_unpaid,
        total_billed: Number(total_billed),
        total_received: Number(total_received),
        receivable_amount: Math.max(0, Number(total_billed) - Number(total_received)),
      },
      recent_purchases, recent_bids, monthly_billed, monthly_received,
      in_transit, customer_summary, users_list, countries_list,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Users ─────────────────────────────────────────────────────────────────────
router.get('/users', adminAuth, async (req, res) => {
  try {
    const { search, type, page = 1, limit = 15 } = req.query;
    let where = "role = 'user'";
    const params = [];
    if (search) { where += ' AND (name LIKE ? OR email LIKE ? OR country LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    if (type)   { where += ' AND type = ?'; params.push(type); }
    const offset = (page - 1) * limit;
    const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM users WHERE ${where}`, params);
    const [rows] = await db.query(
      `SELECT u.user_id, u.name, u.email, u.contact_number, u.country, u.city,
              u.role, u.type, u.status, u.created_at,
              COUNT(DISTINCT b.bid_id) AS total_bids,
              COUNT(DISTINCT p.purchase_id) AS total_purchases
       FROM users u
       LEFT JOIN bids b      ON b.user_id = u.user_id
       LEFT JOIN purchases p ON p.user_id = u.user_id
       WHERE ${where}
       GROUP BY u.user_id ORDER BY u.created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );
    res.json({ users: rows, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/users/:id', adminAuth, async (req, res) => {
  try {
    const [[user]] = await db.query(
      `SELECT u.user_id, u.name, u.email, u.contact_number, u.country, u.city,
              u.role, u.type, u.status, u.created_at,
              COUNT(DISTINCT b.bid_id)      AS total_bids,
              COUNT(DISTINCT p.purchase_id) AS total_purchases
       FROM users u
       LEFT JOIN bids b      ON b.user_id = u.user_id
       LEFT JOIN purchases p ON p.user_id = u.user_id
       WHERE u.user_id = ? GROUP BY u.user_id`,
      [req.params.id]
    );
    if (!user) return res.status(404).json({ message: 'User not found' });

    const [[{ total_received }]] = await db.query(
      "SELECT COALESCE(SUM(deposit_amount),0) AS total_received FROM remittances WHERE user_id = ? AND status='confirmed'",
      [req.params.id]
    );
    const [[{ total_billed }]] = await db.query(
      `SELECT COALESCE(SUM(pd.total),0) AS total_billed
       FROM purchase_details pd JOIN purchases p ON p.purchase_id = pd.purchase_id
       WHERE p.user_id = ?`, [req.params.id]
    );
    res.json({ ...user, total_received: Number(total_received), total_billed: Number(total_billed), balance: Number(total_received) - Number(total_billed) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/users', adminAuth, async (req, res) => {
  try {
    const { name, email, password, contact_number, country, city, role, type } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'Name, email and password are required' });
    const [[exists]] = await db.query('SELECT user_id FROM users WHERE email = ?', [email]);
    if (exists) return res.status(409).json({ message: 'A user with this email already exists' });
    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      'INSERT INTO users (name, email, password, contact_number, country, city, role, type) VALUES (?,?,?,?,?,?,?,?)',
      [name, email, hash, contact_number || null, country || null, city || null,
       role === 'admin' ? 'admin' : 'user', type || 'ordinary']
    );
    const [[user]] = await db.query(
      'SELECT user_id, name, email, contact_number, country, city, role, type, status, created_at FROM users WHERE user_id=?',
      [result.insertId]
    );
    res.status(201).json(user);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/users/:id', adminAuth, async (req, res) => {
  try {
    const { name, email, contact_number, country, city, type } = req.body;
    await db.query(
      'UPDATE users SET name=?, email=?, contact_number=?, country=?, city=?, type=? WHERE user_id=?',
      [name || null, email || null, contact_number || null, country || null, city || null, type || null, req.params.id]
    );
    const [[user]] = await db.query(
      'SELECT user_id, name, email, contact_number, country, city, role, type, status, created_at FROM users WHERE user_id=?',
      [req.params.id]
    );
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/users/:id/toggle', adminAuth, async (req, res) => {
  try {
    const [[user]] = await db.query('SELECT status FROM users WHERE user_id = ?', [req.params.id]);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    await db.query('UPDATE users SET status = ? WHERE user_id = ?', [newStatus, req.params.id]);
    const [[updated]] = await db.query('SELECT user_id, name, email, status FROM users WHERE user_id = ?', [req.params.id]);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/notify', adminAuth, async (req, res) => {
  try {
    const { user_id, title, message, type } = req.body;
    if (user_id === 'all') {
      const [users] = await db.query("SELECT user_id FROM users WHERE role = 'user' AND status = 'active'");
      await Promise.all(users.map(u => db.query(
        'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
        [u.user_id, title, message, type || 'general']
      )));
      res.json({ message: `Notification sent to ${users.length} users` });
    } else {
      await db.query('INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)', [user_id, title, message, type || 'general']);
      res.json({ message: 'Notification sent' });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Settings (dealer_fee, etc.) ──────────────────────────────────────────────
router.get('/settings', adminAuth, async (req, res) => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS settings (
        key_name VARCHAR(100) PRIMARY KEY,
        value    VARCHAR(255) NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    const [rows] = await db.query('SELECT key_name, value FROM settings');
    const obj = {};
    rows.forEach(r => { obj[r.key_name] = r.value; });
    if (!obj.dealer_fee) obj.dealer_fee = '100000';
    res.json(obj);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/settings', adminAuth, async (req, res) => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS settings (
        key_name VARCHAR(100) PRIMARY KEY,
        value    VARCHAR(255) NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    const allowed = ['dealer_fee'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        await db.query(
          'INSERT INTO settings (key_name, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = ?',
          [key, String(req.body[key]), String(req.body[key])]
        );
      }
    }
    res.json({ message: 'Settings saved' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
