-- Run this AFTER schema.sql to add new features
USE autobid;

-- Add file_code and shipment link to purchases
ALTER TABLE purchases
  ADD COLUMN file_code VARCHAR(50) AFTER id,
  ADD COLUMN shipment_id INT NULL,
  ADD COLUMN is_archived BOOLEAN DEFAULT FALSE,
  ADD COLUMN is_re_auction BOOLEAN DEFAULT FALSE,
  ADD COLUMN whatsapp_sent BOOLEAN DEFAULT FALSE;

-- Saved searches
CREATE TABLE IF NOT EXISTS saved_searches (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  filters JSON NOT NULL,
  visibility ENUM('self','shared') DEFAULT 'self',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Shipments (vessels)
CREATE TABLE IF NOT EXISTS shipments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  file_code VARCHAR(50),
  bl_code VARCHAR(50),
  ship_name VARCHAR(255),
  shipping_company VARCHAR(255),
  voyage VARCHAR(100),
  port_of_loading VARCHAR(100),
  port_of_discharge VARCHAR(100),
  etd DATETIME,
  eta DATETIME,
  status ENUM('pending','departed','arrived','delivered') DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- BL Requests
CREATE TABLE IF NOT EXISTS bl_requests (
  id INT PRIMARY KEY AUTO_INCREMENT,
  purchase_id INT,
  file_code VARCHAR(50),
  chassis_number VARCHAR(100),
  shipping_company VARCHAR(255),
  ship_name VARCHAR(255),
  voyage VARCHAR(100),
  eto DATETIME,
  eta DATETIME,
  port_of_loading VARCHAR(100),
  port_of_discharge VARCHAR(100),
  status ENUM('pending','consigned','completed') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE SET NULL
);

-- Remittances (money transfers from client)
CREATE TABLE IF NOT EXISTS remittances (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  ref_no VARCHAR(50),
  name VARCHAR(255),
  transfer_amount DECIMAL(14,2) NOT NULL,
  deposit_amount DECIMAL(14,2) DEFAULT 0,
  currency ENUM('JPY','USD','EUR','GBP','AED','SAR','PKR','AUD','CAD','OTHER') DEFAULT 'JPY',
  exchange_pair VARCHAR(20) DEFAULT 'USD/JPY',
  exchange_rate DECIMAL(10,4) DEFAULT 0,
  bank_charge_1 DECIMAL(14,2) DEFAULT 0,
  bank_charge_2 DECIMAL(14,2) DEFAULT 0,
  payment_mode ENUM('bank','local','other') DEFAULT 'bank',
  remark TEXT,
  copy_path VARCHAR(500),
  status ENUM('pending','confirmed') DEFAULT 'pending',
  confirmed_at TIMESTAMP NULL,
  tt_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Proforma Invoices (pre-shipment invoice)
CREATE TABLE IF NOT EXISTS proforma_invoices (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  invoice_no VARCHAR(50) UNIQUE,
  invoice_date DATE NOT NULL,
  due_date DATE,
  sold_to VARCHAR(255),
  consigned_to VARCHAR(255),
  amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  paid_amount DECIMAL(14,2) DEFAULT 0,
  status ENUM('unpaid','partial','paid') DEFAULT 'unpaid',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Final Invoices (post-shipment invoice)
CREATE TABLE IF NOT EXISTS final_invoices (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  invoice_no VARCHAR(50) UNIQUE,
  file_code VARCHAR(50),
  invoice_date DATE NOT NULL,
  due_date DATE,
  ship_name VARCHAR(255),
  etd DATE,
  eta DATE,
  amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  paid_amount DECIMAL(14,2) DEFAULT 0,
  status ENUM('unpaid','partial','paid','archived') DEFAULT 'unpaid',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Sub-clients (employees/agents under a main client)
CREATE TABLE IF NOT EXISTS sub_clients (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  username VARCHAR(100),
  email VARCHAR(255),
  mobile VARCHAR(50),
  address TEXT,
  country VARCHAR(100),
  city VARCHAR(100),
  contact_person VARCHAR(255),
  port VARCHAR(100),
  company_name VARCHAR(255),
  ship_terms VARCHAR(100),
  currency VARCHAR(20) DEFAULT 'JPY',
  lcc VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
