const router = require('express').Router();
const db = require('../config/database');
const { auth, adminAuth } = require('../middleware/auth');
const ExcelJS = require('exceljs');

const notify = async (userId, title, message, type, relatedId = null) => {
  await db.query('INSERT INTO notifications (user_id, title, message, type, related_id) VALUES (?, ?, ?, ?, ?)', [userId, title, message, type, relatedId]);
};

router.post('/', auth, async (req, res) => {
  try {
    const { part_name, part_description, chassis, delivered_to, platform_name, auction_id, quantity } = req.body;
    if (!part_name) return res.status(400).json({ message: 'part_name required' });

    // Submitted by the client before the admin has actually bid/purchased it, so cost
    // fields are unknown yet — admin fills those in once the part is actually bought.
    const [result] = await db.query(
      `INSERT INTO parts_purchases (user_id, part_name, part_description, chassis, delivered_to, platform_name, auction_id, quantity, bid_price)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, part_name, part_description || null, chassis || null, delivered_to || null,
       platform_name || null, auction_id || null, quantity || 1, 0]
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
    const { status, type, billed_to_client, page = 1, limit = 15 } = req.query;
    let where = 'user_id = ?';
    const params = [req.user.id];
    if (status) { where += ' AND status = ?'; params.push(status); }
    if (type) { where += ' AND type = ?'; params.push(type); }
    if (billed_to_client !== undefined) { where += ' AND billed_to_client = ?'; params.push(billed_to_client === 'true'); }
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
      { header: 'Chassis',         key: 'chassis',           width: 18 },
      { header: 'Delivered To',    key: 'delivered_to',      width: 18 },
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
    const { user_id, part_name, part_description, chassis, delivered_to, platform_name, auction_id, quantity,
            bid_price, delivery_charges, bank_charges, shinchuo_commission, commission,
            delivery_company, tracking_no, delivery_status, status, admin_note } = req.body;
    if (!user_id || !part_name) return res.status(400).json({ message: 'user_id and part_name required' });
    const [result] = await db.query(
      `INSERT INTO parts_purchases
        (user_id, part_name, part_description, chassis, delivered_to, platform_name, auction_id, quantity,
         bid_price, delivery_charges, bank_charges, shinchuo_commission, commission,
         delivery_company, tracking_no, delivery_status, status, admin_note)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [user_id, part_name, part_description||null, chassis||null, delivered_to||null, platform_name||null, auction_id||null,
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
    const { status, type, user_id, billed_to_client, billed_to_shinchuo, page = 1, limit = 15 } = req.query;
    let where = '1=1';
    const params = [];
    if (status) { where += ' AND p.status = ?'; params.push(status); }
    if (type) { where += ' AND p.type = ?'; params.push(type); }
    if (user_id) { where += ' AND p.user_id = ?'; params.push(user_id); }
    if (billed_to_client !== undefined) { where += ' AND p.billed_to_client = ?'; params.push(billed_to_client === 'true'); }
    if (billed_to_shinchuo !== undefined) { where += ' AND p.billed_to_shinchuo = ?'; params.push(billed_to_shinchuo === 'true'); }
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
            delivery_charges, bank_charges, shinchuo_commission, commission,
            part_name, part_description, chassis, delivered_to, platform_name, auction_id, quantity, bid_price,
            billed_to_client, billed_to_shinchuo } = req.body;
    const [existing] = await db.query('SELECT * FROM parts_purchases WHERE parts_purchase_id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ message: 'Parts order not found' });

    await db.query(
      `UPDATE parts_purchases SET
        status=?, delivery_status=?, tracking_no=?, delivery_company=?, admin_note=?,
        delivery_charges=?, bank_charges=?, shinchuo_commission=?, commission=?,
        part_name=?, part_description=?, chassis=?, delivered_to=?, platform_name=?, auction_id=?, quantity=?, bid_price=?,
        billed_to_client=?, billed_to_shinchuo=?
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
       part_name || existing[0].part_name,
       part_description ?? existing[0].part_description,
       chassis ?? existing[0].chassis,
       delivered_to ?? existing[0].delivered_to,
       platform_name ?? existing[0].platform_name,
       auction_id ?? existing[0].auction_id,
       quantity ?? existing[0].quantity,
       bid_price ?? existing[0].bid_price,
       billed_to_client ?? existing[0].billed_to_client,
       billed_to_shinchuo ?? existing[0].billed_to_shinchuo,
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
      { header: 'Chassis',        key: 'chassis',            width: 18 },
      { header: 'Delivered To',   key: 'delivered_to',       width: 18 },
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

const n = (v) => Number(v) || 0;
const lineTotal = (r) => n(r.bid_price) + n(r.delivery_charges) + n(r.bank_charges) + n(r.commission);
const headerStyle = (row) => {
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A1A2E' } };
};

// Generates the "Current Bill" / proforma invoice for one client — everything of theirs
// not yet billed — then marks those rows billed so they drop into history next time.
router.post('/bill-client/:userId', adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const [[user]] = await db.query('SELECT name, email, country FROM users WHERE user_id = ?', [userId]);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const [rows] = await db.query(
      'SELECT * FROM parts_purchases WHERE user_id = ? AND billed_to_client = false ORDER BY created_at ASC',
      [userId]
    );
    if (!rows.length) return res.status(400).json({ message: 'Nothing unbilled for this client' });

    const grandTotal = rows.reduce((s, r) => s + lineTotal(r), 0);
    const invoiceNo = `${(user.name || 'CLIENT').split(' ')[0].toUpperCase().slice(0, 8)}-${Date.now().toString().slice(-5)}`;

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Current Bill');
    sheet.columns = [
      { width: 5 }, { width: 14 }, { width: 25 }, { width: 18 }, { width: 18 },
      { width: 14 }, { width: 8 }, { width: 16 }, { width: 14 }, { width: 14 },
      { width: 14 }, { width: 14 }, { width: 14 },
    ];

    sheet.mergeCells('A1:E1');
    sheet.getCell('A1').value = 'PROFORMA INVOICE';
    sheet.getCell('A1').font = { bold: true, size: 16 };

    sheet.getCell('A3').value = 'TO:'; sheet.getCell('B3').value = user.name;
    sheet.getCell('A4').value = 'INVOICE NO:'; sheet.getCell('B4').value = invoiceNo;
    sheet.getCell('A5').value = 'INVOICE DATE:'; sheet.getCell('B5').value = new Date(); sheet.getCell('B5').numFmt = 'dd-mmm-yyyy';
    sheet.getCell('A6').value = 'TOTAL AMOUNT:'; sheet.getCell('A6').font = { bold: true };
    sheet.getCell('B6').value = grandTotal; sheet.getCell('B6').numFmt = '¥#,##0'; sheet.getCell('B6').font = { bold: true };

    const headerRowNum = 8;
    sheet.getRow(headerRowNum).values = ['NO', 'DATE', 'PART NAME', 'CHASSIS', 'DELIVERED TO', 'PLATFORM', 'QTY', 'AUCTION ID', 'BID PRICE', 'DELIVERY', 'BANK', 'COMMISSION', 'TOTAL'];
    headerStyle(sheet.getRow(headerRowNum));

    rows.forEach((r, i) => {
      const row = sheet.getRow(headerRowNum + 1 + i);
      row.values = [
        i + 1, r.created_at ? new Date(r.created_at) : null, r.part_name, r.chassis || '', r.delivered_to || '',
        r.platform_name || '', r.quantity, r.auction_id || '',
        n(r.bid_price), n(r.delivery_charges), n(r.bank_charges), n(r.commission), lineTotal(r),
      ];
      row.getCell(2).numFmt = 'dd-mmm-yyyy';
      [9, 10, 11, 12, 13].forEach(c => { row.getCell(c).numFmt = '¥#,##0'; });
    });

    const totalRowNum = headerRowNum + 1 + rows.length + 1;
    sheet.getCell(`L${totalRowNum}`).value = 'G.TOTAL';
    sheet.getCell(`L${totalRowNum}`).font = { bold: true };
    sheet.getCell(`M${totalRowNum}`).value = grandTotal;
    sheet.getCell(`M${totalRowNum}`).numFmt = '¥#,##0';
    sheet.getCell(`M${totalRowNum}`).font = { bold: true };

    await db.query('UPDATE parts_purchases SET billed_to_client = true WHERE user_id = ? AND billed_to_client = false', [userId]);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${invoiceNo}-current-bill.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Generates the cross-client "Current Bill" sent to Shinchuo for reimbursement —
// everything not yet billed to Shinchuo across every client — then marks it billed.
router.post('/bill-shinchuo', adminAuth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT p.*, u.name AS user_name
       FROM parts_purchases p JOIN users u ON u.user_id = p.user_id
       WHERE p.billed_to_shinchuo = false ORDER BY p.created_at ASC`
    );
    if (!rows.length) return res.status(400).json({ message: 'Nothing unbilled to Shinchuo' });

    const grandTotal = rows.reduce((s, r) => s + lineTotal(r), 0);

    const workbook = new ExcelJS.Workbook();

    const summary = workbook.addWorksheet('current bill');
    summary.columns = [{ width: 5 }, { width: 20 }, { width: 18 }, { width: 25 }, { width: 16 }, { width: 14 }, { width: 14 }];
    summary.getRow(1).values = ['NO', 'BUYER', 'PUT IN', 'ITEM', 'AUCTIONS ID', 'TOTAL', 'G.TOTAL'];
    headerStyle(summary.getRow(1));
    rows.forEach((r, i) => {
      const row = summary.getRow(2 + i);
      row.values = [i + 1, r.user_name, r.chassis || '', r.part_name, r.auction_id || '', lineTotal(r), i === 0 ? grandTotal : null];
      row.getCell(6).numFmt = '¥#,##0';
      if (i === 0) row.getCell(7).numFmt = '¥#,##0';
    });

    const details = workbook.addWorksheet('Details');
    details.columns = [
      { width: 5 }, { width: 14 }, { width: 20 }, { width: 25 }, { width: 18 }, { width: 18 },
      { width: 16 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 },
    ];
    details.getRow(1).values = ['NO', 'DATE', 'BUYER', 'ITEM', 'CHASSIS', 'AUCTIONS ID', 'DELIVERY COMPANY', 'TRACKING', 'PURCHASED PRICE', 'DELIVERY CHARGES', 'BANK CHARGES', 'SHINCHUO COMMISSION', 'TOTAL'];
    headerStyle(details.getRow(1));
    rows.forEach((r, i) => {
      const row = details.getRow(2 + i);
      row.values = [
        i + 1, r.created_at ? new Date(r.created_at) : null, r.user_name, r.part_name, r.chassis || '', r.auction_id || '',
        r.delivery_company || '', r.tracking_no || '', n(r.bid_price), n(r.delivery_charges), n(r.bank_charges), n(r.shinchuo_commission), lineTotal(r),
      ];
      row.getCell(2).numFmt = 'dd-mmm-yyyy';
      [9, 10, 11, 12, 13].forEach(c => { row.getCell(c).numFmt = '¥#,##0'; });
    });

    await db.query('UPDATE parts_purchases SET billed_to_shinchuo = true WHERE billed_to_shinchuo = false');

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="shinchuo-bill-${Date.now()}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
