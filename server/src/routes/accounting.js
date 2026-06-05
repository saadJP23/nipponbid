const router = require('express').Router();
const db = require('../config/database');
const { auth, adminAuth } = require('../middleware/auth');

const buildLedger = async (userId) => {
  // Credits — confirmed remittances
  const [remRows] = await db.query(
    `SELECT 'remittance' AS entry_type,
            ref_no AS ref,
            IFNULL(sender_name, ref_no) AS description,
            deposit_amount AS credit, 0 AS debit,
            COALESCE(tt_date, DATE(confirmed_at), DATE(created_at)) AS entry_date,
            remittance_id AS source_id
     FROM remittances WHERE user_id = ? AND status = 'confirmed'`,
    [userId]
  );

  // Debits — car purchases (via purchase_details total)
  const [purchaseRows] = await db.query(
    `SELECT 'purchase' AS entry_type,
            CONCAT('P-', p.purchase_id) AS ref,
            CONCAT('Car Purchase - ', c.make, ' ', c.model, ' ', IFNULL(c.year,''), ' (', IFNULL(c.chassis_no,''), ')') AS description,
            0 AS credit, pd.total AS debit,
            COALESCE(p.auction_date, DATE(p.created_at)) AS entry_date,
            p.purchase_id AS source_id
     FROM purchases p
     JOIN cars c ON c.car_id = p.car_id
     JOIN purchase_details pd ON pd.purchase_id = p.purchase_id
     WHERE p.user_id = ? AND pd.total IS NOT NULL AND pd.total > 0`,
    [userId]
  );

  // Debits — parts purchases
  const [partsRows] = await db.query(
    `SELECT 'parts' AS entry_type,
            CONCAT('PART-', parts_purchase_id) AS ref,
            CONCAT('Parts Purchase - ', part_name) AS description,
            0 AS credit,
            (COALESCE(bid_price,0) + COALESCE(delivery_charges,0) + COALESCE(commission,0)) AS debit,
            DATE(created_at) AS entry_date,
            parts_purchase_id AS source_id
     FROM parts_purchases
     WHERE user_id = ? AND bid_price IS NOT NULL AND bid_price > 0`,
    [userId]
  );

  const entries = [...remRows, ...purchaseRows, ...partsRows]
    .sort((a, b) => new Date(a.entry_date) - new Date(b.entry_date));

  let balance = 0;
  return entries.map(e => {
    balance += Number(e.credit) - Number(e.debit);
    return { ...e, credit: Number(e.credit), debit: Number(e.debit), balance: Math.round(balance * 100) / 100 };
  });
};

router.get('/my', auth, async (req, res) => {
  try {
    const ledger = await buildLedger(req.user.id);
    const totalCredit = ledger.reduce((s, r) => s + r.credit, 0);
    const totalDebit = ledger.reduce((s, r) => s + r.debit, 0);
    const balance = totalCredit - totalDebit;
    res.json({ ledger, totalCredit, totalDebit, balance });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/user/:userId', adminAuth, async (req, res) => {
  try {
    const ledger = await buildLedger(req.params.userId);
    const totalCredit = ledger.reduce((s, r) => s + r.credit, 0);
    const totalDebit = ledger.reduce((s, r) => s + r.debit, 0);
    const balance = totalCredit - totalDebit;
    const [[user]] = await db.query('SELECT user_id, name, email, country FROM users WHERE user_id = ?', [req.params.userId]);
    res.json({ user, ledger, totalCredit, totalDebit, balance });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/summary', adminAuth, async (req, res) => {
  try {
    const [users] = await db.query("SELECT user_id, name, email, country FROM users WHERE role = 'user' ORDER BY name");
    const summaries = await Promise.all(users.map(async (u) => {
      const ledger = await buildLedger(u.user_id);
      const totalCredit = ledger.reduce((s, r) => s + r.credit, 0);
      const totalDebit = ledger.reduce((s, r) => s + r.debit, 0);
      return { ...u, totalCredit, totalDebit, balance: totalCredit - totalDebit };
    }));
    res.json(summaries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
