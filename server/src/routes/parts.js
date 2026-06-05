const router = require('express').Router();
const db = require('../config/database');
const { auth, adminAuth } = require('../middleware/auth');
const ExcelJS = require('exceljs');

const notify = async (userId, title, message, type, relatedId = null) => {
  await db.query('INSERT INTO notifications (user_id, title, message, type, related_id) VALUES (?, ?, ?, ?, ?)', [userId, title, message, type, relatedId]);
};

router.post('/', auth, async (req, res) => {
  try {
    const { part_name, part_description, platform_name, auction_id, quantity, bid_price,
            delivery_charges, bank_charges, shinchuo_commission, commission, delivery_company } = req.body;
    if (!part_name || !bid_price) return res.status(400).json({ message: 'part_name and bid_price required' });

    const [result] = await db.query(
      `INSERT INTO parts_purchases (user_id, part_name, part_description, platform_name, auction_id, quantity, bid_price, delivery_charges, bank_charges, shinchuo_commission, commission, delivery_company)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, part_name, part_description || null, platform_name || null, auction_id || null,
       quantity || 1, bid_price, delivery_charges || 0, bank_charges || 0,
       shinchuo_commission || 0, commission || 0, delivery_company || null]
    );

    await notify(req.user.id, 'Parts Request Submitted', `Your request for "${part_name}" has been submitted.`, 'parts', result.insertId);

    const [part] = await db.query('SELECT * FROM parts_purchases WHERE parts_purchase_id = ?', [result.insertId]);
    res.status(201).json(part[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/my', auth, async (req, res) => {
  try {
    const { status, type, page = 1, limit = 15 } = req.query;
    let where = 'user_id = ?';
    const params = [req.user.id];
    if (status) { where += ' AND status = ?'; params.push(status); }
    if (type) { where += ' AND type = ?'; params.push(type); }
    const offset = (page - 1) * limit;
    const [[{ total }]] = await db.query(`SELECT COUNT(*) as total FROM parts_purchases WHERE ${where}`, params);
    const [rows] = await db.query(
      `SELECT * FROM parts_purchases WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );
    res.json({ parts: rows, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/my/export', auth, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM parts_purchases WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('My Parts Orders');
    sheet.columns = [
      { header: 'ID',              key: 'parts_purchase_id', width: 8 },
      { header: 'Part Name',       key: 'part_name',         width: 25 },
      { header: 'Description',     key: 'part_description',  width: 35 },
      { header: 'Platform',        key: 'platform_name',     width: 15 },
      { header: 'Auction ID',      key: 'auction_id',        width: 18 },
      { header: 'Qty',             key: 'quantity',           width: 8 },
      { header: 'Bid Price (¥)',   key: 'bid_price',          width: 15 },
      { header: 'Delivery (¥)',    key: 'delivery_charges',   width: 15 },
      { header: 'Commission (¥)',  key: 'commission',         width: 15 },
      { header: 'Status',          key: 'status',             width: 14 },
      { header: 'Tracking #',      key: 'tracking_no',        width: 20 },
      { header: 'Date',            key: 'created_at',         width: 20 },
    ];
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A1A2E' } };
    rows.forEach(r => sheet.addRow({ ...r, created_at: r.created_at ? new Date(r.created_at).toLocaleDateString() : '' }));
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="nipponbid-parts-${Date.now()}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/admin-create', adminAuth, async (req, res) => {
  try {
    const { user_id, part_name, part_description, platform_name, auction_id, quantity,
            bid_price, delivery_charges, bank_charges, shinchuo_commission, commission,
            delivery_company, tracking_no, delivery_status, status, admin_note } = req.body;
    if (!user_id || !part_name) return res.status(400).json({ message: 'user_id and part_name required' });
    const [result] = await db.query(
      `INSERT INTO parts_purchases
        (user_id, part_name, part_description, platform_name, auction_id, quantity,
         bid_price, delivery_charges, bank_charges, shinchuo_commission, commission,
         delivery_company, tracking_no, delivery_status, status, admin_note)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [user_id, part_name, part_description||null, platform_name||null, auction_id||null,
       quantity||1, bid_price||0, delivery_charges||0, bank_charges||0,
       shinchuo_commission||0, commission||0, delivery_company||null,
       tracking_no||null, delivery_status||'pending', status||'pending', admin_note||null]
    );
    const [part] = await db.query(
      `SELECT p.*, u.name AS user_name, u.email AS user_email, u.country AS user_country
       FROM parts_purchases p JOIN users u ON u.user_id = p.user_id
       WHERE p.parts_purchase_id = ?`, [result.insertId]
    );
    res.status(201).json(part[0]);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/', adminAuth, async (req, res) => {
  try {
    const { status, type, page = 1, limit = 15 } = req.query;
    let where = '1=1';
    const params = [];
    if (status) { where += ' AND p.status = ?'; params.push(status); }
    if (type) { where += ' AND p.type = ?'; params.push(type); }
    const offset = (page - 1) * limit;
    const [[{ total }]] = await db.query(`SELECT COUNT(*) as total FROM parts_purchases p WHERE ${where}`, params);
    const [rows] = await db.query(
      `SELECT p.*, u.name AS user_name, u.email AS user_email, u.country AS user_country, u.contact_number AS user_phone
       FROM parts_purchases p JOIN users u ON u.user_id = p.user_id
       WHERE ${where} ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );
    res.json({ parts: rows, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', adminAuth, async (req, res) => {
  try {
    const { status, delivery_status, tracking_no, delivery_company, admin_note,
            delivery_charges, bank_charges, shinchuo_commission, commission } = req.body;
    const [existing] = await db.query('SELECT * FROM parts_purchases WHERE parts_purchase_id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ message: 'Parts order not found' });

    await db.query(
      `UPDATE parts_purchases SET
        status=?, delivery_status=?, tracking_no=?, delivery_company=?, admin_note=?,
        delivery_charges=?, bank_charges=?, shinchuo_commission=?, commission=?
       WHERE parts_purchase_id=?`,
      [status || existing[0].status,
       delivery_status || existing[0].delivery_status,
       tracking_no || existing[0].tracking_no,
       delivery_company || existing[0].delivery_company,
       admin_note || existing[0].admin_note,
       delivery_charges ?? existing[0].delivery_charges,
       bank_charges ?? existing[0].bank_charges,
       shinchuo_commission ?? existing[0].shinchuo_commission,
       commission ?? existing[0].commission,
       req.params.id]
    );

    const statusMessages = {
      processing: 'is being processed', ordered: 'has been ordered',
      shipped: 'has been shipped', delivered: 'has been delivered', cancelled: 'has been cancelled',
    };
    if (status && statusMessages[status]) {
      await notify(existing[0].user_id, `Parts Order ${status.charAt(0).toUpperCase() + status.slice(1)}`,
        `Your order for "${existing[0].part_name}" ${statusMessages[status]}.${tracking_no ? ` Tracking: ${tracking_no}` : ''}`,
        'parts', req.params.id);
    }

    const [updated] = await db.query('SELECT * FROM parts_purchases WHERE parts_purchase_id = ?', [req.params.id]);
    res.json(updated[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/export', adminAuth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT p.*, u.name AS user_name, u.email AS user_email, u.country
       FROM parts_purchases p JOIN users u ON u.user_id = p.user_id ORDER BY p.created_at DESC`
    );

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('All Parts Orders');
    sheet.columns = [
      { header: 'ID',             key: 'parts_purchase_id', width: 8 },
      { header: 'Customer',       key: 'user_name',          width: 20 },
      { header: 'Email',          key: 'user_email',         width: 25 },
      { header: 'Country',        key: 'country',            width: 15 },
      { header: 'Part Name',      key: 'part_name',          width: 25 },
      { header: 'Platform',       key: 'platform_name',      width: 15 },
      { header: 'Auction ID',     key: 'auction_id',         width: 18 },
      { header: 'Qty',            key: 'quantity',            width: 8 },
      { header: 'Bid Price (¥)',  key: 'bid_price',           width: 15 },
      { header: 'Delivery (¥)',   key: 'delivery_charges',    width: 15 },
      { header: 'Commission (¥)', key: 'commission',          width: 15 },
      { header: 'Status',         key: 'status',              width: 14 },
      { header: 'Tracking #',     key: 'tracking_no',         width: 20 },
      { header: 'Date',           key: 'created_at',          width: 20 },
    ];
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A1A2E' } };
    rows.forEach(row => sheet.addRow({ ...row, created_at: row.created_at ? new Date(row.created_at).toLocaleDateString() : '' }));

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="nipponbid-all-parts-${Date.now()}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
