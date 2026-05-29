const router = require('express').Router();
const db = require('../config/database');
const { auth, adminAuth } = require('../middleware/auth');
const ExcelJS = require('exceljs');

const notify = async (userId, title, message, type, relatedId = null) => {
  await db.query('INSERT INTO notifications (user_id, title, message, type, related_id) VALUES (?, ?, ?, ?, ?)', [userId, title, message, type, relatedId]);
};

router.post('/', auth, async (req, res) => {
  try {
    const { type, platform_link, platform_name, chassis_number, car_make, car_model, car_year, part_name, part_description, bid_price, quantity } = req.body;
    if (!type || !part_name || !bid_price) return res.status(400).json({ message: 'Type, part name and bid price required' });
    if (type === 'online' && !platform_link) return res.status(400).json({ message: 'Platform link required for online purchase' });
    if (type === 'manufacturer' && (!chassis_number || !car_make || !car_model)) return res.status(400).json({ message: 'Chassis number, make and model required for manufacturer orders' });

    const [result] = await db.query(
      `INSERT INTO parts_purchases (user_id, type, platform_link, platform_name, chassis_number, car_make, car_model, car_year, part_name, part_description, bid_price, quantity)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, type, platform_link || null, platform_name || null, chassis_number || null, car_make || null, car_model || null, car_year || null, part_name, part_description, bid_price, quantity || 1]
    );

    await notify(req.user.id, 'Parts Request Submitted', `Your request for "${part_name}" has been submitted. We'll process it shortly.`, 'parts', result.insertId);

    const [part] = await db.query('SELECT * FROM parts_purchases WHERE id = ?', [result.insertId]);
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
    workbook.creator = 'NipponBid';
    const sheet = workbook.addWorksheet('My Parts Orders');

    sheet.columns = [
      { header: 'ID', key: 'id', width: 8 },
      { header: 'Type', key: 'type', width: 14 },
      { header: 'Part Name', key: 'part_name', width: 25 },
      { header: 'Part Description', key: 'part_description', width: 35 },
      { header: 'Bid Price (¥)', key: 'bid_price', width: 15 },
      { header: 'Final Price (¥)', key: 'final_price', width: 15 },
      { header: 'Quantity', key: 'quantity', width: 10 },
      { header: 'Platform Link', key: 'platform_link', width: 40 },
      { header: 'Platform', key: 'platform_name', width: 15 },
      { header: 'Chassis #', key: 'chassis_number', width: 18 },
      { header: 'Car Make', key: 'car_make', width: 15 },
      { header: 'Car Model', key: 'car_model', width: 15 },
      { header: 'Car Year', key: 'car_year', width: 10 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Tracking #', key: 'tracking_number', width: 20 },
      { header: 'Date', key: 'created_at', width: 20 },
    ];

    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A1A2E' } };
    sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    rows.forEach(row => {
      sheet.addRow({
        ...row,
        created_at: row.created_at ? new Date(row.created_at).toLocaleDateString() : '',
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="nipponbid-parts-${Date.now()}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
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
      `SELECT p.*, u.name as user_name, u.email as user_email, u.country as user_country, u.phone as user_phone
       FROM parts_purchases p JOIN users u ON u.id = p.user_id
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
    const { status, final_price, tracking_number, admin_note } = req.body;
    const [existing] = await db.query('SELECT * FROM parts_purchases WHERE id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ message: 'Parts order not found' });

    await db.query(
      'UPDATE parts_purchases SET status=?, final_price=?, tracking_number=?, admin_note=? WHERE id=?',
      [status, final_price || existing[0].final_price, tracking_number || existing[0].tracking_number, admin_note, req.params.id]
    );

    const statusMessages = {
      processing: 'is being processed',
      ordered: 'has been ordered',
      shipped: 'has been shipped',
      delivered: 'has been delivered',
      cancelled: 'has been cancelled',
    };
    if (statusMessages[status]) {
      await notify(existing[0].user_id, `Parts Order ${status.charAt(0).toUpperCase() + status.slice(1)}`, `Your order for "${existing[0].part_name}" ${statusMessages[status]}. ${tracking_number ? `Tracking: ${tracking_number}` : ''}`, 'parts', req.params.id);
    }

    const [updated] = await db.query('SELECT * FROM parts_purchases WHERE id = ?', [req.params.id]);
    res.json(updated[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/export', adminAuth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT p.*, u.name as user_name, u.email as user_email, u.country
       FROM parts_purchases p JOIN users u ON u.id = p.user_id ORDER BY p.created_at DESC`
    );

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('All Parts Orders');
    sheet.columns = [
      { header: 'ID', key: 'id', width: 8 },
      { header: 'Customer', key: 'user_name', width: 20 },
      { header: 'Email', key: 'user_email', width: 25 },
      { header: 'Country', key: 'country', width: 15 },
      { header: 'Type', key: 'type', width: 14 },
      { header: 'Part Name', key: 'part_name', width: 25 },
      { header: 'Bid Price (¥)', key: 'bid_price', width: 15 },
      { header: 'Final Price (¥)', key: 'final_price', width: 15 },
      { header: 'Quantity', key: 'quantity', width: 10 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Chassis #', key: 'chassis_number', width: 18 },
      { header: 'Car Make', key: 'car_make', width: 15 },
      { header: 'Car Model', key: 'car_model', width: 15 },
      { header: 'Platform Link', key: 'platform_link', width: 40 },
      { header: 'Date', key: 'created_at', width: 20 },
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
