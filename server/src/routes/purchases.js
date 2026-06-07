const router = require('express').Router();
const db = require('../config/database');
const { auth, adminAuth } = require('../middleware/auth');
const { uploadDocument, resolveUploadedFile } = require('../middleware/upload');

const notify = async (userId, title, message, type, relatedId = null) => {
  await db.query('INSERT INTO notifications (user_id, title, message, type, related_id) VALUES (?, ?, ?, ?, ?)', [userId, title, message, type, relatedId]);
};

// Returns next car_id and next pro_invoice_no for a given user
router.get('/next-meta', adminAuth, async (req, res) => {
  try {
    const { user_id } = req.query;

    // Next car_id = MAX(car_id) + 1
    const [[{ max_car_id }]] = await db.query('SELECT COALESCE(MAX(car_id), 0) AS max_car_id FROM cars');
    const next_car_id = Number(max_car_id) + 1;

    // Next pro_invoice_no for this user — find last, increment number
    let next_pro_invoice_no = '';
    if (user_id) {
      const [[last]] = await db.query(
        `SELECT pro_invoice_no FROM purchases WHERE user_id = ? AND pro_invoice_no IS NOT NULL
         ORDER BY purchase_id DESC LIMIT 1`, [user_id]
      );
      if (last?.pro_invoice_no) {
        // Pattern: PREFIX-NUMBER  e.g. HS-12, ERD-1, P-001
        const match = last.pro_invoice_no.match(/^(.*?)(\d+)$/);
        if (match) {
          next_pro_invoice_no = `${match[1]}${Number(match[2]) + 1}`;
        } else {
          next_pro_invoice_no = last.pro_invoice_no + '-2';
        }
      }
    }

    res.json({ next_car_id, next_pro_invoice_no });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/my', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const [[{ total }]] = await db.query('SELECT COUNT(*) as total FROM purchases WHERE user_id = ?', [req.user.id]);
    const [rows] = await db.query(
      `SELECT p.*, c.make, c.model, c.year, c.chassis_no, c.color, c.mileage, c.grade,
              a.auction_name, a.auction_date,
              ci.url AS car_image,
              (SELECT COUNT(*) FROM documents d WHERE d.purchase_id = p.purchase_id) AS doc_count
       FROM purchases p
       JOIN cars c ON c.car_id = p.car_id
       LEFT JOIN auctions a ON a.auction_id = p.auction_id
       LEFT JOIN car_images ci ON ci.car_id = c.car_id AND ci.is_primary = 1
       WHERE p.user_id = ?
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [req.user.id, parseInt(limit), offset]
    );
    res.json({ purchases: rows, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    let rows;

    if (req.user.role === 'admin') {
      // Admin: treat :id as direct purchase_id
      [rows] = await db.query(
        `SELECT p.*, c.make, c.model, c.year, c.chassis_no, c.color, c.mileage, c.grade, c.engine, c.transmission,
                a.auction_name, a.auction_date AS auction_house_date, a.location AS auction_location,
                p.auction_date AS auction_date,
                u.name AS user_name, u.email AS user_email, u.country AS user_country, u.contact_number AS user_phone
         FROM purchases p
         JOIN cars c ON c.car_id = p.car_id
         LEFT JOIN auctions a ON a.auction_id = p.auction_id
         JOIN users u ON u.user_id = p.user_id
         WHERE p.purchase_id = ?`,
        [req.params.id]
      );
    } else {
      // User: treat :id as direct purchase_id, scoped to their account
      [rows] = await db.query(
        `SELECT p.*, c.make, c.model, c.year, c.chassis_no, c.color, c.mileage, c.grade, c.engine, c.transmission,
                a.auction_name, a.auction_date AS auction_house_date, a.location AS auction_location,
                p.auction_date AS auction_date,
                u.name AS user_name, u.email AS user_email, u.country AS user_country, u.contact_number AS user_phone
         FROM purchases p
         JOIN cars c ON c.car_id = p.car_id
         LEFT JOIN auctions a ON a.auction_id = p.auction_id
         JOIN users u ON u.user_id = p.user_id
         WHERE p.purchase_id = ? AND p.user_id = ?`,
        [req.params.id, req.user.id]
      );
    }

    if (!rows.length) return res.status(404).json({ message: 'Purchase not found' });

    const purchaseId = rows[0].purchase_id;
    const [images]    = await db.query('SELECT * FROM car_images WHERE car_id = ? ORDER BY is_primary DESC', [rows[0].car_id]);
    const [documents] = await db.query('SELECT * FROM documents WHERE purchase_id = ? ORDER BY created_at DESC', [purchaseId]);
    const [details]   = await db.query('SELECT * FROM purchase_details WHERE purchase_id = ?', [purchaseId]);

    res.json({ ...rows[0], images, documents, details: details[0] || null });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/', adminAuth, async (req, res) => {
  try {
    const { user_id, page = 1, limit = 15, search } = req.query;
    let where = '1=1';
    const params = [];
    if (user_id) { where += ' AND p.user_id = ?'; params.push(user_id); }
    if (search) {
      where += ` AND (
        c.chassis_no LIKE ? OR p.lot_no LIKE ? OR
        a.auction_name LIKE ? OR c.make LIKE ? OR
        c.model LIKE ? OR p.pro_invoice_no LIKE ? OR
        p.file_code_no LIKE ?
      )`;
      const q = `%${search}%`;
      params.push(q, q, q, q, q, q, q);
    }
    const offset = (page - 1) * limit;
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) as total FROM purchases p
       JOIN cars c ON c.car_id = p.car_id
       JOIN users u ON u.user_id = p.user_id
       LEFT JOIN auctions a ON a.auction_id = p.auction_id
       WHERE ${where}`, params);
    const [rows] = await db.query(
      `SELECT p.*, c.make, c.model, c.year, c.chassis_no,
              a.auction_name, a.auction_date AS auction_house_date,
              p.auction_date AS auction_date,
              u.name AS user_name, u.email AS user_email, u.country AS user_country,
              ci.url AS car_image,
              CASE WHEN u.type = 'dealer'
                THEN COALESCE(pd.bid_price,0) + COALESCE(pd.others,0) + COALESCE(pd.dealer_fee,0)
                ELSE COALESCE(pd.bid_price,0) + COALESCE(pd.auction_charges,0) + COALESCE(pd.transportation,0) +
                     COALESCE(pd.loading_custom,0) + COALESCE(pd.others_commission,0) +
                     COALESCE(pd.radiation_photos,0) + COALESCE(pd.custom_fee,0) + COALESCE(pd.freight,0)
              END AS purchase_total,
              (SELECT COUNT(*) FROM documents d WHERE d.purchase_id = p.purchase_id) AS doc_count
       FROM purchases p
       JOIN cars c ON c.car_id = p.car_id
       JOIN users u ON u.user_id = p.user_id
       LEFT JOIN auctions a ON a.auction_id = p.auction_id
       LEFT JOIN car_images ci ON ci.car_id = c.car_id AND ci.is_primary = 1
       LEFT JOIN purchase_details pd ON pd.purchase_id = p.purchase_id
       WHERE ${where}
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );
    res.json({ purchases: rows, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', adminAuth, async (req, res) => {
  try {
    const { user_id, car_id, auction_id, auction_date, lot_no, destination, pro_invoice_no, file_code_no, remarks,
            bid_price, auction_charges, transportation, loading_custom, others_commission,
            tax_10_percent, radiation_photos, custom_fee, freight, recycle, others,
            dealer_fee, nipponbid_commission, is_third_party, third_party_fee } = req.body;

    const [result] = await db.query(
      `INSERT INTO purchases (user_id, car_id, auction_id, auction_date, lot_no, destination, pro_invoice_no, file_code_no, remarks)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [user_id, car_id, auction_id || null, auction_date || null, lot_no || null,
       destination || null, pro_invoice_no || null, file_code_no || null, remarks || null]
    );

    // Insert purchase_details if cost breakdown provided
    if (bid_price) {
      await db.query(
        `INSERT INTO purchase_details (purchase_id, bid_price, auction_charges, transportation, loading_custom, others_commission, tax_10_percent, radiation_photos, custom_fee, freight, recycle, others, dealer_fee, nipponbid_commission, is_third_party, third_party_fee)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [result.insertId, bid_price, auction_charges||0, transportation||0, loading_custom||0,
         others_commission||0, tax_10_percent||0, radiation_photos||0, custom_fee||0, freight||0, recycle||0, others||0,
         dealer_fee||0, nipponbid_commission||0, is_third_party?1:0, third_party_fee||0]
      );
    }

    await db.query('UPDATE cars SET status = ? WHERE car_id = ?', ['purchased', car_id]);

    const [car] = await db.query('SELECT make, model, year FROM cars WHERE car_id = ?', [car_id]);
    await notify(user_id, 'Purchase Confirmed!', `Your purchase of ${car[0].make} ${car[0].model} ${car[0].year} has been confirmed.`, 'purchase', result.insertId);

    const [purchase] = await db.query('SELECT * FROM purchases WHERE purchase_id = ?', [result.insertId]);
    res.status(201).json(purchase[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', adminAuth, async (req, res) => {
  try {
    const { destination, pro_invoice_no, file_code_no, lot_no, remarks, auction_date,
            bid_price, auction_charges, transportation, loading_custom,
            others_commission, tax_10_percent, radiation_photos, custom_fee, freight, recycle, others,
            dealer_fee, nipponbid_commission, is_third_party, third_party_fee,
            make, model, year, chassis_no, color, mileage, grade, engine, transmission } = req.body;

    const [purchase] = await db.query('SELECT * FROM purchases WHERE purchase_id = ?', [req.params.id]);
    if (!purchase.length) return res.status(404).json({ message: 'Purchase not found' });

    await db.query(
      `UPDATE purchases SET destination=?, pro_invoice_no=?, file_code_no=?, lot_no=?, remarks=?, auction_date=? WHERE purchase_id=?`,
      [destination||null, pro_invoice_no||null, file_code_no||null, lot_no||null, remarks||null, auction_date||null, req.params.id]
    );

    // Update car details
    await db.query(
      `UPDATE cars SET make=?, model=?, year=?, chassis_no=?, color=?, mileage=?, grade=?, engine=?, transmission=? WHERE car_id=?`,
      [make||null, model||null, year||null, chassis_no||null, color||null, mileage||null, grade||null, engine||null, transmission||null, purchase[0].car_id]
    );

    const [existing] = await db.query('SELECT purchase_detail_id FROM purchase_details WHERE purchase_id=?', [req.params.id]);
    const n = (v) => Number(v) || 0;
    if (existing.length) {
      await db.query(
        `UPDATE purchase_details SET bid_price=?,auction_charges=?,transportation=?,loading_custom=?,others_commission=?,tax_10_percent=?,radiation_photos=?,custom_fee=?,freight=?,recycle=?,others=?,dealer_fee=?,nipponbid_commission=?,is_third_party=?,third_party_fee=? WHERE purchase_id=?`,
        [n(bid_price),n(auction_charges),n(transportation),n(loading_custom),n(others_commission),n(tax_10_percent),n(radiation_photos),n(custom_fee),n(freight),n(recycle),n(others),n(dealer_fee),n(nipponbid_commission),is_third_party?1:0,n(third_party_fee),req.params.id]
      );
    } else {
      await db.query(
        `INSERT INTO purchase_details (purchase_id,bid_price,auction_charges,transportation,loading_custom,others_commission,tax_10_percent,radiation_photos,custom_fee,freight,recycle,others,dealer_fee,nipponbid_commission,is_third_party,third_party_fee) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [req.params.id,n(bid_price),n(auction_charges),n(transportation),n(loading_custom),n(others_commission),n(tax_10_percent),n(radiation_photos),n(custom_fee),n(freight),n(recycle),n(others),n(dealer_fee),n(nipponbid_commission),is_third_party?1:0,n(third_party_fee)]
      );
    }

    res.json({ message: 'Purchase updated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id/shipping', adminAuth, async (req, res) => {
  try {
    const { remarks } = req.body;
    const [purchase] = await db.query('SELECT * FROM purchases WHERE purchase_id = ?', [req.params.id]);
    if (!purchase.length) return res.status(404).json({ message: 'Purchase not found' });

    await db.query('UPDATE purchases SET remarks = ? WHERE purchase_id = ?', [remarks, req.params.id]);
    await notify(purchase[0].user_id, 'Purchase Updated', `Your purchase remarks have been updated.`, 'purchase', req.params.id);

    const [updated] = await db.query('SELECT * FROM purchases WHERE purchase_id = ?', [req.params.id]);
    res.json(updated[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/documents', adminAuth, uploadDocument.single('document'), async (req, res) => {
  try {
    const { type, name } = req.body;
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const [purchase] = await db.query('SELECT * FROM purchases WHERE purchase_id = ?', [req.params.id]);
    if (!purchase.length) return res.status(404).json({ message: 'Purchase not found' });

    const fileUrl = await resolveUploadedFile(req.file, 'nipponbid/documents');
    const [result] = await db.query(
      'INSERT INTO documents (purchase_id, user_id, car_id, name, type, url, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.params.id, purchase[0].user_id, purchase[0].car_id,
       name || req.file.originalname, type || 'user_and_admin', fileUrl, req.user.id]
    );

    await notify(purchase[0].user_id, 'New Document Available', `A new document has been uploaded to your purchase.`, 'document', req.params.id);

    const [doc] = await db.query('SELECT * FROM documents WHERE document_id = ?', [result.insertId]);
    res.status(201).json(doc[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:purchaseId/documents/:docId', adminAuth, async (req, res) => {
  try {
    await db.query('DELETE FROM documents WHERE document_id = ? AND purchase_id = ?', [req.params.docId, req.params.purchaseId]);
    res.json({ message: 'Document deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
