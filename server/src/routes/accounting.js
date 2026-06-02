const router = require('express').Router();
const db = require('../config/database');
const { auth, adminAuth } = require('../middleware/auth');

const buildLedger = async (userId) => {
  const [remRows] = await db.query(
    `SELECT 'remittance' as entry_type, ref_no as ref, IFNULL(name, ref_no) as description,
            deposit_amount as credit, 0 as debit,
            COALESCE(tt_date, DATE(confirmed_at), created_at) as entry_date, id as source_id
     FROM remittances WHERE user_id = ? AND status = 'confirmed'`,
    [userId]
  );

  const [proRows] = await db.query(
    `SELECT 'proforma' as entry_type, invoice_no as ref, CONCAT('Proforma Invoice - ', IFNULL(sold_to, '')) as description,
            0 as credit, amount as debit, invoice_date as entry_date, id as source_id
     FROM proforma_invoices WHERE user_id = ?`,
    [userId]
  );

  const [finRows] = await db.query(
    `SELECT 'final' as entry_type, invoice_no as ref, CONCAT('Final Invoice', IF(file_code IS NOT NULL, CONCAT(' - ', file_code), '')) as description,
            0 as credit, amount as debit, invoice_date as entry_date, id as source_id
     FROM final_invoices WHERE user_id = ?`,
    [userId]
  );

  const [shinRows] = await db.query(
    `SELECT 'purchase' as entry_type,
            CONCAT('JP-', p.pid) as ref,
            CONCAT('Japan Purchase - ', c.make, ' ', c.model, ' (', c.year, ')') as description,
            0 as credit, p.total as debit,
            COALESCE(c.auction_date, DATE(p.created_at)) as entry_date, p.id as source_id
     FROM japan_purchases p
     JOIN japan_cars c ON c.pid = p.pid
     WHERE p.user_id = ? AND p.total IS NOT NULL AND p.total > 0`,
    [userId]
  );

  const [partsRows] = await db.query(
    `SELECT 'parts' as entry_type,
            CONCAT('PART-', id) as ref,
            CONCAT('Parts Purchase - ', item) as description,
            0 as credit, total as debit,
            COALESCE(purchased_date, DATE(created_at)) as entry_date, id as source_id
     FROM japan_parts_purchases
     WHERE user_id = ? AND total IS NOT NULL AND total > 0`,
    [userId]
  );

  const entries = [...remRows, ...proRows, ...finRows, ...shinRows, ...partsRows]
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
    const [[user]] = await db.query('SELECT id, name, email, country FROM users WHERE id = ?', [req.params.userId]);
    res.json({ user, ledger, totalCredit, totalDebit, balance });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/summary', adminAuth, async (req, res) => {
  try {
    const [users] = await db.query("SELECT id, name, email, country FROM users WHERE role = 'user' ORDER BY name");
    const summaries = await Promise.all(users.map(async (u) => {
      const ledger = await buildLedger(u.id);
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
