-- ════════════════════════════════════════════════════════════════════
--  Hussam Historical Data Import
--  Source: Hussam.xlsx
--  Destination: Brisbane, Australia | Currency: JPY
--  Generated: 2026-06-05
--
--  Insertion order respects FK constraints:
--    users → auctions → cars → purchases → purchase_details → remittances
--
--  Default password: Hussam1234  (change after first login)
--  Email: hussam@nipponbid.com  (update if different)
-- ════════════════════════════════════════════════════════════════════

SET FOREIGN_KEY_CHECKS = 0;

-- ── 1. USER ──────────────────────────────────────────────────────────
INSERT INTO users (name, email, password, role, type, status, country, city)
VALUES (
  'Hussam',
  'hussam@nipponbid.com',
  '$2a$10$O9XGivPXxE.gaI4F06ZK6e1FgEoqdLLGRNi86TAiyVTXabhpOwLyO',
  'user', 'dealer', 'active', 'Australia', 'Brisbane'
);
SET @uid = LAST_INSERT_ID();

-- ── 2. AUCTIONS (one per auction event) ──────────────────────────────
INSERT INTO auctions (auction_name, auction_house, auction_date, status) VALUES ('KCAA/YAMAGUCHI',    'KCAA',        '2025-09-01', 'completed'); SET @a1  = LAST_INSERT_ID();
INSERT INTO auctions (auction_name, auction_house, auction_date, status) VALUES ('CAA/TOHOKU',        'CAA',         '2025-11-18', 'completed'); SET @a2  = LAST_INSERT_ID();
INSERT INTO auctions (auction_name, auction_house, auction_date, status) VALUES ('USS/SHIZUOKA',      'USS',         '2025-11-22', 'completed'); SET @a3  = LAST_INSERT_ID();
INSERT INTO auctions (auction_name, auction_house, auction_date, status) VALUES ('IAUC',              'IAUC',        '2025-11-26', 'completed'); SET @a4  = LAST_INSERT_ID();
INSERT INTO auctions (auction_name, auction_house, auction_date, status) VALUES ('USS/TOKYO-20251207','USS',         '2025-12-07', 'completed'); SET @a5  = LAST_INSERT_ID();
INSERT INTO auctions (auction_name, auction_house, auction_date, status) VALUES ('USS/TOKYO-20251218','USS',         '2025-12-18', 'completed'); SET @a6  = LAST_INSERT_ID();
INSERT INTO auctions (auction_name, auction_house, auction_date, status) VALUES ('USS/SAPPORO',       'USS',         '2025-12-24', 'completed'); SET @a7  = LAST_INSERT_ID();
INSERT INTO auctions (auction_name, auction_house, auction_date, status) VALUES ('SIGMANETWAX',       'SIGMANETWAX', '2026-01-06', 'completed'); SET @a8  = LAST_INSERT_ID();
INSERT INTO auctions (auction_name, auction_house, auction_date, status) VALUES ('CAA/CHUBU',         'CAA',         '2026-02-11', 'completed'); SET @a9  = LAST_INSERT_ID();
INSERT INTO auctions (auction_name, auction_house, auction_date, status) VALUES ('USS/TOKYO-20260305','USS',         '2026-03-05', 'completed'); SET @a10 = LAST_INSERT_ID();
INSERT INTO auctions (auction_name, auction_house, auction_date, status) VALUES ('JU/AICHI',          'JU',          '2026-03-12', 'completed'); SET @a11 = LAST_INSERT_ID();
INSERT INTO auctions (auction_name, auction_house, auction_date, status) VALUES ('JU/HOKKAIDO',       'JU',          '2026-03-13', 'completed'); SET @a12 = LAST_INSERT_ID();

-- ── 3. CARS ───────────────────────────────────────────────────────────
INSERT INTO cars (make, model, year, chassis_no, lot_number, auction_id, status) VALUES ('TOYOTA', 'CHR',      2007, 'ZYX10-2175875',  '279',   @a1,  'purchased'); SET @c1  = LAST_INSERT_ID();
INSERT INTO cars (make, model, year, chassis_no, lot_number, auction_id, status) VALUES ('TOYOTA', 'LEXUS',    2006, 'USF40-5015279',  '2009',  @a2,  'purchased'); SET @c2  = LAST_INSERT_ID();
INSERT INTO cars (make, model, year, chassis_no, lot_number, auction_id, status) VALUES ('TOYOTA', 'CROWN',    2009, 'GRS204-0010705', '45086', @a3,  'purchased'); SET @c3  = LAST_INSERT_ID();
INSERT INTO cars (make, model, year, chassis_no, lot_number, auction_id, status) VALUES ('TOYOTA', 'CROWN',    2009, 'URS206-1002814', '60286', @a4,  'purchased'); SET @c4  = LAST_INSERT_ID();
INSERT INTO cars (make, model, year, chassis_no, lot_number, auction_id, status) VALUES ('TOYOTA', 'CROWN',    2006, 'URS206-1007365', '12011', @a5,  'purchased'); SET @c5  = LAST_INSERT_ID();
INSERT INTO cars (make, model, year, chassis_no, lot_number, auction_id, status) VALUES ('TOYOTA', 'CROWN',    2010, 'URS206-1000207', '86576', @a6,  'purchased'); SET @c6  = LAST_INSERT_ID();
INSERT INTO cars (make, model, year, chassis_no, lot_number, auction_id, status) VALUES ('TOYOTA', 'CROWN',    2009, 'GRS204-0011052', '70218', @a7,  'purchased'); SET @c7  = LAST_INSERT_ID();
INSERT INTO cars (make, model, year, chassis_no, lot_number, auction_id, status) VALUES ('NISSAN', 'SKYLINE',  2008, 'CKV36-404331',   NULL,    @a8,  'purchased'); SET @c8  = LAST_INSERT_ID();
INSERT INTO cars (make, model, year, chassis_no, lot_number, auction_id, status) VALUES ('TOYOTA', 'CROWN',    2008, 'GRS204-0004246', '90186', @a9,  'purchased'); SET @c9  = LAST_INSERT_ID();
INSERT INTO cars (make, model, year, chassis_no, lot_number, auction_id, status) VALUES ('TOYOTA', 'CROWN',    2010, 'GRS204-0014942', '29020', @a10, 'purchased'); SET @c10 = LAST_INSERT_ID();
INSERT INTO cars (make, model, year, chassis_no, lot_number, auction_id, status) VALUES ('TOYOTA', 'CROWN',    2009, 'GRS204-0012246', '30779', @a11, 'purchased'); SET @c11 = LAST_INSERT_ID();
INSERT INTO cars (make, model, year, chassis_no, lot_number, auction_id, status) VALUES ('SUBARU', 'FORESTER', 2000, 'SG5-079221',     '79',    @a12, 'purchased'); SET @c12 = LAST_INSERT_ID();

-- ── 4. PURCHASES (links user ↔ car ↔ auction) ─────────────────────────
INSERT INTO purchases (user_id, car_id, auction_id, auc_date, lot_no, destination) VALUES (@uid, @c1,  @a1,  '2025-09-01', '279',   'Brisbane, Australia'); SET @p1  = LAST_INSERT_ID();
INSERT INTO purchases (user_id, car_id, auction_id, auc_date, lot_no, destination) VALUES (@uid, @c2,  @a2,  '2025-11-18', '2009',  'Brisbane, Australia'); SET @p2  = LAST_INSERT_ID();
INSERT INTO purchases (user_id, car_id, auction_id, auc_date, lot_no, destination) VALUES (@uid, @c3,  @a3,  '2025-11-22', '45086', 'Brisbane, Australia'); SET @p3  = LAST_INSERT_ID();
INSERT INTO purchases (user_id, car_id, auction_id, auc_date, lot_no, destination) VALUES (@uid, @c4,  @a4,  '2025-11-26', '60286', 'Brisbane, Australia'); SET @p4  = LAST_INSERT_ID();
INSERT INTO purchases (user_id, car_id, auction_id, auc_date, lot_no, destination) VALUES (@uid, @c5,  @a5,  '2025-12-07', '12011', 'Brisbane, Australia'); SET @p5  = LAST_INSERT_ID();
INSERT INTO purchases (user_id, car_id, auction_id, auc_date, lot_no, destination) VALUES (@uid, @c6,  @a6,  '2025-12-18', '86576', 'Brisbane, Australia'); SET @p6  = LAST_INSERT_ID();
INSERT INTO purchases (user_id, car_id, auction_id, auc_date, lot_no, destination) VALUES (@uid, @c7,  @a7,  '2025-12-24', '70218', 'Brisbane, Australia'); SET @p7  = LAST_INSERT_ID();
INSERT INTO purchases (user_id, car_id, auction_id, auc_date, lot_no, destination) VALUES (@uid, @c8,  @a8,  '2026-01-06', NULL,    'Brisbane, Australia'); SET @p8  = LAST_INSERT_ID();
INSERT INTO purchases (user_id, car_id, auction_id, auc_date, lot_no, destination) VALUES (@uid, @c9,  @a9,  '2026-02-11', '90186', 'Brisbane, Australia'); SET @p9  = LAST_INSERT_ID();
INSERT INTO purchases (user_id, car_id, auction_id, auc_date, lot_no, destination) VALUES (@uid, @c10, @a10, '2026-03-05', '29020', 'Brisbane, Australia'); SET @p10 = LAST_INSERT_ID();
INSERT INTO purchases (user_id, car_id, auction_id, auc_date, lot_no, destination) VALUES (@uid, @c11, @a11, '2026-03-12', '30779', 'Brisbane, Australia'); SET @p11 = LAST_INSERT_ID();
INSERT INTO purchases (user_id, car_id, auction_id, auc_date, lot_no, destination) VALUES (@uid, @c12, @a12, '2026-03-13', '79',    'Brisbane, Australia'); SET @p12 = LAST_INSERT_ID();

-- ── 5. PURCHASE DETAILS (cost breakdown per car) ──────────────────────
-- Column mapping from Excel:
--   BID PRICE           → bid_price
--   AUCTION             → auction_commission
--   TRANSPORTATION      → transportation
--   LOADING/CUSTOM      → loading_custom
--   AUCTION/COMMISSION  → radiation_photos (fixed per-car auction fee)
--   COMMISION           → commission
--   TAX 10%             → tax_10_percent
--   RECYCLE             → recycle
--   FREIGHT             → freight

-- Car 1: TOYOTA CHR 2007
INSERT INTO purchase_details (purchase_id, bid_price, auction_commission, transportation, loading_custom, radiation_photos, commission, tax_10_percent, recycle)
VALUES (@p1, 1298000, 19500, NULL, NULL, 5000, 0, 132250, 11270);

-- Car 2: TOYOTA LEXUS 2006
INSERT INTO purchase_details (purchase_id, bid_price, auction_commission, transportation, loading_custom, radiation_photos, commission, tax_10_percent, recycle)
VALUES (@p2, 510000, 16000, 17000, 19650, 5000, 62350, 63000, 18500);

-- Car 3: TOYOTA CROWN 2009 (USS/SHIZUOKA)
INSERT INTO purchase_details (purchase_id, bid_price, auction_commission, transportation, loading_custom, radiation_photos, commission, tax_10_percent, recycle)
VALUES (@p3, 290000, 20000, 17000, 25400, 5000, 52600, 41000, 17080);

-- Car 4: TOYOTA CROWN 2009 (IAUC)
INSERT INTO purchase_details (purchase_id, bid_price, auction_commission, transportation, loading_custom, radiation_photos, commission, tax_10_percent, recycle)
VALUES (@p4, 453000, 16500, 6050, 22400, 5000, 70050, 57300, 17790);

-- Car 5: TOYOTA CROWN 2006 (USS/TOKYO Dec-07)
INSERT INTO purchase_details (purchase_id, bid_price, auction_commission, transportation, loading_custom, radiation_photos, commission, tax_10_percent, recycle)
VALUES (@p5, 400000, 30000, NULL, 19650, 5000, 65350, 52000, 15360);

-- Car 6: TOYOTA CROWN 2010 (USS/TOKYO Dec-18)
INSERT INTO purchase_details (purchase_id, bid_price, auction_commission, transportation, loading_custom, radiation_photos, commission, tax_10_percent, recycle)
VALUES (@p6, 415000, 13000, 10000, 19650, 5000, 72350, 53500, 17790);

-- Car 7: TOYOTA CROWN 2009 (USS/SAPPORO)
INSERT INTO purchase_details (purchase_id, bid_price, auction_commission, transportation, loading_custom, radiation_photos, commission, tax_10_percent, recycle)
VALUES (@p7, 220000, 16600, 17000, 19650, 10000, 56750, 34000, 17080);

-- Car 8: NISSAN SKYLINE 2008 (SIGMANETWAX)
INSERT INTO purchase_details (purchase_id, bid_price, auction_commission, transportation, loading_custom, radiation_photos, commission, tax_10_percent)
VALUES (@p8, 730000, 20000, 15000, 23700, 5000, 56300, 85000);

-- Car 9: TOYOTA CROWN 2008 (CAA/CHUBU)
INSERT INTO purchase_details (purchase_id, bid_price, auction_commission, transportation, commission, tax_10_percent, recycle)
VALUES (@p9, 320000, 13500, 10000, 96500, 34350, 17080);

-- Car 10: TOYOTA CROWN 2010 (USS/TOKYO Mar-05)
INSERT INTO purchase_details (purchase_id, bid_price, auction_commission, transportation, radiation_photos, commission)
VALUES (@p10, 375000, 11000, 33000, 10000, 66000);

-- Car 11: TOYOTA CROWN 2009 (JU/AICHI) — commission-only entry
INSERT INTO purchase_details (purchase_id, bid_price, commission)
VALUES (@p11, 0, 120000);

-- Car 12: SUBARU FORESTER 2000 (JU/HOKKAIDO)
INSERT INTO purchase_details (purchase_id, bid_price, transportation, commission)
VALUES (@p12, 320000, 40000, 80000);

-- ── 6. REMITTANCES (10 payments from Hussam) ─────────────────────────
-- ref_no uses placeholder IDs — update with real TT numbers later
INSERT INTO remittances (user_id, ref_no, sender_name, transfer_amount, deposit_amount, currency, tt_date, status) VALUES (@uid, 'HUSSAM-PAY-001', 'Syed Hussam',  988366,  988366, 'JPY', '2025-11-29', 'confirmed');
INSERT INTO remittances (user_id, ref_no, sender_name, transfer_amount, deposit_amount, currency, tt_date, status) VALUES (@uid, 'HUSSAM-PAY-002', 'Syed Hussam',  413268,  413268, 'JPY', '2025-12-12', 'confirmed');
INSERT INTO remittances (user_id, ref_no, sender_name, transfer_amount, deposit_amount, currency, tt_date, status) VALUES (@uid, 'HUSSAM-PAY-003', 'Syed Hussam',  700422,  700422, 'JPY', '2026-01-09', 'confirmed');
INSERT INTO remittances (user_id, ref_no, sender_name, transfer_amount, deposit_amount, currency, tt_date, status) VALUES (@uid, 'HUSSAM-PAY-004', 'Syed Hussam',  305000,  305000, 'JPY', '2026-01-12', 'confirmed');
INSERT INTO remittances (user_id, ref_no, sender_name, transfer_amount, deposit_amount, currency, tt_date, status) VALUES (@uid, 'HUSSAM-PAY-005', 'Syed Hussam',  305000,  305000, 'JPY', '2026-01-12', 'confirmed');
INSERT INTO remittances (user_id, ref_no, sender_name, transfer_amount, deposit_amount, currency, tt_date, status) VALUES (@uid, 'HUSSAM-PAY-006', 'Syed Hussam',  542984,  542984, 'JPY', '2026-02-06', 'confirmed');
INSERT INTO remittances (user_id, ref_no, sender_name, transfer_amount, deposit_amount, currency, tt_date, status) VALUES (@uid, 'HUSSAM-PAY-007', 'Syed Hussam',  756000,  756000, 'JPY', '2026-02-26', 'confirmed');
INSERT INTO remittances (user_id, ref_no, sender_name, transfer_amount, deposit_amount, currency, tt_date, status) VALUES (@uid, 'HUSSAM-PAY-008', 'Syed Hussam',  397000,  397000, 'JPY', '2026-02-26', 'confirmed');
INSERT INTO remittances (user_id, ref_no, sender_name, transfer_amount, deposit_amount, currency, tt_date, status) VALUES (@uid, 'HUSSAM-PAY-009', 'Syed Hussam',  480000,  480000, 'JPY', '2026-02-26', 'confirmed');
INSERT INTO remittances (user_id, ref_no, sender_name, transfer_amount, deposit_amount, currency, tt_date, status) VALUES (@uid, 'HUSSAM-PAY-010', 'Syed Hussam',  494394,  494394, 'JPY', '2026-03-13', 'confirmed');

SET FOREIGN_KEY_CHECKS = 1;

-- ════════════════════════════════════════════════════════════════════
-- VERIFY: Run after import to confirm counts
-- SELECT COUNT(*) FROM purchases   WHERE user_id = @uid;  -- expect 12
-- SELECT COUNT(*) FROM remittances WHERE user_id = @uid;  -- expect 10
-- SELECT SUM(deposit_amount) FROM remittances WHERE user_id = @uid; -- expect 5,382,434
-- ════════════════════════════════════════════════════════════════════
