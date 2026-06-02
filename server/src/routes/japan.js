const router   = require('express').Router();
const db       = require('../config/database');
const { auth, adminAuth } = require('../middleware/auth');
const { uploadDocument, uploadJapanCarImages, resolveUploadedFiles, resolveUploadedFile } = require('../middleware/upload');
const ExcelJS  = require('exceljs');
const email    = require('../utils/email');
const { normalizeDate } = require('../utils/dates');

const SITE_URL = process.env.CLIENT_URL || 'http://localhost:5173';

(async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS japan_bids (
      id         INT PRIMARY KEY AUTO_INCREMENT,
      user_id    INT NOT NULL,
      pid        VARCHAR(50) NOT NULL,
      amount     DECIMAL(14,2) NOT NULL,
      status     ENUM('pending','won','lost') NOT NULL DEFAULT 'pending',
      admin_note TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_user_pid (user_id, pid),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_pid    (pid),
      INDEX idx_status (status)
    )`);

  await db.query(`
    CREATE TABLE IF NOT EXISTS japan_purchases (
      id                  INT PRIMARY KEY AUTO_INCREMENT,
      user_id             INT NOT NULL,
      bid_id              INT NOT NULL,
      pid                 VARCHAR(50) NOT NULL,
      pro_invoice_no      VARCHAR(50),
      file_code           VARCHAR(50),
      destination         VARCHAR(150),
      bid_price           DECIMAL(14,2) DEFAULT 0,
      auction_fee         DECIMAL(14,2) DEFAULT 0,
      auction_commission  DECIMAL(14,2) DEFAULT 0,
      transportation      DECIMAL(14,2) DEFAULT 0,
      loading_custom      DECIMAL(14,2) DEFAULT 0,
      commission          DECIMAL(14,2) DEFAULT 0,
      tax_10pct           DECIMAL(14,2) DEFAULT 0,
      radiation_photos    DECIMAL(14,2) DEFAULT 0,
      custom_fee          DECIMAL(14,2) DEFAULT 0,
      freight             DECIMAL(14,2) DEFAULT 0,
      recycle             DECIMAL(14,2) DEFAULT 0,
      total               DECIMAL(14,2) DEFAULT 0,
      etd                 DATE,
      ship_name           VARCHAR(200),
      eta                 DATE,
      route               VARCHAR(400),
      result_of_inspection TEXT,
      remarks             TEXT,
      bl_status           VARCHAR(100),
      created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (bid_id)  REFERENCES japan_bids(id) ON DELETE CASCADE,
      INDEX idx_user_id (user_id),
      INDEX idx_pid     (pid)
    )`);

  await db.query(`
    CREATE TABLE IF NOT EXISTS japan_documents (
      id          INT PRIMARY KEY AUTO_INCREMENT,
      purchase_id INT NOT NULL,
      type        VARCHAR(100),
      name        VARCHAR(255),
      file_path   VARCHAR(500) NOT NULL,
      file_size   INT,
      uploaded_by INT,
      uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (purchase_id) REFERENCES japan_purchases(id) ON DELETE CASCADE,
      FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL,
      INDEX idx_purchase_id (purchase_id)
    )`);
})().catch(e => console.error('shinchuo schema error:', e.message));

async function getCar(pid) {
  const [rows] = await db.query('SELECT * FROM japan_cars WHERE pid = ?', [pid]);
  return rows[0] || null;
}

router.get('/featured', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT pid, make, model, year, image_url, auction_house, auction_date
      FROM   japan_cars
      WHERE  image_url IS NOT NULL
      ORDER  BY auction_date DESC, id ASC
      LIMIT  12
    `);
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/stats', async (req, res) => {
  try {
    const [[stats]] = await db.query(`
      SELECT COUNT(*) AS total_cars, COUNT(DISTINCT make) AS total_makes,
             COUNT(DISTINCT auction_house) AS total_auction_houses, MAX(scraped_at) AS last_synced
      FROM japan_cars
    `);
    res.json(stats);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/makes', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT DISTINCT make FROM japan_cars WHERE make IS NOT NULL ORDER BY make');
    res.json(rows.map(r => r.make));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/dates', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT DATE_FORMAT(auction_date, '%Y-%m-%d') AS date, COUNT(*) AS count
      FROM japan_cars
      WHERE auction_date >= CURDATE()
      GROUP BY date
      ORDER BY date ASC
    `);
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/cars', async (req, res) => {
  try {
    const { make, model, year_min, year_max, auction_house, grade, mileage_max, lot_number, auction_date, page = 1, limit = 24 } = req.query;
    const where = ['1=1'];
    const params = [];
    if (make)          { where.push('make LIKE ?');                      params.push(`%${make}%`); }
    if (model)         { where.push('model LIKE ?');                     params.push(`%${model}%`); }
    if (year_min)      { where.push('year >= ?');                        params.push(+year_min); }
    if (year_max)      { where.push('year <= ?');                        params.push(+year_max); }
    if (auction_house) { where.push('auction_house LIKE ?');             params.push(`%${auction_house}%`); }
    if (grade)         { where.push('auction_grade = ?');                params.push(grade); }
    if (mileage_max)   { where.push('mileage <= ?');                     params.push(+mileage_max); }
    if (lot_number)    { where.push('lot_number LIKE ?');                params.push(`%${lot_number}%`); }
    if (auction_date)  { where.push('DATE(auction_date) = ?');           params.push(auction_date); }
    const whereSQL = where.join(' AND ');
    const offset   = (+page - 1) * +limit;
    const [[{ total }]] = await db.query(`SELECT COUNT(*) as total FROM japan_cars WHERE ${whereSQL}`, params);
    const [rows] = await db.query(
      `SELECT * FROM japan_cars WHERE ${whereSQL} ORDER BY auction_date DESC, id ASC LIMIT ? OFFSET ?`,
      [...params, +limit, +offset],
    );
    res.json({ cars: rows, total, page: +page, pages: Math.ceil(total / +limit) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/cars/:pid', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM japan_cars WHERE pid = ?', [req.params.pid]);
    if (!rows.length) return res.status(404).json({ message: 'Car not found' });
    const car = rows[0];
    if (car.extra_images) try { car.extra_images = JSON.parse(car.extra_images); } catch { car.extra_images = []; }
    res.json(car);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/bids', auth, async (req, res) => {
  try {
    const { pid, amount } = req.body;
    if (!pid || !amount) return res.status(400).json({ message: 'pid and amount required' });

    const car = await getCar(pid);
    if (!car) return res.status(404).json({ message: 'Car not found' });

    await db.query(
      `INSERT INTO japan_bids (user_id, pid, amount)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE amount = VALUES(amount), status = 'pending', updated_at = NOW()`,
      [req.user.id, pid, amount],
    );
    const [rows] = await db.query('SELECT * FROM japan_bids WHERE user_id = ? AND pid = ?', [req.user.id, pid]);

    const [users] = await db.query('SELECT name, email FROM users WHERE id = ?', [req.user.id]);
    if (users.length) email.bidReceived(users[0].email, users[0].name, car, amount);

    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/bids/my', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT b.*, c.make, c.model, c.year, c.auction_house, c.auction_date,
              c.chassis, c.lot_number, c.image_url, c.start_price
       FROM japan_bids b
       JOIN japan_cars c ON c.pid = b.pid
       WHERE b.user_id = ?
       ORDER BY b.created_at DESC`,
      [req.user.id],
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/bids', adminAuth, async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    let where = '1=1';
    const params = [];
    if (status) { where += ' AND b.status = ?'; params.push(status); }
    const offset = (+page - 1) * +limit;
    const [[{ total }]] = await db.query(`SELECT COUNT(*) as total FROM japan_bids b WHERE ${where}`, params);
    const [rows] = await db.query(
      `SELECT b.*, u.name as user_name, u.email as user_email, u.country as user_country, u.phone as user_phone,
              c.make, c.model, c.year, c.auction_house, c.auction_date,
              c.chassis, c.lot_number, c.image_url, c.start_price
       FROM japan_bids b
       JOIN users u ON u.id = b.user_id
       JOIN japan_cars c ON c.pid = b.pid
       WHERE ${where}
       ORDER BY b.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, +limit, +offset],
    );
    res.json({ bids: rows, total, page: +page, pages: Math.ceil(total / +limit) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/bids/export', adminAuth, async (req, res) => {
  try {
    const { status } = req.query;
    let where = '1=1';
    const params = [];
    if (status) { where += ' AND b.status = ?'; params.push(status); }

    const [rows] = await db.query(
      `SELECT b.id as bid_id, b.amount as bid_amount, b.status as bid_status, b.created_at,
              u.name as user_name, u.email as user_email, u.phone as user_phone, u.country,
              c.make, c.model, c.year, c.chassis, c.lot_number, c.auction_house, c.auction_date, c.start_price,
              p.id as purchase_id, p.pro_invoice_no, p.file_code, p.destination,
              p.bid_price, p.auction_fee, p.auction_commission, p.transportation,
              p.loading_custom, p.commission, p.tax_10pct, p.radiation_photos,
              p.custom_fee, p.freight, p.recycle, p.total,
              p.etd, p.ship_name, p.eta, p.route,
              p.result_of_inspection, p.remarks, p.bl_status, p.shipping_company,
              s.bl_code
       FROM japan_bids b
       JOIN users u ON u.id = b.user_id
       JOIN japan_cars c ON c.pid = b.pid
       LEFT JOIN japan_purchases p ON p.bid_id = b.id
       LEFT JOIN shipments s ON s.file_code = p.file_code
       WHERE ${where}
       ORDER BY c.auction_date ASC, b.created_at ASC`,
      params,
    );

    const wb = new ExcelJS.Workbook();
    wb.creator = 'NipponBid';
    const ws = wb.addWorksheet('Auction Master');

    const COLS = [
      { header: 'NO.',                    key: 'no',                   width: 6  },
      { header: 'CUSTOMER',               key: 'user_name',            width: 22 },
      { header: 'AUC DATE',               key: 'auction_date',         width: 13 },
      { header: 'AUC NAME',               key: 'auction_house',        width: 16 },
      { header: 'LOT NO',                 key: 'lot_number',           width: 10 },
      { header: 'CHASSIS NO',             key: 'chassis',              width: 18 },
      { header: 'MAKE',                   key: 'make',                 width: 12 },
      { header: 'MODEL',                  key: 'model',                width: 16 },
      { header: 'YEAR',                   key: 'year',                 width: 7  },
      { header: 'DESTINATION',            key: 'destination',          width: 14 },
      { header: 'PRO-INVOICE NO.',        key: 'pro_invoice_no',       width: 16 },
      { header: 'FILE CODE NO',           key: 'file_code',            width: 13 },
      { header: 'BL CODE',               key: 'bl_code',              width: 13 },
      { header: 'BID PRICE',              key: 'bid_price',            width: 12 },
      { header: 'AUCTION',                key: 'auction_fee',          width: 12 },
      { header: 'AUCTION COMMISSION',     key: 'auction_commission',   width: 18 },
      { header: 'TRANSPORTATION',         key: 'transportation',       width: 15 },
      { header: 'LOADING/CUSTOM',         key: 'loading_custom',       width: 15 },
      { header: 'COMMISSION',             key: 'commission',           width: 13 },
      { header: 'TAX\n10%',               key: 'tax_10pct',            width: 10 },
      { header: 'RADIATION & PHOTOS',     key: 'radiation_photos',     width: 18 },
      { header: 'CUSTOM',                 key: 'custom_fee',           width: 10 },
      { header: 'FREIGHT',                key: 'freight',              width: 11 },
      { header: 'RECYCLE',                key: 'recycle',              width: 10 },
      { header: 'TOTAL',                  key: 'total',                width: 12 },
      { header: 'ETD',                    key: 'etd',                  width: 12 },
      { header: 'SHIP NAME',              key: 'ship_name',            width: 24 },
      { header: 'SHIPPING CO.',           key: 'shipping_company',     width: 18 },
      { header: 'ETA',                    key: 'eta',                  width: 12 },
      { header: 'ROUTE',                  key: 'route',                width: 28 },
      { header: 'RESULT OF INSPECTION',   key: 'result_of_inspection', width: 22 },
      { header: 'REMARKS',                key: 'remarks',              width: 22 },
      { header: 'BL STATUS',              key: 'bl_status',            width: 14 },
      { header: 'BID STATUS',             key: 'bid_status',           width: 12 },
    ];

    ws.getRow(1).values = COLS.map(c => c.header);
    COLS.forEach((c, i) => {
      ws.getColumn(i + 1).width = c.width;
      const cell = ws.getRow(1).getCell(i + 1);
      cell.font      = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 };
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A1A2E' } };
      cell.alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' };
    });
    ws.getRow(1).height = 30;

    const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB') : '';
    const fmtNum  = n => n != null ? Number(n) : '';

    rows.forEach((r, idx) => {
      const row = ws.addRow([
        idx + 1,
        r.user_name || '',
        fmtDate(r.auction_date),
        r.auction_house || '',
        r.lot_number || '',
        r.chassis || '',
        r.make || '',
        r.model || '',
        r.year || '',
        r.destination || '',
        r.pro_invoice_no || '',
        r.file_code || '',
        r.bl_code || '',
        fmtNum(r.bid_price),
        fmtNum(r.auction_fee),
        fmtNum(r.auction_commission),
        fmtNum(r.transportation),
        fmtNum(r.loading_custom),
        fmtNum(r.commission),
        fmtNum(r.tax_10pct),
        fmtNum(r.radiation_photos),
        fmtNum(r.custom_fee),
        fmtNum(r.freight),
        fmtNum(r.recycle),
        fmtNum(r.total),
        fmtDate(r.etd),
        r.ship_name || '',
        r.shipping_company || '',
        fmtDate(r.eta),
        r.route || '',
        r.result_of_inspection || '',
        r.remarks || '',
        r.bl_status || '',
        r.bid_status || '',
      ]);
      row.eachCell(cell => {
        cell.font      = { size: 9 };
        cell.alignment = { vertical: 'middle' };
        cell.border    = {
          top: { style: 'thin', color: { argb: 'FFE0E0E0' } }, bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          left: { style: 'thin', color: { argb: 'FFE0E0E0' } }, right: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        };
      });
      row.height = 18;
    });

    if (rows.length) {
      const last = 1 + rows.length;
      const totRow = ws.addRow([
        '', '', '', '', '', '', '', '', '', '', '', '', 'GRAND TOTAL',
        `=SUM(N2:N${last})`, `=SUM(O2:O${last})`, `=SUM(P2:P${last})`,
        `=SUM(Q2:Q${last})`, `=SUM(R2:R${last})`, `=SUM(S2:S${last})`,
        `=SUM(T2:T${last})`, `=SUM(U2:U${last})`, `=SUM(V2:V${last})`,
        `=SUM(W2:W${last})`, `=SUM(X2:X${last})`, `=SUM(Y2:Y${last})`,
      ]);
      totRow.eachCell(cell => {
        cell.font = { bold: true, size: 9 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE0B2' } };
      });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="nipponbid-master-${Date.now()}.xlsx"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/bids/:id', adminAuth, async (req, res) => {
  try {
    const { status, admin_note } = req.body;
    if (!['won','lost','pending'].includes(status)) return res.status(400).json({ message: 'Invalid status' });

    const [existing] = await db.query(
      `SELECT b.*, u.name as user_name, u.email as user_email FROM japan_bids b
       JOIN users u ON u.id = b.user_id WHERE b.id = ?`, [req.params.id],
    );
    if (!existing.length) return res.status(404).json({ message: 'Bid not found' });
    const bid = existing[0];

    await db.query('UPDATE japan_bids SET status = ?, admin_note = ? WHERE id = ?', [status, admin_note || null, req.params.id]);

    const car = await getCar(bid.pid);
    if (car) {
      if (status === 'won')  email.bidWon(bid.user_email,  bid.user_name, car, bid.amount, SITE_URL);
      if (status === 'lost') email.bidLost(bid.user_email, bid.user_name, car, SITE_URL);
    }

    const [updated] = await db.query('SELECT * FROM japan_bids WHERE id = ?', [req.params.id]);
    res.json(updated[0]);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/purchases/upload-images', adminAuth, uploadJapanCarImages.array('images', 20), async (req, res) => {
  try {
    if (!req.files?.length) return res.status(400).json({ message: 'No images uploaded' });
    const urls = await resolveUploadedFiles(req.files, 'nipponbid/japan-car-images');
    res.json({ urls });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/purchases/manual', adminAuth, async (req, res) => {
  try {
    const {
      user_id,
      make, model, year, chassis, lot_number, auction_house, auction_date, image_url,
      pro_invoice_no, file_code, destination,
      bid_price, auction_fee, auction_commission, transportation, loading_custom,
      commission, tax_10pct, radiation_photos, custom_fee, freight, recycle, total,
      shipping_company, ship_name, etd, eta, route, result_of_inspection, bl_status, remarks,
    } = req.body;

    if (!user_id) return res.status(400).json({ message: 'user_id is required' });

    // Duplicate chassis check — reject if this user already has a purchase with the same chassis
    if (chassis) {
      const [existing] = await db.query(
        `SELECT p.id FROM japan_purchases p
         JOIN japan_cars c ON c.pid = p.pid
         WHERE p.user_id = ? AND c.chassis = ?
         LIMIT 1`,
        [user_id, chassis]
      );
      if (existing.length > 0) {
        return res.status(409).json({
          message: `A purchase with chassis number "${chassis}" already exists for this client.`,
        });
      }
    }

    const pid = `MANUAL-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

    await db.query(
      `INSERT INTO japan_cars (pid, make, model, year, chassis, lot_number, auction_house, auction_date, image_url, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'purchased')`,
      [pid, make || null, model || null, year || null, chassis || null, lot_number || null,
       auction_house || null, normalizeDate(auction_date), image_url || null],
    );

    const [result] = await db.query(
      `INSERT INTO japan_purchases
        (user_id, pid, pro_invoice_no, file_code, destination,
         bid_price, auction_fee, auction_commission, transportation, loading_custom,
         commission, tax_10pct, radiation_photos, custom_fee, freight, recycle, total,
         shipping_company, ship_name, etd, eta, route, result_of_inspection, bl_status, remarks)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [user_id, pid, pro_invoice_no || null, file_code || null, destination || null,
       bid_price || null, auction_fee || null, auction_commission || null, transportation || null,
       loading_custom || null, commission || null, tax_10pct || null, radiation_photos || null,
       custom_fee || null, freight || null, recycle || null, total || null,
       shipping_company || null, ship_name || null,
       normalizeDate(etd), normalizeDate(eta), route || null, result_of_inspection || null, bl_status || null, remarks || null],
    );

    const [row] = await db.query(
      `SELECT p.*, c.make, c.model, c.year, c.chassis, c.lot_number, c.auction_house,
              c.auction_date, c.image_url, u.name as user_name, u.email as user_email
       FROM japan_purchases p
       JOIN japan_cars c ON c.pid = p.pid
       JOIN users u ON u.id = p.user_id
       WHERE p.id = ?`,
      [result.insertId],
    );
    res.status(201).json(row[0]);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/purchases', adminAuth, async (req, res) => {
  try {
    const { bid_id } = req.body;
    if (!bid_id) return res.status(400).json({ message: 'bid_id required' });

    const [bids] = await db.query('SELECT * FROM japan_bids WHERE id = ?', [bid_id]);
    if (!bids.length) return res.status(404).json({ message: 'Bid not found' });
    const bid = bids[0];

    await db.query("UPDATE japan_bids SET status='won' WHERE id=?", [bid_id]);
    await db.query("UPDATE japan_cars SET status='purchased' WHERE pid=?", [bid.pid]);

    const [result] = await db.query(
      'INSERT INTO japan_purchases (user_id, bid_id, pid, bid_price) VALUES (?,?,?,?)',
      [bid.user_id, bid_id, bid.pid, bid.amount],
    );

    const car = await getCar(bid.pid);
    const [users] = await db.query('SELECT name,email FROM users WHERE id=?', [bid.user_id]);
    if (users.length && car) email.bidWon(users[0].email, users[0].name, car, bid.amount, SITE_URL);

    const [row] = await db.query('SELECT * FROM japan_purchases WHERE id=?', [result.insertId]);
    res.status(201).json(row[0]);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/purchases/my', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT p.*, c.make, c.model, c.year, c.auction_house, c.auction_date,
              c.chassis, c.lot_number, c.image_url, c.grade
       FROM japan_purchases p
       JOIN japan_cars c ON c.pid = p.pid
       WHERE p.user_id = ?
       ORDER BY p.created_at DESC`,
      [req.user.id],
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

async function buildAccountExcel(userName, purchases, remittances) {
  const wb = new ExcelJS.Workbook();
  wb.creator  = 'NipponBid';
  wb.modified = new Date();
  wb.calcProperties = { fullCalcOnLoad: true };

  const fmtDate = (d) => {
    if (!d) return '';
    const dt  = new Date(d);
    const day = String(dt.getDate()).padStart(2, '0');
    const mon = dt.toLocaleString('en-GB', { month: 'short' });
    const yr  = String(dt.getFullYear()).slice(2);
    return `${day}-${mon}-${yr}`;
  };
  const n = (v) => Number(v) || 0;
  const NF = '#,##0';

  const C = {
    navyDark:  'FF0F172A',
    navyMid:   'FF1E3A5F',
    navyLight: 'FF2E4A7A',
    goldText:  'FFFBBF24',
    white:     'FFFFFFFF',
    textDark:  'FF1E293B',
    textMuted: 'FF64748B',
    border:    'FFE2E8F0',
    borderMid: 'FFCBD5E1',
    rowAlt:    'FFF8FAFC',
    greenBg:   'FFDCFCE7',
    greenBdr:  'FF86EFAC',
    greenDark: 'FFD1FAE5',
    greenText: 'FF166534',
    redText:   'FF9F1239',
    redBg:     'FFFFF1F2',
  };

  const bdr  = (style, argb) => ({ style, color: { argb } });
  const hair  = (argb = C.border)    => bdr('hair', argb);
  const thin  = (argb = C.border)    => bdr('thin', argb);
  const med   = (argb = C.navyDark)  => bdr('medium', argb);

  const totalDebit  = purchases.reduce((s, p) => s + n(p.total), 0);
  const totalCredit = (remittances || []).reduce((s, r) => s + (n(r.deposit_amount) || n(r.transfer_amount)), 0);
  const netBalance  = totalCredit - totalDebit;
  const isNeg       = netBalance < 0;

  const sortedPurchases = [...purchases].sort((a, b) => {
    const da = a.auction_date ? new Date(a.auction_date) : new Date(0);
    const db = b.auction_date ? new Date(b.auction_date) : new Date(0);
    return da - db;
  });

  const fs = require('fs');
  const STAMP_PATHS = [
    '/Users/syedsaad/Downloads/stamp.png',
    '/Users/syedsaad/Downloads/stamp.jpg',
    '/Users/syedsaad/Downloads/company_stamp.png',
    '/Users/syedsaad/Desktop/stamp.png',
    '/Users/syedsaad/Desktop/stamp.jpg',
  ];
  let stampImageId = null;
  for (const sp of STAMP_PATHS) {
    if (fs.existsSync(sp)) {
      try {
        stampImageId = wb.addImage({ filename: sp, extension: sp.endsWith('.png') ? 'png' : 'jpeg' });
        break;
      } catch {  }
    }
  }

  const ws = wb.addWorksheet('Data');
  const COL_W = [6, 13, 18, 10, 18, 12, 16, 7, 13, 12, 16, 16, 15, 10, 15, 10, 11, 10, 14, 14, 15];
  COL_W.forEach((w, i) => { ws.getColumn(i + 1).width = w; });
  ws.views = [{ state: 'frozen', ySplit: 15 }];

  ws.getRow(1).height = 38;
  ws.mergeCells('A1:U1');
  Object.assign(ws.getCell('A1'), {
    value:     'AUTO BID 株式会社  ·  ACCOUNT STATEMENT',
    font:      { name: 'Arial', size: 16, bold: true, color: { argb: C.white } },
    fill:      { type: 'pattern', pattern: 'solid', fgColor: { argb: C.navyDark } },
    alignment: { horizontal: 'center', vertical: 'middle' },
  });

  ws.getRow(2).height = 20;
  ws.mergeCells('A2:J2');
  Object.assign(ws.getCell('A2'), {
    value:     `  Client: ${userName || 'Customer'}`,
    font:      { name: 'Arial', size: 10, color: { argb: C.white } },
    fill:      { type: 'pattern', pattern: 'solid', fgColor: { argb: C.navyMid } },
    alignment: { horizontal: 'left', vertical: 'middle' },
  });
  ws.mergeCells('K2:U2');
  Object.assign(ws.getCell('K2'), {
    value:     `Statement Date: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}  `,
    font:      { name: 'Arial', size: 10, color: { argb: C.white } },
    fill:      { type: 'pattern', pattern: 'solid', fgColor: { argb: C.navyMid } },
    alignment: { horizontal: 'right', vertical: 'middle' },
  });

  ws.getRow(3).height = 5;
  ws.mergeCells('A3:U3');
  ws.getCell('A3').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFBBF24' } };

  ws.mergeCells('K4:U10');
  if (stampImageId !== null) {
    Object.assign(ws.getCell('K4'), {
      fill:   { type: 'pattern', pattern: 'solid', fgColor: { argb: C.white } },
      border: { top: thin(C.borderMid), bottom: thin(C.borderMid), left: thin(C.borderMid), right: thin(C.borderMid) },
    });
    ws.addImage(stampImageId, {
      tl: { col: 10.1, row: 3.1 },
      br: { col: 20.9, row: 9.9 },
      editAs: 'oneCell',
    });
  } else {
    Object.assign(ws.getCell('K4'), {
      value:     `Auto Bid 株式会社\n\n〒243-0812\n神奈川県厚木市\n妻田北二丁目14番26号\n\nTEL/FAX: 046-225-5303`,
      font:      { name: 'Times New Roman', size: 11, bold: true, color: { argb: C.navyDark } },
      alignment: { wrapText: true, horizontal: 'center', vertical: 'middle' },
      fill:      { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4FF' } },
      border:    { top: med(), bottom: med(), left: med(), right: med() },
    });
  }

  const BANK_ROWS = [
    ['BANK NAME',    'SUMISHIN SBI NET BANK  |  Wise Payments Limited'],
    ['BRANCH',       'HOUJIN DAI ICHI (106)'],
    ['BANK CODE',    '0038'],
    ['SWIFT CODE',   'NTSSJPJT  |  TRWIGB2LXXX'],
    ['ACCOUNT NO.',  '2447325  |  GB28-TRWI-2308-0153-4807-10'],
    ['ACCOUNT NAME', `Auto Bid K.K  |  ${userName || 'Customer'}`],
    ['ACCOUNT TYPE', 'SAVING (FOTSU)'],
  ];
  BANK_ROWS.forEach((bd, ri) => {
    const r = ri + 4;
    ws.getRow(r).height = 17;
    ws.mergeCells(`A${r}:B${r}`);
    Object.assign(ws.getCell(`A${r}`), {
      value:     bd[0],
      font:      { name: 'Arial', size: 8, bold: true, color: { argb: 'FF334155' } },
      fill:      { type: 'pattern', pattern: 'solid', fgColor: { argb: ri % 2 === 0 ? 'FFF1F5F9' : C.white } },
      alignment: { horizontal: 'right', vertical: 'middle', indent: 1 },
      border:    { right: thin('FFCBD5E1'), bottom: thin('FFCBD5E1') },
    });
    ws.mergeCells(`C${r}:J${r}`);
    Object.assign(ws.getCell(`C${r}`), {
      value:     bd[1],
      font:      { name: 'Arial', size: 9, bold: false, color: { argb: C.textDark } },
      fill:      { type: 'pattern', pattern: 'solid', fgColor: { argb: ri % 2 === 0 ? 'FFF1F5F9' : C.white } },
      alignment: { horizontal: 'left', vertical: 'middle', indent: 2 },
      border:    { right: thin('FFCBD5E1'), bottom: thin('FFCBD5E1') },
    });
  });

  ws.getRow(11).height = 6;
  ws.mergeCells('A11:U11');
  ws.getCell('A11').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };

  ws.getRow(12).height = 34;
  ws.mergeCells('A12:C12');
  Object.assign(ws.getCell('A12'), {
    value:     'NET BALANCE',
    font:      { name: 'Arial', size: 9, bold: true, color: { argb: isNeg ? C.redText : C.greenText } },
    fill:      { type: 'pattern', pattern: 'solid', fgColor: { argb: isNeg ? C.redBg : 'FFF0FDF4' } },
    alignment: { horizontal: 'right', vertical: 'middle', indent: 1 },
    border:    { bottom: thin(C.borderMid) },
  });
  ws.mergeCells('D12:G12');
  Object.assign(ws.getCell('D12'), {
    value:     netBalance,
    numFmt:    '#,##0;(#,##0)',
    font:      { name: 'Arial', size: 14, bold: true, color: { argb: C.white } },
    fill:      { type: 'pattern', pattern: 'solid', fgColor: { argb: isNeg ? 'FFDC2626' : 'FF16A34A' } },
    alignment: { horizontal: 'center', vertical: 'middle' },
    border:    { left: med('FFFBBF24'), right: med('FFFBBF24') },
  });
  [
    ['H12:J12', `Purchases: ¥${totalDebit.toLocaleString()}`],
    ['K12:M12', `Received: ¥${totalCredit.toLocaleString()}`],
    ['N12:P12', `${purchases.length} Car${purchases.length !== 1 ? 's' : ''}`],
    ['Q12:U12', `${(remittances || []).length} Payment${(remittances || []).length !== 1 ? 's' : ''}`],
  ].forEach(([range, val]) => {
    ws.mergeCells(range);
    const addr = range.split(':')[0];
    Object.assign(ws.getCell(addr), {
      value:     val,
      font:      { name: 'Arial', size: 9, color: { argb: C.textMuted } },
      fill:      { type: 'pattern', pattern: 'solid', fgColor: { argb: C.rowAlt } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border:    { bottom: thin(C.borderMid), left: thin(C.border), right: thin(C.border) },
    });
  });

  ws.getRow(13).height = 4;
  ws.mergeCells('A13:U13');
  ws.getCell('A13').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.navyDark } };

  ws.getRow(14).height = 16;
  ws.mergeCells('A14:H14');
  Object.assign(ws.getCell('A14'), {
    value:     '  ■ Purchase rows   ■ Payment / credit rows (green)   ■ DEBIT column = received amount only',
    font:      { name: 'Arial', size: 8, italic: true, color: { argb: C.textMuted } },
    fill:      { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } },
    alignment: { horizontal: 'left', vertical: 'middle' },
  });
  ws.mergeCells('I14:U14');
  Object.assign(ws.getCell('I14'), {
    value:     'See "Details" sheet for shipping, invoice & inspection data  →',
    font:      { name: 'Arial', size: 8, italic: true, color: { argb: C.navyMid } },
    fill:      { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } },
    alignment: { horizontal: 'right', vertical: 'middle', indent: 1 },
  });

  const HEADER_ROW = 15;
  ws.getRow(HEADER_ROW).height = 34;
  const HEADERS = [
    { t: 'NO.',                bg: C.navyDark  },
    { t: 'AUC DATE',           bg: C.navyDark  },
    { t: 'AUC NAME',           bg: C.navyDark  },
    { t: 'LOT NO',             bg: C.navyDark  },
    { t: 'CHASSIS NO',         bg: C.navyDark  },
    { t: 'MAKE',               bg: C.navyDark  },
    { t: 'MODEL',              bg: C.navyDark  },
    { t: 'YEAR',               bg: C.navyDark  },
    { t: 'BID PRICE',          bg: C.navyMid   },
    { t: 'AUCTION',            bg: C.navyMid   },
    { t: 'TRANSPORTATION',     bg: C.navyMid   },
    { t: 'LOADING\n/CUSTOM',   bg: C.navyMid   },
    { t: 'COMMISSION',         bg: C.navyMid   },
    { t: 'TAX\n10%',           bg: C.navyMid   },
    { t: 'RADIATION\n& PHOTOS',bg: C.navyMid   },
    { t: 'CUSTOM',             bg: C.navyMid   },
    { t: 'FREIGHT',            bg: C.navyMid   },
    { t: 'RECYCLE',            bg: C.navyMid   },
    { t: 'TOTAL',              bg: C.navyLight },
    { t: 'DEBIT',              bg: 'FF166534'  },
    { t: 'BALANCE',            bg: C.navyDark  },
  ];
  HEADERS.forEach(({ t, bg }, i) => {
    const cell = ws.getRow(HEADER_ROW).getCell(i + 1);
    cell.value     = t;
    cell.font      = { name: 'Arial', size: 9, bold: true, color: { argb: i === 19 ? 'FF6EE7B7' : C.white } };
    cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border    = { top: thin(C.navyMid), bottom: med('FFFBBF24'), left: thin(C.navyMid), right: thin(C.navyMid) };
  });

  const allEntries = [
    ...purchases.map(p => ({ type: 'purchase', date: p.auction_date ? new Date(p.auction_date) : null, data: p })),
    ...(remittances || []).map(r => ({ type: 'payment', date: r.tt_date ? new Date(r.tt_date) : null, data: r })),
  ].sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date - b.date;
  });

  const DATA_START = HEADER_ROW + 1;
  let rowNum      = DATA_START;
  let runBalance  = 0;
  let purchaseIdx = 0;
  let altRow      = false;

  allEntries.forEach(entry => {
    const row  = ws.getRow(rowNum);
    row.height = 18;

    if (entry.type === 'purchase') {
      purchaseIdx++;
      const p          = entry.data;
      const total      = n(p.total);
      runBalance      -= total;
      const commission = n(p.auction_commission) + n(p.commission);
      const rowFill    = altRow ? C.rowAlt : C.white;
      altRow = !altRow;

      row.values = [
        purchaseIdx, fmtDate(p.auction_date),
        p.auction_house || '', p.lot_number || '', p.chassis || '',
        p.make || '', p.model || '', p.year || '',
        n(p.bid_price), n(p.auction_fee), n(p.transportation),
        n(p.loading_custom), commission,
        n(p.tax_10pct),
        n(p.radiation_photos),
        n(p.custom_fee), n(p.freight),
        n(p.recycle),
        total,
        null,
        runBalance,
      ];

      for (let c = 1; c <= 21; c++) {
        const cell = row.getCell(c);
        cell.font   = { name: 'Arial', size: 9, color: { argb: C.textDark } };
        cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowFill } };
        cell.border = { top: hair(), bottom: hair(), left: thin(C.border), right: thin(C.border) };

        if (c === 1) {
          cell.font      = { name: 'Arial', size: 8, bold: true, color: { argb: C.textMuted } };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.navyDark } };
          cell.border    = { top: hair(C.navyMid), bottom: hair(C.navyMid), right: thin(C.navyMid) };
        }
        if (c === 2) cell.alignment = { horizontal: 'center', vertical: 'middle' };
        if (c === 8) cell.alignment = { horizontal: 'center', vertical: 'middle' };
        if (c >= 9 && c <= 18) {
          cell.numFmt    = NF;
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        }
        if (c === 19) {
          cell.numFmt    = NF;
          cell.font      = { name: 'Arial', size: 9, bold: true, color: { argb: C.navyDark } };
          cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } };
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.border    = { top: hair(), bottom: hair(), left: med(), right: thin(C.border) };
        }
        if (c === 20) {
          cell.numFmt    = '#,##0;(#,##0);"-"';
          cell.font      = { name: 'Arial', size: 9, color: { argb: 'FFCCCCCC' } };
          cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
        if (c === 21) {
          const neg = runBalance < 0;
          cell.numFmt    = '#,##0;(#,##0)';
          cell.font      = { name: 'Arial', size: 9, bold: true, color: { argb: neg ? C.redText : C.greenText } };
          cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: neg ? C.redBg : 'FFF0FDF4' } };
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.border    = { top: hair(), bottom: hair(), left: med(), right: thin(C.border) };
        }
      }

    } else {
      const r   = entry.data;
      const amt = n(r.deposit_amount) || n(r.transfer_amount);
      runBalance += amt;
      altRow = !altRow;

      for (let c = 1; c <= 21; c++) {
        const cell = row.getCell(c);
        cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.greenBg } };
        cell.border = { top: thin(C.greenBdr), bottom: thin(C.greenBdr), left: thin(C.greenBdr), right: thin(C.greenBdr) };
        cell.font   = { name: 'Arial', size: 9, color: { argb: C.greenText } };
      }
      row.getCell(1).fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF166534' } };
      row.getCell(1).font      = { name: 'Arial', size: 9, bold: true, color: { argb: C.white } };
      row.getCell(1).value     = '►';
      row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

      row.getCell(2).value     = fmtDate(r.tt_date);
      row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(2).font      = { name: 'Arial', size: 9, bold: false, color: { argb: C.greenText } };

      row.getCell(3).value = `PAYMENT RECEIVED  —  ${r.name || r.ref_no || ''}`;
      row.getCell(3).font  = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF14532D' } };

      row.getCell(20).value     = amt;
      row.getCell(20).numFmt    = NF;
      row.getCell(20).font      = { name: 'Arial', size: 9, bold: true, color: { argb: C.greenText } };
      row.getCell(20).fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.greenDark } };
      row.getCell(20).alignment = { horizontal: 'right', vertical: 'middle' };

      const neg = runBalance < 0;
      row.getCell(21).value     = runBalance;
      row.getCell(21).numFmt    = '#,##0;(#,##0)';
      row.getCell(21).font      = { name: 'Arial', size: 9, bold: true, color: { argb: neg ? C.redText : C.greenText } };
      row.getCell(21).fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: neg ? C.redBg : C.greenDark } };
      row.getCell(21).alignment = { horizontal: 'right', vertical: 'middle' };
      row.getCell(21).border    = { top: thin(C.greenBdr), bottom: thin(C.greenBdr), left: med(), right: thin(C.greenBdr) };
    }

    rowNum++;
  });

  const totRowNum = rowNum;
  const totRow    = ws.getRow(totRowNum);
  totRow.height   = 28;

  for (let c = 1; c <= 21; c++) {
    const cell = totRow.getCell(c);
    cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.navyDark } };
    cell.border    = { top: med('FFFBBF24'), bottom: med('FFFBBF24'), left: thin(C.navyMid), right: thin(C.navyMid) };
    cell.font      = { name: 'Arial', size: 9, bold: true, color: { argb: C.white } };
    cell.alignment = { horizontal: 'right', vertical: 'middle' };
  }
  ws.mergeCells(`A${totRowNum}:H${totRowNum}`);
  totRow.getCell(1).value     = 'GRAND TOTAL';
  totRow.getCell(1).font      = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFBBF24' } };
  totRow.getCell(1).alignment = { horizontal: 'right', vertical: 'middle', indent: 2 };

  const sumKeys    = ['bid_price','auction_fee','transportation','loading_custom',null,'tax_10pct','radiation_photos','custom_fee','freight','recycle','total'];
  const sumLetters = ['I','J','K','L','M','N','O','P','Q','R','S'];
  sumKeys.forEach((key, i) => {
    const result = key === null
      ? purchases.reduce((s, p) => s + n(p.auction_commission) + n(p.commission), 0)
      : purchases.reduce((s, p) => s + n(p[key]), 0);
    const cell = totRow.getCell(9 + i);
    cell.value  = { formula: `SUM(${sumLetters[i]}${DATA_START}:${sumLetters[i]}${totRowNum - 1})`, result };
    cell.numFmt = NF;
  });
  totRow.getCell(19).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF14532D' } };

  totRow.getCell(20).value  = { formula: `SUM(T${DATA_START}:T${totRowNum - 1})`, result: totalCredit };
  totRow.getCell(20).numFmt = NF;
  totRow.getCell(20).font   = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF6EE7B7' } };
  totRow.getCell(20).fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF166534' } };

  totRow.getCell(21).value  = runBalance;
  totRow.getCell(21).numFmt = '#,##0;(#,##0)';
  totRow.getCell(21).font   = { name: 'Arial', size: 11, bold: true, color: { argb: isNeg ? 'FFFCA5A5' : 'FF6EE7B7' } };
  totRow.getCell(21).fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: isNeg ? 'FF7F1D1D' : 'FF14532D' } };
  totRow.getCell(21).border = { top: med('FFFBBF24'), bottom: med('FFFBBF24'), left: med('FFFBBF24'), right: thin(C.navyMid) };

  const ws3 = wb.addWorksheet('Details');
  const D_W = [6, 12, 18, 10, 18, 14, 16, 13, 15, 12, 24, 12, 28, 22, 22, 14];
  D_W.forEach((w, i) => { ws3.getColumn(i + 1).width = w; });
  ws3.views = [{ state: 'frozen', ySplit: 5 }];

  ws3.getRow(1).height = 34;
  ws3.mergeCells('A1:P1');
  Object.assign(ws3.getCell('A1'), {
    value:     'AUTO BID 株式会社  ·  SHIPPING & EXTENDED DETAILS',
    font:      { name: 'Arial', size: 14, bold: true, color: { argb: C.white } },
    fill:      { type: 'pattern', pattern: 'solid', fgColor: { argb: C.navyDark } },
    alignment: { horizontal: 'center', vertical: 'middle' },
  });

  ws3.getRow(2).height = 18;
  ws3.mergeCells('A2:H2');
  Object.assign(ws3.getCell('A2'), {
    value:     `  Client: ${userName || 'Customer'}   ·   ${purchases.length} car${purchases.length !== 1 ? 's' : ''}`,
    font:      { name: 'Arial', size: 9, color: { argb: C.white } },
    fill:      { type: 'pattern', pattern: 'solid', fgColor: { argb: C.navyMid } },
    alignment: { horizontal: 'left', vertical: 'middle' },
  });
  ws3.mergeCells('I2:P2');
  Object.assign(ws3.getCell('I2'), {
    value:     '← Match the NO. column with the "Data" sheet for cost breakdown  ',
    font:      { name: 'Arial', size: 9, italic: true, color: { argb: 'FFFBBF24' } },
    fill:      { type: 'pattern', pattern: 'solid', fgColor: { argb: C.navyDark } },
    alignment: { horizontal: 'right', vertical: 'middle' },
  });

  ws3.getRow(3).height = 4;
  ws3.mergeCells('A3:P3');
  ws3.getCell('A3').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFBBF24' } };

  ws3.getRow(4).height = 4;

  ws3.getRow(5).height = 34;
  const D_HDR = [
    { t: 'NO.',               bg: C.navyDark  },
    { t: 'AUC DATE',          bg: C.navyDark  },
    { t: 'AUC NAME',          bg: C.navyDark  },
    { t: 'LOT NO',            bg: C.navyDark  },
    { t: 'CHASSIS NO',        bg: C.navyDark  },
    { t: 'DESTINATION',       bg: C.navyMid   },
    { t: 'PRO-INVOICE NO.',   bg: C.navyMid   },
    { t: 'FILE CODE NO',      bg: C.navyMid   },
    { t: 'AUCTION\nCOMMISSION', bg: C.navyMid },
    { t: 'ETD',               bg: C.navyLight },
    { t: 'SHIP NAME',         bg: C.navyLight },
    { t: 'ETA',               bg: C.navyLight },
    { t: 'ROUTE',             bg: C.navyLight },
    { t: 'RESULT OF\nINSPECTION', bg: C.navyLight },
    { t: 'REMARKS',           bg: C.navyLight },
    { t: 'BL STATUS',         bg: C.navyLight },
  ];
  D_HDR.forEach(({ t, bg }, i) => {
    const cell = ws3.getRow(5).getCell(i + 1);
    cell.value     = t;
    cell.font      = { name: 'Arial', size: 9, bold: true, color: { argb: C.white } };
    cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border    = { top: thin(C.navyMid), bottom: med('FFFBBF24'), left: thin(C.navyMid), right: thin(C.navyMid) };
  });

  let d_alt = false;
  sortedPurchases.forEach((p, i) => {
    const row = ws3.getRow(6 + i);
    row.height = 18;
    const fill = d_alt ? C.rowAlt : C.white;
    d_alt = !d_alt;

    row.values = [
      i + 1,
      fmtDate(p.auction_date),
      p.auction_house        || '',
      p.lot_number           || '',
      p.chassis              || '',
      p.destination          || '',
      p.pro_invoice_no       || '',
      p.file_code            || '',
      n(p.auction_commission),
      fmtDate(p.etd),
      p.ship_name            || '',
      fmtDate(p.eta),
      p.route                || '',
      p.result_of_inspection || '',
      p.remarks              || '',
      p.bl_status            || '',
    ];

    for (let c = 1; c <= 16; c++) {
      const cell = row.getCell(c);
      cell.font   = { name: 'Arial', size: 9, color: { argb: C.textDark } };
      cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
      cell.border = { top: hair(), bottom: hair(), left: thin(C.border), right: thin(C.border) };
      if (c === 1) {
        cell.font      = { name: 'Arial', size: 8, bold: true, color: { argb: C.white } };
        cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.navyDark } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border    = { top: hair(C.navyMid), bottom: hair(C.navyMid), right: thin(C.navyMid) };
      }
      if (c === 2 || c === 10 || c === 12) cell.alignment = { horizontal: 'center', vertical: 'middle' };
      if (c === 9) {
        cell.numFmt    = NF;
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      }
    }
  });

  if (sortedPurchases.length) {
    const dTotRow = 6 + sortedPurchases.length;
    const dTot    = ws3.getRow(dTotRow);
    dTot.height   = 26;
    for (let c = 1; c <= 16; c++) {
      dTot.getCell(c).fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.navyDark } };
      dTot.getCell(c).border    = { top: med('FFFBBF24'), bottom: med('FFFBBF24'), left: thin(C.navyMid), right: thin(C.navyMid) };
      dTot.getCell(c).font      = { name: 'Arial', size: 9, bold: true, color: { argb: C.white } };
      dTot.getCell(c).alignment = { horizontal: 'right', vertical: 'middle' };
    }
    ws3.mergeCells(`A${dTotRow}:H${dTotRow}`);
    dTot.getCell(1).value     = 'GRAND TOTAL';
    dTot.getCell(1).font      = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFBBF24' } };
    dTot.getCell(1).alignment = { horizontal: 'right', vertical: 'middle', indent: 2 };
    const auctionCommTotal = purchases.reduce((s, p) => s + n(p.auction_commission), 0);
    dTot.getCell(9).value  = { formula: `SUM(I6:I${dTotRow - 1})`, result: auctionCommTotal };
    dTot.getCell(9).numFmt = NF;
  }

  const ws2 = wb.addWorksheet('Current Bill');
  [30, 22, 8].forEach((w, i) => { ws2.getColumn(i + 1).width = w; });

  ws2.getRow(1).height = 38;
  ws2.mergeCells('A1:C1');
  Object.assign(ws2.getCell('A1'), {
    value:     'AUTO BID 株式会社  ·  CURRENT BILL',
    font:      { name: 'Arial', size: 14, bold: true, color: { argb: C.white } },
    fill:      { type: 'pattern', pattern: 'solid', fgColor: { argb: C.navyDark } },
    alignment: { horizontal: 'center', vertical: 'middle' },
  });

  ws2.getRow(2).height = 4;
  ws2.mergeCells('A2:C2');
  ws2.getCell('A2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFBBF24' } };

  const bRow = (r, label, value, numFormat, valueColor) => {
    ws2.getRow(r).height = 22;
    Object.assign(ws2.getCell(`A${r}`), {
      value: label,
      font:  { name: 'Arial', size: 10, bold: true, color: { argb: C.textMuted } },
      fill:  { type: 'pattern', pattern: 'solid', fgColor: { argb: C.rowAlt } },
      alignment: { horizontal: 'right', vertical: 'middle', indent: 1 },
      border: { right: med('FFFBBF24'), bottom: hair() },
    });
    ws2.mergeCells(`B${r}:C${r}`);
    Object.assign(ws2.getCell(`B${r}`), {
      value,
      font:  { name: 'Arial', size: 10, color: { argb: valueColor || C.textDark } },
      fill:  { type: 'pattern', pattern: 'solid', fgColor: { argb: C.white } },
      alignment: { horizontal: 'left', vertical: 'middle', indent: 2 },
      border: { bottom: hair() },
    });
    if (numFormat) ws2.getCell(`B${r}`).numFmt = numFormat;
  };

  bRow(4,  'Customer',            userName || 'Customer');
  bRow(5,  'Statement Date',      new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }));
  bRow(6,  'Total Cars',          purchases.length);
  bRow(8,  'Total Purchases',     totalDebit,  NF, C.redText);
  bRow(9,  'Total Payments',      totalCredit, NF, C.greenText);
  ws2.getRow(11).height = 32;
  Object.assign(ws2.getCell('A11'), {
    value: 'BALANCE DUE', font: { name: 'Arial', size: 11, bold: true, color: { argb: C.white } },
    fill:  { type: 'pattern', pattern: 'solid', fgColor: { argb: C.navyMid } },
    alignment: { horizontal: 'right', vertical: 'middle', indent: 1 },
    border: { right: med('FFFBBF24') },
  });
  ws2.mergeCells('B11:C11');
  Object.assign(ws2.getCell('B11'), {
    value:     netBalance,
    numFmt:    '#,##0;(#,##0)',
    font:      { name: 'Arial', size: 14, bold: true, color: { argb: C.white } },
    fill:      { type: 'pattern', pattern: 'solid', fgColor: { argb: isNeg ? 'FFDC2626' : 'FF16A34A' } },
    alignment: { horizontal: 'center', vertical: 'middle' },
  });

  return wb;
}

router.get('/purchases/account-excel', auth, async (req, res) => {
  try {
    const [[user]] = await db.query('SELECT name FROM users WHERE id=?', [req.user.id]);
    const [purchases] = await db.query(
      `SELECT p.*, c.make, c.model, c.year, c.auction_house, c.auction_date, c.chassis, c.lot_number
       FROM japan_purchases p JOIN japan_cars c ON c.pid = p.pid
       WHERE p.user_id = ? ORDER BY c.auction_date ASC`,
      [req.user.id],
    );
    const [remittances] = await db.query(
      `SELECT * FROM remittances WHERE user_id = ? AND status = 'confirmed' ORDER BY tt_date ASC`,
      [req.user.id],
    );

    const wb = await buildAccountExcel(user?.name, purchases, remittances);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="nipponbid-account-${Date.now()}.xlsx"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/purchases', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 30, user_id } = req.query;
    const offset = (+page - 1) * +limit;
    let where = '1=1';
    const params = [];
    if (user_id) { where += ' AND p.user_id = ?'; params.push(+user_id); }
    const [[{ total }]] = await db.query(`SELECT COUNT(*) as total FROM japan_purchases p WHERE ${where}`, params);
    const [rows] = await db.query(
      `SELECT p.*, u.name as user_name, u.email as user_email,
              c.make, c.model, c.year, c.auction_house, c.auction_date,
              c.chassis, c.lot_number, c.image_url,
              (SELECT COUNT(*) FROM japan_documents d WHERE d.purchase_id = p.id) as doc_count
       FROM japan_purchases p
       JOIN users u ON u.id = p.user_id
       JOIN japan_cars c ON c.pid = p.pid
       WHERE ${where}
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, +limit, +offset],
    );
    res.json({ purchases: rows, total, page: +page, pages: Math.ceil(total / +limit) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/purchases/account-excel-admin', adminAuth, async (req, res) => {
  try {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ message: 'user_id required' });
    const [[user]] = await db.query('SELECT name, email FROM users WHERE id=?', [user_id]);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const [purchases] = await db.query(
      `SELECT p.*, c.make, c.model, c.year, c.auction_house, c.auction_date, c.chassis, c.lot_number
       FROM japan_purchases p JOIN japan_cars c ON c.pid = p.pid
       WHERE p.user_id = ? ORDER BY c.auction_date ASC`,
      [user_id],
    );
    const [remittances] = await db.query(
      `SELECT * FROM remittances WHERE user_id = ? AND status = 'confirmed' ORDER BY tt_date ASC`,
      [user_id],
    );
    const wb = await buildAccountExcel(user.name, purchases, remittances);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="account-${user.name.replace(/\s+/g,'-')}-${Date.now()}.xlsx"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/purchases/:id', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT p.*, u.name as user_name, u.email as user_email,
              c.make, c.model, c.year, c.auction_house, c.auction_date,
              c.chassis, c.lot_number, c.image_url, c.grade
       FROM japan_purchases p
       JOIN users u ON u.id = p.user_id
       JOIN japan_cars c ON c.pid = p.pid
       WHERE p.id = ? ${req.user.role !== 'admin' ? 'AND p.user_id = ?' : ''}`,
      req.user.role !== 'admin' ? [req.params.id, req.user.id] : [req.params.id],
    );
    if (!rows.length) return res.status(404).json({ message: 'Purchase not found' });

    const purchase = rows[0];

    let docs;
    if (req.user.role === 'admin') {
      const [allDocs] = await db.query(
        'SELECT * FROM japan_documents WHERE purchase_id = ? ORDER BY uploaded_at DESC', [req.params.id],
      );
      docs = allDocs;
    } else {
      const visibleDocs = [];

      const [[blr]] = await db.query(
        'SELECT document_path, document_name, status, updated_at FROM bl_requests WHERE purchase_id = ? AND document_path IS NOT NULL ORDER BY id DESC LIMIT 1',
        [req.params.id],
      );
      if (blr) {
        visibleDocs.push({
          id: 'bl',
          name: blr.document_name || 'BL Document',
          file_path: blr.document_path,
          type: 'BL Document',
          uploaded_at: blr.updated_at,
        });
      }

      if (purchase.file_code) {
        const [[ship]] = await db.query(
          'SELECT document_path, document_name, updated_at FROM shipments WHERE file_code = ? AND document_path IS NOT NULL ORDER BY id DESC LIMIT 1',
          [purchase.file_code],
        );
        if (ship) {
          visibleDocs.push({
            id: 'vessel',
            name: ship.document_name || 'Vessel Document',
            file_path: ship.document_path,
            type: 'Vessel Document',
            uploaded_at: ship.updated_at,
          });
        }
      }

      docs = visibleDocs;
    }

    res.json({ ...purchase, documents: docs });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/purchases/:id', adminAuth, async (req, res) => {
  try {
    const {
      pro_invoice_no, file_code, destination,
      bid_price, auction_fee, auction_commission, transportation,
      loading_custom, commission, tax_10pct, radiation_photos,
      custom_fee, freight, recycle, total,
      etd, ship_name, shipping_company, eta, route,
      result_of_inspection, remarks, bl_status,
    } = req.body;

    await db.query(
      `UPDATE japan_purchases SET
        pro_invoice_no=?, file_code=?, destination=?,
        bid_price=?, auction_fee=?, auction_commission=?, transportation=?,
        loading_custom=?, commission=?, tax_10pct=?, radiation_photos=?,
        custom_fee=?, freight=?, recycle=?, total=?,
        etd=?, ship_name=?, shipping_company=?, eta=?, route=?,
        result_of_inspection=?, remarks=?, bl_status=?
       WHERE id=?`,
      [
        pro_invoice_no||null, file_code||null, destination||null,
        bid_price||0, auction_fee||0, auction_commission||0, transportation||0,
        loading_custom||0, commission||0, tax_10pct||0, radiation_photos||0,
        custom_fee||0, freight||0, recycle||0, total||0,
        normalizeDate(etd), ship_name||null, shipping_company||null, normalizeDate(eta), route||null,
        result_of_inspection||null, remarks||null, bl_status||null,
        req.params.id,
      ],
    );

    const [row] = await db.query(
      `SELECT p.*, u.name as user_name, u.email as user_email,
              c.make, c.model, c.year, c.auction_house, c.chassis, c.lot_number
       FROM japan_purchases p JOIN users u ON u.id=p.user_id
       JOIN japan_cars c ON c.pid=p.pid WHERE p.id=?`, [req.params.id],
    );
    if (!row.length) return res.status(404).json({ message: 'Purchase not found' });
    const p = row[0];

    const car = { make: p.make, model: p.model, year: p.year, chassis: p.chassis, lot_number: p.lot_number, auction_house: p.auction_house };
    const msg = bl_status ? `BL Status updated to: <strong>${bl_status}</strong>` : 'Your purchase details have been updated.';
    email.purchaseUpdated(p.user_email, p.user_name, car, msg, SITE_URL);

    res.json(p);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/purchases/:id', adminAuth, async (req, res) => {
  try {
    const [[purchase]] = await db.query('SELECT id, bid_id, pid FROM japan_purchases WHERE id=?', [req.params.id]);
    if (!purchase) return res.status(404).json({ message: 'Purchase not found' });
    await db.query('DELETE FROM japan_documents WHERE purchase_id=?', [req.params.id]);
    await db.query('DELETE FROM japan_purchases WHERE id=?', [req.params.id]);
    if (purchase.bid_id) {
      await db.query("UPDATE japan_bids SET status='lost' WHERE id=?", [purchase.bid_id]);
    }
    if (purchase.pid) {
      await db.query("UPDATE japan_cars SET status='past' WHERE pid=?", [purchase.pid]);
    }
    res.json({ message: 'Purchase deleted successfully' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/purchases/:id/documents', adminAuth, uploadDocument.single('document'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const { type, name } = req.body;

    const [p] = await db.query(
      `SELECT sp.*, u.name as user_name, u.email as user_email,
              c.make, c.model, c.year, c.chassis, c.lot_number, c.auction_house
       FROM japan_purchases sp JOIN users u ON u.id=sp.user_id
       JOIN japan_cars c ON c.pid=sp.pid WHERE sp.id=?`, [req.params.id],
    );
    if (!p.length) return res.status(404).json({ message: 'Purchase not found' });
    const pur = p[0];

    const filePath = await resolveUploadedFile(req.file, 'nipponbid/documents');
    const [result] = await db.query(
      'INSERT INTO japan_documents (purchase_id, type, name, file_path, file_size, uploaded_by) VALUES (?,?,?,?,?,?)',
      [req.params.id, type||'other', name||req.file.originalname, filePath, req.file.size, req.user.id],
    );

    const docName = name || req.file.originalname;
    const car = { make: pur.make, model: pur.model, year: pur.year, chassis: pur.chassis, lot_number: pur.lot_number, auction_house: pur.auction_house };
    email.documentUploaded(pur.user_email, pur.user_name, car, docName, SITE_URL);

    const [doc] = await db.query('SELECT * FROM japan_documents WHERE id=?', [result.insertId]);
    res.status(201).json(doc[0]);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/purchases/:id/documents/:docId', adminAuth, async (req, res) => {
  try {
    await db.query('DELETE FROM japan_documents WHERE id=? AND purchase_id=?', [req.params.docId, req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Japan Parts Purchases ─────────────────────────────────────────────────────

router.get('/parts-purchases', auth, async (req, res) => {
  try {
    const userId = req.user.role === 'admin' && req.query.user_id ? req.query.user_id : req.user.id;
    const [rows] = await db.query(
      'SELECT * FROM japan_parts_purchases WHERE user_id = ? ORDER BY purchased_date ASC, id ASC',
      [userId]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/parts-purchases', adminAuth, async (req, res) => {
  try {
    const { user_id, purchased_date, particular, item, delivered_to, put_in,
            auction_id, delivery_company, tracking_number, delivery_status,
            bid_price, delivery_charges, bank_charges, commission, total } = req.body;
    if (!user_id || !item) return res.status(400).json({ message: 'user_id and item are required' });
    const [result] = await db.query(
      `INSERT INTO japan_parts_purchases
        (user_id,purchased_date,particular,item,delivered_to,put_in,auction_id,
         delivery_company,tracking_number,delivery_status,bid_price,delivery_charges,
         bank_charges,commission,total)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [user_id, purchased_date||null, particular||null, item, delivered_to||null, put_in||null,
       auction_id||null, delivery_company||null, tracking_number||null, delivery_status||'pending',
       bid_price||null, delivery_charges||null, bank_charges||null, commission||null, total||null]
    );
    const [[row]] = await db.query('SELECT * FROM japan_parts_purchases WHERE id=?', [result.insertId]);
    res.status(201).json(row);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/parts-purchases/:id', adminAuth, async (req, res) => {
  try {
    const { purchased_date, particular, item, delivered_to, put_in, auction_id,
            delivery_company, tracking_number, delivery_status,
            bid_price, delivery_charges, bank_charges, commission, total } = req.body;
    await db.query(
      `UPDATE japan_parts_purchases SET
        purchased_date=?,particular=?,item=?,delivered_to=?,put_in=?,auction_id=?,
        delivery_company=?,tracking_number=?,delivery_status=?,bid_price=?,
        delivery_charges=?,bank_charges=?,commission=?,total=?
       WHERE id=?`,
      [purchased_date||null, particular||null, item, delivered_to||null, put_in||null,
       auction_id||null, delivery_company||null, tracking_number||null, delivery_status||'pending',
       bid_price||null, delivery_charges||null, bank_charges||null, commission||null, total||null,
       req.params.id]
    );
    const [[row]] = await db.query('SELECT * FROM japan_parts_purchases WHERE id=?', [req.params.id]);
    res.json(row);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/parts-purchases/:id', adminAuth, async (req, res) => {
  try {
    await db.query('DELETE FROM japan_parts_purchases WHERE id=?', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Excel export for parts purchases
router.get('/parts-purchases/export', auth, async (req, res) => {
  try {
    const userId = req.user.role === 'admin' && req.query.user_id ? req.query.user_id : req.user.id;
    const [rows] = await db.query(
      'SELECT * FROM japan_parts_purchases WHERE user_id = ? ORDER BY purchased_date ASC, id ASC',
      [userId]
    );
    const [[user]] = await db.query('SELECT name FROM users WHERE id=?', [userId]);

    const wb = new ExcelJS.Workbook();
    wb.creator = 'NipponBid';
    const ws = wb.addWorksheet('Parts Purchases');

    const COLS = [
      { header: 'NO.',               key: 'id',               width: 6  },
      { header: 'PURCHASED DATE',    key: 'purchased_date',   width: 16 },
      { header: 'PARTICULAR',        key: 'particular',       width: 12 },
      { header: 'ITEM',              key: 'item',             width: 30 },
      { header: 'DELIVERED TO',      key: 'delivered_to',     width: 18 },
      { header: 'PUT IN',            key: 'put_in',           width: 10 },
      { header: 'AUCTION ID',        key: 'auction_id',       width: 16 },
      { header: 'DELIVERY COMPANY',  key: 'delivery_company', width: 18 },
      { header: 'TRACKING NUMBER',   key: 'tracking_number',  width: 22 },
      { header: 'DELIVERY STATUS',   key: 'delivery_status',  width: 16 },
      { header: 'BID PRICE',         key: 'bid_price',        width: 12 },
      { header: 'DELIVERY CHARGES',  key: 'delivery_charges', width: 18 },
      { header: 'BANK CHARGES',      key: 'bank_charges',     width: 14 },
      { header: 'COMMISION',         key: 'commission',       width: 12 },
      { header: 'TOTAL',             key: 'total',            width: 14 },
    ];

    ws.getRow(1).values = COLS.map(c => c.header);
    COLS.forEach((c, i) => {
      ws.getColumn(i + 1).width = c.width;
      const cell = ws.getRow(1).getCell(i + 1);
      cell.font      = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 };
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A1A2E' } };
      cell.alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' };
    });
    ws.getRow(1).height = 28;

    const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB') : '';
    const fmtNum  = n => (n != null && n !== '') ? Number(n) : '';

    let seq = 1;
    rows.forEach(r => {
      const row = ws.addRow([
        seq++, fmtDate(r.purchased_date), r.particular||'', r.item,
        r.delivered_to||'', r.put_in||'', r.auction_id||'',
        r.delivery_company||'', r.tracking_number||'', r.delivery_status||'',
        fmtNum(r.bid_price), fmtNum(r.delivery_charges),
        fmtNum(r.bank_charges), fmtNum(r.commission), fmtNum(r.total),
      ]);
      row.eachCell(cell => {
        cell.font = { size: 9 };
        cell.alignment = { vertical: 'middle' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE0E0E0' } }, bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          left: { style: 'thin', color: { argb: 'FFE0E0E0' } }, right: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        };
      });
      row.height = 16;
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="parts-${user?.name?.replace(/\s+/g,'-') || userId}-${Date.now()}.xlsx"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
