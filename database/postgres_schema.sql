-- NipponBid / Autobid — Postgres schema
--
-- Reconstructed from the application code (server/src/routes/*.js, server/src/scripts/*.js),
-- NOT from database/schema.sql, database/nipponbid_schema.sql or database/schema_v2.sql, which
-- are stale and do not match what the live code actually queries (different PK names, different
-- column sets, missing tables). cars_dump.sql (a real dump from the old Railway MySQL DB) was used
-- as ground truth for `auctions`, `cars`, `car_images`, which it matches exactly.
--
-- Primary keys intentionally are NOT all named `id` — they match each table's real PK column name
-- as used throughout the code (e.g. cars.car_id, auctions.auction_id, users.user_id).
--
-- Former MySQL tinyint(1) boolean flags are kept as SMALLINT (0/1), not BOOLEAN, because the
-- application code compares them with literal `= 1` / `= 0` / `?1:0` throughout — changing the
-- column type would require touching every one of those call sites for no functional benefit.

-- ─── updated_at trigger helper ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ════════════════════════════════════════════════════════════════════════════
-- Core marketplace (ground truth: cars_dump.sql, matches server/src/routes/cars.js,
-- bids.js, purchases.js, auth.js, admin.js, etc.)
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE users (
  user_id         SERIAL PRIMARY KEY,
  name            VARCHAR(100) NOT NULL,
  email           VARCHAR(150) NOT NULL UNIQUE,
  password        VARCHAR(255) NOT NULL,
  contact_number  VARCHAR(30),
  country         VARCHAR(80),
  city            VARCHAR(80),
  role            VARCHAR(10)  NOT NULL DEFAULT 'user'  CHECK (role IN ('user','admin')),
  type            VARCHAR(20)  NOT NULL DEFAULT 'ordinary' CHECK (type IN ('ordinary','dealer','agent')),
  status          VARCHAR(10)  NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role  ON users(role);

CREATE TABLE auctions (
  auction_id         SERIAL PRIMARY KEY,
  auction_name       VARCHAR(200) NOT NULL,
  location           VARCHAR(200),
  auction_house      VARCHAR(200),
  auction_date       DATE,
  auction_held_days  VARCHAR(200),
  status             VARCHAR(10) NOT NULL DEFAULT 'active' CHECK (status IN ('upcoming','active','completed')),
  membership_status  VARCHAR(10) NOT NULL DEFAULT 'active' CHECK (membership_status IN ('active','inactive','pending')),
  notes              TEXT,
  created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TRIGGER trg_auctions_updated_at BEFORE UPDATE ON auctions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE cars (
  car_id          SERIAL PRIMARY KEY,
  chassis_no      VARCHAR(100),
  make            VARCHAR(100),
  model           VARCHAR(150),
  year            SMALLINT,
  mileage         INTEGER,
  grade           VARCHAR(50),
  engine          VARCHAR(100),
  transmission    VARCHAR(10) CHECK (transmission IN ('automatic','manual','cvt','other')),
  color           VARCHAR(50),
  doors           SMALLINT,
  seats           SMALLINT,
  fuel_type       VARCHAR(10) CHECK (fuel_type IN ('petrol','diesel','hybrid','electric','other')),
  auction_id      INTEGER REFERENCES auctions(auction_id) ON DELETE SET NULL,
  starting_price  NUMERIC(14,2),
  status          VARCHAR(10) NOT NULL DEFAULT 'active' CHECK (status IN ('active','sold','past','purchased')),
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_cars_auction_id ON cars(auction_id);
CREATE TRIGGER trg_cars_updated_at BEFORE UPDATE ON cars
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE car_images (
  car_image_id  SERIAL PRIMARY KEY,
  car_id        INTEGER NOT NULL REFERENCES cars(car_id) ON DELETE CASCADE,
  url           VARCHAR(500),
  image_path    VARCHAR(500),
  is_primary    SMALLINT NOT NULL DEFAULT 0,
  sort_order    INTEGER DEFAULT 0,
  notes         TEXT,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_car_images_car_id ON car_images(car_id);

CREATE TABLE bids (
  bid_id      SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  car_id      INTEGER NOT NULL REFERENCES cars(car_id) ON DELETE CASCADE,
  auction_id  INTEGER REFERENCES auctions(auction_id) ON DELETE SET NULL,
  amount      NUMERIC(14,2) NOT NULL,
  status      VARCHAR(10) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','won','lost')),
  admin_note  TEXT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_bids_user_id ON bids(user_id);
CREATE INDEX idx_bids_car_id  ON bids(car_id);
CREATE INDEX idx_bids_status  ON bids(status);

CREATE TABLE notifications (
  notification_id  SERIAL PRIMARY KEY,
  user_id          INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  title            VARCHAR(255) NOT NULL,
  message          TEXT,
  type             VARCHAR(20) NOT NULL DEFAULT 'general' CHECK (type IN ('bid','purchase','document','parts','invoice','general')),
  related_id       INTEGER,
  is_read          SMALLINT NOT NULL DEFAULT 0,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- Bootstrapped inline by routes/admin.js in the old MySQL code; now owned by this schema file.
CREATE TABLE settings (
  key_name    VARCHAR(100) PRIMARY KEY,
  value       VARCHAR(255) NOT NULL,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TRIGGER trg_settings_updated_at BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE saved_searches (
  saved_search_id  SERIAL PRIMARY KEY,
  user_id          INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  name             VARCHAR(200) NOT NULL,
  filters          TEXT NOT NULL,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_saved_searches_user_id ON saved_searches(user_id);

CREATE TABLE watchlist (
  watchlist_id  SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  car_id        INTEGER NOT NULL REFERENCES cars(car_id) ON DELETE CASCADE,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, car_id)
);

CREATE TABLE sub_clients (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  name            VARCHAR(150) NOT NULL,
  username        VARCHAR(100),
  email           VARCHAR(150),
  mobile          VARCHAR(30),
  address         TEXT,
  country         VARCHAR(80),
  city            VARCHAR(80),
  contact_person  VARCHAR(150),
  port            VARCHAR(150),
  company_name    VARCHAR(200),
  ship_terms      VARCHAR(100),
  currency        VARCHAR(10) NOT NULL DEFAULT 'JPY',
  lcc             VARCHAR(100),
  is_active       SMALLINT NOT NULL DEFAULT 1,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_sub_clients_user_id ON sub_clients(user_id);

-- ════════════════════════════════════════════════════════════════════════════
-- Purchases / shipping / billing (server/src/routes/purchases.js, shipments.js,
-- invoices.js, remittances.js, accounting.js)
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE purchases (
  purchase_id     SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  car_id          INTEGER NOT NULL REFERENCES cars(car_id) ON DELETE CASCADE,
  auction_id      INTEGER REFERENCES auctions(auction_id) ON DELETE SET NULL,
  auction_date    DATE,
  lot_no          VARCHAR(50),
  destination     VARCHAR(200),
  pro_invoice_no  VARCHAR(50),
  file_code_no    VARCHAR(50),
  remarks         TEXT,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_purchases_user_id ON purchases(user_id);
CREATE INDEX idx_purchases_car_id  ON purchases(car_id);

CREATE TABLE purchase_details (
  purchase_detail_id    SERIAL PRIMARY KEY,
  purchase_id           INTEGER NOT NULL UNIQUE REFERENCES purchases(purchase_id) ON DELETE CASCADE,
  bid_price             NUMERIC(14,2) DEFAULT 0,
  auction_charges       NUMERIC(14,2) DEFAULT 0,
  transportation        NUMERIC(14,2) DEFAULT 0,
  loading_custom        NUMERIC(14,2) DEFAULT 0,
  others_commission     NUMERIC(14,2) DEFAULT 0,
  tax_10_percent        NUMERIC(14,2) DEFAULT 0,
  radiation_photos      NUMERIC(14,2) DEFAULT 0,
  custom_fee            NUMERIC(14,2) DEFAULT 0,
  freight               NUMERIC(14,2) DEFAULT 0,
  recycle               NUMERIC(14,2) DEFAULT 0,
  others                NUMERIC(14,2) DEFAULT 0,
  dealer_fee            NUMERIC(14,2) DEFAULT 0,
  nipponbid_commission  NUMERIC(14,2) DEFAULT 0,
  is_third_party        SMALLINT DEFAULT 0,
  third_party_fee       NUMERIC(14,2) DEFAULT 0
);

CREATE TABLE documents (
  document_id   SERIAL PRIMARY KEY,
  purchase_id   INTEGER NOT NULL REFERENCES purchases(purchase_id) ON DELETE CASCADE,
  user_id       INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  car_id        INTEGER REFERENCES cars(car_id) ON DELETE SET NULL,
  -- References shipping(shipping_id); added via ALTER TABLE below since `shipping` is
  -- defined later in this file. NULL = a general purchase document, not shipment-specific.
  shipping_id   INTEGER,
  name          VARCHAR(255),
  type          VARCHAR(50) NOT NULL DEFAULT 'user_and_admin',
  url           VARCHAR(500) NOT NULL,
  uploaded_by   INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_documents_purchase_id ON documents(purchase_id);
CREATE INDEX idx_documents_shipping_id ON documents(shipping_id);

CREATE TABLE shipping (
  shipping_id           SERIAL PRIMARY KEY,
  purchase_id           INTEGER NOT NULL REFERENCES purchases(purchase_id) ON DELETE CASCADE,
  user_id               INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  shipping_company      VARCHAR(200),
  ship_name             VARCHAR(200),
  voyage                VARCHAR(200),
  route                 VARCHAR(400),
  etd                   DATE,
  eta                   DATE,
  result_of_inspection  TEXT,
  created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_shipping_purchase_id ON shipping(purchase_id);
CREATE INDEX idx_shipping_user_id    ON shipping(user_id);

ALTER TABLE documents ADD CONSTRAINT fk_documents_shipping
  FOREIGN KEY (shipping_id) REFERENCES shipping(shipping_id) ON DELETE CASCADE;

CREATE TABLE bl (
  bl_id              SERIAL PRIMARY KEY,
  purchase_id        INTEGER REFERENCES purchases(purchase_id) ON DELETE SET NULL,
  car_id             INTEGER REFERENCES cars(car_id) ON DELETE SET NULL,
  user_id            INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  shipping_id        INTEGER REFERENCES shipping(shipping_id) ON DELETE SET NULL,
  port_of_loading    VARCHAR(200),
  port_of_discharge  VARCHAR(200),
  route              VARCHAR(400),
  status             VARCHAR(20) NOT NULL DEFAULT 'pending',
  document_id        INTEGER REFERENCES documents(document_id) ON DELETE SET NULL,
  created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_bl_purchase_id ON bl(purchase_id);
CREATE INDEX idx_bl_shipping_id ON bl(shipping_id);

CREATE TABLE remittances (
  remittance_id   SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  ref_no          VARCHAR(20) NOT NULL UNIQUE,
  sender_name     VARCHAR(200),
  deposit_amount  NUMERIC(14,2) NOT NULL,
  tt_date         DATE,
  receipt_url     VARCHAR(500),
  remarks         TEXT,
  status          VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed')),
  confirmed_at    TIMESTAMP,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_remittances_user_id ON remittances(user_id);
CREATE INDEX idx_remittances_status  ON remittances(status);

CREATE TABLE proforma_invoices (
  proforma_id    SERIAL PRIMARY KEY,
  user_id        INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  purchase_id    INTEGER REFERENCES purchases(purchase_id) ON DELETE SET NULL,
  invoice_no     VARCHAR(20) NOT NULL UNIQUE,
  invoice_date   DATE NOT NULL,
  due_date       DATE,
  sold_to        TEXT,
  consigned_to   TEXT,
  amount         NUMERIC(14,2) NOT NULL,
  paid_amount    NUMERIC(14,2) NOT NULL DEFAULT 0,
  status         VARCHAR(10) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','partial','paid')),
  notes          TEXT,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_proforma_invoices_user_id ON proforma_invoices(user_id);

CREATE TABLE final_invoices (
  final_invoice_id  SERIAL PRIMARY KEY,
  user_id           INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  purchase_id       INTEGER REFERENCES purchases(purchase_id) ON DELETE SET NULL,
  shipping_id       INTEGER REFERENCES shipping(shipping_id) ON DELETE SET NULL,
  invoice_no        VARCHAR(20) NOT NULL UNIQUE,
  invoice_date      DATE NOT NULL,
  due_date          DATE,
  amount            NUMERIC(14,2) NOT NULL,
  paid_amount       NUMERIC(14,2) NOT NULL DEFAULT 0,
  status            VARCHAR(10) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','partial','paid','archived')),
  notes             TEXT,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_final_invoices_user_id ON final_invoices(user_id);

CREATE TABLE parts_purchases (
  parts_purchase_id    SERIAL PRIMARY KEY,
  user_id              INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  type                 VARCHAR(20) CHECK (type IN ('online','manufacturer')),
  part_name            VARCHAR(255) NOT NULL,
  part_description     TEXT,
  chassis              VARCHAR(100),
  delivered_to         VARCHAR(200),
  platform_name        VARCHAR(100),
  auction_id           VARCHAR(100),
  quantity             INTEGER NOT NULL DEFAULT 1,
  bid_price            NUMERIC(14,2) NOT NULL,
  delivery_charges     NUMERIC(14,2) DEFAULT 0,
  bank_charges         NUMERIC(14,2) DEFAULT 0,
  shinchuo_commission  NUMERIC(14,2) DEFAULT 0,
  commission           NUMERIC(14,2) DEFAULT 0,
  delivery_company     VARCHAR(200),
  tracking_no          VARCHAR(200),
  delivery_status      VARCHAR(50) DEFAULT 'pending',
  status               VARCHAR(50) DEFAULT 'pending',
  billed_to_client     BOOLEAN NOT NULL DEFAULT false,
  billed_to_shinchuo   BOOLEAN NOT NULL DEFAULT false,
  admin_note           TEXT,
  created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_parts_purchases_user_id ON parts_purchases(user_id);
CREATE INDEX idx_parts_purchases_status  ON parts_purchases(status);

-- ════════════════════════════════════════════════════════════════════════════
-- "Japan" module — Shinchuo-sourced cars, bids, purchases (server/src/routes/japan.js,
-- server/src/scripts/shinchuoAgent.js, shinchuoScraper.js). These used to bootstrap
-- their own tables with inline `CREATE TABLE IF NOT EXISTS` calls at startup (MySQL-only
-- syntax) — that bootstrap code has been removed; this schema file owns them now.
--
-- NOTE: the original code for this module inconsistently referenced `users.id` /
-- `users.phone` in many places (a leftover from an earlier, incompatible `users` schema).
-- Those are real `users.user_id` / `users.contact_number`, confirmed by the registration/
-- login code (routes/auth.js) which is unambiguously correct. The query call sites have
-- been fixed to match — see migration report for the full list.
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE japan_cars (
  id             SERIAL PRIMARY KEY,
  pid            VARCHAR(50) NOT NULL UNIQUE,
  make           VARCHAR(100),
  model          VARCHAR(200),
  year           INTEGER,
  auction_house  VARCHAR(200),
  lot_number     VARCHAR(50),
  chassis        VARCHAR(100),
  mileage        INTEGER,
  cc             INTEGER,
  grade          VARCHAR(200),
  auction_grade  VARCHAR(20),
  transmission   VARCHAR(20),
  color          VARCHAR(50),
  auction_date   DATE,
  status         VARCHAR(10) DEFAULT 'upcoming' CHECK (status IN ('upcoming','past','purchased')),
  start_price    NUMERIC(14,2),
  image_url      VARCHAR(500),
  sheet_url      VARCHAR(500),
  detail_url     VARCHAR(500),
  extra_images   TEXT,
  scraped_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_japan_cars_make         ON japan_cars(make);
CREATE INDEX idx_japan_cars_model        ON japan_cars(model);
CREATE INDEX idx_japan_cars_year         ON japan_cars(year);
CREATE INDEX idx_japan_cars_auction_date ON japan_cars(auction_date);
CREATE INDEX idx_japan_cars_status       ON japan_cars(status);
CREATE TRIGGER trg_japan_cars_updated_at BEFORE UPDATE ON japan_cars
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE japan_bids (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  pid         VARCHAR(50) NOT NULL REFERENCES japan_cars(pid) ON DELETE CASCADE,
  amount      NUMERIC(14,2) NOT NULL,
  status      VARCHAR(10) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','won','lost')),
  admin_note  TEXT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, pid)
);
CREATE INDEX idx_japan_bids_pid    ON japan_bids(pid);
CREATE INDEX idx_japan_bids_status ON japan_bids(status);
CREATE TRIGGER trg_japan_bids_updated_at BEFORE UPDATE ON japan_bids
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE japan_purchases (
  id                    SERIAL PRIMARY KEY,
  user_id               INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  bid_id                INTEGER REFERENCES japan_bids(id) ON DELETE SET NULL,
  pid                   VARCHAR(50) NOT NULL REFERENCES japan_cars(pid) ON DELETE RESTRICT,
  pro_invoice_no        VARCHAR(50),
  file_code             VARCHAR(50),
  destination           VARCHAR(150),
  bid_price             NUMERIC(14,2) DEFAULT 0,
  auction_fee           NUMERIC(14,2) DEFAULT 0,
  auction_commission    NUMERIC(14,2) DEFAULT 0,
  transportation        NUMERIC(14,2) DEFAULT 0,
  loading_custom        NUMERIC(14,2) DEFAULT 0,
  commission            NUMERIC(14,2) DEFAULT 0,
  tax_10pct             NUMERIC(14,2) DEFAULT 0,
  radiation_photos      NUMERIC(14,2) DEFAULT 0,
  custom_fee            NUMERIC(14,2) DEFAULT 0,
  freight               NUMERIC(14,2) DEFAULT 0,
  recycle               NUMERIC(14,2) DEFAULT 0,
  total                 NUMERIC(14,2) DEFAULT 0,
  etd                   DATE,
  ship_name             VARCHAR(200),
  shipping_company      VARCHAR(200),
  eta                   DATE,
  route                 VARCHAR(400),
  result_of_inspection  TEXT,
  remarks               TEXT,
  bl_status             VARCHAR(100),
  created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_japan_purchases_user_id ON japan_purchases(user_id);
CREATE INDEX idx_japan_purchases_pid     ON japan_purchases(pid);
CREATE TRIGGER trg_japan_purchases_updated_at BEFORE UPDATE ON japan_purchases
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE japan_documents (
  id           SERIAL PRIMARY KEY,
  purchase_id  INTEGER NOT NULL REFERENCES japan_purchases(id) ON DELETE CASCADE,
  type         VARCHAR(100),
  name         VARCHAR(255),
  file_path    VARCHAR(500) NOT NULL,
  file_size    INTEGER,
  uploaded_by  INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  uploaded_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_japan_documents_purchase_id ON japan_documents(purchase_id);

CREATE TABLE japan_parts_purchases (
  id                SERIAL PRIMARY KEY,
  user_id           INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  purchased_date    DATE,
  particular        VARCHAR(100),
  item              VARCHAR(255) NOT NULL,
  delivered_to      VARCHAR(200),
  put_in            VARCHAR(100),
  auction_id        VARCHAR(100),
  delivery_company  VARCHAR(200),
  tracking_number   VARCHAR(200),
  delivery_status   VARCHAR(50) DEFAULT 'pending',
  bid_price         NUMERIC(14,2),
  delivery_charges  NUMERIC(14,2),
  bank_charges      NUMERIC(14,2),
  commission        NUMERIC(14,2),
  total             NUMERIC(14,2),
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_japan_parts_purchases_user_id ON japan_parts_purchases(user_id);

-- Legacy, separate from `shipping` — used only by routes/japan.js to look up a
-- vessel document by file_code. Column set confirmed against database/nipponbid_schema.sql
-- (document_path/document_name match) plus the code's own references.
CREATE TABLE shipments (
  id                 SERIAL PRIMARY KEY,
  file_code          VARCHAR(50),
  bl_code            VARCHAR(100),
  ship_name          VARCHAR(200),
  shipping_company   VARCHAR(200),
  voyage             VARCHAR(100),
  port_of_loading    VARCHAR(200),
  port_of_discharge  VARCHAR(200),
  etd                DATE,
  eta                DATE,
  status             VARCHAR(20) DEFAULT 'pending',
  notes              TEXT,
  document_path      VARCHAR(500),
  document_name      VARCHAR(200),
  created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_shipments_file_code ON shipments(file_code);
CREATE TRIGGER trg_shipments_updated_at BEFORE UPDATE ON shipments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Legacy, separate from `bl` — used only by routes/japan.js.
CREATE TABLE bl_requests (
  id                 SERIAL PRIMARY KEY,
  purchase_id        INTEGER REFERENCES japan_purchases(id) ON DELETE SET NULL,
  chassis_number     VARCHAR(100),
  shipping_company   VARCHAR(200),
  ship_name          VARCHAR(200),
  voyage             VARCHAR(100),
  eto                DATE,
  eta                DATE,
  port_of_loading    VARCHAR(200),
  port_of_discharge  VARCHAR(200),
  bl_code            VARCHAR(100),
  status             VARCHAR(20) DEFAULT 'pending',
  document_path      VARCHAR(500),
  document_name      VARCHAR(200),
  created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_bl_requests_purchase_id ON bl_requests(purchase_id);
CREATE TRIGGER trg_bl_requests_updated_at BEFORE UPDATE ON bl_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
