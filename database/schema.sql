-- ═══════════════════════════════════════════════════════════════════════════════
--  AutoBid — Full Database Schema
--  Run once on a fresh MySQL 8+ instance:
--    mysql -u root -p < /Users/syedsaad/Documents/autobid/database/schema.sql
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE DATABASE IF NOT EXISTS autobid
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE autobid;

-- ── 1. users ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id           INT PRIMARY KEY AUTO_INCREMENT,
  name         VARCHAR(100)  NOT NULL,
  email        VARCHAR(150)  NOT NULL UNIQUE,
  password     VARCHAR(255)  NOT NULL,
  role         ENUM('user','admin') NOT NULL DEFAULT 'user',
  phone        VARCHAR(30),
  country      VARCHAR(80),
  city         VARCHAR(80),
  avatar       VARCHAR(500),
  is_active    TINYINT(1)    NOT NULL DEFAULT 1,
  created_at   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_role  (role)
);

-- ── 2. auctions ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS auctions (
  id            INT PRIMARY KEY AUTO_INCREMENT,
  name          VARCHAR(200) NOT NULL,
  location      VARCHAR(200),
  auction_house VARCHAR(100),
  auction_date  DATETIME,
  status        ENUM('upcoming','active','completed') NOT NULL DEFAULT 'upcoming',
  description   TEXT,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status       (status),
  INDEX idx_auction_date (auction_date)
);

-- ── 3. cars ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cars (
  id              INT PRIMARY KEY AUTO_INCREMENT,
  auction_id      INT,
  lot_number      VARCHAR(20),
  make            VARCHAR(100),
  model           VARCHAR(150),
  year            INT,
  mileage         INT,
  grade           VARCHAR(50),
  chassis_number  VARCHAR(100),
  engine          VARCHAR(100),
  transmission    ENUM('automatic','manual','cvt','other'),
  color           VARCHAR(50),
  doors           TINYINT,
  seats           TINYINT,
  fuel_type       ENUM('petrol','diesel','hybrid','electric','other'),
  drive           ENUM('2wd','4wd','awd'),
  starting_price  DECIMAL(14,2),
  current_bid     DECIMAL(14,2),
  status          ENUM('upcoming','active','sold','cancelled') NOT NULL DEFAULT 'upcoming',
  description     TEXT,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (auction_id) REFERENCES auctions(id) ON DELETE SET NULL,
  INDEX idx_make   (make),
  INDEX idx_model  (model),
  INDEX idx_year   (year),
  INDEX idx_status (status)
);

-- ── 4. car_images ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS car_images (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  car_id      INT NOT NULL,
  image_path  VARCHAR(500) NOT NULL,
  is_primary  TINYINT(1)   NOT NULL DEFAULT 0,
  sort_order  INT          NOT NULL DEFAULT 0,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE,
  INDEX idx_car_id (car_id)
);

-- ── 5. bids ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bids (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  user_id     INT NOT NULL,
  car_id      INT NOT NULL,
  amount      DECIMAL(14,2) NOT NULL,
  status      ENUM('pending','approved','rejected','won','lost') NOT NULL DEFAULT 'pending',
  admin_note  TEXT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (car_id)  REFERENCES cars(id)  ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_car_id  (car_id),
  INDEX idx_status  (status)
);

-- ── 6. shipments (vessel records) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shipments (
  id                  INT PRIMARY KEY AUTO_INCREMENT,
  file_code           VARCHAR(50),
  bl_code             VARCHAR(100),
  ship_name           VARCHAR(200),
  shipping_company    VARCHAR(200),
  voyage              VARCHAR(100),
  port_of_loading     VARCHAR(200),
  port_of_discharge   VARCHAR(200),
  etd                 DATE,
  eta                 DATE,
  status              ENUM('active','completed') NOT NULL DEFAULT 'active',
  notes               TEXT,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_file_code (file_code)
);

-- ── 7. purchases ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS purchases (
  id                   INT PRIMARY KEY AUTO_INCREMENT,
  user_id              INT NOT NULL,
  car_id               INT NOT NULL,
  bid_id               INT,
  shipment_id          INT,
  file_code            VARCHAR(50),
  final_amount         DECIMAL(14,2) NOT NULL,
  shipping_fee         DECIMAL(14,2) NOT NULL DEFAULT 0,
  insurance_fee        DECIMAL(14,2) NOT NULL DEFAULT 0,
  inspection_fee       DECIMAL(14,2) NOT NULL DEFAULT 0,
  destination_country  VARCHAR(100),
  destination_port     VARCHAR(200),
  shipping_status      ENUM('processing','in_transit','at_port','customs','delivered') NOT NULL DEFAULT 'processing',
  tracking_number      VARCHAR(200),
  vessel_name          VARCHAR(200),
  eta                  DATE,
  notes                TEXT,
  purchased_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)     REFERENCES users(id)     ON DELETE CASCADE,
  FOREIGN KEY (car_id)      REFERENCES cars(id)       ON DELETE CASCADE,
  FOREIGN KEY (bid_id)      REFERENCES bids(id)       ON DELETE SET NULL,
  FOREIGN KEY (shipment_id) REFERENCES shipments(id)  ON DELETE SET NULL,
  INDEX idx_user_id         (user_id),
  INDEX idx_car_id          (car_id),
  INDEX idx_shipping_status (shipping_status),
  INDEX idx_file_code       (file_code)
);

-- ── 8. documents ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documents (
  id           INT PRIMARY KEY AUTO_INCREMENT,
  purchase_id  INT NOT NULL,
  type         ENUM('auction_sheet','export_certificate','bill_of_lading','inspection_report','deregistration','customs_clearance','other') NOT NULL DEFAULT 'other',
  name         VARCHAR(255),
  file_path    VARCHAR(500) NOT NULL,
  file_size    INT,
  uploaded_by  INT,
  uploaded_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id)     ON DELETE SET NULL,
  INDEX idx_purchase_id (purchase_id)
);

-- ── 9. bl_requests ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bl_requests (
  id                  INT PRIMARY KEY AUTO_INCREMENT,
  purchase_id         INT,
  file_code           VARCHAR(50),
  chassis_number      VARCHAR(100),
  shipping_company    VARCHAR(200),
  ship_name           VARCHAR(200),
  voyage              VARCHAR(100),
  eto                 DATE,
  eta                 DATE,
  port_of_loading     VARCHAR(200),
  port_of_discharge   VARCHAR(200),
  bl_code             VARCHAR(100),
  status              ENUM('pending','issued','sent') NOT NULL DEFAULT 'pending',
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE SET NULL,
  INDEX idx_purchase_id (purchase_id),
  INDEX idx_status      (status)
);

-- ── 10. parts_purchases ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parts_purchases (
  id                INT PRIMARY KEY AUTO_INCREMENT,
  user_id           INT NOT NULL,
  type              ENUM('online','manufacturer') NOT NULL,
  platform_link     TEXT,
  platform_name     VARCHAR(100),
  chassis_number    VARCHAR(100),
  car_make          VARCHAR(100),
  car_model         VARCHAR(150),
  car_year          INT,
  part_name         VARCHAR(255)  NOT NULL,
  part_description  TEXT,
  bid_price         DECIMAL(14,2) NOT NULL,
  final_price       DECIMAL(14,2),
  quantity          INT           NOT NULL DEFAULT 1,
  status            ENUM('pending','processing','ordered','shipped','delivered','cancelled') NOT NULL DEFAULT 'pending',
  tracking_number   VARCHAR(200),
  admin_note        TEXT,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_status  (status)
);

-- ── 11. notifications ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  user_id     INT NOT NULL,
  title       VARCHAR(255) NOT NULL,
  message     TEXT,
  type        ENUM('bid','purchase','document','parts','general') NOT NULL DEFAULT 'general',
  related_id  INT,
  is_read     TINYINT(1)   NOT NULL DEFAULT 0,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_is_read (is_read)
);

-- ── 12. watchlist ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS watchlist (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  user_id     INT NOT NULL,
  car_id      INT NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_car (user_id, car_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (car_id)  REFERENCES cars(id)  ON DELETE CASCADE
);

-- ── 13. remittances ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS remittances (
  id               INT PRIMARY KEY AUTO_INCREMENT,
  user_id          INT NOT NULL,
  ref_no           VARCHAR(20)   NOT NULL UNIQUE,
  name             VARCHAR(200),
  transfer_amount  DECIMAL(14,2) NOT NULL,
  deposit_amount   DECIMAL(14,2) NOT NULL DEFAULT 0,
  currency         VARCHAR(10)   NOT NULL DEFAULT 'JPY',
  exchange_pair    VARCHAR(20)            DEFAULT 'USD/JPY',
  exchange_rate    DECIMAL(10,4)          DEFAULT 0,
  bank_charge_1    DECIMAL(10,2)          DEFAULT 0,
  bank_charge_2    DECIMAL(10,2)          DEFAULT 0,
  payment_mode     VARCHAR(50)            DEFAULT 'bank',
  remark           TEXT,
  copy_path        VARCHAR(500),
  tt_date          DATE,
  status           ENUM('pending','confirmed') NOT NULL DEFAULT 'pending',
  confirmed_at     TIMESTAMP NULL,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_status  (status)
);

-- ── 14. proforma_invoices ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS proforma_invoices (
  id            INT PRIMARY KEY AUTO_INCREMENT,
  user_id       INT NOT NULL,
  invoice_no    VARCHAR(20)   NOT NULL UNIQUE,
  invoice_date  DATE          NOT NULL,
  due_date      DATE,
  sold_to       TEXT,
  consigned_to  TEXT,
  amount        DECIMAL(14,2) NOT NULL,
  paid_amount   DECIMAL(14,2) NOT NULL DEFAULT 0,
  status        ENUM('pending','partial','paid') NOT NULL DEFAULT 'pending',
  notes         TEXT,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_status  (status)
);

-- ── 15. final_invoices ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS final_invoices (
  id            INT PRIMARY KEY AUTO_INCREMENT,
  user_id       INT NOT NULL,
  invoice_no    VARCHAR(20)   NOT NULL UNIQUE,
  file_code     VARCHAR(50),
  invoice_date  DATE          NOT NULL,
  due_date      DATE,
  ship_name     VARCHAR(200),
  etd           DATE,
  eta           DATE,
  amount        DECIMAL(14,2) NOT NULL,
  paid_amount   DECIMAL(14,2) NOT NULL DEFAULT 0,
  status        ENUM('pending','partial','paid','archived') NOT NULL DEFAULT 'pending',
  notes         TEXT,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id   (user_id),
  INDEX idx_status    (status),
  INDEX idx_file_code (file_code)
);

-- ── 16. sub_clients ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sub_clients (
  id              INT PRIMARY KEY AUTO_INCREMENT,
  user_id         INT NOT NULL,
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
  is_active       TINYINT(1)  NOT NULL DEFAULT 1,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id)
);

-- ── 17. saved_searches ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saved_searches (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  user_id     INT NOT NULL,
  name        VARCHAR(200) NOT NULL,
  filters     TEXT         NOT NULL,
  visibility  ENUM('self','shared') NOT NULL DEFAULT 'self',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id    (user_id),
  INDEX idx_visibility (visibility)
);

-- ── 18. shinchuo_cars (scraped from shinchuo.jp) ─────────────────────────────
CREATE TABLE IF NOT EXISTS shinchuo_cars (
  id            INT PRIMARY KEY AUTO_INCREMENT,
  pid           VARCHAR(50)   NOT NULL UNIQUE,
  make          VARCHAR(100),
  model         VARCHAR(200),
  year          INT,
  auction_house VARCHAR(200),
  lot_number    VARCHAR(50),
  chassis       VARCHAR(100),
  mileage       INT,
  cc            INT,
  grade         VARCHAR(200),
  auction_grade VARCHAR(20),
  transmission  VARCHAR(20),
  color         VARCHAR(50),
  auction_date  DATE,
  status        ENUM('upcoming','past','purchased') NOT NULL DEFAULT 'upcoming',
  start_price   DECIMAL(14,2),
  image_url     VARCHAR(500),
  sheet_url     VARCHAR(500),
  detail_url    VARCHAR(500),
  extra_images  TEXT,
  scraped_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_make         (make),
  INDEX idx_model        (model),
  INDEX idx_year         (year),
  INDEX idx_auction_date (auction_date),
  INDEX idx_status       (status)
);

-- ═══════════════════════════════════════════════════════════════════════════════
--  Default admin account
--  Email:    admin@autobid.com
--  Password: Admin1234
--  ⚠ Change this password immediately after first login!
-- ═══════════════════════════════════════════════════════════════════════════════
INSERT IGNORE INTO users (name, email, password, role) VALUES (
  'Admin',
  'admin@autobid.com',
  '$2a$10$dUU8YAYCrRnBWt.xsoA4oOFnYiFG92ENllKuUR9wxnBnI3VIGSk3K',
  'admin'
);
