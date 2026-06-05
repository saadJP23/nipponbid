# NipponBid — Session Handoff Document
Generated: 2026-06-05

---

## Production Setup

| Item | Value |
|---|---|
| Frontend | https://nipponbid-psi.vercel.app (Vercel, auto-deploys from GitHub main) |
| Backend | https://nipponbid.onrender.com (Render, free tier, auto-deploys from GitHub main) |
| Database | Railway MySQL — `nipponbid_v3` database |
| Railway host | centerbeam.proxy.rlwy.net:57594 |
| Railway user | root / UAhrFgyKVimhFeEgmlYEAbRQFDlvGVST |
| Render env | DB_NAME=nipponbid_v3 |
| Admin login | admin@nipponbid.com / Admin1234 |
| Old DB | `railway` database still exists on Railway as backup — safe to DROP when ready |

---

## Database: nipponbid_v3 — Complete Schema

### Key design rules
- PKs are named `table_name_id` (e.g. `user_id`, `car_id`, `purchase_id`)
- `users.role` = admin/user (for auth)
- `users.type` = dealer/ordinary/agent (for business logic)
- `users.status` = active/inactive/suspended
- Client-visible totals are computed in backend, NOT stored separately

### Tables (20 total)

```
users               — user_id, name, email, password, contact_number, country, city, role, type, status
auctions            — auction_id, auction_name, location, auction_held_days, membership_status, notes
cars                — car_id, car_name, chassis_no, make, model, year, mileage, grade, engine, transmission, color, doors, seats, fuel_type
car_images          — car_image_id, car_id, url, is_primary, notes
purchases           — purchase_id, user_id, car_id, auction_id, auc_date, lot_no, destination, pro_invoice_no, file_code_no, remarks
purchase_clients    — purchase_client_id, purchase_id, client_id(agent), commission  ← referral/agent linkage
purchase_details    — purchase_detail_id, purchase_id, bid_price, auction_commission, transportation, loading_custom, commission, tax_10_percent, radiation_photos, custom_fee, freight, recycle, others, total(GENERATED)
auction_results     — auction_result_id, auction_id, purchase_id, car_id, starting_price, sold_price
commissions         — commission_id, user_id(UNIQUE), commission, old_commission
shipping            — shipping_id, purchase_id, user_id, shipping_company, ship_name, route, etd, eta, result_of_inspection
bids                — bid_id, user_id, car_id, auction_id, amount, status, admin_note
documents           — document_id, user_id, car_id, purchase_id, name, type(user_and_admin|admin_only), url, uploaded_by
bl                  — bl_id, purchase_id, car_id, user_id, shipping_id, document_id, port_of_loading, port_of_discharge, route, status
remittances         — remittance_id, user_id, ref_no, sender_name, transfer_amount, deposit_amount, currency, exchange_rate, bank_charge, payment_mode, tt_date, receipt_url, remarks, status, confirmed_at
proforma_invoices   — proforma_id, user_id, purchase_id, invoice_no, invoice_date, due_date, sold_to, consigned_to, amount, paid_amount, status, notes
final_invoices      — final_invoice_id, user_id, purchase_id, shipping_id, invoice_no, invoice_date, due_date, amount, paid_amount, status, notes
parts_purchases     — parts_purchase_id, user_id, part_name, part_description, car_make, car_model, car_year, chassis_no, source_type, platform_name, platform_url, quantity, bid_price, final_price, status, tracking_no, admin_note
notifications       — notification_id, user_id, title, message, type, related_id, is_read
watchlist           — watchlist_id, user_id, car_id
saved_searches      — saved_search_id, user_id, name, filters(JSON)
```

---

## User Types — Roles & Permissions

### users.role (authentication level)
- `admin` — full access to all admin routes, can manage users, purchases, invoices, commissions
- `user` — limited to their own data (purchases, bids, remittances, invoices)

### users.type (business classification)
| Type | Description | What they can do |
|---|---|---|
| `dealer` | Professional car dealer | Buy cars, see simplified invoice (bid + commission + others only), no tax/freight/etc shown |
| `ordinary` | Regular client | Buy cars, sees full invoice except tax 10% and recycle |
| `agent` | Referral agent | Does NOT buy cars. Refers clients to NipponBid. Earns commission per referred purchase. Has own login to see their referrals + earnings |

### Agent workflow
1. Admin creates an agent account (`role=user`, `type=agent`)
2. Admin sets their commission rate via `PUT /admin/users/:id/commission`
3. When admin creates a purchase, they can assign one or more agents as referrers in the `purchase_clients` table
4. Agent commission is **snapshotted** at purchase time (`purchase_clients.commission`) — changing their rate later does NOT affect past purchases
5. Agent logs in and sees:
   - `GET /agents/my-referrals` — all purchases they were referral on
   - `GET /agents/my-commission` — current rate + total earned across all referrals
6. Admin sees agents at `GET /admin/agents` — includes total referrals count + total earned

### NipponBid profit calculation (per car, shown in admin master list)
Referral commissions are deducted from NipponBid's profit, NOT from the client's total:
- **Ordinary client**: `commission − tax_10_percent − recycle − SUM(all referral commissions)`
- **Dealer client**: `commission − auction_commission − transportation − loading_custom − tax_10_percent − radiation_photos − custom_fee − freight − recycle − SUM(all referral commissions)`
- `others` is NEVER deducted from profit (pure pass-through charged directly to client)

### Multiple referrals per purchase
- A purchase can have 0, 1, or many agents as referrers
- Stored in `purchase_clients` junction table: `purchase_id + client_id(agent user_id) + commission`
- In admin Excel export: 3 fixed referral columns (Referral 1 Name, Ref 1 Commission, Referral 2..., Referral 3...)
- If 4+ referrers exist, they are appended into the Referral 3 cell as "Name (¥amount), ..."

---

## Business Logic — Client Visibility Rules

### What each user type sees in purchase cost breakdown:

| Field | Admin | Dealer | Ordinary |
|---|---|---|---|
| bid_price | ✅ | ✅ | ✅ |
| auction_commission | ✅ | ❌ | ✅ |
| transportation | ✅ | ❌ | ✅ |
| loading_custom | ✅ | ❌ | ✅ |
| commission | ✅ | ✅ | ✅ |
| tax_10_percent | ✅ | ❌ | ❌ |
| radiation_photos | ✅ | ❌ | ✅ |
| custom_fee | ✅ | ❌ | ✅ |
| freight | ✅ | ❌ | ✅ |
| recycle | ✅ | ❌ | ❌ |
| others | ✅ | ✅ | ✅ |

**Dealer total** = bid_price + commission + others
**Ordinary total** = everything except tax_10_percent and recycle
**Admin total** = purchase_details.total (generated column = all fields)

### NipponBid Commission (profit per car):
- **Ordinary**: commission − tax_10_percent − recycle − SUM(referral commissions)
- **Dealer**: commission − auction_commission − transportation − loading_custom − tax_10_percent − radiation_photos − custom_fee − freight − recycle − SUM(referral commissions)
- `others` does NOT reduce commission (pure pass-through to client)
- Referral commissions are snapshotted in `purchase_clients.commission` at purchase time

---

## Backend API Routes

### Auth — /api/auth
```
POST   /login           — { email, password } → { token, user }
POST   /register        — { name, email, password, contact_number, country, city }
GET    /me              — returns current user
PUT    /profile         — { name, contact_number, country, city }
PUT    /change-password — { currentPassword, newPassword }
```

### Purchases — /api/purchases
```
GET    /my              — user's own purchases (filtered by user type visibility)
GET    /my/:id          — single purchase detail for user
GET    /                — admin: all purchases (query: user_id, bl_status, page, limit)
GET    /:id             — admin: single purchase full detail
POST   /                — admin: create purchase { user_id, car_id, auction_id, auc_date, lot_no, destination, pro_invoice_no, file_code_no, remarks, bid_price, auction_commission, transportation, loading_custom, commission, tax_10_percent, radiation_photos, custom_fee, freight, recycle, others, referrals:[{client_id, commission}] }
PUT    /:id             — admin: update purchase + cost details + referrals
POST   /:id/documents   — admin: upload document { type: user_and_admin|admin_only, name }
DELETE /:purchaseId/documents/:docId
```

### Admin — /api/admin
```
GET    /stats           — dashboard stats (query: date_from, date_to, user_id, country)
GET    /purchases/master — full purchase list with referrals + NipponBid commission column
GET    /purchases/export — Excel download (query: user_id, date_from, date_to)
GET    /users           — list users (query: search, type, page, limit)
GET    /users/:id       — user detail + balance + commission
POST   /users           — create user { name, email, password, contact_number, country, city, type, role }
PUT    /users/:id       — update user
PUT    /users/:id/toggle — activate/deactivate
PUT    /users/:id/commission — { commission } → sets commission, moves old to old_commission
GET    /agents          — list all agents with referral count + total earned
POST   /notify          — { user_id: 'all'|id, title, message, type }
```

### Bids — /api/bids
```
POST   /    — { car_id, auction_id, amount }
GET    /my  — user's bids
GET    /    — admin: all bids
PUT    /:id — admin: { status, admin_note }
```

### Shipments & BL — /api/shipments
```
GET    /my         — user's shipments
GET    /           — admin: all (page, limit)
POST   /           — create { purchase_id, shipping_company, ship_name, route, etd, eta, result_of_inspection }
PUT    /:id        — update shipping record
GET    /bl         — admin: all BL records
POST   /bl         — create BL { purchase_id, shipping_id, port_of_loading, port_of_discharge, route, status }
PUT    /bl/:id     — update BL
POST   /bl/:id/document — upload BL document
POST   /:id/document    — upload shipment document
```

### Invoices — /api/invoices
```
GET    /proforma/my     — user's proforma invoices
GET    /proforma        — admin: all
POST   /proforma        — { user_id, purchase_id, invoice_date, due_date, sold_to, consigned_to, amount, notes }
PUT    /proforma/:id
DELETE /proforma/:id

GET    /final/my        — user's final invoices
GET    /final           — admin: all
POST   /final           — { user_id, purchase_id, shipping_id, invoice_date, due_date, amount, notes }
PUT    /final/:id
DELETE /final/:id
```

### Accounting — /api/accounting
```
GET    /my              — user's ledger (credits=remittances, debits=purchases+invoices+parts)
GET    /user/:userId    — admin: ledger for specific user
GET    /summary         — admin: balance summary for all users
```

### Remittances — /api/remittances
```
POST   /                — user submits { transfer_amount, sender_name, currency, tt_date, ... }
GET    /my              — user's remittances
GET    /                — admin: all
PUT    /:id/confirm     — admin: { deposit_amount, bank_charge, exchange_rate }
POST   /admin-create    — admin creates on behalf of user
DELETE /:id
```

### Agents — /api/agents
```
GET    /my-referrals    — agent: list of purchases they referred + earned commission
GET    /my-commission   — agent: current rate + total earned
```

### Other routes (unchanged from before)
```
/api/parts          — parts purchases
/api/notifications  — notifications
/api/watchlist      — watchlist
/api/saved-searches — saved searches
/api/japan/*        — shinchuo car listings (still active)
```

---

## Known Issues / TODO

1. **Dashboard "Failed to load stats"** — The `/api/admin/stats` endpoint is failing intermittently. The `Dashboard.jsx` (user-facing) still imports old field names from japan purchases. The admin stats query joins on `purchase_details` which is fine, but the `Dashboard.jsx` page (not AdminDashboard) still uses old field mappings from `japan_purchases`. Needs the user dashboard to be rewritten to use new `/purchases/my` and `/accounting/my` endpoints.

2. **Revenue card shows ¥0 on admin dashboard** — The `total_revenue` stat was removed from stats (it was japan-specific commission sum). The new stats return `total_billed` instead. AdminDashboard.jsx shows "Revenue" card but maps to `stats.total_revenue` which is undefined. Fix: map Revenue card to `stats.total_billed` or calculate NipponBid profit separately.

3. **User drawer "Failed to load user"** — Was caused by missing `others` column in `purchase_details`. FIXED by ALTER TABLE on Railway. Also fixed in schema_v3.sql.

4. **`cars.japan_pid` temp column** — Added during migration to map japan_cars → cars. Should be dropped after migration is verified: `ALTER TABLE cars DROP COLUMN japan_pid;`

5. **Excel export columns** — Admin master purchase list Excel includes referral columns (3 slots, 4th+ appended to slot 3). Client-specific Excel (dealer vs ordinary) filters cost columns per business rules.

6. **`purchase_clients` = agent referrals** — When admin creates a purchase, they can add multiple agents as referrals. Each gets their commission snapshotted. Admin sees referral names in the master purchase list.

---

## File Structure (key files changed in this session)

```
server/src/routes/
  auth.js          — updated for user_id, status, type in JWT
  purchases.js     — full rewrite, visibility filtering by user type
  admin.js         — stats, master list, Excel export, commission mgmt, agents
  accounting.js    — ledger using new tables
  invoices.js      — proforma + final linked to purchases/shipping
  remittances.js   — updated PKs
  shipments.js     — uses new shipping + bl tables
  bids.js          — bid_id PK, auction linkage
  notifications.js — notification_id PK
  watchlist.js     — watchlist_id PK
  parts.js         — parts_purchase_id, source_type, tracking_no
  agents.js        — NEW: agent dashboard routes

src/services/api.js         — all new endpoints, japan stubs kept
src/App.jsx                 — removed japan/subclients routes
src/pages/admin/
  AdminPurchases.jsx        — full rewrite using new endpoints
  AdminBids.jsx             — bid_id, new endpoints
  AdminUsers.jsx            — commission editor, contact_number, type
  AdminDashboard.jsx        — field name fixes
src/pages/
  MyPurchases.jsx           — client-type-aware cost breakdown

database/
  schema_v3.sql             — complete 20-table schema
  migrate_to_v3.sql         — migration from autobid → nipponbid_v3
  migrate_railway.sql       — migration from railway → nipponbid_v3 (used in production)
  railway_backup.sql        — backup of old railway database
```
