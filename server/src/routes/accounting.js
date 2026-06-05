const router  = require('express').Router();
const db      = require('../config/database');
const { auth, adminAuth } = require('../middleware/auth');
const ExcelJS = require('exceljs');

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

// ── Excel Export ─────────────────────────────────────────────────────────────
async function buildAccountExcel(userId) {
  const [[user]] = await db.query(
    'SELECT user_id, name, email, country FROM users WHERE user_id = ?', [userId]
  );

  // Full purchase details
  const [purchases] = await db.query(
    `SELECT p.purchase_id, p.auction_date, p.lot_no, p.destination,
            p.pro_invoice_no, p.file_code_no, p.remarks,
            c.make, c.model, c.year, c.chassis_no, c.color, c.mileage, c.grade,
            a.auction_name,
            pd.bid_price, pd.auction_commission, pd.transportation,
            pd.loading_custom, pd.commission, pd.tax_10_percent,
            pd.radiation_photos, pd.custom_fee, pd.freight, pd.recycle, pd.others, pd.total
     FROM purchases p
     JOIN cars c ON c.car_id = p.car_id
     LEFT JOIN auctions a ON a.auction_id = p.auction_id
     JOIN purchase_details pd ON pd.purchase_id = p.purchase_id
     WHERE p.user_id = ? ORDER BY COALESCE(p.auction_date, p.created_at) ASC`,
    [userId]
  );

  // Shipment details
  const [shipments] = await db.query(
    `SELECT s.purchase_id, s.etd, s.eta, s.ship_name, s.route,
            s.result_of_inspection, s.bl_status, s.port_of_loading, s.port_of_discharge
     FROM shipping s
     JOIN purchases p ON p.purchase_id = s.purchase_id
     WHERE p.user_id = ?`, [userId]
  );
  const shipMap = {};
  shipments.forEach(s => { shipMap[s.purchase_id] = s; });

  // Confirmed remittances
  const [remittances] = await db.query(
    `SELECT remittance_id, ref_no, sender_name, deposit_amount, tt_date, confirmed_at
     FROM remittances WHERE user_id = ? AND status = 'confirmed'
     ORDER BY COALESCE(tt_date, DATE(confirmed_at)) ASC`, [userId]
  );

  // Parts purchases
  const [parts] = await db.query(
    `SELECT parts_purchase_id, part_name, bid_price, delivery_charges,
            bank_charges, shinchuo_commission, commission, created_at
     FROM parts_purchases WHERE user_id = ? AND bid_price > 0
     ORDER BY created_at ASC`, [userId]
  );

  const fmtDate = (d) => {
    if (!d) return '';
    const dt  = new Date(d);
    const day = String(dt.getDate()).padStart(2, '0');
    const mon = dt.toLocaleString('en-GB', { month: 'short' });
    const yr  = String(dt.getFullYear()).slice(2);
    return `${day}-${mon}-${yr}`;
  };
  const n = (v) => Number(v) || 0;
  const today = new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' });

  const wb = new ExcelJS.Workbook();
  wb.creator = 'NipponBid';

  // ── COLORS ──────────────────────────────────────────────────────────────────
  const C = {
    headerBg:   'FF0F172A',  // dark navy
    headerText: 'FFFFFFFF',
    subHeaderBg:'FF1E3A5F',
    colHeaderBg:'FF2E4A7A',
    purchaseBg: 'FFFFFFFF',
    paymentBg:  'FFD1FAE5',
    paymentText:'FF166534',
    totalRowBg: 'FFE2E8F0',
    altRow:     'FFF8FAFC',
    redText:    'FF9F1239',
    border:     'FFD1D5DB',
    labelBg:    'FFF1F5F9',
  };

  const thin = (argb = C.border) => ({ style: 'thin', color: { argb } });
  const allBorder = (argb = C.border) => ({ top: thin(argb), left: thin(argb), bottom: thin(argb), right: thin(argb) });
  const boldFont = (sz = 10, argb = 'FF111827') => ({ name: 'Arial', size: sz, bold: true, color: { argb } });
  const normFont = (sz = 10, argb = 'FF374151') => ({ name: 'Arial', size: sz, color: { argb } });
  const YEN = '#,##0';

  // ── DATA SHEET ───────────────────────────────────────────────────────────────
  const data = wb.addWorksheet('Data');

  // Build interleaved rows: purchases + remittances sorted by date
  const allRows = [];
  purchases.forEach(p => allRows.push({ type: 'purchase', date: p.auction_date, data: p }));
  remittances.forEach(r => allRows.push({ type: 'remittance', date: r.tt_date || r.confirmed_at, data: r }));
  parts.forEach(p => allRows.push({ type: 'parts', date: p.created_at, data: p }));
  allRows.sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));

  const totalPurchases = purchases.reduce((s, p) => s + n(p.total), 0);
  const totalParts = parts.reduce((s, p) => s + n(p.bid_price) + n(p.delivery_charges) + n(p.commission), 0);
  const totalBilled = totalPurchases + totalParts;
  const totalReceived = remittances.reduce((s, r) => s + n(r.deposit_amount), 0);
  const netBalance = totalReceived - totalBilled;

  // Merge & column widths
  data.columns = [
    { key: 'no',     width: 5  },
    { key: 'date',   width: 13 },
    { key: 'auc',    width: 20 },
    { key: 'lot',    width: 8  },
    { key: 'chassis',width: 17 },
    { key: 'make',   width: 10 },
    { key: 'model',  width: 12 },
    { key: 'year',   width: 6  },
    { key: 'bid',    width: 12 },
    { key: 'aucfee', width: 10 },
    { key: 'trans',  width: 13 },
    { key: 'lc',     width: 12 },
    { key: 'comm',   width: 12 },
    { key: 'rad',    width: 12 },
    { key: 'custom', width: 10 },
    { key: 'freight',width: 10 },
    { key: 'total',  width: 13 },
    { key: 'debit',  width: 13 },
    { key: 'balance',width: 14 },
  ];

  // Row 1 — Title
  data.mergeCells('A1:S1');
  const titleCell = data.getCell('A1');
  titleCell.value = 'AUTO BID 株式会社  ·  ACCOUNT STATEMENT';
  titleCell.font  = { name: 'Arial', size: 14, bold: true, color: { argb: C.headerText } };
  titleCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.headerBg } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  data.getRow(1).height = 28;

  // Row 2 — Client + Date
  data.mergeCells('A2:I2');
  const clientCell = data.getCell('A2');
  clientCell.value = `  Client: ${user.name}`;
  clientCell.font  = boldFont(11, C.headerText);
  clientCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.subHeaderBg } };
  clientCell.alignment = { vertical: 'middle' };
  data.mergeCells('J2:S2');
  const dateCell = data.getCell('J2');
  dateCell.value = `Statement Date: ${today}  `;
  dateCell.font  = boldFont(10, C.headerText);
  dateCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.subHeaderBg } };
  dateCell.alignment = { horizontal: 'right', vertical: 'middle' };
  data.getRow(2).height = 20;

  // Row 3 — Bank info
  const bankInfo = [
    ['BANK NAME', 'SUMISHIN SBI NET BANK  |  Wise Payments Limited'],
    ['BRANCH', 'HOUJIN DAI ICHI (106)'],
    ['BANK CODE', '0038'],
    ['SWIFT CODE', 'NTSSJPJT  |  TRWIGB2LXXX'],
    ['ACCOUNT NO.', '2447325  |  GB28-TRWI-2308-0153-4807-10'],
    ['ACCOUNT NAME', `Auto Bid K.K  |  ${user.name}`],
    ['ACCOUNT TYPE', 'SAVING (FOTSU)'],
  ];
  bankInfo.forEach(([label, val], i) => {
    const r = data.getRow(3 + i);
    r.height = 15;
    data.mergeCells(`A${3+i}:B${3+i}`);
    const lc = data.getCell(`A${3+i}`);
    lc.value = label;
    lc.font  = boldFont(9, 'FF374151');
    lc.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.labelBg } };
    lc.alignment = { vertical: 'middle', indent: 1 };
    data.mergeCells(`C${3+i}:I${3+i}`);
    const vc = data.getCell(`C${3+i}`);
    vc.value = val;
    vc.font  = normFont(9);
    vc.alignment = { vertical: 'middle' };
  });

  // Row 10 — Net balance summary
  const sumRow = data.getRow(10);
  sumRow.height = 22;
  data.mergeCells('A10:B10');
  const nbLabel = data.getCell('A10');
  nbLabel.value = 'NET BALANCE';
  nbLabel.font  = boldFont(10, C.headerText);
  nbLabel.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.headerBg } };
  nbLabel.alignment = { horizontal: 'center', vertical: 'middle' };
  data.mergeCells('C10:D10');
  const nbVal = data.getCell('C10');
  nbVal.value      = netBalance;
  nbVal.numFmt     = YEN;
  nbVal.font       = boldFont(12, netBalance < 0 ? C.redText : 'FF166534');
  nbVal.alignment  = { horizontal: 'right', vertical: 'middle' };
  data.mergeCells('E10:H10');
  data.getCell('E10').value = `Purchases: ¥${n(totalBilled).toLocaleString()}`;
  data.getCell('E10').font  = boldFont(9, 'FF374151');
  data.getCell('E10').alignment = { vertical: 'middle' };
  data.mergeCells('I10:L10');
  data.getCell('I10').value = `Received: ¥${n(totalReceived).toLocaleString()}`;
  data.getCell('I10').font  = boldFont(9, 'FF166534');
  data.getCell('I10').alignment = { vertical: 'middle' };
  data.mergeCells('M10:P10');
  data.getCell('M10').value = `${purchases.length} Cars`;
  data.getCell('M10').font  = boldFont(9);
  data.mergeCells('Q10:S10');
  data.getCell('Q10').value = `${remittances.length} Payments`;
  data.getCell('Q10').font  = boldFont(9);

  // Row 11 — Legend
  data.mergeCells('A11:H11');
  data.getCell('A11').value = '  ■ Purchase rows   ■ Payment / credit rows (green)   ■ DEBIT column = received amount only';
  data.getCell('A11').font  = normFont(8, 'FF6B7280');
  data.mergeCells('I11:S11');
  data.getCell('I11').value = 'See "Details" sheet for shipping, invoice & inspection data  →';
  data.getCell('I11').font  = normFont(8, 'FF2563EB');
  data.getCell('I11').alignment = { horizontal: 'right' };
  data.getRow(11).height = 14;

  // Row 12 — Column headers
  const COL_HEADERS = [
    'NO.','AUC DATE','AUC NAME','LOT NO','CHASSIS NO',
    'MAKE','MODEL','YEAR','BID PRICE','AUCTION',
    'TRANSPORTATION','LOADING\n/CUSTOM','COMMISSION','RADIATION\n& PHOTOS',
    'CUSTOM','FREIGHT','TOTAL','DEBIT','BALANCE'
  ];
  const hRow = data.getRow(12);
  hRow.height = 30;
  COL_HEADERS.forEach((h, i) => {
    const cell = hRow.getCell(i + 1);
    cell.value = h;
    cell.font  = boldFont(9, C.headerText);
    cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.colHeaderBg } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = allBorder('FF1E3A5F');
  });

  // Data rows
  let rowIdx = 13;
  let carNo  = 1;
  let balance = 0;

  for (const item of allRows) {
    const row = data.getRow(rowIdx);
    row.height = 16;
    const isPay  = item.type === 'remittance';
    const isPart = item.type === 'parts';
    const bgArgb = isPay ? C.paymentBg : (rowIdx % 2 === 0 ? C.altRow : C.purchaseBg);

    if (isPay) {
      const r = item.data;
      const amt = n(r.deposit_amount);
      balance += amt;
      const vals = [
        '►', fmtDate(r.tt_date || r.confirmed_at),
        `PAYMENT RECEIVED  —  ${r.ref_no}`,
        '', '', '', '', '', '', '', '', '', '', '', '', '', '',
        amt, balance
      ];
      vals.forEach((v, i) => {
        const c = row.getCell(i + 1);
        c.value = v;
        c.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.paymentBg } };
        c.font  = (i === 17) ? boldFont(9, 'FF166534')
                : (i === 18) ? boldFont(9, balance < 0 ? C.redText : 'FF166534')
                : normFont(9, 'FF166534');
        if (i === 17 || i === 18) c.numFmt = YEN;
        c.alignment = { vertical: 'middle', horizontal: i >= 8 ? 'right' : 'left' };
        c.border = allBorder();
      });
    } else if (isPart) {
      const p = item.data;
      const total = n(p.bid_price) + n(p.delivery_charges) + n(p.commission);
      balance -= total;
      const vals = [
        carNo++, fmtDate(p.created_at), 'PARTS PURCHASE',
        '', '', '', p.part_name, '', n(p.bid_price), '',
        n(p.delivery_charges), '', n(p.commission), '', '', '',
        total, '', balance
      ];
      vals.forEach((v, i) => {
        const c = row.getCell(i + 1);
        c.value = v;
        c.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
        c.font  = (i === 18) ? boldFont(9, balance < 0 ? C.redText : 'FF166534')
                : normFont(9);
        if ([8,9,10,11,12,13,14,15,16,18].includes(i)) c.numFmt = YEN;
        c.alignment = { vertical: 'middle', horizontal: i >= 8 ? 'right' : 'left' };
        c.border = allBorder();
      });
    } else {
      const p = item.data;
      balance -= n(p.total);
      const vals = [
        carNo++, fmtDate(p.auction_date), p.auction_name || '',
        p.lot_no || '', p.chassis_no || '',
        p.make || '', p.model || '', p.year || '',
        n(p.bid_price), n(p.auction_commission),
        n(p.transportation), n(p.loading_custom), n(p.commission),
        n(p.radiation_photos), n(p.custom_fee), n(p.freight),
        n(p.total), '', balance
      ];
      vals.forEach((v, i) => {
        const c = row.getCell(i + 1);
        c.value = v;
        c.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
        c.font  = (i === 18) ? boldFont(9, balance < 0 ? C.redText : 'FF166534') : normFont(9);
        if ([8,9,10,11,12,13,14,15,16,18].includes(i)) c.numFmt = YEN;
        c.alignment = { vertical: 'middle', horizontal: i >= 8 ? 'right' : i === 7 ? 'center' : 'left' };
        c.border = allBorder();
      });
    }
    rowIdx++;
  }

  // Freeze panes below header
  data.views = [{ state: 'frozen', ySplit: 12 }];

  // ── DETAILS SHEET ────────────────────────────────────────────────────────────
  const det = wb.addWorksheet('Details');
  det.columns = [
    { width: 5  }, { width: 12 }, { width: 20 }, { width: 8  }, { width: 17 },
    { width: 22 }, { width: 16 }, { width: 14 }, { width: 12 },
    { width: 12 }, { width: 20 }, { width: 12 }, { width: 22 },
    { width: 18 }, { width: 20 }, { width: 12 },
  ];

  // Title
  det.mergeCells('A1:P1');
  const dTitle = det.getCell('A1');
  dTitle.value = 'AUTO BID 株式会社  ·  SHIPPING & EXTENDED DETAILS';
  dTitle.font  = { name: 'Arial', size: 14, bold: true, color: { argb: C.headerText } };
  dTitle.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.headerBg } };
  dTitle.alignment = { horizontal: 'center', vertical: 'middle' };
  det.getRow(1).height = 28;

  det.mergeCells('A2:H2');
  det.getCell('A2').value = `  Client: ${user.name}   ·   ${purchases.length} cars`;
  det.getCell('A2').font  = boldFont(11, C.headerText);
  det.getCell('A2').fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.subHeaderBg } };
  det.mergeCells('I2:P2');
  det.getCell('I2').value = '← Match the NO. column with the "Data" sheet for cost breakdown  ';
  det.getCell('I2').font  = normFont(9, 'FF2563EB');
  det.getCell('I2').fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.subHeaderBg } };
  det.getCell('I2').alignment = { horizontal: 'right' };
  det.getRow(2).height = 20;

  const DET_HEADERS = [
    'NO.','AUC DATE','AUC NAME','LOT NO','CHASSIS NO',
    'DESTINATION','PRO-INVOICE NO.','FILE CODE NO',
    'AUCTION\nCOMMISSION','ETD','SHIP NAME','ETA',
    'ROUTE','RESULT OF\nINSPECTION','REMARKS','BL STATUS'
  ];
  const dhRow = det.getRow(3);
  dhRow.height = 30;
  DET_HEADERS.forEach((h, i) => {
    const cell = dhRow.getCell(i + 1);
    cell.value = h;
    cell.font  = boldFont(9, C.headerText);
    cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.colHeaderBg } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = allBorder('FF1E3A5F');
  });

  purchases.forEach((p, i) => {
    const ship = shipMap[p.purchase_id] || {};
    const dRow = det.getRow(4 + i);
    dRow.height = 16;
    const bg = i % 2 === 0 ? C.purchaseBg : C.altRow;
    const vals = [
      i + 1, fmtDate(p.auction_date), p.auction_name || '',
      p.lot_no || '', p.chassis_no || '',
      p.destination || '', p.pro_invoice_no || '', p.file_code_no || '',
      n(p.auction_commission),
      fmtDate(ship.etd), ship.ship_name || '',
      fmtDate(ship.eta), ship.route || '',
      ship.result_of_inspection || '', p.remarks || '',
      ship.bl_status || '',
    ];
    vals.forEach((v, j) => {
      const c = dRow.getCell(j + 1);
      c.value = v;
      c.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      c.font  = normFont(9);
      if (j === 8) c.numFmt = YEN;
      c.alignment = { vertical: 'middle', horizontal: j === 8 ? 'right' : 'left' };
      c.border = allBorder();
    });
  });

  // Grand total row
  const gtRow = det.getRow(4 + purchases.length);
  gtRow.height = 18;
  det.mergeCells(`A${4+purchases.length}:H${4+purchases.length}`);
  const gtLabel = gtRow.getCell(1);
  gtLabel.value = 'GRAND TOTAL';
  gtLabel.font  = boldFont(10, C.headerText);
  gtLabel.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.headerBg } };
  gtLabel.alignment = { horizontal: 'center', vertical: 'middle' };
  const gtVal = gtRow.getCell(9);
  gtVal.value  = purchases.reduce((s, p) => s + n(p.auction_commission), 0);
  gtVal.numFmt = YEN;
  gtVal.font   = boldFont(10, C.headerText);
  gtVal.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.headerBg } };
  gtVal.alignment = { horizontal: 'right', vertical: 'middle' };

  det.views = [{ state: 'frozen', ySplit: 3 }];

  // ── CURRENT BILL SHEET ───────────────────────────────────────────────────────
  const bill = wb.addWorksheet('Current Bill');
  bill.columns = [{ width: 22 }, { width: 20 }, { width: 5 }];

  bill.mergeCells('A1:C1');
  const bTitle = bill.getCell('A1');
  bTitle.value = 'AUTO BID 株式会社  ·  CURRENT BILL';
  bTitle.font  = { name: 'Arial', size: 14, bold: true, color: { argb: C.headerText } };
  bTitle.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.headerBg } };
  bTitle.alignment = { horizontal: 'center', vertical: 'middle' };
  bill.getRow(1).height = 28;

  const billData = [
    ['Customer',        user.name],
    ['Statement Date',  today],
    ['Total Cars',      purchases.length],
    ['Total Purchases', totalBilled],
    ['Total Payments',  totalReceived],
    ['BALANCE DUE',     netBalance],
  ];
  billData.forEach(([label, val], i) => {
    const r = bill.getRow(2 + i);
    r.height = 20;
    const lc = r.getCell(1);
    lc.value = label;
    lc.font  = boldFont(10);
    lc.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.labelBg } };
    lc.alignment = { vertical: 'middle', indent: 1 };
    lc.border = allBorder();
    const vc = r.getCell(2);
    vc.value = val;
    vc.font  = label === 'BALANCE DUE'
      ? boldFont(12, val < 0 ? C.redText : 'FF166534')
      : (typeof val === 'number' ? boldFont(10) : normFont(10));
    if (typeof val === 'number' && i >= 2) vc.numFmt = YEN;
    vc.fill  = { type: 'pattern', pattern: 'solid',
                 fgColor: { argb: label === 'BALANCE DUE' ? (val < 0 ? 'FFFFF1F2' : C.paymentBg) : C.purchaseBg } };
    vc.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };
    vc.border = allBorder();
  });

  return wb;
}

router.get('/export', adminAuth, async (req, res) => {
  try {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ message: 'user_id required' });
    const wb = await buildAccountExcel(user_id);
    const [[user]] = await db.query('SELECT name FROM users WHERE user_id = ?', [user_id]);
    const fname = `account-${(user?.name || 'export').replace(/\s+/g, '-')}-${Date.now()}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fname}"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) { res.status(500).json({ message: err.message }); }
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
