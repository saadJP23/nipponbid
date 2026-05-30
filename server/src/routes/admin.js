const router = require('express').Router();
const db = require('../config/database');
const { adminAuth } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

router.get('/stats', adminAuth, async (req, res) => {
  try {
    const { date_from, date_to, user_id, country } = req.query;

    const shinWhere = [];
    const shinP     = [];
    if (date_from) { shinWhere.push('c.auction_date >= ?'); shinP.push(date_from); }
    if (date_to)   { shinWhere.push('c.auction_date <= ?'); shinP.push(date_to);   }
    if (user_id)   { shinWhere.push('sp.user_id = ?');      shinP.push(+user_id);  }
    if (country)   { shinWhere.push('u.country = ?');       shinP.push(country);   }
    const shinW = shinWhere.length ? `WHERE ${shinWhere.join(' AND ')}` : '';

    const remWhere  = ["r.status = 'confirmed'"];
    const remP      = [];
    if (user_id) { remWhere.push('r.user_id = ?'); remP.push(+user_id); }
    if (country) { remWhere.push('u.country = ?'); remP.push(country);  }
    const remJoin = country ? 'JOIN users u ON u.id = r.user_id' : '';
    const remW    = `WHERE ${remWhere.join(' AND ')}`;

    const invWhere = [];
    const invP     = [];
    if (user_id) { invWhere.push('user_id = ?'); invP.push(+user_id); }
    const invW = invWhere.length ? `AND ${invWhere.join(' AND ')}` : '';

    const [[{ total_users }]] = await db.query("SELECT COUNT(*) as total_users FROM users WHERE role = 'user'");

    const shinBidWhere = ["sb.status = 'pending'"];
    const shinBidP     = [];
    if (user_id) { shinBidWhere.push('sb.user_id = ?'); shinBidP.push(+user_id); }
    if (country) { shinBidWhere.push('u.country = ?');  shinBidP.push(country); }
    const [[{ pending_bids }]] = await db.query(
      `SELECT COUNT(*) as pending_bids FROM japan_bids sb
       JOIN users u ON u.id = sb.user_id
       WHERE ${shinBidWhere.join(' AND ')}`, shinBidP
    );

    const [[{ total_parts }]] = await db.query(
      `SELECT COUNT(*) as total_parts FROM parts_purchases WHERE 1=1 ${invW}`, invP
    );

    const [[{ proforma_unpaid }]] = await db.query(
      `SELECT COALESCE(SUM(amount - paid_amount), 0) as proforma_unpaid
       FROM proforma_invoices WHERE status != 'paid' ${invW}`, invP
    );
    const [[{ final_unpaid }]] = await db.query(
      `SELECT COALESCE(SUM(amount - paid_amount), 0) as final_unpaid
       FROM final_invoices WHERE status NOT IN ('paid','archived') ${invW}`, invP
    );

    const BASE = `FROM japan_purchases sp JOIN japan_cars c ON c.pid = sp.pid JOIN users u ON u.id = sp.user_id ${shinW}`;

    const [[{ total_purchases }]] = await db.query(`SELECT COUNT(sp.id) as total_purchases ${BASE}`, shinP);
    const [[{ total_revenue }]]   = await db.query(`SELECT COALESCE(SUM(COALESCE(sp.commission,0) + COALESCE(sp.auction_commission,0)), 0) as total_revenue ${BASE}`, shinP);
    const [[{ total_billed }]]    = await db.query(`SELECT COALESCE(SUM(sp.total), 0) as total_billed ${BASE}`, shinP);
    const [[{ total_received }]]  = await db.query(`SELECT COALESCE(SUM(r.deposit_amount), 0) as total_received FROM remittances r ${remJoin} ${remW}`, remP);
    const remittance_confirmed = Number(total_received);

    const receivable_amount = Math.max(0, Number(total_billed) - Number(total_received));

    const [[{ in_transit_count }]] = await db.query(
      `SELECT COUNT(sp.id) as in_transit_count
       FROM japan_purchases sp JOIN japan_cars c ON c.pid = sp.pid JOIN users u ON u.id = sp.user_id
       ${shinW ? shinW + " AND sp.bl_status IN ('loaded','in_transit')" : "WHERE sp.bl_status IN ('loaded','in_transit')"}`,
      shinP
    );

    const [recent_purchases] = await db.query(
      `SELECT sp.id, sp.user_id, sp.total, sp.commission, sp.created_at,
              c.make, c.model, c.year, c.image_url, c.auction_date, c.chassis,
              u.name as user_name, u.country as user_country
       ${BASE} ORDER BY sp.created_at DESC LIMIT 6`,
      shinP
    );

    const monthlyWhere = [...shinWhere, 'c.auction_date IS NOT NULL', 'sp.total IS NOT NULL'];
    const monthlyP     = [...shinP];
    if (!date_from && !date_to) {
      monthlyWhere.push('c.auction_date >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 11 MONTH), \'%Y-%m-01\')');
    }
    const monthlyW    = `WHERE ${monthlyWhere.join(' AND ')}`;
    const MONTHLY_BASE = `FROM japan_purchases sp JOIN japan_cars c ON c.pid = sp.pid JOIN users u ON u.id = sp.user_id ${monthlyW}`;

    const [monthly_revenue] = await db.query(
      `SELECT DATE_FORMAT(c.auction_date, '%Y-%m') as month,
              COALESCE(SUM(COALESCE(sp.commission,0) + COALESCE(sp.auction_commission,0)), 0) as revenue,
              COUNT(*) as sales
       ${MONTHLY_BASE}
       GROUP BY month ORDER BY month ASC`,
      monthlyP
    );

    const [recent_bids] = await db.query(
      `SELECT sb.*, u.name as user_name, sc.make, sc.model, sc.year
       FROM japan_bids sb JOIN users u ON u.id = sb.user_id
       LEFT JOIN japan_cars sc ON sc.pid = sb.pid
       WHERE sb.status = 'pending' ORDER BY sb.created_at DESC LIMIT 5`
    );

    const [bid_stats] = await db.query(
      `SELECT sb.status, COUNT(*) as count FROM japan_bids sb
       JOIN users u ON u.id = sb.user_id
       ${shinBidWhere.length > 1 ? 'WHERE ' + shinBidWhere.slice(1).join(' AND ') : ''}
       GROUP BY sb.status`,
      shinBidP.slice(0)
    );

    const inTransitWhere = [...shinWhere, "sp.bl_status IN ('loaded','in_transit')"];
    const [in_transit] = await db.query(
      `SELECT sp.id as purchase_id, sp.file_code, sp.total, sp.bl_status,
              sc.make, sc.model, sc.year, sc.chassis,
              u.name as user_name,
              sp.ship_name, sp.eta, sp.etd, sp.destination as port_of_discharge
       FROM japan_purchases sp
       JOIN japan_cars sc ON sc.pid = sp.pid
       JOIN users u ON u.id = sp.user_id
       WHERE ${inTransitWhere.join(' AND ')}
       ORDER BY sp.eta ASC LIMIT 20`,
      [...shinP]
    );

    const [stock_by_make] = await db.query(
      `SELECT sc.make, COUNT(*) as count
       FROM japan_purchases sp
       JOIN japan_cars sc ON sc.pid = sp.pid
       JOIN users u ON u.id = sp.user_id
       ${shinW}
       GROUP BY sc.make ORDER BY count DESC LIMIT 10`,
      shinP
    );

    const [customer_rows] = await db.query(
      `SELECT u.id, u.name, u.country,
              COUNT(sp.id)                                                                    as purchases,
              COALESCE(SUM(sp.total), 0)                                                     as total_billed,
              COALESCE(SUM(COALESCE(sp.commission,0) + COALESCE(sp.auction_commission,0)), 0) as total_commission
       ${BASE}
       GROUP BY u.id, u.name, u.country
       ORDER BY total_billed DESC`,
      shinP
    );
    const [perUserRec] = await db.query(
      `SELECT r.user_id, COALESCE(SUM(r.deposit_amount), 0) as received
       FROM remittances r ${remJoin} ${remW}
       GROUP BY r.user_id`,
      remP
    );
    const receivedMap = {};
    perUserRec.forEach(r => { receivedMap[r.user_id] = Number(r.received); });
    const customer_summary = customer_rows.map(row => ({
      ...row,
      total_billed:    Number(row.total_billed),
      total_commission:Number(row.total_commission),
      total_received:  receivedMap[row.id] || 0,
      balance:         (receivedMap[row.id] || 0) - Number(row.total_billed),
    }));

    const [users_list] = await db.query(
      "SELECT id, name, country FROM users WHERE role = 'user' ORDER BY name"
    );
    const [countries_list] = await db.query(
      "SELECT DISTINCT country FROM users WHERE role = 'user' AND country IS NOT NULL AND country != '' ORDER BY country"
    );

    res.json({
      stats: { total_users, pending_bids, total_purchases, total_revenue, total_parts,
               in_transit_count, remittance_confirmed, proforma_unpaid, final_unpaid,
               receivable_amount, total_billed: Number(total_billed), total_received: Number(total_received) },
      recent_bids,
      recent_purchases,
      monthly_revenue,
      bid_stats,
      in_transit,
      stock_by_make,
      customer_summary,
      users_list,
      countries_list,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/users', adminAuth, async (req, res) => {
  try {
    const { search, page = 1, limit = 15 } = req.query;
    let where = "role = 'user'";
    const params = [];
    if (search) { where += ' AND (name LIKE ? OR email LIKE ? OR country LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    const offset = (page - 1) * limit;
    const [[{ total }]] = await db.query(`SELECT COUNT(*) as total FROM users WHERE ${where}`, params);
    const [rows] = await db.query(
      `SELECT u.id, u.name, u.email, u.phone, u.country, u.city, u.is_active, u.created_at,
              (COUNT(DISTINCT b.id) + COUNT(DISTINCT jb.id))  as total_bids,
              (COUNT(DISTINCT p.id) + COUNT(DISTINCT jp.id))  as total_purchases
       FROM users u
       LEFT JOIN bids b         ON b.user_id  = u.id
       LEFT JOIN purchases p    ON p.user_id  = u.id
       LEFT JOIN japan_bids jb  ON jb.user_id = u.id
       LEFT JOIN japan_purchases jp ON jp.user_id = u.id
       WHERE ${where}
       GROUP BY u.id ORDER BY u.created_at DESC LIMIT ? OFFSET ?`,
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
      `SELECT u.id, u.name, u.email, u.phone, u.country, u.city, u.is_active, u.created_at,
              COUNT(DISTINCT b.id)  as total_bids,
              COUNT(DISTINCT p.id)  as total_purchases,
              COUNT(DISTINCT sb.id) as total_japan_bids,
              COUNT(DISTINCT sp.id) as total_japan_purchases
       FROM users u
       LEFT JOIN bids b ON b.user_id = u.id
       LEFT JOIN purchases p ON p.user_id = u.id
       LEFT JOIN japan_bids sb ON sb.user_id = u.id
       LEFT JOIN japan_purchases sp ON sp.user_id = u.id
       WHERE u.id = ? GROUP BY u.id`,
      [req.params.id]
    );
    if (!user) return res.status(404).json({ message: 'User not found' });

    const [remRows] = await db.query(
      "SELECT COALESCE(SUM(deposit_amount),0) as total FROM remittances WHERE user_id = ? AND status='confirmed'",
      [req.params.id]
    );
    const [proRows] = await db.query(
      "SELECT COALESCE(SUM(amount),0) as total FROM proforma_invoices WHERE user_id = ?",
      [req.params.id]
    );
    const [finRows] = await db.query(
      "SELECT COALESCE(SUM(amount),0) as total FROM final_invoices WHERE user_id = ?",
      [req.params.id]
    );
    const [shinRows] = await db.query(
      "SELECT COALESCE(SUM(total),0) as total FROM japan_purchases WHERE user_id = ? AND total > 0",
      [req.params.id]
    );
    const totalCredit = Number(remRows[0].total);
    const totalDebit  = Number(proRows[0].total) + Number(finRows[0].total) + Number(shinRows[0].total);
    res.json({ ...user, totalCredit, totalDebit, balance: totalCredit - totalDebit });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/users', adminAuth, async (req, res) => {
  try {
    const { name, email, password, phone, country, city, role } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'Name, email and password are required' });
    const [[exists]] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (exists) return res.status(409).json({ message: 'A user with this email already exists' });
    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      'INSERT INTO users (name, email, password, phone, country, city, role, is_active) VALUES (?,?,?,?,?,?,?,1)',
      [name, email, hash, phone || null, country || null, city || null, role === 'admin' ? 'admin' : 'user']
    );
    const [[user]] = await db.query(
      'SELECT id, name, email, phone, country, city, role, is_active, created_at FROM users WHERE id=?',
      [result.insertId]
    );
    res.status(201).json(user);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/users/:id', adminAuth, async (req, res) => {
  try {
    const { name, email, phone, country, city } = req.body;
    await db.query(
      'UPDATE users SET name=?, email=?, phone=?, country=?, city=? WHERE id=?',
      [name || null, email || null, phone || null, country || null, city || null, req.params.id]
    );
    const [[user]] = await db.query(
      'SELECT id, name, email, phone, country, city, is_active, created_at FROM users WHERE id=?',
      [req.params.id]
    );
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/users/:id/toggle', adminAuth, async (req, res) => {
  try {
    await db.query('UPDATE users SET is_active = NOT is_active WHERE id = ?', [req.params.id]);
    const [user] = await db.query('SELECT id, name, email, is_active FROM users WHERE id = ?', [req.params.id]);
    res.json(user[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/notify', adminAuth, async (req, res) => {
  try {
    const { user_id, title, message, type } = req.body;
    if (user_id === 'all') {
      const [users] = await db.query("SELECT id FROM users WHERE role = 'user' AND is_active = 1");
      await Promise.all(users.map(u => db.query(
        'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
        [u.id, title, message, type || 'general']
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

const { cleanupOldCars } = require('../scripts/cleanupCars');

router.get('/cleanup-cars/preview', adminAuth, async (req, res) => {
  try {
    const stats = await cleanupOldCars(true);
    res.json(stats);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/cleanup-cars', adminAuth, async (req, res) => {
  try {
    const stats = await cleanupOldCars(false);
    res.json(stats);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/run-scraper', adminAuth, (req, res) => {
  const { spawn } = require('child_process');
  const path = require('path');
  const script = path.join(__dirname, '../scripts/shinchuoAgent.js');
  const child = spawn(process.execPath, [script], {
    detached: true,
    stdio: 'ignore',
    env: process.env,
  });
  child.unref();
  res.json({ message: 'Scraper started in background' });
});

module.exports = router;
