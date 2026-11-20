-- Real data recovered from cars_dump.sql (a mysqldump taken from the old Railway MySQL DB
-- on 2026-07-03). Only auctions/cars/car_images had data in that dump — every other table
-- starts empty after database/postgres_schema.sql runs.

INSERT INTO auctions (auction_id, auction_name, location, auction_house, auction_date, auction_held_days, status, membership_status, notes, created_at, updated_at) VALUES
(1,'USS Tokyo Updated','Tokyo, Japan','USS','2026-08-01',NULL,'upcoming','active','Updated','2026-06-04 22:24:03','2026-06-05 04:09:45'),
(2,'TAA Yokohama','Yokohama, Japan','TAA','2026-06-14','Every Saturday','upcoming','active','Toyota affiliated auction. Quality used vehicles.','2026-06-04 22:24:03','2026-06-04 22:24:03'),
(3,'USS Nagoya','Nagoya, Japan','USS','2026-06-17','Every Wednesday','upcoming','active',NULL,'2026-06-04 22:24:03','2026-06-04 22:24:03'),
(4,'NAA Osaka','Osaka, Japan','NAA','2026-06-19','Every Friday','upcoming','active','Nissan Osaka auction. Sedans and SUVs.','2026-06-04 22:24:03','2026-06-04 22:24:03'),
(5,'LAA Okayama','Okayama, Japan','LAA','2026-06-21','Every Saturday','upcoming','active',NULL,'2026-06-04 22:24:03','2026-06-04 22:24:03'),
(6,'USS Sapporo','Sapporo, Japan','USS','2026-06-24','Every Tuesday','upcoming','active',NULL,'2026-06-04 22:24:03','2026-06-04 22:24:03'),
(7,'HAA Kobe','Kobe, Japan','HAA','2026-06-26','Every Thursday','upcoming','active','Honda affiliated auction.','2026-06-04 22:24:03','2026-06-04 22:24:03'),
(8,'CAA Chubu','Nagoya, Japan','CAA','2026-06-28','Every Saturday','upcoming','active',NULL,'2026-06-04 22:24:03','2026-06-04 22:24:03'),
(9,'USS Tokyo','Tokyo, Japan','USS','2026-07-03','Every Thursday','upcoming','active',NULL,'2026-06-04 22:24:03','2026-06-04 22:24:03'),
(10,'TAA Yokohama','Yokohama, Japan','TAA','2026-07-05','Every Saturday','upcoming','active',NULL,'2026-06-04 22:24:03','2026-06-04 22:24:03'),
(11,'USS Fukuoka','Fukuoka, Japan','USS','2026-07-08','Every Wednesday','upcoming','active',NULL,'2026-06-04 22:24:03','2026-06-04 22:24:03'),
(12,'NAA Osaka','Osaka, Japan','NAA','2026-07-10','Every Friday','upcoming','active',NULL,'2026-06-04 22:24:03','2026-06-04 22:24:03'),
(13,'USS Nagoya','Nagoya, Japan','USS','2026-07-15','Every Wednesday','upcoming','active',NULL,'2026-06-04 22:24:03','2026-06-04 22:24:03'),
(14,'LAA Okayama','Okayama, Japan','LAA','2026-07-19','Every Saturday','upcoming','active',NULL,'2026-06-04 22:24:03','2026-06-04 22:24:03'),
(15,'HAA Tokyo Gotenba','Gotenba, Japan','HAA','2026-07-22','Every Tuesday','upcoming','active','Honda premium lots. Low mileage vehicles.','2026-06-04 22:24:03','2026-06-04 22:24:03'),
(16,'USS Tokyo','Tokyo, Japan','USS','2026-05-29','Every Thursday','completed','active',NULL,'2026-06-04 22:24:03','2026-06-04 22:24:03'),
(17,'TAA Yokohama','Yokohama, Japan','TAA','2026-05-24','Every Saturday','completed','active',NULL,'2026-06-04 22:24:03','2026-06-04 22:24:03'),
(18,'NAA Osaka','Osaka, Japan','NAA','2026-05-16','Every Friday','completed','active',NULL,'2026-06-04 22:24:03','2026-06-04 22:24:03'),
(19,'USS Nagoya','Nagoya, Japan','USS','2026-05-07','Every Wednesday','completed','active',NULL,'2026-06-04 22:24:03','2026-06-04 22:24:03'),
(20,'CAA Tohoku','Sendai, Japan','CAA','2026-04-26','Every Saturday','completed','active',NULL,'2026-06-04 22:24:03','2026-06-04 22:24:03'),
(21,'KCAA Yamaguchi','Yamaguchi, Japan','KCAA',NULL,NULL,'completed','active',NULL,'2026-06-04 22:30:41','2026-06-04 22:30:41'),
(22,'USS Shizuoka','Shizuoka, Japan','USS',NULL,NULL,'completed','active',NULL,'2026-06-04 22:30:41','2026-06-04 22:30:41'),
(23,'IAUC','Tokyo, Japan','IAUC',NULL,NULL,'completed','active',NULL,'2026-06-04 22:30:41','2026-06-04 22:30:41'),
(24,'Sigma Net Wax','Online, Japan','SIGMANETWAX',NULL,NULL,'completed','active',NULL,'2026-06-04 22:30:41','2026-06-04 22:30:41'),
(25,'JU Aichi','Aichi, Japan','JU',NULL,NULL,'completed','active',NULL,'2026-06-04 22:30:41','2026-06-04 22:30:41'),
(26,'JU Hokkaido','Hokkaido, Japan','JU',NULL,NULL,'completed','active',NULL,'2026-06-04 22:30:41','2026-06-04 22:30:41'),
(27,'Honda Nagoya','Nagoya, Japan','Honda',NULL,NULL,'completed','active',NULL,'2026-06-04 22:30:41','2026-06-04 22:30:41'),
(28,'Honda Tokyo','Tokyo, Japan','Honda',NULL,NULL,'completed','active',NULL,'2026-06-04 22:30:41','2026-06-04 22:30:41'),
(29,'Honda Kobe','Kobe, Japan','Honda',NULL,NULL,'completed','active',NULL,'2026-06-04 22:30:41','2026-06-04 22:30:41'),
(31,'USS Tokyo','Tokyo, Japan','USS','2026-08-01','Every Thursday','active','active','Test auction','2026-06-05 04:09:17','2026-06-05 04:09:17');

INSERT INTO cars (car_id, chassis_no, make, model, year, mileage, grade, engine, transmission, color, doors, seats, fuel_type, auction_id, starting_price, status, created_at, updated_at) VALUES
(1,'GP5-3010084','Toyota','FIT',2013,85000,NULL,NULL,NULL,'White',NULL,NULL,NULL,NULL,NULL,'purchased','2026-06-04 22:30:41','2026-06-07 03:53:26'),
(2,'ANH20-8167692','Toyota','VELLFIRE',2011,96000,'A','2400cc','automatic','Silver',5,7,'petrol',2,NULL,'purchased','2026-06-04 22:30:41','2026-06-04 22:43:18'),
(3,'GGH20-8071240','Toyota','VELLFIRE',2012,88000,'A','3500cc','automatic','Black',5,7,'petrol',5,NULL,'purchased','2026-06-04 22:30:41','2026-06-04 22:43:18'),
(4,'NSP130-2158723','Toyota','VITZ',2014,54000,'A','1000cc','cvt','Red',5,5,'petrol',2,NULL,'purchased','2026-06-04 22:30:41','2026-06-04 22:43:18'),
(5,'ME51-166955','Nissan','ELGRAND',2004,112000,'B','3500cc','automatic','Champagne',5,8,'petrol',22,NULL,'purchased','2026-06-04 22:30:41','2026-06-04 22:43:18'),
(6,'GP5-4201852','Toyota','FIT',2014,74000,'A','1500cc Hybrid','cvt','Silver',5,5,'hybrid',15,NULL,'purchased','2026-06-04 22:30:41','2026-06-04 22:43:19'),
(7,'NSP130-2102991','Toyota','VITZ',2015,61000,'A','1000cc','cvt','White',5,5,'petrol',27,NULL,'purchased','2026-06-04 22:30:41','2026-06-04 22:43:19'),
(8,'GP5-4301420','Toyota','FIT',2015,69000,'A','1500cc Hybrid','cvt','Dark Blue',5,5,'hybrid',4,NULL,'purchased','2026-06-04 22:30:41','2026-06-04 22:43:19'),
(9,'WVWZZZAUZFW222760','Volkswagen','GOLF',2015,73000,'A','1400cc Turbo','automatic','Metallic Grey',5,5,'petrol',1,NULL,'purchased','2026-06-04 22:30:41','2026-06-04 22:43:19'),
(10,'GFC27-217897','Nissan','SERENA',2021,34000,'S','2000cc Hybrid','cvt','Pearl White',5,8,'hybrid',4,NULL,'purchased','2026-06-04 22:30:41','2026-06-04 22:43:19'),
(11,'GP5-4305686','Honda','FIT',2015,58000,'A','1500cc Hybrid','cvt','Silver',5,5,'hybrid',28,NULL,'purchased','2026-06-04 22:30:41','2026-06-04 22:43:19'),
(12,'GP5-4008536','Honda','FIT',2015,63000,'A','1500cc Hybrid','cvt','White',5,5,'hybrid',29,NULL,'purchased','2026-06-04 22:30:41','2026-06-04 22:43:19'),
(13,'ZYX10-2175875','Toyota','C-HR',2017,47000,'S','1800cc Hybrid','cvt','Pearl White',5,5,'hybrid',21,NULL,'purchased','2026-06-04 22:30:42','2026-06-04 22:43:19'),
(14,'USF40-5015279','Toyota','LS460',2006,118000,'B','4600cc','automatic','Black',4,5,'petrol',20,NULL,'purchased','2026-06-04 22:30:42','2026-06-04 22:43:20'),
(15,'GRS204-0010705','Toyota','CROWN',2009,91000,'B','2500cc','automatic','Silver',4,5,'petrol',22,NULL,'purchased','2026-06-04 22:30:42','2026-06-04 22:43:20'),
(16,'URS206-1002814','Toyota','CROWN',2009,87000,'B','4600cc','automatic','Champagne',4,5,'petrol',23,NULL,'purchased','2026-06-04 22:30:42','2026-06-04 22:43:20'),
(17,'URS206-1007365','Toyota','CROWN',2006,124000,'C','4600cc','automatic','Dark Blue',4,5,'petrol',1,NULL,'purchased','2026-06-04 22:30:42','2026-06-04 22:43:20'),
(18,'URS206-1000207','Toyota','CROWN',2010,82000,'A','4600cc','automatic','Black',4,5,'petrol',1,NULL,'purchased','2026-06-04 22:30:42','2026-06-04 22:43:20'),
(19,'GRS204-0011052','Toyota','CROWN',2009,94000,'B','2500cc','automatic','White',4,5,'petrol',6,NULL,'purchased','2026-06-04 22:30:42','2026-06-04 22:43:20'),
(20,'CKV36-404331','Nissan','SKYLINE',2008,98000,'A','3700cc','automatic','Gun Metal',4,5,'petrol',24,NULL,'purchased','2026-06-04 22:30:42','2026-06-04 22:43:20'),
(21,'GRS204-0004246','Toyota','CROWN',2008,102000,'B','2500cc','automatic','Silver',4,5,'petrol',8,NULL,'purchased','2026-06-04 22:30:42','2026-06-04 22:43:20'),
(22,'GRS204-0014942','Toyota','CROWN',2010,78000,'A','2500cc','automatic','Pearl White',4,5,'petrol',1,NULL,'purchased','2026-06-04 22:30:42','2026-06-04 22:43:21'),
(23,'GRS204-0012246','Toyota','CROWN',2009,89000,'B','2500cc','automatic','Black',4,5,'petrol',25,NULL,'purchased','2026-06-04 22:30:42','2026-06-04 22:43:21'),
(24,'SG5-079221','Subaru','FORESTER',2000,148000,'C','2000cc Turbo','manual','Dark Green',5,5,'petrol',26,NULL,'purchased','2026-06-04 22:30:42','2026-06-04 22:43:21');

-- car_images had no rows in the recovered dump.

-- Bump sequences for every table that now has (or may later get) explicit-id inserts,
-- so the next SERIAL-generated id doesn't collide with recovered data.
SELECT setval(pg_get_serial_sequence('auctions','auction_id'), (SELECT COALESCE(MAX(auction_id), 1) FROM auctions));
SELECT setval(pg_get_serial_sequence('cars','car_id'),         (SELECT COALESCE(MAX(car_id), 1) FROM cars));
SELECT setval(pg_get_serial_sequence('car_images','car_image_id'), 1, false);
