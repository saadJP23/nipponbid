-- Shinchuo.jp scraped cars table
-- Run this once: mysql -u root -p autobid < database/shinchuo_migration.sql

CREATE TABLE IF NOT EXISTS shinchuo_cars (
  id            INT PRIMARY KEY AUTO_INCREMENT,
  pid           VARCHAR(50) NOT NULL UNIQUE,          -- shinchuo internal PID
  make          VARCHAR(100),
  model         VARCHAR(200),
  year          INT,
  auction_house VARCHAR(200),                         -- e.g. "USS HAA Kobe"
  lot_number    VARCHAR(50),
  chassis       VARCHAR(100),
  mileage       INT,                                  -- stored as km integer
  cc            INT,                                  -- engine cc
  grade         VARCHAR(200),                         -- auction grade + equipment
  auction_grade VARCHAR(20),                          -- numeric grade e.g. "4.5"
  transmission  VARCHAR(20),
  color         VARCHAR(50),
  auction_date  DATE,
  start_price   DECIMAL(14,2),
  image_url     VARCHAR(500),                         -- primary photo (ajes.com)
  sheet_url     VARCHAR(500),                         -- auction sheet image (ajes.com)
  detail_url    VARCHAR(500),                         -- shinchuo detail page URL
  extra_images  TEXT,                                 -- JSON array of additional image URLs
  scraped_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_make        (make),
  INDEX idx_model       (model),
  INDEX idx_year        (year),
  INDEX idx_auction_house (auction_house(100)),
  INDEX idx_auction_date  (auction_date),
  INDEX idx_scraped_at    (scraped_at)
);
