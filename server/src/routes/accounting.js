const router  = require('express').Router();
const db      = require('../config/database');
const { auth, adminAuth } = require('../middleware/auth');
const ExcelJS = require('exceljs');

const intVal = (v) => typeof v === 'number' ? Math.round(v) : v;

const getDealerFee = async () => {
  try {
    const [[row]] = await db.query("SELECT value FROM settings WHERE key_name = 'dealer_fee'");
    return row ? Number(row.value) : 100000;
  } catch { return 100000; }
};

const n = (v) => Math.round(Number(v) || 0);

// Dealer purchase cost: flat per-car fee model — the dealer fee is assumed to cover
// auction/transport/customs costs, so only bid price, dealer fee and others count.
const calcDealerPurchaseTotal = (pd) => n(pd.bid_price) + n(pd.dealer_fee) + n(pd.others);

// Agent purchase cost: every line item billed individually, including tax, recycle, and both
// the intermediary's commission and NipponBid's own commission.
const calcAgentPurchaseTotal = (pd) =>
  n(pd.third_party_fee) + n(pd.bid_price) + n(pd.auction_charges) + n(pd.transportation) +
  n(pd.loading_custom) + n(pd.tax_10_percent) + n(pd.radiation_photos) + n(pd.custom_fee) +
  n(pd.freight) + n(pd.recycle) + n(pd.others) + n(pd.others_commission) + n(pd.nipponbid_commission);

// Ordinary client-billed total: Tax and Recycle are NOT billed to ordinary clients as separate
// line items, but their manually-entered NipponBid Commission is included in what they owe,
// alongside any intermediary (Others) commission actually billed on that car.
const calcOrdinaryPurchaseTotal = (pd) =>
  n(pd.bid_price) + n(pd.auction_charges) + n(pd.transportation) +
  n(pd.loading_custom) + n(pd.radiation_photos) + n(pd.custom_fee) + n(pd.freight) +
  n(pd.others) + n(pd.others_commission) + (n(pd.nipponbid_commission) - n(pd.third_party_fee));

// Credits — confirmed remittances. Same for every customer type.
const fetchRemittanceCredits = async (userId) => {
  const [remRows] = await db.query(
    `SELECT 'remittance' AS entry_type,
            ref_no AS ref,
            COALESCE(sender_name, ref_no) AS description,
            deposit_amount AS credit, 0 AS debit,
            COALESCE(tt_date, DATE(confirmed_at), DATE(created_at)) AS entry_date,
            remittance_id AS source_id
     FROM remittances WHERE user_id = ? AND status = 'confirmed'`,
    [userId]
  );
  return remRows;
};

// Raw car-purchase rows (LEFT JOIN so purchases without cost details are included with 0 debit).
// Same query for every customer type — only the debit formula applied to these rows differs.
const fetchPurchaseRows = async (userId) => {
  const [purchaseRows] = await db.query(
    `SELECT 'purchase' AS entry_type,
            CONCAT('P-', p.purchase_id) AS ref,
            CONCAT('Car Purchase - ', c.make, ' ', c.model, ' ', COALESCE(c.year::text,''), ' (', COALESCE(c.chassis_no,''), ')') AS description,
            0 AS credit,
            pd.bid_price, pd.auction_charges, pd.transportation, pd.loading_custom,
            pd.others_commission, pd.radiation_photos, pd.custom_fee, pd.freight,
            pd.others, pd.tax_10_percent, pd.recycle, pd.dealer_fee, pd.nipponbid_commission,
            pd.is_third_party, pd.third_party_fee,
            COALESCE(p.auction_date, DATE(p.created_at)) AS entry_date,
            p.purchase_id AS source_id
     FROM purchases p
     JOIN cars c ON c.car_id = p.car_id
     LEFT JOIN purchase_details pd ON pd.purchase_id = p.purchase_id
     WHERE p.user_id = ?`,
    [userId]
  );
  return purchaseRows;
};

// Debits — parts purchases. Same for every customer type.
const fetchPartsDebits = async (userId) => {
  const [partsRowsRaw] = await db.query(
    `SELECT 'parts' AS entry_type,
            CONCAT('PART-', parts_purchase_id) AS ref,
            CONCAT('Parts Purchase - ', part_name) AS description,
            0 AS credit,
            bid_price, delivery_charges, commission,
            DATE(created_at) AS entry_date,
            parts_purchase_id AS source_id
     FROM parts_purchases
     WHERE user_id = ? AND bid_price IS NOT NULL AND bid_price > 0`,
    [userId]
  );
  return partsRowsRaw.map(r => ({
    ...r,
    debit: n(r.bid_price) + n(r.delivery_charges) + n(r.commission),
  }));
};

// Merges credit/debit rows in date order and runs a cumulative balance over them.
const assembleLedger = (remRows, purchaseRowsMapped, partsRows) => {
  const entries = [...remRows, ...purchaseRowsMapped, ...partsRows]
    .sort((a, b) => new Date(a.entry_date) - new Date(b.entry_date));

  let balance = 0;
  return entries.map(e => {
    const credit = n(e.credit);
    const debit  = n(e.debit);
    balance = n(balance + credit - debit);
    return { ...e, credit, debit, balance };
  });
};

const buildDealerLedger = async (userId) => {
  const [remRows, purchaseRows, partsRows] = await Promise.all([
    fetchRemittanceCredits(userId), fetchPurchaseRows(userId), fetchPartsDebits(userId),
  ]);
  const purchaseRowsMapped = purchaseRows.map(r => ({
    ...r,
    debit: calcDealerPurchaseTotal(r),
    bid_price:  n(r.bid_price),
    others:     n(r.others),
    commission: n(r.dealer_fee),
  }));
  return assembleLedger(remRows, purchaseRowsMapped, partsRows);
};

const buildAgentLedger = async (userId) => {
  const [remRows, purchaseRows, partsRows] = await Promise.all([
    fetchRemittanceCredits(userId), fetchPurchaseRows(userId), fetchPartsDebits(userId),
  ]);
  const purchaseRowsMapped = purchaseRows.map(r => ({
    ...r,
    debit: calcAgentPurchaseTotal(r),
    bid_price:  n(r.bid_price),
    others:     n(r.others),
    commission: n(r.others_commission),
  }));
  return assembleLedger(remRows, purchaseRowsMapped, partsRows);
};

const buildOrdinaryLedger = async (userId) => {
  const [remRows, purchaseRows, partsRows] = await Promise.all([
    fetchRemittanceCredits(userId), fetchPurchaseRows(userId), fetchPartsDebits(userId),
  ]);
  const purchaseRowsMapped = purchaseRows.map(r => ({
    ...r,
    debit: calcOrdinaryPurchaseTotal(r),
    bid_price:  n(r.bid_price),
    others:     n(r.others),
    commission: n(r.nipponbid_commission),
  }));
  return assembleLedger(remRows, purchaseRowsMapped, partsRows);
};

// Checks the customer's type first, then delegates to the matching builder.
const buildLedger = async (userId) => {
  const [[userRow]] = await db.query('SELECT type FROM users WHERE user_id = ?', [userId]);
  const userType = userRow?.type || 'ordinary';
  if (userType === 'dealer') return buildDealerLedger(userId);
  if (userType === 'agent')  return buildAgentLedger(userId);
  return buildOrdinaryLedger(userId);
};

router.get('/my', auth, async (req, res) => {
  try {
    const ledger = await buildLedger(req.user.id);
    const totalCredit = Math.round(ledger.reduce((s, r) => s + r.credit, 0));
    const totalDebit  = Math.round(ledger.reduce((s, r) => s + r.debit,  0));
    const balance     = totalCredit - totalDebit;
    res.json({ ledger, totalCredit, totalDebit, balance });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/user/:userId', adminAuth, async (req, res) => {
  try {
    const ledger = await buildLedger(req.params.userId);
    const totalCredit = Math.round(ledger.reduce((s, r) => s + r.credit, 0));
    const totalDebit  = Math.round(ledger.reduce((s, r) => s + r.debit,  0));
    const balance     = totalCredit - totalDebit;
    const [[user]] = await db.query('SELECT user_id, name, email, country FROM users WHERE user_id = ?', [req.params.userId]);
    res.json({ user, ledger, totalCredit, totalDebit, balance });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Excel Export ─────────────────────────────────────────────────────────────
async function buildAccountExcel(userId, adminView = false) {
  const [[user]] = await db.query(
    'SELECT user_id, name, email, country, type FROM users WHERE user_id = ?', [userId]
  );
  const userType  = user?.type || 'ordinary';
  const dealerFee = await getDealerFee();
  // In admin view, dealers get the full ordinary breakdown so admin sees all cost fields.
  // In user's own view, dealers see their simplified layout.
  const isDealer      = userType === 'dealer' && !adminView;
  // Admin always gets the full 22-column layout with tax, recycle, dealer commission
  const isAdminLayout = adminView;

  // Full purchase details
  const [purchasesRaw] = await db.query(
    `SELECT p.purchase_id, p.auction_date, p.lot_no, p.destination,
            p.pro_invoice_no, p.file_code_no, p.remarks,
            c.make, c.model, c.year, c.chassis_no, c.color, c.mileage, c.grade,
            a.auction_name,
            pd.bid_price, pd.auction_charges, pd.transportation,
            pd.loading_custom, pd.others_commission, pd.tax_10_percent,
            pd.radiation_photos, pd.custom_fee, pd.freight, pd.recycle, pd.others,
            pd.dealer_fee, pd.nipponbid_commission, pd.is_third_party, pd.third_party_fee
     FROM purchases p
     JOIN cars c ON c.car_id = p.car_id
     LEFT JOIN auctions a ON a.auction_id = p.auction_id
     JOIN purchase_details pd ON pd.purchase_id = p.purchase_id
     WHERE p.user_id = ? ORDER BY COALESCE(p.auction_date, p.created_at) ASC`,
    [userId]
  );

  // Override total with the correct formula for this user type
  const purchases = purchasesRaw.map(p => ({
    ...p,
    computed_total: userType === 'dealer' ? calcDealerPurchaseTotal(p)
                   : userType === 'agent'  ? calcAgentPurchaseTotal(p)
                   : calcOrdinaryPurchaseTotal(p),
  }));

  // Shipment details (bl_status lives in the bl table, not shipping)
  const [shipments] = await db.query(
    `SELECT s.purchase_id, s.etd, s.eta, s.ship_name, s.route,
            s.result_of_inspection,
            bl.port_of_loading, bl.port_of_discharge, bl.status AS bl_status
     FROM shipping s
     JOIN purchases p ON p.purchase_id = s.purchase_id
     LEFT JOIN bl ON bl.shipping_id = s.shipping_id
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
  const n = (v) => Math.round(Number(v) || 0);
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

  const totalPurchases = Math.round(purchases.reduce((s, p) => s + n(p.computed_total), 0));
  const totalParts     = Math.round(parts.reduce((s, p) => s + n(p.bid_price) + n(p.delivery_charges) + n(p.commission), 0));
  const totalBilled    = totalPurchases + totalParts;
  const totalReceived  = Math.round(remittances.reduce((s, r) => s + n(r.deposit_amount), 0));
  const netBalance     = totalReceived - totalBilled;

  // Merge & column widths
  // admin=22 cols, ordinary=19 cols, dealer=14 cols
  data.columns = isAdminLayout
    ? [
        { key: 'no',       width: 5  },
        { key: 'date',     width: 13 },
        { key: 'auc',      width: 20 },
        { key: 'lot',      width: 8  },
        { key: 'chassis',  width: 17 },
        { key: 'make',     width: 10 },
        { key: 'model',    width: 12 },
        { key: 'year',     width: 6  },
        { key: 'bid',      width: 12 },
        { key: 'aucfee',   width: 10 },
        { key: 'trans',    width: 13 },
        { key: 'lc',       width: 12 },
        { key: 'ncomm',    width: 14 },
        { key: 'rad',      width: 12 },
        { key: 'custom',   width: 10 },
        { key: 'freight',  width: 10 },
        { key: 'tax',      width: 10 },
        { key: 'recycle',  width: 10 },
        { key: 'dcomm',    width: 14 },
        { key: 'total',    width: 13 },
        { key: 'debit',    width: 13 },
        { key: 'balance',  width: 14 },
      ]
    : isDealer
    ? [
        { key: 'no',      width: 5  },
        { key: 'date',    width: 13 },
        { key: 'auc',     width: 20 },
        { key: 'lot',     width: 8  },
        { key: 'chassis', width: 17 },
        { key: 'make',    width: 10 },
        { key: 'model',   width: 12 },
        { key: 'year',    width: 6  },
        { key: 'bid',     width: 12 },
        { key: 'others',  width: 12 },
        { key: 'comm',    width: 12 },
        { key: 'total',   width: 13 },
        { key: 'debit',   width: 13 },
        { key: 'balance', width: 14 },
      ]
    : [
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

  // admin=22 cols (A-V), ordinary=19 (A-S), dealer=14 (A-N)
  const lastCol  = isAdminLayout ? 'V' : isDealer ? 'N' : 'S';
  const midCol   = isAdminLayout ? 'K' : isDealer ? 'H' : 'I';
  const midCol2  = isAdminLayout ? 'L' : isDealer ? 'I' : 'J';

  // Row 1 — Title
  data.mergeCells(`A1:${lastCol}1`);
  const titleCell = data.getCell('A1');
  titleCell.value = 'AUTO BID 株式会社  ·  ACCOUNT STATEMENT';
  titleCell.font  = { name: 'Arial', size: 14, bold: true, color: { argb: C.headerText } };
  titleCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.headerBg } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  data.getRow(1).height = 28;

  // Row 2 — Client + Date
  data.mergeCells(`A2:${midCol}2`);
  const clientCell = data.getCell('A2');
  clientCell.value = `  Client: ${user.name}${isDealer ? '  [DEALER]' : ''}`;
  clientCell.font  = boldFont(11, C.headerText);
  clientCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.subHeaderBg } };
  clientCell.alignment = { vertical: 'middle' };
  data.mergeCells(`${midCol2}2:${lastCol}2`);
  const dateCell = data.getCell(`${midCol2}2`);
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
    data.mergeCells(`C${3+i}:${midCol}${3+i}`);
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
  if (isDealer) {
    data.mergeCells('E10:H10');
    data.getCell('E10').value = `Purchases: ¥${n(totalBilled).toLocaleString()}  |  Dealer Fee: ¥${dealerFee.toLocaleString()}`;
    data.getCell('E10').font  = boldFont(9, 'FF374151');
    data.getCell('E10').alignment = { vertical: 'middle' };
    data.mergeCells('I10:N10');
    data.getCell('I10').value = `Received: ¥${n(totalReceived).toLocaleString()}`;
    data.getCell('I10').font  = boldFont(9, 'FF166534');
    data.getCell('I10').alignment = { vertical: 'middle' };
  } else {
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
  }

  // Row 11 — Legend
  data.mergeCells(`A11:${midCol}11`);
  data.getCell('A11').value = '  ■ Purchase rows   ■ Payment / credit rows (green)   ■ DEBIT column = received amount only';
  data.getCell('A11').font  = normFont(8, 'FF6B7280');
  data.mergeCells(`${midCol2}11:${lastCol}11`);
  data.getCell(`${midCol2}11`).value = 'See "Details" sheet for shipping, invoice & inspection data  →';
  data.getCell(`${midCol2}11`).font  = normFont(8, 'FF2563EB');
  data.getCell(`${midCol2}11`).alignment = { horizontal: 'right' };
  data.getRow(11).height = 14;

  // Row 12 — Column headers
  const COL_HEADERS = isAdminLayout
    ? ['NO.','AUC DATE','AUC NAME','LOT NO','CHASSIS NO',
       'MAKE','MODEL','YEAR','BID PRICE','AUCTION',
       'TRANSPORTATION','LOADING\n/CUSTOM','NIPPONBID\nCOMMISSION','RADIATION\n& PHOTOS',
       'CUSTOM','FREIGHT','TAX\n10%','RECYCLE','DEALER\nCOMMISSION','TOTAL','DEBIT','BALANCE']
    : isDealer
    ? ['NO.','AUC DATE','AUC NAME','LOT NO','CHASSIS NO','MAKE','MODEL','YEAR',
       'BID PRICE','OTHERS','COMMISSION','TOTAL','DEBIT','BALANCE']
    : ['NO.','AUC DATE','AUC NAME','LOT NO','CHASSIS NO',
       'MAKE','MODEL','YEAR','BID PRICE','AUCTION',
       'TRANSPORTATION','LOADING\n/CUSTOM','COMMISSION','RADIATION\n& PHOTOS',
       'CUSTOM','FREIGHT','TOTAL','DEBIT','BALANCE'];
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
  const addInt = (a, b) => Math.round(a + b);

  // Column letters: admin T=TOTAL,U=DEBIT,V=BALANCE | ordinary Q,R,S | dealer L,M,N
  const totCol    = isAdminLayout ? 'T' : isDealer ? 'L' : 'Q';
  const debCol    = isAdminLayout ? 'U' : isDealer ? 'M' : 'R';
  const balCol    = isAdminLayout ? 'V' : isDealer ? 'N' : 'S';
  const balColNum = isAdminLayout ? 22 : isDealer ? 14 : 19;
  const FIRST_ROW = 13;

  const totColNum = isAdminLayout ? 20 : isDealer ? 12 : 17;

  const writeTotCell = (row, total) => {
    const cell = row.getCell(totColNum);
    cell.value  = total;
    cell.numFmt = YEN;
    cell.font   = normFont(9);
    cell.alignment = { vertical: 'middle', horizontal: 'right' };
    cell.border = allBorder();
  };

  const writeBalFormula = (row, rowNum, computedBal) => {
    const isFirst = rowNum === FIRST_ROW;
    const prevRef = isFirst ? '0' : `${balCol}${rowNum - 1}`;
    const op = isFirst ? '+' : '-'; // first row of a block: "0-(TOTAL+DEBIT)"; every row after: "PREV-(TOTAL-DEBIT)"
    const cell = row.getCell(balColNum);
    cell.value = { formula: `=${prevRef}-(N(${totCol}${rowNum})${op}N(${debCol}${rowNum}))`, result: computedBal };
  };

  for (const item of allRows) {
    const row = data.getRow(rowIdx);
    row.height = 16;
    const isPay  = item.type === 'remittance';
    const isPart = item.type === 'parts';
    const bgArgb = isPay ? C.paymentBg : (rowIdx % 2 === 0 ? C.altRow : C.purchaseBg);

    if (isPay) {
      const r = item.data;
      const amt = n(r.deposit_amount);
      balance = addInt(balance, amt);
      // admin: 22 cols (DEBIT=col21), ordinary: 19 (col18), dealer: 14 (col13)
      const amtIdx = isAdminLayout ? 20 : isDealer ? 12 : 17;
      const balIdx = isAdminLayout ? 21 : isDealer ? 13 : 18;
      const empties = Array(amtIdx - 3).fill('');
      const vals = ['►', fmtDate(r.tt_date || r.confirmed_at), `PAYMENT RECEIVED  —  ${r.ref_no}`, ...empties, amt, balance];
      vals.forEach((v, i) => {
        const c = row.getCell(i + 1);
        c.value = intVal(v);
        c.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.paymentBg } };
        c.font  = (i === amtIdx) ? boldFont(9, 'FF166534')
                : (i === balIdx) ? boldFont(9, balance < 0 ? C.redText : 'FF166534')
                : normFont(9, 'FF166534');
        if (i === amtIdx || i === balIdx) c.numFmt = YEN;
        c.alignment = { vertical: 'middle', horizontal: i >= 8 ? 'right' : 'left' };
        c.border = allBorder();
      });
      writeBalFormula(row, rowIdx, balance);
    } else if (isPart) {
      const p = item.data;
      const total = n(p.bid_price) + n(p.delivery_charges) + n(p.commission);
      balance = addInt(balance, -total);
      const vals = isAdminLayout
        ? [carNo++, fmtDate(p.created_at), 'PARTS PURCHASE', '', '', '', p.part_name, '', n(p.bid_price), '', n(p.delivery_charges), '', n(p.commission), '', '', '', '', '', '', total, '', balance]
        : isDealer
        ? [carNo++, fmtDate(p.created_at), 'PARTS PURCHASE', '', '', '', p.part_name, '', n(p.bid_price), '', n(p.commission), total, '', balance]
        : [carNo++, fmtDate(p.created_at), 'PARTS PURCHASE', '', '', '', p.part_name, '', n(p.bid_price), '', n(p.delivery_charges), '', n(p.commission), '', '', '', total, '', balance];
      const balIdx = vals.length - 1;
      const numericCols = isAdminLayout ? [8,10,12,19,21] : isDealer ? [8, 10, 11, 13] : [8,9,10,11,12,13,14,15,16,18];
      vals.forEach((v, i) => {
        const c = row.getCell(i + 1);
        c.value = intVal(v);
        c.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
        c.font  = (i === balIdx) ? boldFont(9, balance < 0 ? C.redText : 'FF166534') : normFont(9);
        if (numericCols.includes(i)) c.numFmt = YEN;
        c.alignment = { vertical: 'middle', horizontal: i >= 8 ? 'right' : 'left' };
        c.border = allBorder();
      });
      writeTotCell(row, total);
      writeBalFormula(row, rowIdx, balance);
    } else {
      const p = item.data;
      const rowTotal = n(p.computed_total);
      balance = addInt(balance, -rowTotal);

      const vals = isAdminLayout
        ? [
            carNo++, fmtDate(p.auction_date), p.auction_name || '',
            p.lot_no || '', p.chassis_no || '',
            p.make || '', p.model || '', p.year || '',
            n(p.bid_price), n(p.auction_charges),
            n(p.transportation), n(p.loading_custom), n(p.nipponbid_commission),
            n(p.radiation_photos), n(p.custom_fee), n(p.freight),
            n(p.tax_10_percent), n(p.recycle), n(p.dealer_fee),
            rowTotal, '', balance
          ]
        : isDealer
        ? [
            carNo++, fmtDate(p.auction_date), p.auction_name || '',
            p.lot_no || '', p.chassis_no || '',
            p.make || '', p.model || '', p.year || '',
            n(p.bid_price), n(p.others), n(p.others_commission),
            rowTotal, '', balance
          ]
        : [
            carNo++, fmtDate(p.auction_date), p.auction_name || '',
            p.lot_no || '', p.chassis_no || '',
            p.make || '', p.model || '', p.year || '',
            n(p.bid_price), n(p.auction_charges),
            n(p.transportation), n(p.loading_custom), n(p.others_commission),
            n(p.radiation_photos), n(p.custom_fee), n(p.freight),
            rowTotal, '', balance
          ];

      const numericCols = isAdminLayout
        ? [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 21]
        : isDealer
        ? [8, 9, 10, 11, 13]
        : [8, 9, 10, 11, 12, 13, 14, 15, 16, 18];
      const balanceIdx = isAdminLayout ? 21 : isDealer ? 13 : 18;

      vals.forEach((v, i) => {
        const c = row.getCell(i + 1);
        c.value = intVal(v);
        c.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
        c.font  = (i === balanceIdx) ? boldFont(9, balance < 0 ? C.redText : 'FF166534') : normFont(9);
        if (numericCols.includes(i)) c.numFmt = YEN;
        c.alignment = { vertical: 'middle', horizontal: i >= 8 ? 'right' : i === 7 ? 'center' : 'left' };
        c.border = allBorder();
      });
      writeTotCell(row, rowTotal);
      writeBalFormula(row, rowIdx, balance);
    }
    rowIdx++;
  }

  // Freeze panes below header
  data.views = [{ state: 'frozen', ySplit: 12 }];

  // ── DETAILS SHEET ────────────────────────────────────────────────────────────
  const det = wb.addWorksheet('Details');
  det.columns = [
    { width: 5  }, { width: 12 }, { width: 20 }, { width: 8  }, { width: 17 },
    { width: 22 }, { width: 16 }, { width: 14 },
    { width: 12 }, { width: 20 }, { width: 12 }, { width: 22 },
    { width: 18 }, { width: 20 }, { width: 12 },
  ];

  // Title
  det.mergeCells('A1:O1');
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
  det.mergeCells('I2:O2');
  det.getCell('I2').value = '← Match the NO. column with the "Data" sheet for cost breakdown  ';
  det.getCell('I2').font  = normFont(9, 'FF2563EB');
  det.getCell('I2').fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.subHeaderBg } };
  det.getCell('I2').alignment = { horizontal: 'right' };
  det.getRow(2).height = 20;

  const DET_HEADERS = [
    'NO.','AUC DATE','AUC NAME','LOT NO','CHASSIS NO',
    'DESTINATION','PRO-INVOICE NO.','FILE CODE NO',
    'ETD','SHIP NAME','ETA',
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
      fmtDate(ship.etd), ship.ship_name || '',
      fmtDate(ship.eta), ship.route || '',
      ship.result_of_inspection || '', p.remarks || '',
      ship.bl_status || '',
    ];
    vals.forEach((v, j) => {
      const c = dRow.getCell(j + 1);
      c.value = intVal(v);
      c.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      c.font  = normFont(9);
      c.alignment = { vertical: 'middle', horizontal: 'left' };
      c.border = allBorder();
    });
  });

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
    ['Customer',        `${user.name}${isDealer ? ' [DEALER]' : ''}`],
    ['Statement Date',  today],
    ['Total Cars',      purchases.length],
    ['Total Purchases', totalBilled],
    ['Total Payments',  totalReceived],
    ['BALANCE DUE',     netBalance],
    ...(isDealer ? [['Dealer Fee / car', dealerFee]] : []),
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

router.get('/export/my', auth, async (req, res) => {
  try {
    const wb = await buildAccountExcel(req.user.id, false);
    const [[user]] = await db.query('SELECT name FROM users WHERE user_id = ?', [req.user.id]);
    const fname = `account-${(user?.name || 'export').replace(/\s+/g, '-')}-${Date.now()}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fname}"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/export', adminAuth, async (req, res) => {
  try {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ message: 'user_id required' });
    const wb = await buildAccountExcel(user_id, true);
    const [[user]] = await db.query('SELECT name FROM users WHERE user_id = ?', [user_id]);
    const fname = `account-${(user?.name || 'export').replace(/\s+/g, '-')}-${Date.now()}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fname}"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/export-all', adminAuth, async (req, res) => {
  try {
    const [users] = await db.query(
      "SELECT user_id, name, type, country FROM users WHERE role = 'user' ORDER BY type, name"
    );

    // Build one combined workbook — sheets grouped by customer type, not one set per customer
    const wb = new ExcelJS.Workbook();
    wb.creator = 'NipponBid';

    // Summary sheet first
    const sumSheet = wb.addWorksheet('Summary');
    sumSheet.columns = [
      { width: 24 }, { width: 16 }, { width: 18 }, { width: 18 }, { width: 16 },
    ];

    const C = { headerBg: 'FF0F172A', headerText: 'FFFFFFFF', subHeaderBg: 'FF1E3A5F', colHeaderBg: 'FF2E4A7A', labelBg: 'FFF1F5F9', border: 'FFD1D5DB', altRow: 'FFF8FAFC', redText: 'FF9F1239' };
    const allBorder = (argb = C.border) => ({ top: { style:'thin', color:{argb} }, left: { style:'thin', color:{argb} }, bottom: { style:'thin', color:{argb} }, right: { style:'thin', color:{argb} } });
    const boldFont = (sz = 10, argb = 'FF111827') => ({ name: 'Arial', size: sz, bold: true, color: { argb } });
    const normFont = (sz = 10, argb = 'FF374151') => ({ name: 'Arial', size: sz, color: { argb } });
    const YEN = '#,##0';
    const today = new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' });

    sumSheet.mergeCells('A1:E1');
    const st = sumSheet.getCell('A1');
    st.value = 'AUTO BID 株式会社  ·  ALL CUSTOMERS ACCOUNT SUMMARY';
    st.font  = { name:'Arial', size:14, bold:true, color:{ argb:C.headerText } };
    st.fill  = { type:'pattern', pattern:'solid', fgColor:{ argb:C.headerBg } };
    st.alignment = { horizontal:'center', vertical:'middle' };
    sumSheet.getRow(1).height = 28;

    sumSheet.mergeCells('A2:E2');
    const sd = sumSheet.getCell('A2');
    sd.value = `  Statement Date: ${today}  ·  ${users.length} customers`;
    sd.font  = boldFont(10, C.headerText);
    sd.fill  = { type:'pattern', pattern:'solid', fgColor:{ argb:C.subHeaderBg } };
    sd.alignment = { vertical:'middle' };
    sumSheet.getRow(2).height = 18;

    const SUM_HEADERS = ['CUSTOMER', 'COUNTRY', 'TOTAL BILLED', 'TOTAL RECEIVED', 'BALANCE'];
    const shRow = sumSheet.getRow(3);
    shRow.height = 22;
    SUM_HEADERS.forEach((h, i) => {
      const c = shRow.getCell(i + 1);
      c.value = h; c.font = boldFont(9, C.headerText);
      c.fill  = { type:'pattern', pattern:'solid', fgColor:{ argb:C.colHeaderBg } };
      c.alignment = { horizontal:'center', vertical:'middle' };
      c.border = allBorder('FF1E3A5F');
    });

    let grandBilled = 0, grandReceived = 0;
    const summaryRows = [];

    // One destination sheet per (type, sheet-name) pair — e.g. "Dealer - Data" — that every
    // customer of that type gets appended into, one block after another, instead of each
    // customer getting their own separate set of sheets.
    const typeSheets = {};

    // Data/Details sheets stack many customers' rows together, so each gets a CLIENT column
    // instead of the old single "Client: Name" banner row (which only identified one block,
    // and got lost once rows are scrolled/sorted/filtered). bannerRow is skipped entirely
    // (left blank) since the CLIENT column now carries that information on every row instead.
    // Current Bill isn't included here — it's already one short, self-contained block per
    // customer, so the row-ambiguity problem these rules solve doesn't apply to it.
    const SHEET_RULES = {
      'Data':    { bannerRow: 2, headerRow: 12, dataFrom: 13 },
      'Details': { bannerRow: 2, headerRow: 3,  dataFrom: 4  },
    };

    // Parses "A1:V1" into numeric {c1,r1,c2,r2} so a merge can be translated by a column/row
    // offset when re-created in the destination sheet.
    const colLetterToNum = (letters) => {
      let n = 0;
      for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
      return n;
    };
    const parseRange = (rangeStr) => {
      const m = rangeStr.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
      if (!m) return null;
      return { c1: colLetterToNum(m[1]), r1: +m[2], c2: colLetterToNum(m[3]), r2: +m[4] };
    };

    // Translates cell references inside a formula string (e.g. "T13") by the same
    // column/row offset used to physically place that cell in the destination sheet —
    // otherwise a copied formula keeps pointing at its old (now wrong) position.
    const shiftFormula = (formula, colShift, rowShift) =>
      formula.replace(/([A-Z]+)(\d+)/g, (_, col, rowDigits) => {
        const newCol = colShift ? String.fromCharCode(col.charCodeAt(0) + colShift) : col;
        return `${newCol}${Number(rowDigits) + rowShift}`;
      });

    for (const u of users) {
      const ledger = await buildLedger(u.user_id);
      const totalCredit = ledger.reduce((s, e) => s + e.credit, 0);
      const totalDebit  = ledger.reduce((s, e) => s + e.debit,  0);
      const balance     = totalCredit - totalDebit;
      grandBilled   += totalDebit;
      grandReceived += totalCredit;
      summaryRows.push({ ...u, totalDebit, totalCredit, balance });

      const typeLabel = (u.type || 'ordinary').replace(/^\w/, c => c.toUpperCase());

      // Build per-user workbook, then append each of its sheets into the shared type-sheet
      const userWb = await buildAccountExcel(u.user_id, true);
      for (const wsName of userWb.worksheets.map(w => w.name)) {
        if (wsName === 'Current Bill') continue; // not included in the grouped-by-type export
        const srcWs = userWb.getWorksheet(wsName);
        const rules = SHEET_RULES[wsName];
        const colShift = rules ? 1 : 0;
        const srcMerges = ((srcWs.model && srcWs.model.merges) || []).map(parseRange).filter(Boolean);
        const key = `${typeLabel}::${wsName}`;
        let entry = typeSheets[key];
        if (!entry) {
          const destWs = wb.addWorksheet(`${typeLabel} - ${wsName}`);
          if (rules) destWs.getColumn(1).width = 20; // CLIENT column
          srcWs.columns.forEach((col, i) => {
            if (col.width) destWs.getColumn(i + 1 + colShift).width = col.width;
          });
          destWs.views = srcWs.views || [];
          entry = typeSheets[key] = { ws: destWs, nextRow: 1 };
        }
        const destWs = entry.ws;
        const rowOffset = entry.nextRow - 1;
        let lastRowUsed = entry.nextRow - 1;
        srcWs.eachRow({ includeEmpty: false }, (row, rowNum) => {
          const destRowNum = rowOffset + rowNum;
          lastRowUsed = Math.max(lastRowUsed, destRowNum);
          if (rules && rowNum === rules.bannerRow) return; // was the "Client: Name" banner — leave blank
          const destRow = destWs.getRow(destRowNum);
          destRow.height = row.height;
          row.eachCell({ includeEmpty: true }, (cell, colNum) => {
            // Merged non-master cells proxy the master's value in exceljs — copying that
            // blindly duplicates the title/banner text into every column it used to span.
            // Only the master cell gets the value; the merge itself is re-created below.
            const isMergedNonMaster = cell.isMerged && cell.master !== cell;
            const destCell = destWs.getCell(destRowNum, colNum + colShift);
            if (cell.value && typeof cell.value === 'object' && cell.value.formula) {
              destCell.value = {
                formula: shiftFormula(cell.value.formula, colShift, rowOffset),
                result: cell.value.result,
              };
            } else {
              destCell.value = isMergedNonMaster ? null : cell.value;
            }
            destCell.font       = cell.font ? { ...cell.font } : undefined;
            destCell.fill       = cell.fill ? { ...cell.fill } : undefined;
            destCell.alignment  = cell.alignment ? { ...cell.alignment } : undefined;
            destCell.numFmt     = cell.numFmt;
            destCell.border     = cell.border ? { ...cell.border } : undefined;
          });
          srcMerges
            .filter(m => m.r1 === rowNum && m.r2 === rowNum)
            .forEach(m => destWs.mergeCells(destRowNum, m.c1 + colShift, destRowNum, m.c2 + colShift));
          if (rules && rowNum === rules.headerRow) {
            const c = destWs.getCell(destRowNum, 1);
            c.value = 'CLIENT';
            c.font  = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
            c.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E4A7A' } };
            c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            c.border = allBorder('FF1E3A5F');
          } else if (rules && rowNum >= rules.dataFrom) {
            const c = destWs.getCell(destRowNum, 1);
            c.value = u.name;
            c.font  = normFont(9);
            c.fill  = row.getCell(1).fill ? { ...row.getCell(1).fill } : undefined;
            c.alignment = { vertical: 'middle', horizontal: 'left' };
            c.border = allBorder();
          }
        });
        entry.nextRow = lastRowUsed + 2; // one blank row between customers' blocks
      }
    }

    // Fill summary rows
    summaryRows.forEach((r, i) => {
      const row = sumSheet.getRow(4 + i);
      row.height = 18;
      const bg = i % 2 === 0 ? 'FFFFFFFF' : C.altRow;
      const [[userDetail]] = [[]]; // placeholder
      const vals = [r.name, r.country || '—', r.totalDebit, r.totalCredit, r.balance];
      vals.forEach((v, j) => {
        const c = row.getCell(j + 1);
        c.value = intVal(v);
        c.font  = j === 4 ? boldFont(10, v < 0 ? C.redText : 'FF166534') : normFont(10);
        if (j >= 2) c.numFmt = YEN;
        c.fill  = { type:'pattern', pattern:'solid', fgColor:{ argb: bg } };
        c.alignment = { vertical:'middle', horizontal: j >= 2 ? 'right' : 'left', indent: j < 2 ? 1 : 0 };
        c.border = allBorder();
      });
    });

    // Grand total row
    const gtRow = sumSheet.getRow(4 + summaryRows.length);
    gtRow.height = 22;
    ['TOTAL', '', grandBilled, grandReceived, grandReceived - grandBilled].forEach((v, i) => {
      const c = gtRow.getCell(i + 1);
      c.value = intVal(v);
      c.font  = boldFont(10, i === 4 ? ((grandReceived - grandBilled) < 0 ? C.redText : 'FF166534') : C.headerText);
      if (i >= 2) c.numFmt = YEN;
      c.fill  = { type:'pattern', pattern:'solid', fgColor:{ argb:C.headerBg } };
      c.alignment = { vertical:'middle', horizontal: i >= 2 ? 'right' : 'center' };
      c.border = allBorder('FF1E3A5F');
    });

    const fname = `nipponbid-all-accounts-${Date.now()}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fname}"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/summary', adminAuth, async (req, res) => {
  try {
    const [users] = await db.query("SELECT user_id, name, email, country, type FROM users WHERE role = 'user' ORDER BY name");
    const summaries = await Promise.all(users.map(async (u) => {
      const ledger      = await buildLedger(u.user_id);
      const total_credit = Math.round(ledger.reduce((s, r) => s + r.credit, 0));
      const total_debit  = Math.round(ledger.reduce((s, r) => s + r.debit,  0));
      // Dealer purchase cost: the flat-fee formula (Bid Price + Others + Dealer Fee) total,
      // car purchases only (excludes parts purchases and remittances). Only meaningful for dealers.
      const dealer_purchase_cost = u.type === 'dealer'
        ? Math.round(ledger.filter(e => e.entry_type === 'purchase').reduce((s, r) => s + r.debit, 0))
        : null;
      return { ...u, total_credit, total_debit, total_billed: total_debit, total_paid: total_credit, balance: total_credit - total_debit, dealer_purchase_cost };
    }));
    res.json(summaries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
