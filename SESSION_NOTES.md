# NipponBid — Session Notes
**Date:** June 5, 2026  
**Duration:** ~4 hours  

---

## 🎯 Goal of This Session

1. **Clear all data** from the Railway production database and start completely fresh
2. **Re-scrape** the latest car listings from Shinchuo.jp into the new v3 schema
3. **Redesign the entire frontend** professionally using the Google Stitch design mockups
4. **Fix the backend** to work correctly with the new v3 database schema

---

## ✅ What Worked

### Database
- Successfully connected to Railway MySQL console via the Console tab
- Dropped all 17 old-schema tables (`admin_others`, `auctions`, `bids`, `bl_requests`, `documents`, `final_invoices`, `japan_bids`, `japan_cars`, `japan_documents`, `japan_parts_purchases`, `notifications`, `parts_purchases`, `proforma_invoices`, `purchases`, `remittances`, `saved_searches`, `shipments`, `sub_clients`, `users`, `watchlist`)
- Applied the full **v3 schema** to Railway successfully — all 20 new tables created with correct structure
- Admin user re-inserted: `admin@nipponbid.com` / `Admin1234`

### Backend (Server)
- **`japan.js` routes** — Fixed all FK references from `users(id)` → `users(user_id)` to match v3 schema
- **`japan.js` listing routes** — `/featured`, `/stats`, `/makes`, `/dates`, `/cars`, `/cars/:pid` now query the v3 `cars` + `auctions` + `car_images` tables instead of the dropped `japan_cars` table
- **`japan_cars` compatibility VIEW** — Created on server startup so all existing bid/purchase admin JOINs (`japan_bids`, `japan_purchases`) keep working without a full rewrite
- **Manual car creation** — Updated to insert into `cars` + `auctions` + `car_images` tables
- **Status updates** — `UPDATE japan_cars SET status` → `UPDATE cars SET status`
- **`shinchuoScraper.js`** — Fully updated to save scraped data into v3 `cars`, `auctions`, `car_images` tables instead of the old `japan_cars` table. Includes auction upsert by name, car upsert by `pid`, and image rows in `car_images`
- **`schema_v3.sql`** — Updated with all missing columns: `cars.pid`, `cars.auction_id`, `cars.lot_number`, `cars.starting_price`, `cars.status`; `auctions.auction_house`, `auctions.auction_date`, `auctions.status`; `car_images.image_path`, `car_images.sort_order`
- **`clear_and_reset.sql`** — Created a clean DB wipe script for future use

### Frontend Redesign
- **Layout.jsx** — Main content area now uses `data-theme="light"` (light backgrounds), top header updated to light surface with dark text matching Stitch design; fixed nav link `/my-japan-purchases` → `/my-purchases`
- **index.css** — Updated `.card`, `.input-field`, `.badge-*`, `.btn-outline-gold`, `.btn-ghost` classes to render correctly in light mode
- **JapaneseAuctions.jsx** — Full redesign: proper filter bar with search + Filters button, date pills, clean `bg-surface-container-lowest` card grid, proper pagination, Material Symbols icons replacing Lucide
- **Login.jsx** — New split-panel design: dark navy branding panel on left + clean white form on right
- **Register.jsx** — Clean white card form matching Stitch style
- **MyPurchases.jsx** — Light expandable cards with cost breakdown, proper surface tokens
- **MyBids.jsx** — Status pills (colored), clean list with hover effects, no dark glass
- **Parts.jsx** — Clean type selector cards + form with proper light-mode fields
- **Notifications.jsx** — Icon-based notification cards with read/unread states, type-colored icons
- **Build passes locally** — `✓ built in ~20s`, no errors

### Git / Deployment
- All changes committed to GitHub (`saadJP23/nipponbid`, branch `main`)
- Vercel triggered to redeploy with latest commit

---

## ❌ What Didn't Work / Issues Encountered

### Railway DB Console
- The **Database tab** (GUI) only runs one SQL statement at a time — couldn't run multi-statement scripts there
- The **Console tab** bash shell was initially used directly (pasting SQL into bash instead of MySQL)
- Had to manually connect: `mysql -u $MYSQLUSER -p$MYSQLPASSWORD -h $MYSQLHOST --port=$MYSQLPORT $MYSQLDATABASE`
- The old schema had no `type` column on `users` — INSERT failed until we dropped old tables and applied v3

### Scraper
- First run pointed to **local MySQL** (not Railway) because `.env` has `DB_HOST=localhost`
- Local MySQL still had old schema without `auction_house` column — scraper crashed
- Fix: run scraper with Railway env vars passed inline (see Current Status below)

### Vercel Deployment
- Vercel initially deployed from an **older commit** that had `getJapanFeatured` in `Home.jsx` — build failed
- Fix: pushed an empty commit to force Vercel to pick up the latest code
- New deployment triggered as of end of session — **status unknown** (was building when session ended)

### Backend Routes (Partial)
- `japan.js` bid/purchase admin routes still use `japan_bids` and `japan_purchases` tables (which are recreated on server startup). These tables JOIN through the `japan_cars` VIEW — this is a compatibility workaround, not a full migration. A proper full migration to v3 `bids`/`purchases` tables was scoped out but not done (too large to rewrite safely in one session)

---

## 📊 Current Status

| Component | Status |
|-----------|--------|
| Railway DB schema | ✅ v3 applied, clean |
| Admin user | ✅ Created (`admin@nipponbid.com` / `Admin1234`) |
| Car data in Railway | ❌ Empty — scraper not yet run against Railway |
| Backend (Railway server) | ⚠️ Needs redeploy to pick up route fixes |
| Frontend (Vercel) | ⚠️ Redeployment triggered, status unknown |
| Scraper | ⚠️ Ready to run, command below |

---

## 🔧 What Still Needs to Be Done

### 1. Run the Scraper (PRIORITY)
The Railway database has no cars yet. Run this:

```bash
cd /Users/syedsaad/Documents/Nipponbid/server

# Test run (fast, 20 pages, no detail fetching)
DB_HOST=centerbeam.proxy.rlwy.net \
DB_PORT=57594 \
DB_USER=root \
DB_PASSWORD=UAhrFgyKVimhFeEgmlYEAbRQFDlvGVST \
DB_NAME=railway \
node src/scripts/shinchuoScraper.js --pages 20 --no-details

# Full run (all 91,473 cars — takes ~40 min)
DB_HOST=centerbeam.proxy.rlwy.net \
DB_PORT=57594 \
DB_USER=root \
DB_PASSWORD=UAhrFgyKVimhFeEgmlYEAbRQFDlvGVST \
DB_NAME=railway \
node src/scripts/shinchuoScraper.js
```

### 2. Redeploy Railway Backend
The backend server on Railway needs to restart to:
- Pick up the updated `japan.js` routes
- Create the `japan_cars` compatibility VIEW on startup
- Create `japan_bids`, `japan_purchases` tables with correct FKs

In Railway → Web Service → click **Redeploy**.

### 3. Verify Vercel Deployment
Check `vercel.com → nipponbid → Deployments` — confirm the latest build succeeded. If it did, the new frontend design will be live.

### 4. Update `.env` for Local Dev (Optional)
To avoid the "wrong database" issue when running the scraper locally again, add a `.env.railway` file:

```env
DB_HOST=centerbeam.proxy.rlwy.net
DB_PORT=57594
DB_USER=root
DB_PASSWORD=UAhrFgyKVimhFeEgmlYEAbRQFDlvGVST
DB_NAME=railway
```

Then run: `node --env-file=.env.railway src/scripts/shinchuoScraper.js`

### 5. Future: Fully Migrate Japan Bid/Purchase Routes (Technical Debt)
The `japan_bids` and `japan_purchases` tables are still separate from the v3 `bids` and `purchases` tables. They work via a compatibility VIEW but it's not fully unified. A proper migration would:
- Map `japan_bids` → `bids` table
- Map `japan_purchases` → `purchases` + `purchase_details` + `shipping` tables
- Rewrite the 1,600-line `japan.js` route file

This is a significant task for a future session.

---

## 🔑 Key Credentials (Keep Safe)

| Item | Value |
|------|-------|
| Railway DB Host (public) | `centerbeam.proxy.rlwy.net` |
| Railway DB Port | `57594` |
| Railway DB User | `root` |
| Railway DB Name | `railway` |
| Admin email | `admin@nipponbid.com` |
| Admin password | `Admin1234` |
| GitHub repo | `github.com/saadJP23/nipponbid` |
| Vercel URL | `nipponbid-psi.vercel.app` |
